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

  async findAll(userId: string, userRole: UserRole, status?: ReportStatus): Promise<any[]> {
    const where: any = {};
    if (status) where.status = status;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.flightPlan', 'flightPlan')
      .leftJoinAndSelect('flightPlan.applicant', 'applicant')
      .where(where);

    if (userRole === UserRole.OPERATOR) {
      queryBuilder.andWhere('flightPlan.applicantId = :userId', { userId });
    }

    queryBuilder.orderBy('report.createdAt', 'DESC');
    const reports = await queryBuilder.getMany();

    const now = new Date();
    return reports.map((r: any) => {
      const result: any = { ...r };
      if (r.flightPlan && r.flightPlan.status === FlightPlanStatus.APPROVED) {
        const startTime = new Date(r.flightPlan.plannedStartTime);
        const endTime = new Date(r.flightPlan.plannedEndTime);
        const hoursToStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (r.status === ReportStatus.PENDING) {
          let urgency = 'normal';
          if (hoursToStart < 0 && now < endTime) urgency = 'overdue';
          else if (hoursToStart >= 0 && hoursToStart <= 1) urgency = 'urgent';
          else if (hoursToStart > 1 && hoursToStart <= 24) urgency = 'warning';

          result.reminder = {
            urgency,
            hoursToStart: Math.round(hoursToStart * 10) / 10,
            message:
              urgency === 'overdue'
                ? '起飞时间已到，请立即完成现场报备！'
                : urgency === 'urgent'
                ? `距离计划起飞不足${Math.ceil(hoursToStart * 60)}分钟`
                : urgency === 'warning'
                ? `距离计划起飞还有${Math.ceil(hoursToStart)}小时`
                : `距离计划起飞还有${Math.ceil(hoursToStart)}小时`,
          };
        }
      }
      return result;
    });
  }

  async findPendingList(userId: string, userRole: UserRole): Promise<any[]> {
    const now = new Date();

    const approvedPlans = await this.flightPlanRepository
      .createQueryBuilder('fp')
      .leftJoinAndSelect('fp.applicant', 'applicant')
      .leftJoinAndSelect('fp.report', 'report')
      .where('fp.status = :status', { status: FlightPlanStatus.APPROVED })
      .andWhere('fp.plannedEndTime > :now', { now })
      .andWhere(
        '(report.id IS NULL OR report.status IN (:...pendingStatuses))',
        { pendingStatuses: [ReportStatus.PENDING] },
      )
      .orderBy('fp.plannedStartTime', 'ASC');

    if (userRole === UserRole.OPERATOR) {
      approvedPlans.andWhere('fp.applicantId = :userId', { userId });
    }

    const plans = await approvedPlans.getMany();

    return plans.map((plan: any) => {
      const startTime = new Date(plan.plannedStartTime);
      const endTime = new Date(plan.plannedEndTime);
      const hoursToStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const hoursToEnd = (endTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      let urgency = 'normal';
      if (hoursToStart < 0 && now < endTime) urgency = 'overdue';
      else if (hoursToStart >= 0 && hoursToStart <= 1) urgency = 'urgent';
      else if (hoursToStart > 1 && hoursToStart <= 24) urgency = 'warning';

      const report = plan.report;
      return {
        id: plan.id,
        planNo: plan.planNo,
        title: plan.title,
        applicant: plan.applicant,
        applicantId: plan.applicantId,
        plannedStartTime: plan.plannedStartTime,
        plannedEndTime: plan.plannedEndTime,
        uavModel: plan.uavModel,
        pilotName: plan.pilotName,
        maxAltitude: plan.maxAltitude,
        reportId: report?.id,
        reportStatus: report?.status || 'not_created',
        hoursToStart: Math.round(hoursToStart * 10) / 10,
        hoursToEnd: Math.round(hoursToEnd * 10) / 10,
        urgency,
        reminder: {
          urgency,
          isUrgent: urgency === 'urgent' || urgency === 'overdue',
          message:
            urgency === 'overdue'
              ? `计划【${plan.planNo}】起飞时间已到但尚未完成现场报备！`
              : urgency === 'urgent'
              ? `计划【${plan.planNo}】距离起飞不足${Math.ceil(hoursToStart * 60)}分钟，请立即报备`
              : urgency === 'warning'
              ? `计划【${plan.planNo}】距离起飞还有${Math.ceil(hoursToStart)}小时`
              : `计划【${plan.planNo}】距离起飞还有${Math.ceil(hoursToStart)}小时`,
        },
      };
    });
  }
}
