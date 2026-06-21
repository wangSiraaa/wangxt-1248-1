import request from '@/utils/request';

export const reportApi = {
  list: (status?: string) =>
    request.get('/reports', { params: { status } }),
  pendingList: () => request.get('/reports/pending/list'),
  getByFlightPlan: (flightPlanId: string) =>
    request.get(`/reports/${flightPlanId}`),
  takeoff: (flightPlanId: string, data: any) =>
    request.post(`/reports/${flightPlanId}/takeoff`, data),
  landing: (flightPlanId: string, data: any) =>
    request.post(`/reports/${flightPlanId}/landing`, data),
  uploadResult: (flightPlanId: string, data: any) =>
    request.post(`/reports/${flightPlanId}/operation-result`, data),
};
