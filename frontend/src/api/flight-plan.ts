import request from '@/utils/request';

export const flightPlanApi = {
  list: (status?: string, reportPending?: boolean) =>
    request.get('/flight-plans', { params: { status, reportPending } }),
  detail: (id: string) => request.get(`/flight-plans/${id}`),
  create: (data: any) => request.post('/flight-plans', data),
  update: (id: string, data: any) => request.put(`/flight-plans/${id}`, data),
  submit: (id: string) => request.post(`/flight-plans/${id}/submit`),
  cancel: (id: string) => request.post(`/flight-plans/${id}/cancel`),
  remove: (id: string) => request.delete(`/flight-plans/${id}`),
  airTrafficApprove: (id: string, data: any) =>
    request.post(`/flight-plans/${id}/air-traffic/approve`, data),
  airTrafficReject: (id: string, data: any) =>
    request.post(`/flight-plans/${id}/air-traffic/reject`, data),
  policeApprove: (id: string, data: any) =>
    request.post(`/flight-plans/${id}/police/approve`, data),
  policeReject: (id: string, data: any) =>
    request.post(`/flight-plans/${id}/police/reject`, data),
};
