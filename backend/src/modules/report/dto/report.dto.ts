import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsObject, IsDateString, IsArray } from 'class-validator';

export class TakeoffReportDto {
  @ApiProperty({ description: '起飞时间（默认当前时间）', required: false })
  @IsDateString()
  @IsOptional()
  takeoffTime?: string;

  @ApiProperty({ description: '起飞点纬度' })
  @IsNumber()
  @IsNotEmpty()
  takeoffLat: number;

  @ApiProperty({ description: '起飞点经度' })
  @IsNumber()
  @IsNotEmpty()
  takeoffLng: number;

  @ApiProperty({ description: '起飞高度(米)', required: false })
  @IsNumber()
  @IsOptional()
  takeoffAltitude?: number;

  @ApiProperty({ description: '起飞备注', required: false })
  @IsString()
  @IsOptional()
  takeoffRemark?: string;
}

export class LandingReportDto {
  @ApiProperty({ description: '降落时间（默认当前时间）', required: false })
  @IsDateString()
  @IsOptional()
  landingTime?: string;

  @ApiProperty({ description: '降落点纬度' })
  @IsNumber()
  @IsNotEmpty()
  landingLat: number;

  @ApiProperty({ description: '降落点经度' })
  @IsNumber()
  @IsNotEmpty()
  landingLng: number;

  @ApiProperty({ description: '降落高度(米)', required: false })
  @IsNumber()
  @IsOptional()
  landingAltitude?: number;

  @ApiProperty({ description: '实际飞行时长(分钟)', required: false })
  @IsNumber()
  @IsOptional()
  actualFlightDuration?: number;

  @ApiProperty({ description: '实际飞行距离(公里)', required: false })
  @IsNumber()
  @IsOptional()
  actualDistance?: number;

  @ApiProperty({ description: '降落备注', required: false })
  @IsString()
  @IsOptional()
  landingRemark?: string;
}

export class OperationResultDto {
  @ApiProperty({ description: '作业结果备注' })
  @IsString()
  @IsOptional()
  operationResultRemark?: string;

  @ApiProperty({ description: '作业附件列表', type: [Object], required: false })
  @IsArray()
  @IsOptional()
  operationFiles?: any[];
}
