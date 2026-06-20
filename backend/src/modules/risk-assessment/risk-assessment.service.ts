import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LargeEvent } from './large-event.entity';
import { RiskAssessment } from './risk-assessment.entity';
import { CreateLargeEventDto, AssessRiskDto } from './dto/risk-assessment.dto';
import { FlightPlan } from '../flight-plan/flight-plan.entity';
import { FlightPlanStatus, RiskLevel } from '../../common/enums';
import { RiskLevel as RiskLevelEnum } from '../../common/enums';

@Injectable()
export class RiskAssessmentService implements OnModuleInit {
  constructor(
    @InjectRepository(LargeEvent)
    private largeEventRepository: Repository<LargeEvent>,
    @InjectRepository(RiskAssessment)
    private riskAssessmentRepository: Repository<RiskAssessment>,
    @InjectRepository(FlightPlan)
    private flightPlanRepository: Repository<FlightPlan>,
  ) {}

  async onModuleInit() {
    const count = await this.largeEventRepository.count();
    if (count === 0) {
      const seedEvents = [
        {
          name: '天安门广场大型庆典',
          description: '国庆庆典活动',
          riskLevel: RiskLevel.CRITICAL,
          bufferRadius: 1000,
          startTime: new Date(Date.now() - 86400000 * 30),
          endTime: new Date(Date.now() + 86400000 * 365),
          organizer: '国务院',
          isActive: true,
          area: {
            type: 'Polygon',
            coordinates: [[
              [116.38, 39.90],
              [116.41, 39.90],
              [116.41, 39.93],
              [116.38, 39.93],
              [116.38, 39.90],
            ]],
          },
        },
        {
          name: '鸟巢演唱会',
          description: '大型体育演出活动',
          riskLevel: RiskLevel.HIGH,
          bufferRadius: 500,
          startTime: new Date(Date.now() - 86400000 * 7),
          endTime: new Date(Date.now() + 86400000 * 30),
          organizer: '文化公司',
          isActive: true,
          area: {
            type: 'Polygon',
            coordinates: [[
              [116.38, 39.99],
              [116.40, 39.99],
              [116.40, 40.01],
              [116.38, 40.01],
              [116.38, 39.99],
            ]],
          },
        },
      ];
      await this.largeEventRepository.save(seedEvents as any);
      console.log('✅ 示例大型活动数据已初始化');
    }
  }

  async createLargeEvent(dto: CreateLargeEventDto): Promise<LargeEvent> {
    const event = this.largeEventRepository.create(dto);
    return this.largeEventRepository.save(event);
  }

  async findAllLargeEvents(activeOnly = true): Promise<LargeEvent[]> {
    const where: any = {};
    if (activeOnly) where.isActive = true;
    return this.largeEventRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findLargeEvent(id: string): Promise<LargeEvent> {
    const event = await this.largeEventRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('活动不存在');
    return event;
  }

  async updateLargeEvent(id: string, dto: Partial<CreateLargeEventDto>): Promise<LargeEvent> {
    const event = await this.findLargeEvent(id);
    Object.assign(event, dto);
    return this.largeEventRepository.save(event);
  }

  async removeLargeEvent(id: string): Promise<void> {
    const event = await this.findLargeEvent(id);
    await this.largeEventRepository.remove(event);
  }

  async checkLargeEventConflict(flightPlanId: string): Promise<{
    hasConflict: boolean;
    events: LargeEvent[];
  }> {
    const plan = await this.flightPlanRepository.findOne({ where: { id: flightPlanId } });
    if (!plan) throw new NotFoundException('飞行计划不存在');

    const events = await this.largeEventRepository
      .createQueryBuilder('e')
      .where('e.isActive = true')
      .andWhere(
        '(e.startTime <= :plannedEnd AND e.endTime >= :plannedStart)',
        {
          plannedStart: plan.plannedStartTime,
          plannedEnd: plan.plannedEndTime,
        },
      )
      .andWhere(
        'ST_Intersects(ST_Buffer(e.area::geography, e.bufferRadius)::geometry, ST_SetSRID(ST_GeomFromGeoJSON(:routeGeoJson), 4326))',
        { routeGeoJson: JSON.stringify(plan.plannedRoute) },
      )
      .getMany();

    return {
      hasConflict: events.length > 0,
      events,
    };
  }

  async getOrCreateAssessment(flightPlanId: string, userId?: string): Promise<RiskAssessment> {
    let assessment = await this.riskAssessmentRepository.findOne({
      where: { flightPlanId },
      relations: ['flightPlan'],
    });

    if (!assessment) {
      const conflictResult = await this.checkLargeEventConflict(flightPlanId);
      assessment = this.riskAssessmentRepository.create({
        flightPlanId,
        overallRisk: conflictResult.hasConflict ? RiskLevel.HIGH : RiskLevel.LOW,
        hasLargeEventConflict: conflictResult.hasConflict,
        largeEventRisks: conflictResult.events.map((e) => ({
          id: e.id,
          name: e.name,
          riskLevel: e.riskLevel,
        })),
        largeEventDescription: conflictResult.events.map((e) => e.name).join(', '),
        assessorId: userId,
        assessedAt: new Date(),
      });
      assessment = await this.riskAssessmentRepository.save(assessment);
    }

    return assessment;
  }

  async assessFlightPlan(
    flightPlanId: string,
    dto: AssessRiskDto,
    userId: string,
  ): Promise<RiskAssessment> {
    const plan = await this.flightPlanRepository.findOne({ where: { id: flightPlanId } });
    if (!plan) throw new NotFoundException('飞行计划不存在');
    if (plan.status !== FlightPlanStatus.POLICE_REVIEW) {
      throw new BadRequestException('当前状态不可进行风险评估');
    }

    let assessment = await this.riskAssessmentRepository.findOne({
      where: { flightPlanId },
    });

    if (!assessment) {
      assessment = this.riskAssessmentRepository.create({ flightPlanId });
    }

    Object.assign(assessment, {
      ...dto,
      assessorId: userId,
      assessedAt: new Date(),
    });

    return this.riskAssessmentRepository.save(assessment);
  }
}
