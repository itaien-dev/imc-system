import apiClient from './client';

export async function previewUsersCsv(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/import/users/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.rows;
}

export async function commitUsersCsv(rows) {
  const { data } = await apiClient.post('/import/users/commit', { rows });
  return data;
}

export async function previewWorkshopsCsv(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/import/workshops/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.rows;
}

export async function commitWorkshopsCsv(rows) {
  const { data } = await apiClient.post('/import/workshops/commit', { rows });
  return data;
}
