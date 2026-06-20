<template>
  <div class="trajectory-detail" v-loading="loading">
    <el-row :gutter="20" v-if="detail">
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>轨迹详情 - {{ detail.flightPlan?.planNo }}</span>
              <el-tag :type="statusTag(detail.status)" size="large">
                {{ statusLabel(detail.status) }}
              </el-tag>
            </div>
          </template>

          <el-descriptions :column="2" border>
            <el-descriptions-item label="飞行计划">
              {{ detail.flightPlan?.title || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="飞行时段">
              {{ formatTime(detail.startTime) }} ~ {{ formatTime(detail.endTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="平均偏离距离">
              <span :style="{ color: detail.deviationDistance > 200 ? '#ef4444' : '' }">
                {{ Number(detail.deviationDistance).toFixed(2) }} 米
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="最大偏离距离">
              <span :style="{ color: detail.maxDeviation > 200 ? '#ef4444' : '#10b981', fontWeight: 'bold' }">
                {{ Number(detail.maxDeviation).toFixed(2) }} 米
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="是否偏离">
              <el-tag :type="detail.hasDeviation ? 'danger' : 'success'">
                {{ detail.hasDeviation ? '是（超过阈值）' : '否' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="偏离阈值">200 米</el-descriptions-item>
          </el-descriptions>

          <el-divider v-if="detail.deviationDetails?.length" content-position="left">
            偏离点 TOP {{ detail.deviationDetails.length }}
          </el-divider>
          <el-table v-if="detail.deviationDetails?.length" :data="detail.deviationDetails" size="small" max-height="220">
            <el-table-column prop="idx" label="序号" width="70" />
            <el-table-column label="经度">
              <template #default="{ row }">{{ Number(row.lng).toFixed(6) }}</template>
            </el-table-column>
            <el-table-column label="纬度">
              <template #default="{ row }">{{ Number(row.lat).toFixed(6) }}</template>
            </el-table-column>
            <el-table-column label="偏离距离(米)">
              <template #default="{ row }">
                <span style="color: #ef4444; font-weight: bold">{{ Number(row.distance).toFixed(1) }}</span>
              </template>
            </el-table-column>
          </el-table>

          <el-divider v-if="detail.reviewedAt" />
          <el-descriptions v-if="detail.reviewedAt" :column="2" border size="small" title="复核信息">
            <el-descriptions-item label="复核时间">{{ formatTime(detail.reviewedAt) }}</el-descriptions-item>
            <el-descriptions-item label="复核结果">{{ detail.status === 'review_passed' ? '通过' : '驳回' }}</el-descriptions-item>
            <el-descriptions-item label="复核意见" :span="2">{{ detail.reviewComment || '-' }}</el-descriptions-item>
          </el-descriptions>

          <el-divider v-if="detail.archivedAt" />
          <el-descriptions v-if="detail.archivedAt" :column="2" border size="small" title="归档信息">
            <el-descriptions-item label="归档时间">{{ formatTime(detail.archivedAt) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card>
          <template #header>轨迹对比地图</template>
          <div style="height: 550px">
            <OpenLayersMap
              :layers="mapLayers"
              :center="mapCenter"
              :zoom="13"
              :show-legend="true"
              :legend-items="legendItems"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import dayjs from 'dayjs';
import OpenLayersMap from '@/components/OpenLayersMap.vue';
import { trajectoryApi } from '@/api/trajectory';
import { airspaceApi } from '@/api/airspace';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';

const route = useRoute();
const loading = ref(false);
const detail = ref<any>(null);
const noFlyZones = ref<any[]>([]);
const mapCenter = ref([116.4074, 39.9042]);

const mapLayers = computed(() => {
  const layers: any[] = [];

  noFlyZones.value.forEach((zone) => {
    layers.push({
      id: `nofly-${zone.id}`,
      type: 'geojson' as const,
      data: zone.geom,
      style: new Style({
        fill: new Fill({ color: 'rgba(239, 68, 68, 0.15)' }),
        stroke: new Stroke({ color: '#dc2626', width: 1 }),
      }),
    });
  });

  if (detail.value?.flightPlan?.plannedRoute) {
    layers.push({
      id: 'planned',
      type: 'geojson' as const,
      data: detail.value.flightPlan.plannedRoute,
      style: new Style({
        stroke: new Stroke({ color: '#3b82f6', width: 3, lineDash: [8, 4] }),
      }),
    });
  }

  if (detail.value?.actualRoute) {
    layers.push({
      id: 'actual',
      type: 'geojson' as const,
      data: detail.value.actualRoute,
      style: new Style({
        stroke: new Stroke({ color: detail.value.hasDeviation ? '#ef4444' : '#10b981', width: 4 }),
      }),
    });
  }

  if (detail.value?.deviationDetails) {
    detail.value.deviationDetails.forEach((p: any, idx: number) => {
      if (idx < 5) {
        layers.push({
          id: `dev-${idx}`,
          type: 'point' as const,
          data: [p.lng, p.lat],
          style: new Style({
            image: new CircleStyle({
              radius: 8,
              fill: new Fill({ color: '#ef4444' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
            }),
          }),
        });
      }
    });
  }

  return layers;
});

const legendItems = [
  { label: '禁飞区', color: 'rgba(239, 68, 68, 0.3)' },
  { label: '计划航线', color: '#3b82f6' },
  { label: '实际轨迹', color: detail.value?.hasDeviation ? '#ef4444' : '#10b981' },
  { label: '偏离点', color: '#ef4444' },
];

function formatTime(t: string) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-';
}

function statusTag(s: string) {
  const map: Record<string, string> = {
    normal: 'success', deviated: 'danger', reviewing: 'warning',
    review_passed: '', review_rejected: 'danger', archived: 'info',
  };
  return (map[s] || '') as any;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    normal: '正常', deviated: '已偏离', reviewing: '复核中',
    review_passed: '复核通过', review_rejected: '复核驳回', archived: '已归档',
  };
  return map[s] || s;
}

onMounted(async () => {
  loading.value = true;
  try {
    const id = route.params.id as string;
    detail.value = await trajectoryApi.detail(id);
    noFlyZones.value = (await airspaceApi.noFlyZones()) as any;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
