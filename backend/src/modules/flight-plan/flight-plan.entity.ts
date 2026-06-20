import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { FlightPlanStatus } from '../../common/enums';
import { User } from '../user/user.entity';
import { Report } from '../report/report.entity';
import { Trajectory } from '../trajectory/trajectory.entity';
import { RiskAssessment } from '../risk-assessment/risk-assessment.entity';

@Entity('flight_plans')
export class FlightPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  planNo: string;

  @Column({ nullable: true })
  title: string;

  @ManyToOne(() => User, (user) => user.flightPlans)
  @JoinColumn({ name: 'applicantId' })
  applicant: User;

  @Column()
  applicantId: string;

  @Column()
  uavModel: string;

  @Column()
  uavSn: string;

  @Column()
  pilotName: string;

  @Column()
  pilotLicense: string;

  @Column({ type: 'timestamp' })
  plannedStartTime: Date;

  @Column({ type: 'timestamp' })
  plannedEndTime: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 120 })
  maxAltitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 50 })
  maxSpeed: number;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'LineString',
    srid: 4326,
  })
  plannedRoute: any;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  operationArea?: any;

  @Column({ type: 'text', nullable: true })
  purpose?: string;

  @Column({
    type: 'enum',
    enum: FlightPlanStatus,
    default: FlightPlanStatus.DRAFT,
  })
  status: FlightPlanStatus;

  @Column({ type: 'uuid', nullable: true })
  airTrafficReviewerId?: string;

  @Column({ type: 'text', nullable: true })
  airTrafficComment?: string;

  @Column({ type: 'uuid', nullable: true })
  policeReviewerId?: string;

  @Column({ type: 'text', nullable: true })
  policeComment?: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  noFlyZoneConflicts?: any;

  @Column({ type: 'text', nullable: true })
  rejectReason?: string;

  @OneToOne(() => Report, (report) => report.flightPlan)
  report: Report;

  @OneToOne(() => RiskAssessment, (ra) => ra.flightPlan)
  riskAssessment: RiskAssessment;

  @OneToMany(() => Trajectory, (t) => t.flightPlan)
  trajectories: Trajectory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
