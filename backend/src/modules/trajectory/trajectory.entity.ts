import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TrajectoryStatus } from '../../common/enums';
import { FlightPlan } from '../flight-plan/flight-plan.entity';
import { User } from '../user/user.entity';

@Entity('trajectories')
export class Trajectory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => FlightPlan, (plan) => plan.trajectories)
  @JoinColumn({ name: 'flightPlanId' })
  flightPlan: FlightPlan;

  @Column()
  flightPlanId: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'LineString',
    srid: 4326,
  })
  @Index({ spatial: true })
  actualRoute: any;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    array: true,
    nullable: true,
  })
  trackPoints?: any;

  @Column({ type: 'jsonb', nullable: true })
  trackData?: any;

  @Column({
    type: 'enum',
    enum: TrajectoryStatus,
    default: TrajectoryStatus.NORMAL,
  })
  status: TrajectoryStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deviationDistance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maxDeviation: number;

  @Column({ default: false })
  hasDeviation: boolean;

  @Column({ type: 'jsonb', nullable: true })
  deviationDetails?: any;

  @Column({ type: 'text', nullable: true })
  reviewComment?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewerId' })
  reviewer?: User;

  @Column({ type: 'uuid', nullable: true })
  reviewerId?: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt?: Date;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
