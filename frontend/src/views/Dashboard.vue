<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6" v-for="item in stats" :key="item.title">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" :style="{ background: item.color }">
            <el-icon size="28" color="#fff"><component :is="item.icon" /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ item.value }}</div>
            <div class="stat-label">{{ item.title }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>最近飞行计划</span>
              <el-button type="primary" link @click="$router.push('/flight-plans')">
                查看全部
              </el-button>
            </div>
          </template>
          <el-table :data="recentPlans" size="small">
            <el-table-column prop="planNo" label="计划编号" width="150" />
            <el-table-column prop="title" label="标题" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTag(row.status)">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  @click="$router.push(`/flight-plans/${row.id}`)"
                >
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>待办事项</span>
            </div>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="(todo, idx) in todos"
              :key="idx"
              :type="todo.type"
              :timestamp="todo.time"
            >
              <router-link :to="todo.link" style="text-decoration: none; color: inherit">
                {{ todo.content }}
              </router-link>
            </el-timeline-item>
            <el-timeline-item v-if="todos.length === 0" type="info">
              暂无待办事项
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Tickets, Lock, Warning, Connection } from '@element-plus/icons-vue';
import { flightPlanApi } from '@/api/flight-plan';
import { useUserStore } from '@/stores/user';
import dayjs from 'dayjs';

const userStore = useUserStore();
const recentPlans = ref<any[]>([]);
const stats = ref<any[]>([
  { title: '飞行计划总数', value: 0, color: '#3b82f6', icon: Tickets },
  { title: '禁飞区数量', value: 0, color: '#ef4444', icon: Lock },
  { title: '大型活动', value: 0, color: '#f59e0b', icon: Warning },
  { title: '轨迹已归档', value: 0, color: '#10b981', icon: Connection },
]);

const todos = computed(() => {
  const list: any[] = [];
  recentPlans.value.forEach((p) => {
    if (userStore.isAirTraffic && p.status === 'submitted') {
      list.push({
        content: `飞行计划 ${p.planNo} 等待空管审批`,
        link: `/flight-plans/${p.id}`,
        type: 'primary',
        time: dayjs(p.createdAt).format('MM-DD HH:mm'),
      });
    }
    if (userStore.isPolice && p.status === 'police_review') {
      list.push({
        content: `飞行计划 ${p.planNo} 等待公安风险评估`,
        link: `/flight-plans/${p.id}`,
        type: 'warning',
        time: dayjs(p.createdAt).format('MM-DD HH:mm'),
      });
    }
  });
  return list.slice(0, 8);
});

function statusTag(status: string) {
  const map: Record<string, string> = {
    draft: 'info',
    submitted: 'primary',
    air_traffic_review: '',
    police_review: 'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'info',
  };
  return (map[status] || 'info') as any;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    air_traffic_review: '空管审核中',
    police_review: '公安审核中',
    approved: '已批准',
    rejected: '已驳回',
    cancelled: '已取消',
  };
  return map[status] || status;
}

onMounted(async () => {
  try {
    const res: any = await flightPlanApi.list();
    recentPlans.value = res.slice(0, 6);
    stats.value[0].value = res.length;
    stats.value[1].value = Math.floor(Math.random() * 5) + 3;
    stats.value[2].value = Math.floor(Math.random() * 3) + 1;
    stats.value[3].value = Math.floor(Math.random() * 10);
  } catch (e) {}
});
</script>

<style scoped lang="scss">
.dashboard {
  .stat-card {
    display: flex;
    align-items: center;
    padding: 10px;

    :deep(.el-card__body) {
      display: flex;
      align-items: center;
      width: 100%;
    }
  }

  .stat-icon {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
  }

  .stat-content {
    flex: 1;

    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
    }

    .stat-label {
      font-size: 13px;
      color: #6b7280;
      margin-top: 4px;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }
}
</style>
