import apiClient from './client';

export async function getMe() {
  const { data } = await apiClient.get('/users/me');
  return data;
}

export async function updateMe(patch) {
  const { data } = await apiClient.patch('/users/me', patch);
  return data;
}

export async function listUsers({ search, status, page, pageSize, sortBy, sortDir }) {
  const { data } = await apiClient.get('/users', { params: { search, status, page, pageSize, sortBy, sortDir } });
  return data;
}

export async function createUser(payload) {
  const { data } = await apiClient.post('/users', payload);
  return data;
}

export async function getUser(id) {
  const { data } = await apiClient.get(`/users/${id}`);
  return data;
}

export async function updateUser(id, patch) {
  const { data } = await apiClient.patch(`/users/${id}`, patch);
  return data;
}

export function getExportUrl({ search, status }) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  const token = localStorage.getItem('accessToken');
  // Export uses a direct link; the browser doesn't attach our axios interceptor's header,
  // so for simplicity in this scaffold we fetch via axios and trigger a client-side download instead.
  return { params, token };
}

export async function exportUsersCsv({ search, status }) {
  const { data } = await apiClient.get('/users/export', {
    params: { search, status },
    responseType: 'blob',
  });
  return data;
}

export async function searchUsers(query) {
  const { data } = await apiClient.get('/users/search', { params: { q: query } });
  return data;
}

export async function requestDeletion() {
  const { data } = await apiClient.post('/users/me/request-deletion');
  return data;
}

export async function deleteUser(id) {
  const { data } = await apiClient.delete(`/users/${id}`);
  return data;
}

export async function getMyWorkshopHistory() {
  const { data } = await apiClient.get('/users/me/history');
  return data;
}

export async function getUserWorkshopHistory(id) {
  const { data } = await apiClient.get(`/users/${id}/history`);
  return data;
}
