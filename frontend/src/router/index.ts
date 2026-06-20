import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'map',
        name: 'Map',
        component: () => import('@/views/MapView.vue'),
        meta: { title: '空域地图' },
      },
      {
        path: 'flight-plans',
        name: 'FlightPlans',
        component: () => import('@/views/FlightPlanList.vue'),
        meta: { title: '飞行计划' },
      },
      {
        path: 'flight-plans/new',
        name: 'FlightPlanNew',
        component: () => import('@/views/FlightPlanEdit.vue'),
        meta: { title: '新建飞行计划', roles: ['operator', 'admin'] },
      },
      {
        path: 'flight-plans/:id',
        name: 'FlightPlanDetail',
        component: () => import('@/views/FlightPlanDetail.vue'),
        meta: { title: '飞行计划详情' },
      },
      {
        path: 'airspaces',
        name: 'Airspaces',
        component: () => import('@/views/AirspaceList.vue'),
        meta: { title: '空域管理', roles: ['air_traffic', 'admin'] },
      },
      {
        path: 'risk-events',
        name: 'RiskEvents',
        component: () => import('@/views/RiskEvents.vue'),
        meta: { title: '大型活动管理', roles: ['police', 'admin'] },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/ReportList.vue'),
        meta: { title: '现场报备' },
      },
      {
        path: 'trajectories',
        name: 'Trajectories',
        component: () => import('@/views/TrajectoryList.vue'),
        meta: { title: '轨迹归档' },
      },
      {
        path: 'trajectories/:id',
        name: 'TrajectoryDetail',
        component: () => import('@/views/TrajectoryDetail.vue'),
        meta: { title: '轨迹详情' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore();

  if (to.meta.public) {
    if (userStore.isLoggedIn && to.name === 'Login') {
      return next('/');
    }
    return next();
  }

  if (!userStore.isLoggedIn) {
    return next('/login');
  }

  const requiredRoles = to.meta.roles as string[] | undefined;
  if (requiredRoles && !requiredRoles.includes(userStore.userInfo?.role || '')) {
    return next('/dashboard');
  }

  next();
});

export default router;
