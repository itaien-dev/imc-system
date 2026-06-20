import apiClient from './client';

export async function listAccessLog({ page = 1, pageSize = 50, action } = {}) {
  const { data } = await apiClient.get('/access-log', { params: { page, pageSize, action } });
  return data;
}
