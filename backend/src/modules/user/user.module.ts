import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './user.entity';
import { UserRole } from '../../common/enums';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService, UserModuleInitializer],
  exports: [UserService],
})
export class UserModule {}

class UserModuleInitializer implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    const count = await this.userRepository.count();
    if (count === 0) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      const seedUsers = [
        { username: 'admin', name: '系统管理员', role: UserRole.ADMIN, password: hashedPassword, company: '系统' },
        { username: 'operator', name: '运营人员', role: UserRole.OPERATOR, password: hashedPassword, company: 'XX无人机运营公司' },
        { username: 'airtraffic', name: '空管人员', role: UserRole.AIR_TRAFFIC, password: hashedPassword, company: '民航局' },
        { username: 'police', name: '公安人员', role: UserRole.POLICE, password: hashedPassword, company: '公安局' },
      ];
      await this.userRepository.save(seedUsers);
      console.log('✅ 测试用户已初始化: admin/operator/airtraffic/police 密码: 123456');
    }
  }
}
