<template>
  <div class="flight-plan-list">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>飞行计划列表</span>
          <div class="actions">
            <el-select v-model="filterStatus" placeholder="状态筛选" style="width: 150px" clearable>
              <el-option label="草稿" value="draft" />
              <el-option label="已提交" value="submitted" />
              <el-option label="空管审核中" value="air_traffic_review" />
              <el-option label="公安审核中" value="police_review" />
              <el-option label="已批准" value="approved" />
              <el-option label="已驳回" value="rejected" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-button type="primary" @click="$router.push('/flight-plans/new')" v-if="userStore.isOperator || userStore.isAdmin">
              <el-icon><Plus /></el-icon>
              新建计划
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="planNo" label="计划编号" width="170" />
        <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <el-table-column label="申请人" width="110">
          <template #default="{ row }">
            {{ row.applicant?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="uavModel" label="无人机型号" width="120" />
        <el-table-column label="计划时段" width="280">
          <template #default="{ row }">
            {{ formatTime(row.plannedStartTime) }} ~ {{ formatTime(row.plannedEndTime) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/flight-plans/${row.id}`)">
              详情
            </el-button>
            <el-button
              v-if="(userStore.isOperator || userStore.isAdmin) && row.status === 'draft'"
              type="success"
              link
              @click="handleSubmit(row)"
            >
              提交审批
            </el-button>
            <el-button
              v-if="userStore.isAirTraffic || userStore.isAdmin"
              link
              @click="$router.push(`/flight-plans/${row.id}`)"
            >
              {{ row.status === 'submitted' ? '空管审批' : '' }}
            </el-button>
            <el-button
              v-if="(userStore.isPolice || userStore.isAdmin) && row.status === 'police_review'"
              type="warning"
              link
              @click="$router.push(`/flight-plans/${row.id}`)"
            >
              公安评估
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { flightPlanApi } from '@/api/flight-plan';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const list = ref<any[]>([]);
const loading = ref(false);
const filterStatus = ref('');

function formatTime(t: string) {
  return dayjs(t).format('MM-DD HH:mm');
}

function statusTag(s: string) {
  const map: Record<string, string> = {
    draft: 'info',
    submitted: 'primary',
    air_traffic_review: '',
    police_review: 'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'info',
  };
  return (map[s] || 'info') as any;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    air_traffic_review: '空管审核中',
    police_review: '公安审核中',
    approved: '已批准',
    rejected: '已驳回',
    cancelled: '已取消',
  };
  return map[s] || s;
}

async function loadData() {
  loading.value = true;
  try {
    list.value = await flightPlanApi.list(filterStatus.value || undefined) as any;
  } finally {
    loading.value = false;
  }
}

async function handleSubmit(row: any) {
  try {
    await ElMessageBox.confirm('确定提交该飞行计划审批吗？系统将自动检查禁飞区冲突。', '提示', {
      type: 'warning',
    });
    await flightPlanApi.submit(row.id);
    ElMessage.success('提交成功');
    loadData();
  } catch (e: any) {
    if (e?.response?.data?.message?.includes('禁飞区')) {
      ElMessageBox.alert(e.response.data.message, '禁飞区冲突', { type: 'error' });
    }
  }
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
</style>
