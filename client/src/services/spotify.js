import api from './api';

/**
 * Pesquisa múltiplos tipos (músicas, álbuns, artistas) no Spotify via backend.
 * @param {string} query O termo de busca.
 * @returns {Promise<{tracks: Array, albums: Array, artists: Array}>}
 */
export const searchMulti = async (query) => {
  const response = await api.get('/spotify/search', {
    params: {
      q: query,
    },
  });
  return response.data;
};

export const searchTracks = async (query) => {
  const data = await searchMulti(query);
  return data.tracks || [];
};

/**
 * Função para obter os detalhes de um álbum.
 * @param {string} albumId O ID do álbum no Spotify.
 * @returns {Promise<Object>}
 */
export const getAlbumDetails = async (albumId) => {
  const response = await api.get(`/spotify/albums/${albumId}`);
  return response.data;
};

/**
 * Função para obter os detalhes de um artista.
 * @param {string} artistId O ID do artista no Spotify.
 * @returns {Promise<Object>}
 */
export const getArtistDetails = async (artistId) => {
  const response = await api.get(`/spotify/artists/${artistId}`);
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

/**
 * Função para obter os detalhes de múltiplos álbuns de uma só vez (batch).
 * @param {string[]} albumIds Array de IDs de álbuns do Spotify.
 * @returns {Promise<Object>} Um mapa { albumId: albumData }.
 */
export const getMultipleAlbumDetails = async (albumIds) => {
  if (!albumIds || albumIds.length === 0) return {};

  const response = await api.post('/spotify/albums/batch', { ids: albumIds });

  const map = {};
  response.data.forEach((album) => {
    map[album.id] = album;
  });
  return map;
};

/**
 * Função para obter os detalhes de múltiplos artistas de uma só vez (batch).
 * @param {string[]} artistIds Array de IDs de artistas do Spotify.
 * @returns {Promise<Object>} Um mapa { artistId: artistData }.
 */
export const getMultipleArtistDetails = async (artistIds) => {
  if (!artistIds || artistIds.length === 0) return {};

  const response = await api.post('/spotify/artists/batch', { ids: artistIds });

  const map = {};
  response.data.forEach((artist) => {
    map[artist.id] = artist;
  });
  return map;
};
