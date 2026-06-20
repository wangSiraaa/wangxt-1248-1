import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrajectoryController } from './trajectory.controller';
import { TrajectoryService } from './trajectory.service';
import { Trajectory } from './trajectory.entity';
import { FlightPlan } from '../flight-plan/flight-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trajectory, FlightPlan])],
  controllers: [TrajectoryController],
  providers: [TrajectoryService],
  exports: [TrajectoryService],
})
export class TrajectoryModule {}
