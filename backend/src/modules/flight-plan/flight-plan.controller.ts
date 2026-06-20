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
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FlightPlanService } from './flight-plan.service';
import {
  CreateFlightPlanDto,
  UpdateFlightPlanDto,
  ReviewDto,
} from './dto/flight-plan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FlightPlanStatus, UserRole } from '../../common/enums';

@ApiTags('飞行计划')
@Controller('flight-plans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FlightPlanController {
  constructor(private flightPlanService: FlightPlanService) {}

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: '创建飞行计划（草稿）' })
  async create(
    @Body() dto: CreateFlightPlanDto,
    @CurrentUser() user: any,
  ) {
    return this.flightPlanService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取飞行计划列表' })
  @ApiQuery({ name: 'status', required: false, enum: FlightPlanStatus })
  async findAll(
    @Query('status') status?: FlightPlanStatus,
    @CurrentUser() user?: any,
  ) {
    return this.flightPlanService.findAll(user.id, user.role, status);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取飞行计划详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.flightPlanService.findOne(id, user.id, user.role);
  }

  @Put(':id')
  @Roles(UserRole.OPERATOR)
  @ApiOperation({ summary: '更新飞行计划（仅草稿）' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFlightPlanDto,
    @CurrentUser() user: any,
  ) {
    return this.flightPlanService.update(id, dto, user.id);
  }

  @Post(':id/submit')
  @Roles(UserRole.OPERATOR)
  @HttpCode(200)
  @ApiOperation({ summary: '提交审批（自动检查禁飞区）' })
  async submit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.flightPlanService.submit(id, user.id);
  }

  @Post(':id/air-traffic/approve')
  @Roles(UserRole.AIR_TRAFFIC, UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: '空管审批通过' })
  async airTrafficApprove(
    @Param('id') id: string,
    @Body() dto: ReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.flightPlanService.airTrafficReview(id, true, dto, user.id);
  }

  @Post(':id/air-traffic/reject')
  @Roles(UserRole.AIR_TRAFFIC, UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: '空管审批驳回' })
  async airTrafficReject(
    @Param('id') id: string,
    @Body() dto: ReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.flightPlanService.airTrafficReview(id, false, dto, user.id);
  }

  @Post(':id/police/approve')
  @Roles(UserRole.POLICE, UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: '公安风险评估通过' })
  async policeApprove(
    @Param('id') id: string,
    @Body() dto: ReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.flightPlanService.policeReview(id, true, dto, user.id);
  }

  @Post(':id/police/reject')
  @Roles(UserRole.POLICE, UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: '公安风险评估驳回' })
  async policeReject(
    @Param('id') id: string,
    @Body() dto: ReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.flightPlanService.policeReview(id, false, dto, user.id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.OPERATOR)
  @HttpCode(200)
  @ApiOperation({ summary: '取消飞行计划' })
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.flightPlanService.cancel(id, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.OPERATOR)
  @ApiOperation({ summary: '删除飞行计划（仅草稿/驳回）' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.flightPlanService.remove(id, user.id);
    return { message: '删除成功' };
  }
}
