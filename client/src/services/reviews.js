import api from './api';

/**
 * Obtém a avaliação do utilizador para um item (track, album ou artist).
 * @param {string} itemType - 'track', 'album' ou 'artist'
 * @param {string} itemId - ID do item no Spotify
 */
export const getUserReviewForItem = async (itemType, itemId) => {
  try {
    const response = await api.get(`/reviews/${itemType}/${itemId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar avaliação existente:', error);
    return null;
  }
};

/**
 * @deprecated Use getUserReviewForItem instead.
 * Mantido para compatibilidade com componentes ainda não migrados.
 */
export const getUserReviewForTrack = async (trackId) => {
  return getUserReviewForItem('track', trackId);
};

/**
 * Cria ou atualiza uma avaliação para qualquer tipo de item.
 * @param {string} itemType - 'track', 'album' ou 'artist'
 * @param {string} itemId - ID do item no Spotify
 * @param {number} rating - Nota (0-10)
 * @param {string|null} reviewText - Texto da review (opcional)
 * @param {number|null} existingReviewId - ID da avaliação existente (para update)
 */
export const saveReview = async (itemType, itemId, rating, reviewText = null, existingReviewId = null) => {
  if (existingReviewId) {
    const response = await api.put(`/reviews/${existingReviewId}`, { rating, reviewText });
    return response.data;
  } else {
    const response = await api.post('/reviews', { itemType, itemId, rating, reviewText });
    return response.data;
  }
};

/**
 * Apaga uma avaliação.
 * @param {number} reviewId - ID da avaliação
 */
export const deleteReview = async (reviewId) => {
  const response = await api.delete(`/reviews/${reviewId}`);
  return response.data;
};

/**
 * Obtém todas as avaliações do utilizador autenticado.
 */
export const getMyReviews = async () => {
  const response = await api.get('/users/me/reviews');
  return response.data;
};

/**
 * Obtém as avaliações de um utilizador específico pelo nome.
 * @param {string} username
 */
export const getUserReviewsByUsername = async (username) => {
  const response = await api.get(`/users/${username}/reviews`);
  return response.data;
};