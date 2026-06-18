import apiClient from './client';

export async function getPublicWorkshops() {
  const { data } = await apiClient.get('/public/workshops');
  return data;
}

export async function submitSignup(workshopId, payload) {
  const { data } = await apiClient.post(`/public/workshops/${workshopId}/signup`, payload);
  return data;
}
