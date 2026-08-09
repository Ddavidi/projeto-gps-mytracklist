import api from './api';

// =====================
// Follow / Unfollow
// =====================

/**
 * Segue um utilizador pelo ID.
 */
export const followUser = async (targetUserId) => {
  const response = await api.post(`/social/follow/${targetUserId}`);
  return response.data;
};

/**
 * Deixa de seguir um utilizador pelo ID.
 */
export const unfollowUser = async (targetUserId) => {
  const response = await api.delete(`/social/follow/${targetUserId}`);
  return response.data;
};

/**
 * Verifica se o utilizador autenticado segue outro.
 */
export const checkIsFollowing = async (targetUserId) => {
  try {
    const response = await api.get(`/social/is-following/${targetUserId}`);
    return response.data.isFollowing;
  } catch {
    return false;
  }
};

/**
 * Obtém seguidores de um utilizador.
 */
export const getFollowers = async (userId) => {
  const response = await api.get(`/social/followers/${userId}`);
  return response.data;
};

/**
 * Obtém lista de quem um utilizador segue.
 */
export const getFollowing = async (userId) => {
  const response = await api.get(`/social/following/${userId}`);
  return response.data;
};

// =====================
// Review Likes
// =====================

/**
 * Curte uma avaliação.
 */
export const likeReview = async (reviewId) => {
  const response = await api.post(`/social/reviews/${reviewId}/like`);
  return response.data;
};

/**
 * Remove curtida de uma avaliação.
 */
export const unlikeReview = async (reviewId) => {
  const response = await api.delete(`/social/reviews/${reviewId}/like`);
  return response.data;
};

/**
 * Obtém quem curtiu uma avaliação.
 */
export const getReviewLikes = async (reviewId) => {
  const response = await api.get(`/social/reviews/${reviewId}/likes`);
  return response.data;
};

// =====================
// Feed
// =====================

/**
 * Obtém o feed social do utilizador autenticado.
 * @param {number} limit - Número de itens por página (máx. 50)
 * @param {number} offset - Posição de início
 */
export const getSocialFeed = async (limit = 20, offset = 0) => {
  const response = await api.get('/social/feed', { params: { limit, offset } });
  return response.data;
};

// =====================
// Friends Reviews (AniList-style)
// =====================

/**
 * Obtém avaliações de amigos para um item específico.
 * @param {string} itemType - 'track', 'album' ou 'artist'
 * @param {string} itemId - ID do item no Spotify
 */
export const getFriendsReviews = async (itemType, itemId) => {
  try {
    const response = await api.get(`/social/friends-reviews/${itemType}/${itemId}`);
    return response.data.friendsReviews || [];
  } catch {
    return [];
  }
};
