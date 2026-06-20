import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { Report } from './report.entity';
import { FlightPlan } from '../flight-plan/flight-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Report, FlightPlan])],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
