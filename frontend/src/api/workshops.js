import apiClient from './client';

export async function listWorkshops({ search, track, page, pageSize } = {}) {
  const { data } = await apiClient.get('/workshops', { params: { search, track, page, pageSize } });
  return data;
}

export async function createWorkshop(payload) {
  const { data } = await apiClient.post('/workshops', payload);
  return data;
}

export async function getWorkshop(id) {
  const { data } = await apiClient.get(`/workshops/${id}`);
  return data;
}

export async function getParticipants(workshopId, role) {
  const { data } = await apiClient.get(`/workshops/${workshopId}/participants`, { params: { role } });
  return data;
}

export async function addParticipant(workshopId, userId, role) {
  const { data } = await apiClient.post(`/workshops/${workshopId}/participants`, { userId, role });
  return data;
}

export async function exportParticipantsCsv(workshopId, role) {
  const { data } = await apiClient.get(`/workshops/${workshopId}/export`, {
    params: { role },
    responseType: 'blob',
  });
  return data;
}

export async function getClosingSummary(workshopId) {
  const { data } = await apiClient.get(`/workshops/${workshopId}/closing-summary`);
  return data;
}

export async function closeWorkshop(workshopId, payload) {
  const { data } = await apiClient.post(`/workshops/${workshopId}/close`, payload);
  return data;
}
