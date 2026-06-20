<template>
  <div class="trajectory-list">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>轨迹归档列表</span>
          <div class="actions">
            <el-select v-model="filterStatus" placeholder="状态筛选" style="width: 160px" clearable>
              <el-option label="正常" value="normal" />
              <el-option label="已偏离" value="deviated" />
              <el-option label="复核中" value="reviewing" />
              <el-option label="复核通过" value="review_passed" />
              <el-option label="复核驳回" value="review_rejected" />
              <el-option label="已归档" value="archived" />
            </el-select>
            <el-button
              type="primary"
              v-if="userStore.isOperator || userStore.isAdmin"
              @click="openUpload()"
            >
              上传轨迹
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="计划编号" width="170">
          <template #default="{ row }">
            {{ row.flightPlan?.planNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.flightPlan?.title || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="飞行时段" width="280">
          <template #default="{ row }">
            {{ formatTime(row.startTime) }} ~ {{ formatTime(row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column label="平均偏离(米)" width="120">
          <template #default="{ row }">
            <span :style="{ color: row.deviationDistance > 200 ? '#ef4444' : '' }">
              {{ Number(row.deviationDistance).toFixed(1) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="最大偏离(米)" width="120">
          <template #default="{ row }">
            <span :style="{ color: row.maxDeviation > 200 ? '#ef4444' : '#10b981', fontWeight: 'bold' }">
              {{ Number(row.maxDeviation).toFixed(1) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/trajectories/${row.id}`)">
              详情
            </el-button>
            <el-button
              v-if="(row.status === 'deviated' || row.status === 'normal') && (userStore.isAirTraffic || userStore.isAdmin)"
              type="warning"
              link
              @click="startReview(row)"
            >
              发起复核
            </el-button>
            <el-button
              v-if="row.status === 'reviewing' && (userStore.isAirTraffic || userStore.isAdmin)"
              type="success"
              link
              @click="reviewApprove(row)"
            >
              复核通过
            </el-button>
            <el-button
              v-if="row.status === 'reviewing' && (userStore.isAirTraffic || userStore.isAdmin)"
              type="danger"
              link
              @click="reviewReject(row)"
            >
              复核驳回
            </el-button>
            <el-button
              v-if="['normal', 'review_passed'].includes(row.status) && (userStore.isAirTraffic || userStore.isAdmin)"
              link
              @click="archive(row)"
            >
              归档
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="uploadDialog.visible" title="上传飞行轨迹" width="900px">
      <el-form :model="uploadForm" :rules="uploadRules" ref="uploadFormRef" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="飞行开始时间" prop="startTime">
              <el-date-picker
                v-model="uploadForm.startTime"
                type="datetime"
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="飞行结束时间" prop="endTime">
              <el-date-picker
                v-model="uploadForm.endTime"
                type="datetime"
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联飞行计划" prop="flightPlanId">
              <el-select v-model="uploadForm.flightPlanId" placeholder="选择已批准的计划" style="width: 100%">
                <el-option
                  v-for="p in approvedPlans"
                  :key="p.id"
                  :label="`${p.planNo} - ${p.title}`"
                  :value="p.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="偏离阈值(米)">
              <el-input-number v-model="uploadForm.deviationThreshold" :min="50" :max="2000" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-divider content-position="left">实际飞行航线（在地图上绘制）</el-divider>
        <div class="draw-toolbar">
          <el-radio-group v-model="drawMode">
            <el-radio-button label="line">绘制轨迹(LineString)</el-radio-button>
            <el-radio-button :label="null">浏览</el-radio-button>
          </el-radio-group>
          <el-button @click="clearDraw">清除</el-button>
          <el-tag v-if="uploadForm.actualRoute" type="success">轨迹已绘制</el-tag>
          <el-tag v-else type="danger">请绘制实际飞行轨迹</el-tag>
        </div>
        <div style="height: 350px">
          <OpenLayersMap
            ref="mapRef"
            :layers="mapLayers"
            :draw-mode="drawMode"
            :center="[116.4074, 39.9042]"
            :zoom="12"
            :show-legend="true"
            :legend-items="legendItems"
            @draw-end="handleDrawEnd"
          />
        </div>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitUpload">上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import dayjs from 'dayjs';
import OpenLayersMap from '@/components/OpenLayersMap.vue';
import { trajectoryApi } from '@/api/trajectory';
import { flightPlanApi } from '@/api/flight-plan';
import { airspaceApi } from '@/api/airspace';
import { useUserStore } from '@/stores/user';
import { Style, Fill, Stroke } from 'ol/style';

const route = useRoute();
const userStore = useUserStore();
const loading = ref(false);
const list = ref<any[]>([]);
const filterStatus = ref('');
const approvedPlans = ref<any[]>([]);
const noFlyZones = ref<any[]>([]);
const drawMode = ref<'line' | null>('line');
const mapRef = ref<any>();
const uploadFormRef = ref<FormInstance>();

const uploadDialog = reactive({ visible: false });
const uploadForm = reactive<any>({
  startTime: '',
  endTime: '',
  flightPlanId: '',
  deviationThreshold: 200,
  actualRoute: null,
  trackData: [],
});

const uploadRules: FormRules = {
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  flightPlanId: [{ required: true, message: '请选择飞行计划', trigger: 'change' }],
};

const mapLayers = computed(() => {
  const layers: any[] = [];
  noFlyZones.value.forEach((zone) => {
    layers.push({
      id: `nofly-${zone.id}`,
      type: 'geojson' as const,
      data: zone.geom,
      style: new Style({
        fill: new Fill({ color: 'rgba(239, 68, 68, 0.2)' }),
        stroke: new Stroke({ color: '#dc2626', width: 2 }),
      }),
    });
  });
  const plan = approvedPlans.value.find((p) => p.id === uploadForm.flightPlanId);
  if (plan?.plannedRoute) {
    layers.push({
      id: 'planned',
      type: 'geojson' as const,
      data: plan.plannedRoute,
      style: new Style({ stroke: new Stroke({ color: '#3b82f6', width: 3, lineDash: [8, 4] }) }),
    });
  }
  return layers;
});

const legendItems = [
  { label: '禁飞区', color: 'rgba(239, 68, 68, 0.4)' },
  { label: '计划航线', color: '#3b82f6' },
];

function formatTime(t: string) {
  return dayjs(t).format('MM-DD HH:mm');
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

async function loadData() {
  loading.value = true;
  try {
    const planId = (route.query.planId as string) || undefined;
    list.value = await trajectoryApi.list(planId, filterStatus.value || undefined) as any;
  } finally {
    loading.value = false;
  }
}

async function openUpload() {
  approvedPlans.value = (await flightPlanApi.list('approved')) as any;
  noFlyZones.value = (await airspaceApi.noFlyZones()) as any;
  Object.assign(uploadForm, {
    startTime: dayjs().subtract(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
    endTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    flightPlanId: route.query.planId as string || approvedPlans.value[0]?.id || '',
    deviationThreshold: 200,
    actualRoute: null,
    trackData: [],
  });
  uploadDialog.visible = true;
}

function handleDrawEnd(geojson: any) {
  uploadForm.actualRoute = geojson.features?.[0]?.geometry || geojson;
  ElMessage.success('轨迹已绘制');
}

function clearDraw() {
  mapRef.value?.clearDrawLayer();
  uploadForm.actualRoute = null;
}

async function submitUpload() {
  if (!uploadFormRef.value) return;
  const valid = await uploadFormRef.value.validate().catch(() => false);
  if (!valid) return;
  if (!uploadForm.actualRoute) {
    ElMessage.warning('请绘制实际飞行轨迹');
    return;
  }
  try {
    await trajectoryApi.upload(uploadForm.flightPlanId, uploadForm);
    ElMessage.success('轨迹上传成功，系统已自动检测偏离');
    uploadDialog.visible = false;
    loadData();
  } catch (e) {}
}

async function startReview(row: any) {
  try {
    await ElMessageBox.confirm('确定发起轨迹复核吗？', '提示', { type: 'warning' });
    await trajectoryApi.startReview(row.id);
    ElMessage.success('已发起复核');
    loadData();
  } catch (e) {}
}

async function reviewApprove(row: any) {
  const { value } = await ElMessageBox.prompt('请输入复核意见', '复核通过', {
    inputPattern: /.*/,
  }).catch(() => ({ value: null }));
  if (value === null) return;
  await trajectoryApi.reviewApprove(row.id, { reviewComment: value });
  ElMessage.success('复核通过');
  loadData();
}

async function reviewReject(row: any) {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '复核驳回', {
    inputPattern: /.+/,
    inputErrorMessage: '请输入驳回原因',
  }).catch(() => ({ value: null }));
  if (value === null) return;
  await trajectoryApi.reviewReject(row.id, { reviewComment: value });
  ElMessage.success('已驳回');
  loadData();
}

async function archive(row: any) {
  try {
    await ElMessageBox.confirm('确定归档该轨迹吗？', '提示', { type: 'warning' });
    await trajectoryApi.archive(row.id);
    ElMessage.success('归档成功');
    loadData();
  } catch (e) {}
}

watch(filterStatus, () => loadData());

onMounted(() => loadData());
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .actions {
    display: flex;
    gap: 12px;
  }
}
.draw-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
</style>
