import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsObject } from 'class-validator';
import { AirspaceType, RiskLevel } from '../../common/enums';

export class CreateAirspaceDto {
  @ApiProperty({ description: '空域名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '空域类型', enum: AirspaceType })
  @IsEnum(AirspaceType)
  type: AirspaceType;

  @ApiProperty({ description: '风险等级', enum: RiskLevel })
  @IsEnum(RiskLevel)
  @IsOptional()
  riskLevel?: RiskLevel;

  @ApiProperty({ description: 'GeoJSON Polygon格式的几何' })
  @IsObject()
  @IsNotEmpty()
  geom: any;

  @ApiProperty({ description: '最低高度(米)' })
  @IsNumber()
  @IsOptional()
  minAltitude?: number;

  @ApiProperty({ description: '最高高度(米)' })
  @IsNumber()
  @IsOptional()
  maxAltitude?: number;

  @ApiProperty({ description: '生效开始时间', required: false })
  @IsOptional()
  effectiveFrom?: Date;

  @ApiProperty({ description: '生效结束时间', required: false })
  @IsOptional()
  effectiveTo?: Date;

  @ApiProperty({ description: '限制原因', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateAirspaceDto extends CreateAirspaceDto {
  @ApiProperty({ description: '是否启用' })
  @IsOptional()
  isActive?: boolean;
}

export class CheckConflictDto {
  @ApiProperty({ description: 'GeoJSON LineString格式的航线' })
  @IsObject()
  @IsNotEmpty()
  route: any;

  @ApiProperty({ description: '飞行高度', required: false })
  @IsNumber()
  @IsOptional()
  altitude?: number;
}
