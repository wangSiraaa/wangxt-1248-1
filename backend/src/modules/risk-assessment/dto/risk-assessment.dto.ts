import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsObject, IsDateString } from 'class-validator';
import { RiskLevel } from '../../common/enums';

export class CreateLargeEventDto {
  @ApiProperty({ description: '活动名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '活动描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '风险等级', enum: RiskLevel })
  @IsEnum(RiskLevel)
  @IsOptional()
  riskLevel?: RiskLevel;

  @ApiProperty({ description: '活动区域 GeoJSON Polygon' })
  @IsObject()
  @IsNotEmpty()
  area: any;

  @ApiProperty({ description: '缓冲区半径(米)', default: 500 })
  @IsNumber()
  @IsOptional()
  bufferRadius?: number;

  @ApiProperty({ description: '开始时间' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: '结束时间' })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ description: '主办方', required: false })
  @IsString()
  @IsOptional()
  organizer?: string;
}

export class AssessRiskDto {
  @ApiProperty({ description: '总体风险等级', enum: RiskLevel })
  @IsEnum(RiskLevel)
  overallRisk: RiskLevel;

  @ApiProperty({ description: '建议', required: false })
  @IsString()
  @IsOptional()
  suggestion?: string;
}
