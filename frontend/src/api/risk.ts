import request from '@/utils/request';

export const riskApi = {
  listLargeEvents: (activeOnly = true) =>
    request.get('/risk-assessments/large-events', { params: { activeOnly } }),
  getLargeEvent: (id: string) =>
    request.get(`/risk-assessments/large-events/${id}`),
  createLargeEvent: (data: any) =>
    request.post('/risk-assessments/large-events', data),
  updateLargeEvent: (id: string, data: any) =>
    request.put(`/risk-assessments/large-events/${id}`, data),
  removeLargeEvent: (id: string) =>
    request.delete(`/risk-assessments/large-events/${id}`),
  checkConflict: (flightPlanId: string) =>
    request.get(`/risk-assessments/large-events/conflict/${flightPlanId}`),
  getAssessment: (flightPlanId: string) =>
    request.get(`/risk-assessments/${flightPlanId}`),
  assess: (flightPlanId: string, data: any) =>
    request.post(`/risk-assessments/${flightPlanId}`, data),
};
