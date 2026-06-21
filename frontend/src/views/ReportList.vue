<template>
  <div class="report-list">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <el-tabs v-model="activeTab" type="border-card" @tab-change="handleTabChange">
            <el-tab-pane label="报备列表" name="list" />
            <el-tab-pane>
              <template #label>
                <span>
                  待报备清单
                  <el-badge v-if="pendingList.length" :value="pendingList.length" class="tab-badge" />
                </span>
              </template>
              <span>待报备清单</span>
            </el-tab-pane>
            <el-tab-pane v-if="userStore.isPolice || userStore.isAdmin" label="公安监控-未报备" name="police" />
          </el-tabs>
        </div>
      </template>

      <template v-if="activeTab === 'list'">
        <div class="filter-bar">
          <el-select v-model="filterStatus" placeholder="状态筛选" style="width: 160px" clearable @change="loadData">
            <el-option label="待报备" value="pending" />
            <el-option label="已起飞" value="takeoff_reported" />
            <el-option label="已降落" value="landing_reported" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </div>

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
          <el-table-column v-if="userStore.isPolice || userStore.isAdmin" label="运营公司" width="160">
            <template #default="{ row }">
              {{ row.flightPlan?.applicant?.company || row.flightPlan?.applicant?.name || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="起飞时间" width="160">
            <template #default="{ row }">
              {{ row.takeoffTime ? formatTime(row.takeoffTime) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="降落时间" width="160">
            <template #default="{ row }">
              {{ row.landingTime ? formatTime(row.landingTime) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="飞行时长" width="110">
            <template #default="{ row }">
              {{ row.actualFlightDuration ? row.actualFlightDuration + '分钟' : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="作业结果" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.operationResultUploaded" type="success" size="small">已上传</el-tag>
              <el-tag v-else type="info" size="small">未上传</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="提醒" width="120">
            <template #default="{ row }">
              <el-tag
                v-if="row.reminder"
                :type="reminderTagType(row.reminder.urgency)"
                size="small"
                effect="dark"
              >
                {{ urgencyLabel(row.reminder.urgency) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" size="small">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                link
                @click="openReport(row)"
              >
                {{ row.status === 'pending' ? '起飞报备' : '查看/继续' }}
              </el-button>
              <el-button
                v-if="row.status === 'takeoff_reported' && (userStore.isOperator || userStore.isAdmin)"
                type="success"
                link
                @click="openLanding(row)"
              >
                降落报备
              </el-button>
              <el-button
                v-if="row.status !== 'pending' && (userStore.isOperator || userStore.isAdmin)"
                type="warning"
                link
                @click="openUpload(row)"
              >
                上传作业
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template v-else-if="activeTab === 'pending' || activeTab === 'police'">
        <el-alert
          v-if="activeTab === 'pending' && (userStore.isOperator || userStore.isAdmin)"
          title="以下飞行计划已批准，需要在起飞前完成现场报备"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 16px"
        />
        <el-alert
          v-if="activeTab === 'police' && (userStore.isPolice || userStore.isAdmin)"
          title="公安监控视角：以下为已批准但尚未完成现场报备的飞行计划"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 16px"
        />

        <el-table :data="filteredPendingList" v-loading="pendingLoading" stripe>
          <el-table-column label="紧急度" width="100">
            <template #default="{ row }">
              <el-tag
                :type="reminderTagType(row.urgency)"
                size="small"
                effect="dark"
              >
                {{ urgencyLabel(row.urgency) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="计划编号" width="170">
            <template #default="{ row }">
              <el-button
                type="primary"
                link
                @click="$router.push(`/flight-plans/${row.id}`)"
              >
                {{ row.planNo }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="标题" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.title || '-' }}
            </template>
          </el-table-column>
          <el-table-column v-if="userStore.isPolice || userStore.isAdmin" label="运营公司" width="160">
            <template #default="{ row }">
              {{ row.applicant?.company || row.applicant?.name || '-' }}
            </template>
          </el-table-column>
          <el-table-column v-if="userStore.isPolice || userStore.isAdmin" label="飞行员" width="120">
            <template #default="{ row }">
              {{ row.pilotName || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="无人机" width="130">
            <template #default="{ row }">
              {{ row.uavModel || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="计划起飞" width="160">
            <template #default="{ row }">
              <span :class="{ 'text-danger': row.hoursToStart < 0 }">
                {{ formatTime(row.plannedStartTime) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="距起飞" width="110">
            <template #default="{ row }">
              <span :class="hoursClass(row.hoursToStart)">
                {{ formatHours(row.hoursToStart) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="计划降落" width="160">
            <template #default="{ row }">
              {{ formatTime(row.plannedEndTime) }}
            </template>
          </el-table-column>
          <el-table-column label="报备状态" width="110">
            <template #default="{ row }">
              <el-tag :type="pendingReportTag(row.reportStatus)" size="small">
                {{ pendingReportLabel(row.reportStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="userStore.isOperator || userStore.isAdmin"
                type="primary"
                link
                @click="goReportFromPending(row)"
              >
                去报备
              </el-button>
              <el-button
                type="primary"
                link
                @click="$router.push(`/flight-plans/${row.id}`)"
              >
                查看详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!pendingLoading && filteredPendingList.length === 0" description="暂无待报备计划" />
      </template>
    </el-card>

    <el-dialog v-model="reportDialog.visible" title="起飞报备" width="550px">
      <el-form :model="reportForm" :rules="takeoffRules" ref="takeoffFormRef" label-width="100px">
        <el-form-item label="起飞时间" prop="takeoffTime">
          <el-date-picker
            v-model="reportForm.takeoffTime"
            type="datetime"
            style="width: 100%"
            value-format="YYYY-MM-DDTHH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="纬度" prop="takeoffLat">
          <el-input-number v-model="reportForm.takeoffLat" :precision="6" :min="-90" :max="90" style="width: 100%" />
        </el-form-item>
        <el-form-item label="经度" prop="takeoffLng">
          <el-input-number v-model="reportForm.takeoffLng" :precision="6" :min="-180" :max="180" style="width: 100%" />
        </el-form-item>
        <el-form-item label="起飞高度">
          <el-input-number v-model="reportForm.takeoffAltitude" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="reportForm.takeoffRemark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reportDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitTakeoff">确认起飞</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="landingDialog.visible" title="降落报备" width="550px">
      <el-form :model="landingForm" :rules="landingRules" ref="landingFormRef" label-width="100px">
        <el-form-item label="降落时间" prop="landingTime">
          <el-date-picker
            v-model="landingForm.landingTime"
            type="datetime"
            style="width: 100%"
            value-format="YYYY-MM-DDTHH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="纬度" prop="landingLat">
          <el-input-number v-model="landingForm.landingLat" :precision="6" :min="-90" :max="90" style="width: 100%" />
        </el-form-item>
        <el-form-item label="经度" prop="landingLng">
          <el-input-number v-model="landingForm.landingLng" :precision="6" :min="-180" :max="180" style="width: 100%" />
        </el-form-item>
        <el-form-item label="飞行时长(分钟)">
          <el-input-number v-model="landingForm.actualFlightDuration" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="飞行距离(公里)">
          <el-input-number v-model="landingForm.actualDistance" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="landingForm.landingRemark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="landingDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitLanding">确认降落</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="uploadDialog.visible" title="上传作业结果" width="550px">
      <el-form :model="uploadForm" label-width="100px">
        <el-form-item label="结果备注">
          <el-input v-model="uploadForm.operationResultRemark" type="textarea" :rows="4" />
        </el-form-item>
        <el-alert
          title="提示：未完成起飞报备不能上传作业结果"
          type="warning"
          :closable="false"
          show-icon
        />
      </el-form>
      <template #footer>
        <el-button @click="uploadDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitUpload">确认上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import dayjs from 'dayjs';
import { reportApi } from '@/api/report';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const pendingLoading = ref(false);
const list = ref<any[]>([]);
const pendingList = ref<any[]>([]);
const filterStatus = ref('');

const activeTab = ref('list');

const takeoffFormRef = ref<FormInstance>();
const landingFormRef = ref<FormInstance>();
const currentPlanId = ref('');

const reportDialog = reactive({ visible: false });
const landingDialog = reactive({ visible: false });
const uploadDialog = reactive({ visible: false });

const reportForm = reactive({
  takeoffTime: '',
  takeoffLat: 39.9042,
  takeoffLng: 116.4074,
  takeoffAltitude: 0,
  takeoffRemark: '',
});

const landingForm = reactive({
  landingTime: '',
  landingLat: 39.9042,
  landingLng: 116.4074,
  landingAltitude: 0,
  actualFlightDuration: 0,
  actualDistance: 0,
  landingRemark: '',
});

const uploadForm = reactive({
  operationResultRemark: '',
  operationFiles: [],
});

const takeoffRules: FormRules = {
  takeoffTime: [{ required: true, message: '请选择起飞时间', trigger: 'change' }],
  takeoffLat: [{ required: true, message: '请输入纬度', trigger: 'blur' }],
  takeoffLng: [{ required: true, message: '请输入经度', trigger: 'blur' }],
};

const landingRules: FormRules = {
  landingTime: [{ required: true, message: '请选择降落时间', trigger: 'change' }],
  landingLat: [{ required: true, message: '请输入纬度', trigger: 'blur' }],
  landingLng: [{ required: true, message: '请输入经度', trigger: 'blur' }],
};

const filteredPendingList = computed(() => {
  if (activeTab.value === 'police') {
    return pendingList.value;
  }
  return pendingList.value;
});

function handleTabChange() {
  if (activeTab.value === 'pending' || activeTab.value === 'police') {
    loadPendingList();
  }
}

function formatTime(t: string) {
  return t ? dayjs(t).format('MM-DD HH:mm') : '-';
}

function formatHours(h: number) {
  if (h < 0) return `已过${Math.ceil(Math.abs(h))}小时`;
  if (h < 1) return `${Math.ceil(h * 60)}分钟`;
  return `${Math.ceil(h)}小时`;
}

function hoursClass(h: number) {
  if (h < 0) return 'text-danger';
  if (h <= 1) return 'text-danger';
  if (h <= 24) return 'text-warning';
  return '';
}

function statusTag(s: string) {
  const map: Record<string, string> = {
    pending: 'info', takeoff_reported: 'primary',
    landing_reported: 'warning', completed: 'success',
  };
  return (map[s] || '') as any;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: '待报备', takeoff_reported: '已起飞',
    landing_reported: '已降落', completed: '已完成',
  };
  return map[s] || s;
}

function reminderTagType(u: string) {
  const map: Record<string, string> = {
    overdue: 'danger', urgent: 'danger', warning: 'warning', normal: 'info',
  };
  return (map[u] || 'info') as any;
}

function urgencyLabel(u: string) {
  const map: Record<string, string> = {
    overdue: '已逾期', urgent: '紧急', warning: '提醒', normal: '正常',
  };
  return map[u] || u;
}

function pendingReportTag(s: string) {
  const map: Record<string, string> = {
    not_created: 'info', pending: 'warning',
  };
  return (map[s] || 'info') as any;
}

function pendingReportLabel(s: string) {
  const map: Record<string, string> = {
    not_created: '未创建', pending: '待报备',
  };
  return map[s] || s;
}

async function loadData() {
  loading.value = true;
  try {
    list.value = await reportApi.list(filterStatus.value || undefined) as any;
  } finally {
    loading.value = false;
  }
}

async function loadPendingList() {
  pendingLoading.value = true;
  try {
    pendingList.value = await reportApi.pendingList() as any;
  } finally {
    pendingLoading.value = false;
  }
}

function openReport(row: any) {
  currentPlanId.value = row.flightPlanId;
  if (row.takeoffTime) {
    Object.assign(reportForm, {
      takeoffTime: row.takeoffTime,
      takeoffLat: row.takeoffLat,
      takeoffLng: row.takeoffLng,
      takeoffAltitude: row.takeoffAltitude,
      takeoffRemark: row.takeoffRemark,
    });
  } else {
    Object.assign(reportForm, {
      takeoffTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
      takeoffLat: 39.9042,
      takeoffLng: 116.4074,
      takeoffAltitude: 0,
      takeoffRemark: '',
    });
  }
  reportDialog.visible = true;
}

function goReportFromPending(row: any) {
  router.push(`/reports?planId=${row.id}`);
}

function openLanding(row: any) {
  currentPlanId.value = row.flightPlanId;
  Object.assign(landingForm, {
    landingTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    landingLat: row.landingLat || 39.9042,
    landingLng: row.landingLng || 116.4074,
    landingAltitude: row.landingAltitude || 0,
    actualFlightDuration: row.actualFlightDuration || 0,
    actualDistance: row.actualDistance || 0,
    landingRemark: row.landingRemark || '',
  });
  landingDialog.visible = true;
}

function openUpload(row: any) {
  currentPlanId.value = row.flightPlanId;
  uploadForm.operationResultRemark = row.operationResultRemark || '';
  uploadDialog.visible = true;
}

async function submitTakeoff() {
  if (!takeoffFormRef.value) return;
  const valid = await takeoffFormRef.value.validate().catch(() => false);
  if (!valid) return;
  try {
    await reportApi.takeoff(currentPlanId.value, reportForm);
    ElMessage.success('起飞报备成功');
    reportDialog.visible = false;
    loadData();
    loadPendingList();
  } catch (e) {}
}

async function submitLanding() {
  if (!landingFormRef.value) return;
  const valid = await landingFormRef.value.validate().catch(() => false);
  if (!valid) return;
  try {
    await reportApi.landing(currentPlanId.value, landingForm);
    ElMessage.success('降落报备成功');
    landingDialog.visible = false;
    loadData();
    loadPendingList();
  } catch (e) {}
}

async function submitUpload() {
  try {
    await reportApi.uploadResult(currentPlanId.value, uploadForm);
    ElMessage.success('作业结果上传成功');
    uploadDialog.visible = false;
    loadData();
  } catch (e) {}
}

onMounted(() => {
  const planId = route.query.planId as string;
  if (planId) {
    setTimeout(() => {
      router.push(`/flight-plans/${planId}`);
    }, 300);
  }
  loadData();
});
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  :deep(.el-tabs) {
    width: 100%;
  }

  :deep(.el-tabs__header) {
    margin: 0;
  }
}

.filter-bar {
  margin-bottom: 16px;
}

.tab-badge {
  margin-left: 6px;
}

.text-danger {
  color: #f56c6c;
  font-weight: 600;
}

.text-warning {
  color: #e6a23c;
  font-weight: 600;
}
</style>
