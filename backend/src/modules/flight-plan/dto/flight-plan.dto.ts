import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsObject, IsDateString, IsUUID } from 'class-validator';
import { FlightPlanStatus } from '../../common/enums';

export class CreateFlightPlanDto {
  @ApiProperty({ description: '计划标题' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: '无人机型号' })
  @IsString()
  @IsNotEmpty()
  uavModel: string;

  @ApiProperty({ description: '无人机序列号' })
  @IsString()
  @IsNotEmpty()
  uavSn: string;

  @ApiProperty({ description: '飞行员姓名' })
  @IsString()
  @IsNotEmpty()
  pilotName: string;

  @ApiProperty({ description: '飞行员执照号' })
  @IsString()
  @IsNotEmpty()
  pilotLicense: string;

  @ApiProperty({ description: '计划起飞时间' })
  @IsDateString()
  @IsNotEmpty()
  plannedStartTime: string;

  @ApiProperty({ description: '计划降落时间' })
  @IsDateString()
  @IsNotEmpty()
  plannedEndTime: string;

  @ApiProperty({ description: '最大高度(米)' })
  @IsNumber()
  @IsOptional()
  maxAltitude?: number;

  @ApiProperty({ description: '最大速度(km/h)' })
  @IsNumber()
  @IsOptional()
  maxSpeed?: number;

  @ApiProperty({ description: '计划航线 GeoJSON LineString' })
  @IsObject()
  @IsNotEmpty()
  plannedRoute: any;

  @ApiProperty({ description: '作业区域 GeoJSON Polygon', required: false })
  @IsObject()
  @IsOptional()
  operationArea?: any;

  @ApiProperty({ description: '飞行目的', required: false })
  @IsString()
  @IsOptional()
  purpose?: string;
}

export class UpdateFlightPlanDto extends CreateFlightPlanDto {
  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  status?: FlightPlanStatus;
}

export class ReviewDto {
  @ApiProperty({ description: '审批意见' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({ description: '驳回原因（驳回时必填）', required: false })
  @IsString()
  @IsOptional()
  rejectReason?: string;
}
