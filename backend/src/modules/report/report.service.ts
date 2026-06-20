import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './report.entity';
import { FlightPlan } from '../flight-plan/flight-plan.entity';
import {
  TakeoffReportDto,
  LandingReportDto,
  OperationResultDto,
} from './dto/report.dto';
import { ReportStatus, FlightPlanStatus, UserRole } from '../../common/enums';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(FlightPlan)
    private flightPlanRepository: Repository<FlightPlan>,
  ) {}

  async getOrCreateReport(flightPlanId: string, userId: string, userRole: UserRole): Promise<Report> {
    const plan = await this.flightPlanRepository.findOne({ where: { id: flightPlanId } });
    if (!plan) throw new NotFoundException('飞行计划不存在');

    if (userRole === UserRole.OPERATOR && plan.applicantId !== userId) {
      throw new ForbiddenException('无权操作此飞行计划');
    }

    let report = await this.reportRepository.findOne({
      where: { flightPlanId },
      relations: ['flightPlan'],
    });

    if (!report) {
      report = this.reportRepository.create({
        flightPlanId,
        reporterId: userId,
        status: ReportStatus.PENDING,
      });
      report = await this.reportRepository.save(report);
    }

    return report;
  }

  async takeoff(
    flightPlanId: string,
    dto: TakeoffReportDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Report> {
    const plan = await this.flightPlanRepository.findOne({ where: { id: flightPlanId } });
    if (!plan) throw new NotFoundException('飞行计划不存在');

    if (plan.status !== FlightPlanStatus.APPROVED) {
      throw new BadRequestException('只有已批准的飞行计划才能进行起飞报备');
    }

    const report = await this.getOrCreateReport(flightPlanId, userId, userRole);

    if (
      report.status !== ReportStatus.PENDING &&
      report.status !== ReportStatus.LANDING_REPORTED
    ) {
      throw new BadRequestException('当前状态不可进行起飞报备');
    }

    report.takeoffTime = dto.takeoffTime ? new Date(dto.takeoffTime) : new Date();
    report.takeoffLat = dto.takeoffLat;
    report.takeoffLng = dto.takeoffLng;
    report.takeoffAltitude = dto.takeoffAltitude;
    report.takeoffRemark = dto.takeoffRemark;
    report.status = ReportStatus.TAKEOFF_REPORTED;
    report.reporterId = userId;

    return this.reportRepository.save(report);
  }

  async landing(
    flightPlanId: string,
    dto: LandingReportDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Report> {
    const report = await this.getOrCreateReport(flightPlanId, userId, userRole);

    if (report.status !== ReportStatus.TAKEOFF_REPORTED) {
      throw new BadRequestException('请先完成起飞报备');
    }

    report.landingTime = dto.landingTime ? new Date(dto.landingTime) : new Date();
    report.landingLat = dto.landingLat;
    report.landingLng = dto.landingLng;
    report.landingAltitude = dto.landingAltitude;
    report.landingRemark = dto.landingRemark;
    report.actualFlightDuration = dto.actualFlightDuration;
    report.actualDistance = dto.actualDistance;
    report.status = report.operationResultUploaded
      ? ReportStatus.COMPLETED
      : ReportStatus.LANDING_REPORTED;

    return this.reportRepository.save(report);
  }

  async uploadOperationResult(
    flightPlanId: string,
    dto: OperationResultDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Report> {
    const report = await this.getOrCreateReport(flightPlanId, userId, userRole);

    if (
      report.status !== ReportStatus.TAKEOFF_REPORTED &&
      report.status !== ReportStatus.LANDING_REPORTED
    ) {
      throw new BadRequestException('未完成起飞报备，不能上传作业结果');
    }

    report.operationResultRemark = dto.operationResultRemark;
    report.operationFiles = dto.operationFiles as any;
    report.operationResultUploaded = true;

    if (report.status === ReportStatus.LANDING_REPORTED) {
      report.status = ReportStatus.COMPLETED;
    }

    return this.reportRepository.save(report);
  }

  async findByFlightPlan(flightPlanId: string, userId: string, userRole: UserRole): Promise<Report> {
    return this.getOrCreateReport(flightPlanId, userId, userRole);
  }

  async findAll(userId: string, userRole: UserRole, status?: ReportStatus): Promise<Report[]> {
    const where: any = {};
    if (status) where.status = status;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.flightPlan', 'flightPlan')
      .where(where);

    if (userRole === UserRole.OPERATOR) {
      queryBuilder.andWhere('flightPlan.applicantId = :userId', { userId });
    }

    queryBuilder.orderBy('report.createdAt', 'DESC');
    return queryBuilder.getMany();
  }
}
