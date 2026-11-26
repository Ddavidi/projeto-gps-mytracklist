import api from './api';

export const getPublicLists = async (limit = 24) => {
  const res = await api.get(`/lists/public?limit=${limit}`);
  return res.data || [];
};

export const getUserLists = async (userId) => {
  const res = await api.get(`/lists/user/${userId}`);
  return res.data || [];
};

export const getListById = async (listId) => {
  const res = await api.get(`/lists/${listId}`);
  return res.data;
};

export const createList = async ({ title, description, isRanked = true, isPublic = true, listType = 'album' }) => {
  const res = await api.post('/lists', { title, description, isRanked, isPublic, listType });
  return res.data;
};

export const updateList = async (listId, { title, description, isRanked, isPublic }) => {
  const res = await api.put(`/lists/${listId}`, { title, description, isRanked, isPublic });
  return res.data;
};

export const deleteList = async (listId) => {
  const res = await api.delete(`/lists/${listId}`);
  return res.data;
};

export const addItemToList = async (listId, item) => {
  const res = await api.post(`/lists/${listId}/items`, item);
  return res.data;
};

export const addItemsBulkToList = async (listId, items) => {
  const res = await api.post(`/lists/${listId}/items/bulk`, { items });
  return res.data;
};

export const exportPlaylistToSpotify = async ({ name, description = '', isPublic = true, trackIds = [] }) => {
  const res = await api.post('/spotify/me/playlists/export', { name, description, isPublic, trackIds });
  return res.data;
};

export const importSpotifyPlaylistById = async (playlistId) => {
  const res = await api.get(`/spotify/playlists/import/${encodeURIComponent(playlistId)}`);
  return res.data;
};

export const removeItemFromList = async (listId, itemRowId) => {
  const res = await api.delete(`/lists/${listId}/items/${itemRowId}`);
  return res.data;
};

export const reorderListItems = async (listId, items) => {
  const res = await api.put(`/lists/${listId}/reorder`, { items });
  return res.data;
};

export const toggleLikeList = async (listId) => {
  const res = await api.post(`/lists/${listId}/like`);
  return res.data;
};

