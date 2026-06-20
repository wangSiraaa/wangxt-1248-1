import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsObject, IsDateString, IsArray } from 'class-validator';

export class UploadTrajectoryDto {
  @ApiProperty({ description: '实际飞行航线 GeoJSON LineString' })
  @IsObject()
  @IsNotEmpty()
  actualRoute: any;

  @ApiProperty({ description: '轨迹点数据', type: [Object], required: false })
  @IsArray()
  @IsOptional()
  trackData?: any[];

  @ApiProperty({ description: '飞行开始时间' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: '飞行结束时间' })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ description: '偏离阈值(米)，默认200米', required: false })
  @IsNumber()
  @IsOptional()
  deviationThreshold?: number;
}

export class ReviewTrajectoryDto {
  @ApiProperty({ description: '复核意见' })
  @IsString()
  @IsOptional()
  reviewComment?: string;
}
