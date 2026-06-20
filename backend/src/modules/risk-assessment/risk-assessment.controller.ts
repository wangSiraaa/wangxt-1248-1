import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RiskAssessmentService } from './risk-assessment.service';
import { CreateLargeEventDto, AssessRiskDto } from './dto/risk-assessment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('风险评估')
@Controller('risk-assessments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RiskAssessmentController {
  constructor(private riskAssessmentService: RiskAssessmentService) {}

  @Post('large-events')
  @Roles(UserRole.POLICE, UserRole.ADMIN)
  @ApiOperation({ summary: '创建大型活动' })
  async createLargeEvent(@Body() dto: CreateLargeEventDto) {
    return this.riskAssessmentService.createLargeEvent(dto);
  }

  @Get('large-events')
  @ApiOperation({ summary: '获取大型活动列表' })
  async findAllLargeEvents(@Query('activeOnly') activeOnly: string = 'true') {
    return this.riskAssessmentService.findAllLargeEvents(activeOnly !== 'false');
  }

  @Get('large-events/:id')
  @ApiOperation({ summary: '获取大型活动详情' })
  async findLargeEvent(@Param('id') id: string) {
    return this.riskAssessmentService.findLargeEvent(id);
  }

  @Put('large-events/:id')
  @Roles(UserRole.POLICE, UserRole.ADMIN)
  @ApiOperation({ summary: '更新大型活动' })
  async updateLargeEvent(@Param('id') id: string, @Body() dto: Partial<CreateLargeEventDto>) {
    return this.riskAssessmentService.updateLargeEvent(id, dto);
  }

  @Delete('large-events/:id')
  @Roles(UserRole.POLICE, UserRole.ADMIN)
  @ApiOperation({ summary: '删除大型活动' })
  async removeLargeEvent(@Param('id') id: string) {
    await this.riskAssessmentService.removeLargeEvent(id);
    return { message: '删除成功' };
  }

  @Get('large-events/conflict/:flightPlanId')
  @ApiOperation({ summary: '检查飞行计划与大型活动冲突' })
  async checkLargeEventConflict(@Param('flightPlanId') flightPlanId: string) {
    return this.riskAssessmentService.checkLargeEventConflict(flightPlanId);
  }

  @Get(':flightPlanId')
  @ApiOperation({ summary: '获取飞行计划风险评估（自动生成）' })
  async getAssessment(@Param('flightPlanId') flightPlanId: string, @CurrentUser() user: any) {
    return this.riskAssessmentService.getOrCreateAssessment(flightPlanId, user.id);
  }

  @Post(':flightPlanId')
  @Roles(UserRole.POLICE, UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: '人工进行风险评估' })
  async assess(
    @Param('flightPlanId') flightPlanId: string,
    @Body() dto: AssessRiskDto,
    @CurrentUser() user: any,
  ) {
    return this.riskAssessmentService.assessFlightPlan(flightPlanId, dto, user.id);
  }
}
