import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Trajectory } from './trajectory.entity';
import { FlightPlan } from '../flight-plan/flight-plan.entity';
import { UploadTrajectoryDto, ReviewTrajectoryDto } from './dto/trajectory.dto';
import { TrajectoryStatus, FlightPlanStatus, UserRole } from '../../common/enums';

const DEFAULT_DEVIATION_THRESHOLD = 200;

@Injectable()
export class TrajectoryService {
  constructor(
    @InjectRepository(Trajectory)
    private trajectoryRepository: Repository<Trajectory>,
    @InjectRepository(FlightPlan)
    private flightPlanRepository: Repository<FlightPlan>,
    private dataSource: DataSource,
  ) {}

  async upload(
    flightPlanId: string,
    dto: UploadTrajectoryDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Trajectory> {
    const plan = await this.flightPlanRepository.findOne({ where: { id: flightPlanId } });
    if (!plan) throw new NotFoundException('飞行计划不存在');

    if (userRole === UserRole.OPERATOR && plan.applicantId !== userId) {
      throw new ForbiddenException('无权操作此飞行计划');
    }

    if (plan.status !== FlightPlanStatus.APPROVED) {
      throw new BadRequestException('只有已批准的飞行计划才能上传轨迹');
    }

    const threshold = dto.deviationThreshold || DEFAULT_DEVIATION_THRESHOLD;

    const deviationResult = await this.calculateDeviation(
      plan.plannedRoute,
      dto.actualRoute,
    );

    const hasDeviation = deviationResult.maxDeviation > threshold;

    const trajectory = this.trajectoryRepository.create({
      flightPlanId,
      actualRoute: dto.actualRoute,
      trackData: dto.trackData as any,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      deviationDistance: deviationResult.avgDeviation,
      maxDeviation: deviationResult.maxDeviation,
      hasDeviation,
      deviationDetails: deviationResult.details,
      status: hasDeviation ? TrajectoryStatus.DEVIATED : TrajectoryStatus.NORMAL,
    });

    return this.trajectoryRepository.save(trajectory);
  }

  private async calculateDeviation(
    plannedRoute: any,
    actualRoute: any,
  ): Promise<{
    maxDeviation: number;
    avgDeviation: number;
    details: any[];
  }> {
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      try {
        const result = await this.dataSource.query(
          `
          WITH actual_points AS (
            SELECT 
              (ST_DumpPoints(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))).geom AS geom,
              generate_series(1, ST_NPoints(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))) AS idx
          ),
          deviations AS (
            SELECT 
              idx,
              ST_Distance(
                geom::geography,
                ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)::geography
              ) AS dist,
              ST_X(geom) AS lng,
              ST_Y(geom) AS lat
            FROM actual_points
          )
          SELECT 
            COALESCE(MAX(dist), 0)::float AS max_deviation,
            COALESCE(AVG(dist), 0)::float AS avg_deviation,
            json_agg(
              json_build_object(
                'idx', idx,
                'distance', dist,
                'lng', lng,
                'lat', lat
              )
              ORDER BY dist DESC
              LIMIT 10
            ) AS details
          FROM deviations
          WHERE dist > 0
          `,
          [JSON.stringify(actualRoute), JSON.stringify(plannedRoute)],
        );

        const row = result[0] || {};
        return {
          maxDeviation: row.max_deviation || 0,
          avgDeviation: row.avg_deviation || 0,
          details: row.details || [],
        };
      } finally {
        await queryRunner.release();
      }
    } catch (e) {
      return {
        maxDeviation: 0,
        avgDeviation: 0,
        details: [],
      };
    }
  }

  async findAll(
    userId: string,
    userRole: UserRole,
    flightPlanId?: string,
    status?: TrajectoryStatus,
  ): Promise<Trajectory[]> {
    const where: any = {};
    if (flightPlanId) where.flightPlanId = flightPlanId;
    if (status) where.status = status;

    const queryBuilder = this.trajectoryRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.flightPlan', 'flightPlan')
      .where(where);

    if (userRole === UserRole.OPERATOR) {
      queryBuilder.andWhere('flightPlan.applicantId = :userId', { userId });
    }

    queryBuilder.orderBy('t.createdAt', 'DESC');
    return queryBuilder.getMany();
  }

  async findOne(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Trajectory> {
    const trajectory = await this.trajectoryRepository.findOne({
      where: { id },
      relations: ['flightPlan'],
    });
    if (!trajectory) throw new NotFoundException('轨迹不存在');

    if (userRole === UserRole.OPERATOR && trajectory.flightPlan.applicantId !== userId) {
      throw new ForbiddenException('无权查看此轨迹');
    }

    return trajectory;
  }

  async startReview(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Trajectory> {
    if (userRole !== UserRole.AIR_TRAFFIC && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('只有空管人员可以发起复核');
    }

    const trajectory = await this.trajectoryRepository.findOne({ where: { id } });
    if (!trajectory) throw new NotFoundException('轨迹不存在');

    if (
      trajectory.status !== TrajectoryStatus.DEVIATED &&
      trajectory.status !== TrajectoryStatus.NORMAL
    ) {
      throw new BadRequestException('当前状态不可发起复核');
    }

    trajectory.status = TrajectoryStatus.REVIEWING;
    return this.trajectoryRepository.save(trajectory);
  }

  async review(
    id: string,
    approve: boolean,
    dto: ReviewTrajectoryDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Trajectory> {
    if (userRole !== UserRole.AIR_TRAFFIC && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('只有空管人员可以进行复核');
    }

    const trajectory = await this.trajectoryRepository.findOne({ where: { id } });
    if (!trajectory) throw new NotFoundException('轨迹不存在');

    if (trajectory.status !== TrajectoryStatus.REVIEWING) {
      throw new BadRequestException('当前状态不可进行复核');
    }

    trajectory.reviewComment = dto.reviewComment;
    trajectory.reviewerId = userId;
    trajectory.reviewedAt = new Date();
    trajectory.status = approve
      ? TrajectoryStatus.REVIEW_PASSED
      : TrajectoryStatus.REVIEW_REJECTED;

    return this.trajectoryRepository.save(trajectory);
  }

  async archive(id: string, userId: string, userRole: UserRole): Promise<Trajectory> {
    if (userRole !== UserRole.AIR_TRAFFIC && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('只有空管人员可以归档');
    }

    const trajectory = await this.trajectoryRepository.findOne({ where: { id } });
    if (!trajectory) throw new NotFoundException('轨迹不存在');

    const archiveableStatuses = [
      TrajectoryStatus.NORMAL,
      TrajectoryStatus.REVIEW_PASSED,
    ];
    if (!archiveableStatuses.includes(trajectory.status)) {
      throw new BadRequestException('当前状态不可归档');
    }

    trajectory.status = TrajectoryStatus.ARCHIVED;
    trajectory.archivedAt = new Date();
    return this.trajectoryRepository.save(trajectory);
  }
}
