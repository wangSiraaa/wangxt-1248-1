import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlightPlan } from './flight-plan.entity';
import { CreateFlightPlanDto, UpdateFlightPlanDto, ReviewDto } from './dto/flight-plan.dto';
import { FlightPlanStatus, UserRole } from '../../common/enums';
import { AirspaceService } from '../airspace/airspace.service';

@Injectable()
export class FlightPlanService {
  constructor(
    @InjectRepository(FlightPlan)
    private flightPlanRepository: Repository<FlightPlan>,
    private airspaceService: AirspaceService,
  ) {}

  private generatePlanNo(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `UAV${dateStr}${random}`;
  }

  async create(dto: CreateFlightPlanDto, userId: string): Promise<FlightPlan> {
    const plan = this.flightPlanRepository.create({
      ...dto,
      applicantId: userId,
      planNo: this.generatePlanNo(),
      status: FlightPlanStatus.DRAFT,
    });
    return this.flightPlanRepository.save(plan);
  }

  async findAll(
    userId: string,
    userRole: UserRole,
    status?: FlightPlanStatus,
    reportPending?: boolean,
  ): Promise<FlightPlan[]> {
    const queryBuilder = this.flightPlanRepository
      .createQueryBuilder('fp')
      .leftJoinAndSelect('fp.applicant', 'applicant')
      .leftJoinAndSelect('fp.report', 'report');

    if (status) {
      queryBuilder.andWhere('fp.status = :status', { status });
    }
    if (userRole === UserRole.OPERATOR) {
      queryBuilder.andWhere('fp.applicantId = :userId', { userId });
    }
    if (reportPending === true) {
      queryBuilder
        .andWhere('fp.status = :approvedStatus', { approvedStatus: FlightPlanStatus.APPROVED })
        .andWhere('(report.id IS NULL OR report.status = :pendingStatus)', {
          pendingStatus: 'pending',
        });
    }

    queryBuilder.orderBy('fp.createdAt', 'DESC');
    return queryBuilder.getMany();
  }

  async findOne(id: string, userId: string, userRole: UserRole): Promise<any> {
    const plan = await this.flightPlanRepository.findOne({
      where: { id },
      relations: ['applicant', 'report'],
    });
    if (!plan) {
      throw new NotFoundException('飞行计划不存在');
    }
    if (userRole === UserRole.OPERATOR && plan.applicantId !== userId) {
      throw new ForbiddenException('无权查看此飞行计划');
    }

    const result: any = { ...plan };

    if (plan.status === FlightPlanStatus.APPROVED) {
      const now = new Date();
      const startTime = new Date(plan.plannedStartTime);
      const endTime = new Date(plan.plannedEndTime);
      const report = plan.report;

      const hoursToStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      let reportStatus = 'not_reported';
      if (report) {
        if (report.status === 'pending') reportStatus = 'pending_report';
        else if (report.status === 'takeoff_reported') reportStatus = 'takeoff_reported';
        else if (report.status === 'landing_reported') reportStatus = 'landing_reported';
        else if (report.status === 'completed') reportStatus = 'completed';
      }

      let reminder: any = null;
      if (reportStatus === 'not_reported' || reportStatus === 'pending_report') {
        let urgency = 'normal';
        if (hoursToStart < 0 && now < endTime) urgency = 'overdue';
        else if (hoursToStart >= 0 && hoursToStart <= 1) urgency = 'urgent';
        else if (hoursToStart > 1 && hoursToStart <= 24) urgency = 'warning';

        reminder = {
          needReport: true,
          reportStatus,
          hoursToStart: Math.round(hoursToStart * 10) / 10,
          urgency,
          message:
            urgency === 'overdue'
              ? '起飞时间已到，请立即完成现场报备！'
              : urgency === 'urgent'
              ? `距离计划起飞不足${Math.ceil(hoursToStart * 60)}分钟，请尽快完成现场报备！`
              : urgency === 'warning'
              ? `距离计划起飞还有${Math.ceil(hoursToStart)}小时，请准备现场报备。`
              : `距离计划起飞还有${Math.ceil(hoursToStart)}小时，记得按时报备。`,
        };
      }

      result.reportInfo = {
        reportStatus,
        reportId: report?.id,
        takeoffTime: report?.takeoffTime,
        landingTime: report?.landingTime,
        reminder,
      };
    }

    return result;
  }

  async update(
    id: string,
    dto: UpdateFlightPlanDto,
    userId: string,
  ): Promise<FlightPlan> {
    const plan = await this.findOne(id, userId, UserRole.OPERATOR);
    if (plan.status !== FlightPlanStatus.DRAFT) {
      throw new BadRequestException('只有草稿状态的计划可以修改');
    }
    Object.assign(plan, dto);
    return this.flightPlanRepository.save(plan);
  }

  async submit(id: string, userId: string): Promise<FlightPlan> {
    const plan = await this.findOne(id, userId, UserRole.OPERATOR);
    if (plan.status !== FlightPlanStatus.DRAFT) {
      throw new BadRequestException('只有草稿状态的计划可以提交');
    }

    const conflictResult = await this.airspaceService.checkConflict({
      route: plan.plannedRoute,
      altitude: plan.maxAltitude,
    });

    if (conflictResult.hasConflict) {
      plan.noFlyZoneConflicts = conflictResult.conflicts.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        reason: c.reason,
      }));
      await this.flightPlanRepository.save(plan);
      throw new BadRequestException(
        `航线穿越 ${conflictResult.conflicts.length} 个禁飞区，不能提交审批`,
      );
    }

    plan.status = FlightPlanStatus.SUBMITTED;
    return this.flightPlanRepository.save(plan);
  }

  async airTrafficReview(
    id: string,
    approve: boolean,
    dto: ReviewDto,
    reviewerId: string,
  ): Promise<FlightPlan> {
    const plan = await this.flightPlanRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('飞行计划不存在');

    if (plan.status !== FlightPlanStatus.SUBMITTED) {
      throw new BadRequestException('当前状态不可进行空管审批');
    }

    plan.airTrafficReviewerId = reviewerId;
    plan.airTrafficComment = dto.comment;

    if (!approve) {
      plan.status = FlightPlanStatus.REJECTED;
      plan.rejectReason = dto.rejectReason || '空管审批未通过';
      return this.flightPlanRepository.save(plan);
    }

    plan.status = FlightPlanStatus.POLICE_REVIEW;
    return this.flightPlanRepository.save(plan);
  }

  async policeReview(
    id: string,
    approve: boolean,
    dto: ReviewDto,
    reviewerId: string,
  ): Promise<FlightPlan> {
    const plan = await this.flightPlanRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('飞行计划不存在');

    if (plan.status !== FlightPlanStatus.POLICE_REVIEW) {
      throw new BadRequestException('当前状态不可进行公安审批');
    }

    plan.policeReviewerId = reviewerId;
    plan.policeComment = dto.comment;

    if (!approve) {
      plan.status = FlightPlanStatus.REJECTED;
      plan.rejectReason = dto.rejectReason || '公安风险评估未通过';
      return this.flightPlanRepository.save(plan);
    }

    plan.status = FlightPlanStatus.APPROVED;
    plan.approvedAt = new Date();
    return this.flightPlanRepository.save(plan);
  }

  async cancel(id: string, userId: string): Promise<FlightPlan> {
    const plan = await this.findOne(id, userId, UserRole.OPERATOR);
    if (
      ![FlightPlanStatus.DRAFT, FlightPlanStatus.SUBMITTED, FlightPlanStatus.APPROVED].includes(
        plan.status,
      )
    ) {
      throw new BadRequestException('当前状态不可取消');
    }
    plan.status = FlightPlanStatus.CANCELLED;
    return this.flightPlanRepository.save(plan);
  }

  async remove(id: string, userId: string): Promise<void> {
    const plan = await this.findOne(id, userId, UserRole.OPERATOR);
    if (plan.status !== FlightPlanStatus.DRAFT && plan.status !== FlightPlanStatus.REJECTED) {
      throw new BadRequestException('只有草稿或已驳回的计划可以删除');
    }
    await this.flightPlanRepository.remove(plan);
  }
}
