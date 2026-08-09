import api from './api';

/**
 * Pesquisa músicas, álbuns e artistas no Spotify.
 * @param {string} query - Termo de busca
 * @param {string} type - 'track,album,artist' ou combinação específica
 * @param {number} limit - Resultados por tipo (máx. 20)
 */
export const searchSpotify = async (query, type = 'track,album,artist', limit = 10) => {
  const response = await api.get('/spotify/search', {
    params: { q: query, type, limit },
  });
  return response.data; // { tracks: [], albums: [], artists: [] }
};

/**
 * @deprecated Use searchSpotify instead.
 * Mantido para compatibilidade.
 */
export const searchTracks = async (query) => {
  const result = await searchSpotify(query, 'track', 20);
  return result.tracks || [];
};

/**
 * Obtém os detalhes de uma única música.
 */
export const getTrackDetails = async (trackId) => {
  const response = await api.get(`/spotify/tracks/${trackId}`);
  return response.data;
};

/**
 * Obtém detalhes de múltiplas músicas de uma só vez (batch).
 * Resolve o problema N+1 ao listar avaliações.
 * @param {string[]} trackIds - Array de IDs (máx. 50)
 * @returns {Object} Mapa { trackId: trackData }
 */
export const getMultipleTrackDetails = async (trackIds) => {
  if (!trackIds || trackIds.length === 0) return {};

  const response = await api.post('/spotify/tracks/batch', { ids: trackIds });

  const trackMap = {};
  response.data.forEach((track) => {
    trackMap[track.id] = track;
  });
  return trackMap;
};

// =====================
// Albums
// =====================

/**
 * Obtém os detalhes de um álbum específico.
 */
export const getAlbumDetails = async (albumId) => {
  const response = await api.get(`/spotify/albums/${albumId}`);
  return response.data;
};

/**
 * Obtém detalhes de múltiplos álbuns de uma só vez (batch).
 * @param {string[]} albumIds - Array de IDs (máx. 20)
 * @returns {Object} Mapa { albumId: albumData }
 */
export const getMultipleAlbumDetails = async (albumIds) => {
  if (!albumIds || albumIds.length === 0) return {};

  const response = await api.post('/spotify/albums/batch', { ids: albumIds });

  const albumMap = {};
  response.data.forEach((album) => {
    albumMap[album.id] = album;
  });
  return albumMap;
};

// =====================
// Artists
// =====================

/**
 * Obtém os detalhes de um artista específico (inclui top tracks).
 */
export const getArtistDetails = async (artistId) => {
  const response = await api.get(`/spotify/artists/${artistId}`);
  return response.data;
};

/**
 * Obtém detalhes de múltiplos artistas de uma só vez (batch).
 * @param {string[]} artistIds - Array de IDs (máx. 50)
 * @returns {Object} Mapa { artistId: artistData }
 */
export const getMultipleArtistDetails = async (artistIds) => {
  if (!artistIds || artistIds.length === 0) return {};

  const response = await api.post('/spotify/artists/batch', { ids: artistIds });

  const artistMap = {};
  response.data.forEach((artist) => {
    artistMap[artist.id] = artist;
  });
  return artistMap;
};
