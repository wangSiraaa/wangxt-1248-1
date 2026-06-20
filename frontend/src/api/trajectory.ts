import request from '@/utils/request';

export const trajectoryApi = {
  list: (flightPlanId?: string, status?: string) =>
    request.get('/trajectories', { params: { flightPlanId, status } }),
  detail: (id: string) => request.get(`/trajectories/${id}`),
  upload: (flightPlanId: string, data: any) =>
    request.post(`/trajectories/flight-plan/${flightPlanId}`, data),
  startReview: (id: string) =>
    request.post(`/trajectories/${id}/start-review`),
  reviewApprove: (id: string, data: any) =>
    request.post(`/trajectories/${id}/review-approve`, data),
  reviewReject: (id: string, data: any) =>
    request.post(`/trajectories/${id}/review-reject`, data),
  archive: (id: string) => request.post(`/trajectories/${id}/archive`),
};
