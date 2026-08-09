import { Router, Request, Response } from 'express';
import { SpotifyService } from '../services/SpotifyService';
import { requireAuth } from '../middleware/auth';

export function createSpotifyRouter(spotifyService: SpotifyService): Router {
  const router = Router();

  // Todas as rotas do Spotify requerem autenticação
  router.use(requireAuth);

  // =====================
  // Search
  // =====================

  /**
   * GET /spotify/search?q=query&type=track,album,artist
   * Pesquisa músicas, álbuns e artistas no Spotify.
   */
  router.get('/search', async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const type = (req.query.type as string) || 'track,album,artist';
    const limit = Math.min(Number(req.query.limit) || 10, 20);

    if (!query) {
      res.status(400).json({ error: 'Parâmetro de busca (q) é obrigatório.' });
      return;
    }

    try {
      // If searching only for tracks (legacy behavior), use old method
      if (type === 'track') {
        const results = await spotifyService.searchTracks(query, limit);
        res.json({ tracks: results, albums: [], artists: [] });
      } else {
        const results = await spotifyService.searchAll(query, type, limit);
        res.json(results);
      }
    } catch (err) {
      console.error('Erro na busca Spotify:', err);
      res.status(500).json({ error: 'Falha ao buscar no Spotify.' });
    }
  });

  // =====================
  // Tracks
  // =====================

  /**
   * GET /spotify/tracks/:id
   * Obtém detalhes de uma música específica.
   */
  router.get('/tracks/:id', async (req: Request, res: Response) => {
    try {
      const details = await spotifyService.getTrackDetails(req.params.id!);
      res.json(details);
    } catch (err) {
      console.error('Erro ao obter detalhes da música:', err);
      res.status(500).json({ error: 'Falha ao obter detalhes da música.' });
    }
  });

  /**
   * POST /spotify/tracks/batch
   * Obtém detalhes de múltiplas músicas de uma vez (resolve o problema N+1).
   * Body: { ids: ["id1", "id2", ...] }
   */
  router.post('/tracks/batch', async (req: Request, res: Response) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Array de IDs é obrigatório.' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ error: 'Máximo de 50 IDs por requisição.' });
      return;
    }

    try {
      const tracks = await spotifyService.getMultipleTracks(ids);
      res.json(tracks);
    } catch (err) {
      console.error('Erro ao obter múltiplas músicas:', err);
      res.status(500).json({ error: 'Falha ao obter detalhes das músicas.' });
    }
  });

  // =====================
  // Albums
  // =====================

  /**
   * GET /spotify/albums/:id
   * Obtém detalhes de um álbum específico.
   */
  router.get('/albums/:id', async (req: Request, res: Response) => {
    try {
      const details = await spotifyService.getAlbumDetails(req.params.id!);
      res.json(details);
    } catch (err) {
      console.error('Erro ao obter detalhes do álbum:', err);
      res.status(500).json({ error: 'Falha ao obter detalhes do álbum.' });
    }
  });

  /**
   * POST /spotify/albums/batch
   * Obtém detalhes de múltiplos álbuns de uma vez.
   * Body: { ids: ["id1", "id2", ...] }  (máx. 20)
   */
  router.post('/albums/batch', async (req: Request, res: Response) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Array de IDs é obrigatório.' });
      return;
    }
    if (ids.length > 20) {
      res.status(400).json({ error: 'Máximo de 20 IDs por requisição para álbuns.' });
      return;
    }

    try {
      const albums = await spotifyService.getMultipleAlbums(ids);
      res.json(albums);
    } catch (err) {
      console.error('Erro ao obter múltiplos álbuns:', err);
      res.status(500).json({ error: 'Falha ao obter detalhes dos álbuns.' });
    }
  });

  // =====================
  // Artists
  // =====================

  /**
   * GET /spotify/artists/:id
   * Obtém detalhes de um artista específico (inclui top tracks).
   */
  router.get('/artists/:id', async (req: Request, res: Response) => {
    try {
      const details = await spotifyService.getArtistDetails(req.params.id!);
      res.json(details);
    } catch (err) {
      console.error('Erro ao obter detalhes do artista:', err);
      res.status(500).json({ error: 'Falha ao obter detalhes do artista.' });
    }
  });

  /**
   * POST /spotify/artists/batch
   * Obtém detalhes de múltiplos artistas de uma vez.
   * Body: { ids: ["id1", "id2", ...] }  (máx. 50)
   */
  router.post('/artists/batch', async (req: Request, res: Response) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Array de IDs é obrigatório.' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ error: 'Máximo de 50 IDs por requisição para artistas.' });
      return;
    }

    try {
      const artists = await spotifyService.getMultipleArtists(ids);
      res.json(artists);
    } catch (err) {
      console.error('Erro ao obter múltiplos artistas:', err);
      res.status(500).json({ error: 'Falha ao obter detalhes dos artistas.' });
    }
  });

  return router;
}
