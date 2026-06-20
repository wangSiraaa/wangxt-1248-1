import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TrajectoryService } from './trajectory.service';
import { UploadTrajectoryDto, ReviewTrajectoryDto } from './dto/trajectory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TrajectoryStatus, UserRole } from '../../common/enums';

@ApiTags('轨迹归档')
@Controller('trajectories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrajectoryController {
  constructor(private trajectoryService: TrajectoryService) {}

  @Post('flight-plan/:flightPlanId')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: '上传飞行轨迹（自动检测偏离）' })
  async upload(
    @Param('flightPlanId') flightPlanId: string,
    @Body() dto: UploadTrajectoryDto,
    @CurrentUser() user: any,
  ) {
    return this.trajectoryService.upload(flightPlanId, dto, user.id, user.role);
  }

  @Get()
  @ApiOperation({ summary: '获取轨迹列表' })
  @ApiQuery({ name: 'flightPlanId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TrajectoryStatus })
  async findAll(
    @Query('flightPlanId') flightPlanId?: string,
    @Query('status') status?: TrajectoryStatus,
    @CurrentUser() user?: any,
  ) {
    return this.trajectoryService.findAll(user.id, user.role, flightPlanId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取轨迹详情' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.trajectoryService.findOne(id, user.id, user.role);
  }

  @Post(':id/start-review')
  @Roles(UserRole.AIR_TRAFFIC, UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: '发起轨迹复核' })
  async startReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.trajectoryService.startReview(id, user.id, user.role);
  }

  @Post(':id/review-approve')
  @Roles(UserRole.AIR_TRAFFIC, UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: '复核通过' })
  async reviewApprove(
    @Param('id') id: string,
    @Body() dto: ReviewTrajectoryDto,
    @CurrentUser() user: any,
  ) {
    return this.trajectoryService.review(id, true, dto, user.id, user.role);
  }

  @Post(':id/review-reject')
  @Roles(UserRole.AIR_TRAFFIC, UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: '复核驳回' })
  async reviewReject(
    @Param('id') id: string,
    @Body() dto: ReviewTrajectoryDto,
    @CurrentUser() user: any,
  ) {
    return this.trajectoryService.review(id, false, dto, user.id, user.role);
  }

  @Post(':id/archive')
  @Roles(UserRole.AIR_TRAFFIC, UserRole.ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: '归档轨迹' })
  async archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.trajectoryService.archive(id, user.id, user.role);
  }
}
