import api from './api';

/**
 * Função para procurar músicas através do nosso back-end.
 * @param {string} query O termo de busca para a música.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de músicas.
 */
export const searchTracks = async (query) => {
  const response = await api.get('/spotify/search', {
    params: {
      q: query,
    },
  });
  return response.data;
};

/**
 * Função para obter os detalhes de uma única música.
 * @param {string} trackId O ID da música no Spotify.
 * @returns {Promise<Object>} Uma promessa que resolve para um objeto com os detalhes da música.
 */
export const getTrackDetails = async (trackId) => {
  const response = await api.get(`/spotify/tracks/${trackId}`);
  return response.data;
};

/**
 * Função para obter os detalhes de múltiplas músicas de uma só vez (batch).
 * Resolve o problema N+1 ao listar avaliações.
 * @param {string[]} trackIds Array de IDs de músicas do Spotify (máx. 50).
 * @returns {Promise<Object>} Um mapa { trackId: trackData } para acesso rápido.
 */
export const getMultipleTrackDetails = async (trackIds) => {
  if (!trackIds || trackIds.length === 0) return {};

  const response = await api.post('/spotify/tracks/batch', { ids: trackIds });

  // Converte o array em um mapa para acesso O(1) por ID
  const trackMap = {};
  response.data.forEach((track) => {
    trackMap[track.id] = track;
  });
  return trackMap;
};
