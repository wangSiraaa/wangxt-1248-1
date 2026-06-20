import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { RiskLevel } from '../../common/enums';
import { FlightPlan } from '../flight-plan/flight-plan.entity';
import { User } from '../user/user.entity';

@Entity('risk_assessments')
export class RiskAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => FlightPlan, (plan) => plan.riskAssessment)
  @JoinColumn({ name: 'flightPlanId' })
  flightPlan: FlightPlan;

  @Column()
  flightPlanId: string;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.LOW,
  })
  overallRisk: RiskLevel;

  @Column({ type: 'jsonb', nullable: true })
  largeEventRisks?: any;

  @Column({ type: 'jsonb', nullable: true })
  airspaceRisks?: any;

  @Column({ type: 'jsonb', nullable: true })
  weatherRisks?: any;

  @Column({ default: false })
  hasLargeEventConflict: boolean;

  @Column({ type: 'text', nullable: true })
  largeEventDescription?: string;

  @Column({ type: 'text', nullable: true })
  suggestion?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assessorId' })
  assessor: User;

  @Column({ nullable: true })
  assessorId?: string;

  @Column({ type: 'timestamp', nullable: true })
  assessedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
