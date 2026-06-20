import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlightPlanController } from './flight-plan.controller';
import { FlightPlanService } from './flight-plan.service';
import { FlightPlan } from './flight-plan.entity';
import { AirspaceModule } from '../airspace/airspace.module';

@Module({
  imports: [TypeOrmModule.forFeature([FlightPlan]), AirspaceModule],
  controllers: [FlightPlanController],
  providers: [FlightPlanService],
  exports: [FlightPlanService],
})
export class FlightPlanModule {}
