<template>
  <div class="map-view">
    <el-card class="map-card">
      <template #header>
        <div class="card-header">
          <span>空域地图 - 禁飞区、限飞区与大型活动</span>
          <div class="controls">
            <el-checkbox v-model="showNoFly" label="禁飞区" />
            <el-checkbox v-model="showRestricted" label="限飞区" />
            <el-checkbox v-model="showEvents" label="大型活动" />
            <el-checkbox v-model="showRoutes" label="已批准计划" />
          </div>
        </div>
      </template>
      <div style="height: 70vh">
        <OpenLayersMap
          ref="mapRef"
          :layers="mapLayers"
          :show-legend="true"
          :legend-items="legendItems"
          :center="mapCenter"
          :zoom="11"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import OpenLayersMap from '@/components/OpenLayersMap.vue';
import { airspaceApi } from '@/api/airspace';
import { riskApi } from '@/api/risk';
import { flightPlanApi } from '@/api/flight-plan';
import { Style, Fill, Stroke } from 'ol/style';

const mapRef = ref();
const showNoFly = ref(true);
const showRestricted = ref(true);
const showEvents = ref(true);
const showRoutes = ref(true);
const mapCenter = ref([116.4074, 39.9042]);

const noFlyZones = ref<any[]>([]);
const restrictedZones = ref<any[]>([]);
const largeEvents = ref<any[]>([]);
const approvedPlans = ref<any[]>([]);

const mapLayers = computed(() => {
  const layers: any[] = [];

  if (showNoFly.value) {
    noFlyZones.value.forEach((zone) => {
      layers.push({
        id: `nofly-${zone.id}`,
        type: 'geojson' as const,
        data: zone.geom,
        style: new Style({
          fill: new Fill({ color: 'rgba(239, 68, 68, 0.3)' }),
          stroke: new Stroke({ color: '#dc2626', width: 2 }),
        }),
        label: zone.name,
      });
    });
  }

  if (showRestricted.value) {
    restrictedZones.value.forEach((zone) => {
      layers.push({
        id: `restricted-${zone.id}`,
        type: 'geojson' as const,
        data: zone.geom,
        style: new Style({
          fill: new Fill({ color: 'rgba(245, 158, 11, 0.25)' }),
          stroke: new Stroke({ color: '#f59e0b', width: 2 }),
        }),
        label: zone.name,
      });
    });
  }

  if (showEvents.value) {
    largeEvents.value.forEach((evt) => {
      layers.push({
        id: `event-${evt.id}`,
        type: 'geojson' as const,
        data: evt.area,
        style: new Style({
          fill: new Fill({ color: 'rgba(168, 85, 247, 0.25)' }),
          stroke: new Stroke({ color: '#a855f7', width: 2, lineDash: [8, 4] }),
        }),
        label: evt.name,
      });
    });
  }

  if (showRoutes.value) {
    approvedPlans.value.forEach((plan) => {
      if (plan.plannedRoute) {
        layers.push({
          id: `plan-${plan.id}`,
          type: 'geojson' as const,
          data: plan.plannedRoute,
          style: new Style({
            stroke: new Stroke({ color: '#10b981', width: 3 }),
          }),
        });
      }
    });
  }

  return layers;
});

const legendItems = [
  { label: '禁飞区', color: 'rgba(239, 68, 68, 0.5)' },
  { label: '限飞区', color: 'rgba(245, 158, 11, 0.45)' },
  { label: '大型活动', color: 'rgba(168, 85, 247, 0.45)' },
  { label: '已批准航线', color: '#10b981' },
];

onMounted(async () => {
  try {
    const [noFly, restricted, events, plans]: any = await Promise.all([
      airspaceApi.list('no_fly'),
      airspaceApi.list('restricted'),
      riskApi.listLargeEvents(),
      flightPlanApi.list('approved'),
    ]);
    noFlyZones.value = noFly;
    restrictedZones.value = restricted;
    largeEvents.value = events;
    approvedPlans.value = plans;
  } catch (e) {
    console.error('加载地图数据失败', e);
  }
});
</script>

<style scoped lang="scss">
.map-view {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .controls {
      display: flex;
      gap: 16px;
    }
  }
}
</style>
