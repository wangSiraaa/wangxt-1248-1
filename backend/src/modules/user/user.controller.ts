import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('用户')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AIR_TRAFFIC, UserRole.POLICE)
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  async findAll(@Query('role') role?: UserRole) {
    return this.userService.findAll(role);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取用户详情' })
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}
