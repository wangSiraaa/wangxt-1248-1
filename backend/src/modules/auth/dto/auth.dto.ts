import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums';

export class LoginDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: '姓名' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '角色', enum: UserRole })
  @IsString()
  role: UserRole;

  @ApiProperty({ description: '公司', required: false })
  company?: string;

  @ApiProperty({ description: '电话', required: false })
  phone?: string;
}
