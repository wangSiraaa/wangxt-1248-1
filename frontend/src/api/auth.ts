import request from '@/utils/request';

export interface LoginParams {
  username: string;
  password: string;
}

export interface RegisterParams {
  username: string;
  password: string;
  name: string;
  role: string;
  company?: string;
  phone?: string;
}

export const authApi = {
  login: (data: LoginParams) => request.post('/auth/login', data),
  register: (data: RegisterParams) => request.post('/auth/register', data),
  profile: () => request.get('/auth/profile'),
};
