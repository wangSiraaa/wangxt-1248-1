import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AirspaceService } from './airspace.service';
import { CreateAirspaceDto, UpdateAirspaceDto, CheckConflictDto } from './dto/airspace.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AirspaceType, UserRole } from '../../common/enums';

@ApiTags('空域管理')
@Controller('airspaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AirspaceController {
  constructor(private airspaceService: AirspaceService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.AIR_TRAFFIC)
  @ApiOperation({ summary: '创建空域（禁飞区等）' })
  async create(@Body() dto: CreateAirspaceDto) {
    return this.airspaceService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取空域列表' })
  @ApiQuery({ name: 'type', required: false, enum: AirspaceType })
  async findAll(@Query('type') type?: AirspaceType) {
    return this.airspaceService.findAll(type);
  }

  @Get('no-fly')
  @ApiOperation({ summary: '获取所有禁飞区（Redis缓存）' })
  async getNoFlyZones() {
    return this.airspaceService.getNoFlyZones();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取空域详情' })
  async findOne(@Param('id') id: string) {
    return this.airspaceService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.AIR_TRAFFIC)
  @ApiOperation({ summary: '更新空域' })
  async update(@Param('id') id: string, @Body() dto: UpdateAirspaceDto) {
    return this.airspaceService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.AIR_TRAFFIC)
  @ApiOperation({ summary: '删除空域' })
  async remove(@Param('id') id: string) {
    await this.airspaceService.remove(id);
    return { message: '删除成功' };
  }

  @Post('check-conflict')
  @ApiOperation({ summary: '检查航线与禁飞区冲突' })
  async checkConflict(@Body() dto: CheckConflictDto) {
    return this.airspaceService.checkConflict(dto);
  }

  @Get('point/check')
  @ApiOperation({ summary: '检查点是否在禁飞区内' })
  async checkPoint(
    @Query('lng') lng: number,
    @Query('lat') lat: number,
  ) {
    return this.airspaceService.checkPointInNoFlyZone(lng, lat);
  }
}
