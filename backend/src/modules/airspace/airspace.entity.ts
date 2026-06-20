import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AirspaceType, RiskLevel } from '../../common/enums';

@Entity('airspaces')
export class Airspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: AirspaceType,
  })
  type: AirspaceType;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.MEDIUM,
  })
  riskLevel: RiskLevel;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
  })
  @Index({ spatial: true })
  geom: any;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minAltitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 120 })
  maxAltitude: number;

  @Column({ type: 'timestamp', nullable: true })
  effectiveFrom?: Date;

  @Column({ type: 'timestamp', nullable: true })
  effectiveTo?: Date;

  @Column({ nullable: true })
  reason?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
