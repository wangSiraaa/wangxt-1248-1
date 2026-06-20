import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskAssessmentController } from './risk-assessment.controller';
import { RiskAssessmentService } from './risk-assessment.service';
import { LargeEvent } from './large-event.entity';
import { RiskAssessment } from './risk-assessment.entity';
import { FlightPlan } from '../flight-plan/flight-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LargeEvent, RiskAssessment, FlightPlan])],
  controllers: [RiskAssessmentController],
  providers: [RiskAssessmentService],
  exports: [RiskAssessmentService],
})
export class RiskAssessmentModule {}
