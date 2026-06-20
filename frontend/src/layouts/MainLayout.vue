<template>
  <el-container class="main-layout">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <el-icon size="24"><Promotion /></el-icon>
        <span>无人机审批系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#1f2937"
        text-color="#d1d5db"
        active-text-color="#60a5fa"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/map">
          <el-icon><Location /></el-icon>
          <span>空域地图</span>
        </el-menu-item>
        <el-menu-item index="/flight-plans">
          <el-icon><Tickets /></el-icon>
          <span>飞行计划</span>
        </el-menu-item>
        <el-menu-item
          v-if="userStore.isAirTraffic || userStore.isAdmin"
          index="/airspaces"
        >
          <el-icon><Lock /></el-icon>
          <span>空域管理</span>
        </el-menu-item>
        <el-menu-item
          v-if="userStore.isPolice || userStore.isAdmin"
          index="/risk-events"
        >
          <el-icon><Warning /></el-icon>
          <span>大型活动</span>
        </el-menu-item>
        <el-menu-item index="/reports">
          <el-icon><EditPen /></el-icon>
          <span>现场报备</span>
        </el-menu-item>
        <el-menu-item index="/trajectories">
          <el-icon><Connection /></el-icon>
          <span>轨迹归档</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="title">{{ $route.meta.title || '低空无人机飞行审批系统' }}</div>
        <div class="user-info">
          <el-tag v-if="userStore.userInfo" :type="roleTagType">
            {{ roleLabel }}
          </el-tag>
          <span class="user-name">{{ userStore.userInfo?.name }}</span>
          <el-button type="danger" link size="small" @click="handleLogout">
            退出
          </el-button>
        </div>
      </el-header>
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import {
  DataAnalysis,
  Location,
  Tickets,
  Lock,
  Warning,
  EditPen,
  Connection,
  Promotion,
} from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const activeMenu = computed(() => route.path);

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    operator: '运营公司',
    air_traffic: '空管协同',
    police: '公安人员',
    admin: '系统管理员',
  };
  return map[userStore.userInfo?.role || ''] || '';
});

const roleTagType = computed(() => {
  const map: Record<string, string> = {
    operator: 'primary',
    air_traffic: 'success',
    police: 'warning',
    admin: 'danger',
  };
  return map[userStore.userInfo?.role || ''] as any;
});

function handleLogout() {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      userStore.logout();
      router.push('/login');
    })
    .catch(() => {});
}
</script>

<style scoped lang="scss">
.main-layout {
  height: 100vh;
}

.aside {
  background-color: #1f2937;
  color: #fff;

  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 16px;
    font-weight: bold;
    color: #fff;
    border-bottom: 1px solid #374151;
  }

  .el-menu {
    border-right: none;
  }
}

.header {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 20px;

  .title {
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .user-name {
      color: #374151;
    }
  }
}

.main {
  background-color: #f3f4f6;
  padding: 20px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
