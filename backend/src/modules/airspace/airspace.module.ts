import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AirspaceController } from './airspace.controller';
import { AirspaceService } from './airspace.service';
import { Airspace } from './airspace.entity';
import { AirspaceType, RiskLevel } from '../../common/enums';

@Module({
  imports: [TypeOrmModule.forFeature([Airspace])],
  controllers: [AirspaceController],
  providers: [AirspaceService, AirspaceSeeder],
  exports: [AirspaceService],
})
export class AirspaceModule {}

class AirspaceSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Airspace)
    private airspaceRepository: Repository<Airspace>,
  ) {}

  async onModuleInit() {
    const count = await this.airspaceRepository.count();
    if (count === 0) {
      const seedAirspaces = [
        {
          name: '天安门禁飞区',
          type: AirspaceType.NO_FLY,
          riskLevel: RiskLevel.CRITICAL,
          minAltitude: 0,
          maxAltitude: 1000,
          reason: '政治敏感区域',
          isActive: true,
          geom: {
            type: 'Polygon',
            coordinates: [[
              [116.385, 39.905],
              [116.405, 39.905],
              [116.405, 39.925],
              [116.385, 39.925],
              [116.385, 39.905],
            ]],
          },
        },
        {
          name: '首都机场周边',
          type: AirspaceType.RESTRICTED,
          riskLevel: RiskLevel.HIGH,
          minAltitude: 0,
          maxAltitude: 2000,
          reason: '机场净空保护区',
          isActive: true,
          geom: {
            type: 'Polygon',
            coordinates: [[
              [116.55, 40.05],
              [116.65, 40.05],
              [116.65, 40.15],
              [116.55, 40.15],
              [116.55, 40.05],
            ]],
          },
        },
        {
          name: '军事管理区',
          type: AirspaceType.NO_FLY,
          riskLevel: RiskLevel.CRITICAL,
          minAltitude: 0,
          maxAltitude: 500,
          reason: '军事禁区',
          isActive: true,
          geom: {
            type: 'Polygon',
            coordinates: [[
              [116.30, 39.95],
              [116.35, 39.95],
              [116.35, 40.00],
              [116.30, 40.00],
              [116.30, 39.95],
            ]],
          },
        },
      ];
      await this.airspaceRepository.save(seedAirspaces as any);
      console.log('✅ 示例空域数据已初始化');
    }
  }
}
