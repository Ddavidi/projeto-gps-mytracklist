import { Router, Request, Response } from 'express';
import { SpotifyService } from '../services/SpotifyService';
import { UserController } from '../controllers/UserController';
import { requireAuth } from '../middleware/auth';

export function createSpotifyRouter(spotifyService: SpotifyService, userController: UserController): Router {
  const router = Router();

  /**
   * GET /spotify/trending
   * Obtém os "Em Alta" (Trending). Não requer autenticação (para a Home deslogada).
   */
  router.get('/trending', async (req: Request, res: Response) => {
    try {
      const trending = await spotifyService.getTrending();
      res.json(trending);
    } catch (err) {
      console.error('Erro ao obter trending:', err);
      res.status(500).json({ error: 'Falha ao obter os lançamentos do Spotify.' });
    }
  });

  /**
   * GET /spotify/search?q=query
   * Pesquisa músicas, álbuns e artistas no Spotify.
   */
  router.get('/search', async (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (!query) {
      res.status(400).json({ error: 'Parâmetro de busca (q) é obrigatório.' });
      return;
    }

    try {
      const results = await spotifyService.searchMulti(query);
      res.json(results);
    } catch (err) {
      console.error('Erro na busca Spotify:', err);
      res.status(500).json({ error: 'Falha ao buscar no Spotify.' });
    }
  });

  // Todas as demais rotas do Spotify requerem autenticação
  router.use(requireAuth);

  /**
   * GET /spotify/albums/:id
   * Obtém detalhes de um álbum específico e a sua lista de músicas.
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
   * GET /spotify/artists/:id
   * Obtém detalhes de um artista, top tracks e discografia.
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

  /**
   * POST /spotify/albums/batch
   * Obtém detalhes de múltiplos álbuns de uma vez.
   * Body: { ids: ["id1", "id2", ...] }
   */
  router.post('/albums/batch', async (req: Request, res: Response) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Array de IDs é obrigatório.' });
      return;
    }

    if (ids.length > 20) {
      res.status(400).json({ error: 'Máximo de 20 IDs por requisição.' });
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

  /**
   * POST /spotify/artists/batch
   * Obtém detalhes de múltiplos artistas de uma vez.
   * Body: { ids: ["id1", "id2", ...] }
   */
  router.post('/artists/batch', async (req: Request, res: Response) => {
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
      const artists = await spotifyService.getMultipleArtists(ids);
      res.json(artists);
    } catch (err) {
      console.error('Erro ao obter múltiplos artistas:', err);
      res.status(500).json({ error: 'Falha ao obter detalhes dos artistas.' });
    }
  });

  // ==========================================
  // ROTAS ESPECÍFICAS DE USUÁRIO (OAUTH)
  // ==========================================

  router.get('/user/:userId/playlists', async (req: Request, res: Response) => {
    try {
      const accessToken = await spotifyService.getValidUserAccessToken(Number(req.params.userId), userController);
      const playlists = await spotifyService.getUserPlaylists(accessToken);
      res.json(playlists);
    } catch (err: any) {
      console.error('Erro ao obter playlists do usuário:', err.message);
      res.status(500).json({ error: err.message || 'Falha ao obter playlists.' });
    }
  });

  router.get('/user/:userId/playlists/:playlistId/tracks', async (req: Request, res: Response) => {
    try {
      const accessToken = await spotifyService.getValidUserAccessToken(Number(req.params.userId), userController);
      const tracks = await spotifyService.getPlaylistTracks(accessToken, req.params.playlistId);
      res.json(tracks);
    } catch (err: any) {
      console.error('Erro ao obter faixas da playlist:', err.message);
      res.status(500).json({ error: err.message || 'Falha ao obter faixas da playlist.' });
    }
  });

  router.get('/user/:userId/recent', async (req: Request, res: Response) => {
    try {
      const accessToken = await spotifyService.getValidUserAccessToken(Number(req.params.userId), userController);
      const recent = await spotifyService.getUserRecentlyPlayed(accessToken);
      res.json(recent);
    } catch (err: any) {
      console.error('Erro ao obter músicas recentes do usuário:', err.message);
      res.status(500).json({ error: err.message || 'Falha ao obter músicas recentes.' });
    }
  });

  router.get('/user/:userId/top/:type', async (req: Request, res: Response) => {
    const { type } = req.params;
    const timeRange = (req.query.time_range as string) || 'short_term';

    if (type !== 'tracks' && type !== 'artists') {
      res.status(400).json({ error: 'O tipo deve ser tracks ou artists.' });
      return;
    }

    try {
      const accessToken = await spotifyService.getValidUserAccessToken(Number(req.params.userId), userController);
      const topItems = await spotifyService.getUserTopItems(accessToken, type, timeRange as 'short_term'|'medium_term'|'long_term');
      res.json(topItems);
    } catch (err: any) {
      console.error(`Erro ao obter top ${type} do usuário:`, err.message);
      res.status(500).json({ error: err.message || `Falha ao obter top ${type}.` });
    }
  });

  // ==========================================
  // PLAYER CONTROL ROUTES (usa o token do user logado via JWT)
  // ==========================================

  /**
   * GET /spotify/me/playlists
   * Retorna as playlists do usuario logado (para o modal de add to playlist)
   */
  router.get('/me/playlists', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const accessToken = await spotifyService.getValidUserAccessToken(userId, userController);
      const playlists = await spotifyService.getUserPlaylists(accessToken);
      res.json(playlists);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Falha ao obter playlists.' });
    }
  });

  /**
   * GET /spotify/me/saved-tracks/contains?id=trackId
   * Verifica se a musica esta salva na biblioteca
   */
  router.get('/me/saved-tracks/contains', async (req: Request, res: Response) => {
    const trackId = req.query.id as string;
    if (!trackId) { res.status(400).json({ error: 'id é obrigatório' }); return; }
    try {
      const userId = (req as any).user?.id;
      const accessToken = await spotifyService.getValidUserAccessToken(userId, userController);
      const saved = await spotifyService.checkSavedTrack(accessToken, trackId);
      res.json({ saved });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * PUT /spotify/me/saved-tracks
   * Salva uma musica na biblioteca
   * Body: { trackId }
   */
  router.put('/me/saved-tracks', async (req: Request, res: Response) => {
    const { trackId } = req.body;
    if (!trackId) { res.status(400).json({ error: 'trackId é obrigatório' }); return; }
    try {
      const userId = (req as any).user?.id;
      const accessToken = await spotifyService.getValidUserAccessToken(userId, userController);
      await spotifyService.saveTrack(accessToken, trackId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * DELETE /spotify/me/saved-tracks
   * Remove uma musica da biblioteca
   * Body: { trackId }
   */
  router.delete('/me/saved-tracks', async (req: Request, res: Response) => {
    const { trackId } = req.body;
    if (!trackId) { res.status(400).json({ error: 'trackId é obrigatório' }); return; }
    try {
      const userId = (req as any).user?.id;
      const accessToken = await spotifyService.getValidUserAccessToken(userId, userController);
      await spotifyService.unsaveTrack(accessToken, trackId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /spotify/me/queue
   * Adiciona uma musica a fila do player ativo do usuario
   * Body: { trackId }
   */
  router.post('/me/queue', async (req: Request, res: Response) => {
    const { trackId } = req.body;
    if (!trackId) { res.status(400).json({ error: 'trackId é obrigatório' }); return; }
    try {
      const userId = (req as any).user?.id;
      const accessToken = await spotifyService.getValidUserAccessToken(userId, userController);
      await spotifyService.addToQueue(accessToken, `spotify:track:${trackId}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /spotify/playlists/:playlistId/tracks
   * Adiciona uma musica a uma playlist especifica do usuario
   * Body: { trackId }
   */
  router.post('/playlists/:playlistId/tracks', async (req: Request, res: Response) => {
    const { trackId } = req.body;
    const { playlistId } = req.params;
    if (!trackId) { res.status(400).json({ error: 'trackId é obrigatório' }); return; }
    try {
      const userId = (req as any).user?.id;
      const accessToken = await spotifyService.getValidUserAccessToken(userId, userController);
      await spotifyService.addTrackToPlaylist(accessToken, playlistId, `spotify:track:${trackId}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
