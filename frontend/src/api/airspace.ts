import request from '@/utils/request';

export const airspaceApi = {
  list: (type?: string) =>
    request.get('/airspaces', { params: { type } }),
  noFlyZones: () => request.get('/airspaces/no-fly'),
  detail: (id: string) => request.get(`/airspaces/${id}`),
  create: (data: any) => request.post('/airspaces', data),
  update: (id: string, data: any) => request.put(`/airspaces/${id}`, data),
  remove: (id: string) => request.delete(`/airspaces/${id}`),
  checkConflict: (route: any, altitude?: number) =>
    request.post('/airspaces/check-conflict', { route, altitude }),
  checkPoint: (lng: number, lat: number) =>
    request.get('/airspaces/point/check', { params: { lng, lat } }),
};
