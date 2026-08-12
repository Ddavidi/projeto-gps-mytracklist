import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { SpotifyService } from '../services/SpotifyService';
import { UserController } from '../controllers/UserController';
import jwt from 'jsonwebtoken';

export function createSpotifyAuthRouter(spotifyService: SpotifyService, userController: UserController): Router {
  const router = Router();

  /**
   * GET /api/auth/spotify/url
   * Retorna a URL de autorização do Spotify.
   * Usamos o JWT gerado no próprio app como o parâmetro 'state' para
   * sabermos qual usuário está se conectando quando o Spotify redirecionar de volta.
   */
  router.get('/url', requireAuth, (req: Request, res: Response) => {
    // req.user contains the decoded JWT { userId, username }
    const stateToken = jwt.sign(
      { userId: req.user!.userId },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' } // Token expira em 15 minutos (suficiente pro fluxo OAuth)
    );
    
    const url = spotifyService.getAuthorizationUrl(stateToken);
    res.json({ url });
  });

  /**
   * GET /api/auth/spotify/callback
   * O Spotify redireciona o usuário para cá após o login.
   * O query param `code` contém o código de autorização.
   * O query param `state` contém o token gerado acima.
   */
  router.get('/callback', async (req: Request, res: Response) => {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Erro na autorização do Spotify:', error);
      return res.redirect('http://localhost:5173/settings?spotify_error=access_denied');
    }

    if (!code || !state) {
      return res.redirect('http://localhost:5173/settings?spotify_error=missing_params');
    }

    try {
      // 1. Validar qual usuário fez a requisição decodificando o state
      const decoded = jwt.verify(state as string, process.env.JWT_SECRET || 'secret') as any;
      const userId = decoded.userId;

      // 2. Trocar o código pelo token
      const tokenData = await spotifyService.exchangeCodeForToken(code as string);
      
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      // Expires in é em segundos. Calculamos a data exata.
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // 3. Salvar no banco de dados
      await userController.updateSpotifyTokens(userId, accessToken, refreshToken, expiresAt);

      // 4. Redirecionar de volta para o frontend com sucesso
      return res.redirect('http://localhost:5173/settings?spotify_connected=true');
    } catch (err) {
      console.error('Falha ao processar callback do Spotify:', err);
      return res.redirect('http://localhost:5173/settings?spotify_error=auth_failed');
    }
  });

  /**
   * DELETE /api/auth/spotify/unlink
   * Remove a conexão com a conta do Spotify do usuário.
   */
  router.delete('/unlink', requireAuth, async (req: Request, res: Response) => {
    try {
      await userController.updateSpotifyTokens(req.user!.userId, null as any, null as any, new Date(0));
      res.json({ success: true, message: 'Conta do Spotify desvinculada com sucesso.' });
    } catch (err) {
      console.error('Falha ao desvincular conta do Spotify:', err);
      res.status(500).json({ error: 'Erro ao desvincular conta do Spotify.' });
    }
  });

  return router;
}
