export enum UserRole {
  OPERATOR = 'operator',
  AIR_TRAFFIC = 'air_traffic',
  POLICE = 'police',
  ADMIN = 'admin',
}

export enum FlightPlanStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  AIR_TRAFFIC_REVIEW = 'air_traffic_review',
  POLICE_REVIEW = 'police_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum ReportStatus {
  PENDING = 'pending',
  TAKEOFF_REPORTED = 'takeoff_reported',
  LANDING_REPORTED = 'landing_reported',
  COMPLETED = 'completed',
}

export enum TrajectoryStatus {
  NORMAL = 'normal',
  DEVIATED = 'deviated',
  REVIEWING = 'reviewing',
  REVIEW_PASSED = 'review_passed',
  REVIEW_REJECTED = 'review_rejected',
  ARCHIVED = 'archived',
}

export enum AirspaceType {
  NO_FLY = 'no_fly',
  RESTRICTED = 'restricted',
  WARNING = 'warning',
  CONTROLLED = 'controlled',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
