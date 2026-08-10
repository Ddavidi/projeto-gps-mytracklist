import api from './api';

export const getUserFavorites = async (userId) => {
  const response = await api.get(`/favorites/${userId}`);
  return response.data; // Retorna array de favoritos { id, item_id, item_type }
};

export const addFavorite = async (itemType, itemId) => {
  const response = await api.post('/favorites', { item_type: itemType, item_id: itemId });
  return response.data;
};

export const removeFavorite = async (itemType, itemId) => {
  const response = await api.delete(`/favorites/${itemType}/${itemId}`);
  return response.data;
};
