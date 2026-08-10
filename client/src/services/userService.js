import api from './api';

/**
 * Pesquisa utilizadores pelo nome (parcial).
 * @param {string} query O termo de pesquisa.
 * @returns {Promise<Array>} Lista de utilizadores encontrados.
 */
export const searchUsers = async (query) => {
  if (!query) return [];
  const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const uploadCover = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post('/upload/cover', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};