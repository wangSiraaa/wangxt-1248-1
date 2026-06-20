<template>
  <div class="flight-plan-detail" v-loading="loading">
    <el-row :gutter="20" v-if="detail">
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>飞行计划详情</span>
              <div>
                <el-tag :type="statusTag(detail.status)" size="large">
                  {{ statusLabel(detail.status) }}
                </el-tag>
              </div>
            </div>
          </template>

          <el-descriptions :column="2" border>
            <el-descriptions-item label="计划编号">{{ detail.planNo }}</el-descriptions-item>
            <el-descriptions-item label="标题">{{ detail.title }}</el-descriptions-item>
            <el-descriptions-item label="申请人">{{ detail.applicant?.name }}</el-descriptions-item>
            <el-descriptions-item label="公司">{{ detail.applicant?.company }}</el-descriptions-item>
            <el-descriptions-item label="无人机型号">{{ detail.uavModel }}</el-descriptions-item>
            <el-descriptions-item label="序列号">{{ detail.uavSn }}</el-descriptions-item>
            <el-descriptions-item label="飞行员">{{ detail.pilotName }}</el-descriptions-item>
            <el-descriptions-item label="执照号">{{ detail.pilotLicense }}</el-descriptions-item>
            <el-descriptions-item label="最大高度">{{ detail.maxAltitude }} 米</el-descriptions-item>
            <el-descriptions-item label="最大速度">{{ detail.maxSpeed }} km/h</el-descriptions-item>
            <el-descriptions-item label="计划起飞">{{ formatTime(detail.plannedStartTime) }}</el-descriptions-item>
            <el-descriptions-item label="计划降落">{{ formatTime(detail.plannedEndTime) }}</el-descriptions-item>
            <el-descriptions-item label="飞行目的" :span="2">{{ detail.purpose || '-' }}</el-descriptions-item>
          </el-descriptions>

          <el-divider />

          <el-row :gutter="12" class="action-row">
            <el-col v-if="detail.status === 'draft' && (userStore.isOperator || userStore.isAdmin)">
              <el-button type="success" @click="handleSubmit">提交审批</el-button>
            </el-col>
            <el-col v-if="detail.status === 'submitted' && (userStore.isAirTraffic || userStore.isAdmin)">
              <el-button type="success" @click="handleAirTrafficApprove">空管通过</el-button>
              <el-button type="danger" @click="handleAirTrafficReject">空管驳回</el-button>
            </el-col>
            <el-col v-if="detail.status === 'police_review' && (userStore.isPolice || userStore.isAdmin)">
              <el-button type="success" @click="handlePoliceApprove">公安通过</el-button>
              <el-button type="danger" @click="handlePoliceReject">公安驳回</el-button>
            </el-col>
            <el-col v-if="detail.status === 'approved'">
              <el-button type="primary" @click="$router.push(`/reports?planId=${detail.id}`)">
                前往报备
              </el-button>
              <el-button type="warning" @click="$router.push(`/trajectories?planId=${detail.id}`)">
                上传轨迹
              </el-button>
            </el-col>
            <el-col v-if="['draft', 'submitted', 'approved'].includes(detail.status) && (userStore.isOperator || userStore.isAdmin)">
              <el-button @click="handleCancel">取消计划</el-button>
            </el-col>
          </el-row>

          <el-divider v-if="detail.noFlyZoneConflicts?.length" />
          <el-alert
            v-if="detail.noFlyZoneConflicts?.length"
            :title="`穿越 ${detail.noFlyZoneConflicts.length} 个禁飞区`"
            type="error"
            :closable="false"
          >
            <div v-for="c in detail.noFlyZoneConflicts" :key="c.id">
              - {{ c.name }} ({{ c.reason }})
            </div>
          </el-alert>
        </el-card>

        <el-card v-if="detail.status !== 'draft'" style="margin-top: 16px">
          <template #header>审批记录</template>
          <el-steps direction="vertical" :active="stepActive">
            <el-step title="创建草稿" :description="formatTime(detail.createdAt)" />
            <el-step
              title="提交审批"
              :description="detail.status !== 'draft' ? '已提交' : ''"
            />
            <el-step
              title="空管审批"
              :description="
                detail.airTrafficReviewerId
                  ? (detail.status === 'rejected' && !detail.policeReviewerId ? '驳回' : '通过') + ' · ' + (detail.airTrafficComment || '')
                  : ''
              "
            />
            <el-step
              title="公安风险评估"
              :description="
                detail.policeReviewerId
                  ? (detail.status === 'rejected' ? '驳回' : '通过') + ' · ' + (detail.policeComment || '')
                  : ''
              "
            />
            <el-step
              title="已批准"
              :description="detail.approvedAt ? formatTime(detail.approvedAt) : ''"
            />
          </el-steps>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card>
          <template #header>航线地图</template>
          <div style="height: 500px">
            <OpenLayersMap
              :layers="mapLayers"
              :center="mapCenter"
              :zoom="12"
              :show-legend="true"
              :legend-items="legendItems"
            />
          </div>
        </el-card>

        <el-card style="margin-top: 16px" v-if="riskAssessment">
          <template #header>风险评估</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="总体风险">
              <el-tag :type="riskLevelTag(riskAssessment.overallRisk)">
                {{ riskLevelLabel(riskAssessment.overallRisk) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="大型活动冲突">
              {{ riskAssessment.hasLargeEventConflict ? '是' : '否' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="riskAssessment.largeEventDescription" label="活动详情">
              {{ riskAssessment.largeEventDescription }}
            </el-descriptions-item>
            <el-descriptions-item v-if="riskAssessment.suggestion" label="评估建议">
              {{ riskAssessment.suggestion }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, ElInput } from 'element-plus';
import dayjs from 'dayjs';
import OpenLayersMap from '@/components/OpenLayersMap.vue';
import { flightPlanApi } from '@/api/flight-plan';
import { riskApi } from '@/api/risk';
import { airspaceApi } from '@/api/airspace';
import { useUserStore } from '@/stores/user';
import { Style, Fill, Stroke } from 'ol/style';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const detail = ref<any>(null);
const riskAssessment = ref<any>(null);
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
        fill: new Fill({ color: 'rgba(239, 68, 68, 0.3)' }),
        stroke: new Stroke({ color: '#dc2626', width: 2 }),
      }),
      label: zone.name,
    });
  });
  if (detail.value?.plannedRoute) {
    layers.push({
      id: 'route',
      type: 'geojson' as const,
      data: detail.value.plannedRoute,
      style: new Style({
        stroke: new Stroke({ color: '#3b82f6', width: 4 }),
      }),
    });
  }
  if (detail.value?.operationArea) {
    layers.push({
      id: 'op',
      type: 'geojson' as const,
      data: detail.value.operationArea,
      style: new Style({
        fill: new Fill({ color: 'rgba(16, 185, 129, 0.2)' }),
        stroke: new Stroke({ color: '#10b981', width: 2 }),
      }),
    });
  }
  return layers;
});

const legendItems = [
  { label: '禁飞区', color: 'rgba(239, 68, 68, 0.5)' },
  { label: '计划航线', color: '#3b82f6' },
  { label: '作业区域', color: 'rgba(16, 185, 129, 0.4)' },
];

function formatTime(t: string) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-';
}

function statusTag(s: string) {
  const map: Record<string, string> = {
    draft: 'info', submitted: 'primary', air_traffic_review: '', police_review: 'warning',
    approved: 'success', rejected: 'danger', cancelled: 'info',
  };
  return (map[s] || 'info') as any;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    draft: '草稿', submitted: '已提交', air_traffic_review: '空管审核中', police_review: '公安审核中',
    approved: '已批准', rejected: '已驳回', cancelled: '已取消',
  };
  return map[s] || s;
}

function riskLevelTag(l: string) {
  const map: Record<string, string> = { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' };
  return (map[l] || 'info') as any;
}

function riskLevelLabel(l: string) {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '极高' };
  return map[l] || l;
}

const stepActive = computed(() => {
  const status = detail.value?.status;
  const map: Record<string, number> = {
    draft: 0, submitted: 1, air_traffic_review: 2, police_review: 3,
    approved: 5, rejected: detail.value?.policeReviewerId ? 4 : 3, cancelled: 1,
  };
  return map[status] || 0;
});

async function loadDetail() {
  loading.value = true;
  try {
    const id = route.params.id as string;
    detail.value = await flightPlanApi.detail(id);
    if (detail.value.status !== 'draft') {
      try {
        riskAssessment.value = await riskApi.getAssessment(id);
      } catch (e) {}
    }
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  try {
    await ElMessageBox.confirm('提交后将进行禁飞区检查，确定提交？', '提示', { type: 'warning' });
    await flightPlanApi.submit(detail.value.id);
    ElMessage.success('提交成功');
    loadDetail();
  } catch (e: any) {
    if (e?.response?.data?.message?.includes('禁飞区')) {
      ElMessageBox.alert(e.response.data.message, '禁飞区冲突', { type: 'error' });
    }
  }
}

async function inputComment(title: string) {
  const { value } = await ElMessageBox({
    title,
    message: '请输入审批意见（可选）',
    inputPattern: /.*/,
    inputErrorMessage: '',
    showCancelButton: true,
  } as any).catch(() => ({ value: null }));
  return value !== null ? { comment: value } : null;
}

async function handleAirTrafficApprove() {
  const data = await inputComment('空管审批通过');
  if (!data) return;
  await flightPlanApi.airTrafficApprove(detail.value.id, data);
  ElMessage.success('已通过空管审批');
  loadDetail();
}

async function handleAirTrafficReject() {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '空管驳回', {
    inputPattern: /.+/,
    inputErrorMessage: '请输入驳回原因',
  }).catch(() => ({ value: null }));
  if (!value) return;
  await flightPlanApi.airTrafficReject(detail.value.id, { rejectReason: value, comment: value });
  ElMessage.success('已驳回');
  loadDetail();
}

async function handlePoliceApprove() {
  const data = await inputComment('公安风险评估通过');
  if (!data) return;
  await flightPlanApi.policeApprove(detail.value.id, data);
  ElMessage.success('已通过公安评估');
  loadDetail();
}

async function handlePoliceReject() {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '公安驳回', {
    inputPattern: /.+/,
    inputErrorMessage: '请输入驳回原因',
  }).catch(() => ({ value: null }));
  if (!value) return;
  await flightPlanApi.policeReject(detail.value.id, { rejectReason: value, comment: value });
  ElMessage.success('已驳回');
  loadDetail();
}

async function handleCancel() {
  try {
    await ElMessageBox.confirm('确定取消该飞行计划？', '提示', { type: 'warning' });
    await flightPlanApi.cancel(detail.value.id);
    ElMessage.success('已取消');
    loadDetail();
  } catch (e) {}
}

onMounted(async () => {
  await loadDetail();
  noFlyZones.value = (await airspaceApi.noFlyZones()) as any;
});
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.action-row {
  display: flex;
  gap: 12px;
}
</style>
