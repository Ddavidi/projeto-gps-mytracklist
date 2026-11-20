import api from './api';

export const getMyListenLater = async () => {
  const res = await api.get('/listen-later/me');
  return res.data?.items || (Array.isArray(res.data) ? res.data : []);
};

export const getUserListenLater = async (userId) => {
  const res = await api.get(`/listen-later/user/${userId}`);
  return {
    isPrivate: Boolean(res.data?.isPrivate),
    items: res.data?.items || (Array.isArray(res.data) ? res.data : []),
  };
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

export const reorderListenLater = async (items) => {
  const res = await api.put('/listen-later/reorder', { items });
  return res.data;
};

export const updateListenLaterVisibility = async (isPublic) => {
  const res = await api.put('/listen-later/visibility', { isPublic });
  return res.data;
};

