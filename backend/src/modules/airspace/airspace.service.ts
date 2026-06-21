import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cache } from 'cache-manager';
import { Airspace } from './airspace.entity';
import { CreateAirspaceDto, UpdateAirspaceDto, CheckConflictDto } from './dto/airspace.dto';
import { AirspaceType } from '../../common/enums';

const NO_FLY_CACHE_KEY = 'airspace:no_fly_zones';
const CACHE_TTL = 600;

@Injectable()
export class AirspaceService {
  constructor(
    @InjectRepository(Airspace)
    private airspaceRepository: Repository<Airspace>,
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateAirspaceDto): Promise<Airspace> {
    const airspace = this.airspaceRepository.create(dto);
    const saved = await this.airspaceRepository.save(airspace);
    await this.invalidateNoFlyCache();
    return saved;
  }

  async findAll(type?: AirspaceType, activeOnly = true): Promise<Airspace[]> {
    const where: any = {};
    if (type) where.type = type;
    if (activeOnly) where.isActive = true;
    return this.airspaceRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Airspace> {
    const airspace = await this.airspaceRepository.findOne({ where: { id } });
    if (!airspace) {
      throw new NotFoundException('空域不存在');
    }
    return airspace;
  }

  async update(id: string, dto: UpdateAirspaceDto): Promise<Airspace> {
    const airspace = await this.findOne(id);
    Object.assign(airspace, dto);
    const saved = await this.airspaceRepository.save(airspace);
    await this.invalidateNoFlyCache();
    return saved;
  }

  async remove(id: string): Promise<void> {
    const airspace = await this.findOne(id);
    await this.airspaceRepository.remove(airspace);
    await this.invalidateNoFlyCache();
  }

  async getNoFlyZones(): Promise<Airspace[]> {
    const cached = await this.cacheManager.get<Airspace[]>(NO_FLY_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const zones = await this.airspaceRepository.find({
      where: {
        type: AirspaceType.NO_FLY,
        isActive: true,
      },
    });

    await this.cacheManager.set(NO_FLY_CACHE_KEY, zones, CACHE_TTL);
    return zones;
  }

  async checkConflict(dto: CheckConflictDto): Promise<{ hasConflict: boolean; conflicts: Airspace[] }> {
    try {
      const routeGeoJson = JSON.stringify(dto.route);

      const conflicts = await this.airspaceRepository
        .createQueryBuilder('airspace')
        .where('airspace.type = :type', { type: AirspaceType.NO_FLY })
        .andWhere('airspace.isActive = true')
        .andWhere(
          'ST_Intersects(airspace.geom, ST_SetSRID(ST_GeomFromGeoJSON(:routeGeoJson), 4326))',
          { routeGeoJson },
        )
        .getMany();

      return {
        hasConflict: conflicts.length > 0,
        conflicts,
      };
    } catch (error) {
      throw new BadRequestException('航线数据格式错误，必须是合法的GeoJSON LineString');
    }
  }

  async checkPointInNoFlyZone(lng: number, lat: number): Promise<{ inNoFly: boolean; zones: Airspace[] }> {
    const zones = await this.airspaceRepository
      .createQueryBuilder('airspace')
      .where('airspace.type = :type', { type: AirspaceType.NO_FLY })
      .andWhere('airspace.isActive = true')
      .andWhere(
        'ST_Contains(airspace.geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))',
        { lng, lat },
      )
      .getMany();

    return {
      inNoFly: zones.length > 0,
      zones,
    };
  }

  private async invalidateNoFlyCache(): Promise<void> {
    await this.cacheManager.del(NO_FLY_CACHE_KEY);
  }
}
