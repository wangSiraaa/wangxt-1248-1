import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
import type { LoginParams, RegisterParams } from '@/api/auth';

export type UserRole = 'operator' | 'air_traffic' | 'police' | 'admin';

export interface UserInfo {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  company?: string;
  phone?: string;
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const userInfo = ref<UserInfo | null>(
    JSON.parse(localStorage.getItem('user') || 'null'),
  );

  const isLoggedIn = computed(() => !!token.value);
  const isOperator = computed(() => userInfo.value?.role === 'operator');
  const isAirTraffic = computed(() => userInfo.value?.role === 'air_traffic');
  const isPolice = computed(() => userInfo.value?.role === 'police');
  const isAdmin = computed(() => userInfo.value?.role === 'admin');

  async function login(params: LoginParams) {
    const res: any = await authApi.login(params);
    token.value = res.accessToken;
    userInfo.value = res.user;
    localStorage.setItem('token', res.accessToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    return res;
  }

  async function register(params: RegisterParams) {
    return authApi.register(params);
  }

  async function fetchProfile() {
    const res: any = await authApi.profile();
    userInfo.value = res;
    localStorage.setItem('user', JSON.stringify(res));
    return res;
  }

  function logout() {
    token.value = null;
    userInfo.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isOperator,
    isAirTraffic,
    isPolice,
    isAdmin,
    login,
    register,
    fetchProfile,
    logout,
  };
});
