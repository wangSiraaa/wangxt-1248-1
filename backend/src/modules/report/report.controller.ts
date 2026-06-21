import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportService } from './report.service';
import {
  TakeoffReportDto,
  LandingReportDto,
  OperationResultDto,
} from './dto/report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportStatus, UserRole } from '../../common/enums';

@ApiTags('现场报备')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get()
  @ApiOperation({ summary: '获取报备列表' })
  @ApiQuery({ name: 'status', required: false, enum: ReportStatus })
  async findAll(
    @Query('status') status?: ReportStatus,
    @CurrentUser() user?: any,
  ) {
    return this.reportService.findAll(user.id, user.role, status);
  }

  @Get('pending/list')
  @ApiOperation({ summary: '获取待报备清单（运营公司起飞前提醒 / 公安未报备监控）' })
  async findPendingList(@CurrentUser() user: any) {
    return this.reportService.findPendingList(user.id, user.role);
  }

  @Get(':flightPlanId')
  @ApiOperation({ summary: '获取飞行计划的报备信息' })
  async findByFlightPlan(
    @Param('flightPlanId') flightPlanId: string,
    @CurrentUser() user: any,
  ) {
    return this.reportService.findByFlightPlan(flightPlanId, user.id, user.role);
  }

  @Post(':flightPlanId/takeoff')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: '起飞报备' })
  async takeoff(
    @Param('flightPlanId') flightPlanId: string,
    @Body() dto: TakeoffReportDto,
    @CurrentUser() user: any,
  ) {
    return this.reportService.takeoff(flightPlanId, dto, user.id, user.role);
  }

  @Post(':flightPlanId/landing')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: '降落报备' })
  async landing(
    @Param('flightPlanId') flightPlanId: string,
    @Body() dto: LandingReportDto,
    @CurrentUser() user: any,
  ) {
    return this.reportService.landing(flightPlanId, dto, user.id, user.role);
  }

  @Post(':flightPlanId/operation-result')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: '上传作业结果（需先完成起飞报备）' })
  async uploadOperationResult(
    @Param('flightPlanId') flightPlanId: string,
    @Body() dto: OperationResultDto,
    @CurrentUser() user: any,
  ) {
    return this.reportService.uploadOperationResult(flightPlanId, dto, user.id, user.role);
  }
}
