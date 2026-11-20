import api from './api';

export const getMyListenLater = async () => {
  const res = await api.get('/listen-later/me');
  return res.data || [];
};

export const getUserListenLater = async (userId) => {
  const res = await api.get(`/listen-later/user/${userId}`);
  return res.data || [];
};

export const checkListenLater = async (itemType, itemId) => {
  const res = await api.get(`/listen-later/check/${itemType}/${itemId}`);
  return Boolean(res.data?.saved);
};

export const addListenLater = async (item) => {
  const res = await api.post('/listen-later', item);
  return res.data;
};

export const removeListenLater = async (itemType, itemId) => {
  const res = await api.delete(`/listen-later/${itemType}/${itemId}`);
  return res.data;
};

