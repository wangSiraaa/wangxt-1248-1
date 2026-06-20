import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import type { RedisClientOptions } from 'redis';

import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AirspaceModule } from './modules/airspace/airspace.module';
import { FlightPlanModule } from './modules/flight-plan/flight-plan.module';
import { RiskAssessmentModule } from './modules/risk-assessment/risk-assessment.module';
import { ReportModule } from './modules/report/report.module';
import { TrajectoryModule } from './modules/trajectory/trajectory.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: false,
      }),
    }),
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
          password: configService.get('REDIS_PASSWORD') || undefined,
        }),
        ttl: 300,
      }),
    }),
    AuthModule,
    UserModule,
    AirspaceModule,
    FlightPlanModule,
    RiskAssessmentModule,
    ReportModule,
    TrajectoryModule,
  ],
})
export class AppModule {}
