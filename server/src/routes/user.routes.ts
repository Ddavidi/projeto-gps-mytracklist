import { Router, Request, Response } from 'express';
import { UserController } from '../controllers/UserController';
import { requireAuth } from '../middleware/auth';

export function createUserRouter(userController: UserController): Router {
  const router = Router();

  // Todas as rotas de utilizadores requerem autenticação
  router.use(requireAuth);

  /**
   * GET /users/me/reviews
   * Obtém as avaliações do utilizador autenticado.
   */
  router.get('/me/reviews', async (req: Request, res: Response) => {
    const result = await userController.getUserReviews(req.user!.userId);

    if (result.success) {
      res.json(result.reviews);
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  /**
   * GET /users/search?q=query
   * Pesquisa utilizadores pelo nome (parcial).
   */
  router.get('/search', async (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (!query) {
      res.status(400).json({ error: 'Termo de pesquisa obrigatório.' });
      return;
    }

    const result = await userController.searchUsers(query);

    if (result.success) {
      res.json(result.users);
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  /**
   * GET /users/:username/reviews
   * Obtém as avaliações de um utilizador específico (perfil público).
   */
  router.get('/:username/reviews', async (req: Request, res: Response) => {
    const { username } = req.params as { username: string };

    const targetUser = await userController.getUserByUsername(username);
    if (!targetUser) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }

    const result = await userController.getUserReviews(targetUser.id);

    if (result.success) {
      res.json({
        user: { 
          id: targetUser.id, 
          username: targetUser.username,
          avatar_url: targetUser.avatar_url,
          cover_url: targetUser.cover_url,
          bio: (targetUser as any).bio
        },
        reviews: result.reviews
      });
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  router.get('/me/notifications', async (req: Request, res: Response) => {
    const result = await userController.getNotifications(req.user!.userId);
    if (result.success) res.json(result.notifications);
    else res.status(500).json({ error: result.message });
  });

  router.put('/me/notifications/read', async (req: Request, res: Response) => {
    const result = await userController.markNotificationsAsRead(req.user!.userId);
    if (result.success) res.json({ message: 'Lidas' });
    else res.status(500).json({ error: result.message });
  });

  router.put('/me/password', async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: 'Senhas obrigatórias' });
      return;
    }
    const result = await userController.changePassword(req.user!.userId, oldPassword, newPassword);
    if (result.success) res.json({ message: 'Senha atualizada' });
    else res.status(400).json({ error: result.message });
  });

  return router;
}
