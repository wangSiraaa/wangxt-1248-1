import request from '@/utils/request';

export const userApi = {
  list: (role?: string) =>
    request.get('/users', { params: { role } }),
  detail: (id: string) => request.get(`/users/${id}`),
};
