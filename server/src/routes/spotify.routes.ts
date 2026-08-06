import { Router, Request, Response } from 'express';
import { SpotifyService } from '../services/SpotifyService';
import { requireAuth } from '../middleware/auth';

export function createSpotifyRouter(spotifyService: SpotifyService): Router {
  const router = Router();

  // Todas as rotas do Spotify requerem autenticação
  router.use(requireAuth);

  /**
   * GET /spotify/search?q=query
   * Pesquisa músicas no Spotify.
   */
  router.get('/search', async (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (!query) {
      res.status(400).json({ error: 'Parâmetro de busca (q) é obrigatório.' });
      return;
    }

    try {
      const results = await spotifyService.searchTracks(query);
      res.json(results);
    } catch (err) {
      console.error('Erro na busca Spotify:', err);
      res.status(500).json({ error: 'Falha ao buscar músicas no Spotify.' });
    }
  });

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

  return router;
}
