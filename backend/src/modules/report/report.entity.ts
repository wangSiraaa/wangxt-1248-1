import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { ReportStatus } from '../../common/enums';
import { FlightPlan } from '../flight-plan/flight-plan.entity';
import { User } from '../user/user.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => FlightPlan, (plan) => plan.report)
  @JoinColumn({ name: 'flightPlanId' })
  flightPlan: FlightPlan;

  @Column({ unique: true })
  flightPlanId: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @Column()
  reporterId: string;

  @Column({ type: 'timestamp', nullable: true })
  takeoffTime?: Date;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  takeoffLat?: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  takeoffLng?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  takeoffAltitude?: number;

  @Column({ type: 'text', nullable: true })
  takeoffRemark?: string;

  @Column({ type: 'timestamp', nullable: true })
  landingTime?: Date;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  landingLat?: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  landingLng?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  landingAltitude?: number;

  @Column({ type: 'text', nullable: true })
  landingRemark?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualFlightDuration?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualDistance?: number;

  @Column({ default: false })
  operationResultUploaded: boolean;

  @Column({ type: 'text', nullable: true })
  operationResultRemark?: string;

  @Column({ type: 'jsonb', nullable: true })
  operationFiles?: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
