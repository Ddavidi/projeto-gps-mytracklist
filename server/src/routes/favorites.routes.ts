import { Router, Request, Response } from 'express';
import { FavoriteController } from '../controllers/FavoriteController';
import { requireAuth } from '../middleware/auth';

export function createFavoriteRouter(favoriteController: FavoriteController): Router {
  const router = Router();

  // GET /favorites/:userId -> Retorna favoritos de um usuário (rota pública, não precisa de auth)
  router.get('/:userId', async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId as string, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'ID de utilizador inválido.' });
      return;
    }
    const result = await favoriteController.getUserFavorites(userId);
    if (result.success) {
      res.json(result.favorites);
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  // Rotas que modificam dados precisam de autenticação
  router.use(requireAuth);

  // POST /favorites -> Adiciona favorito
  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const { item_type, item_id } = req.body;
    
    if (!item_type || !item_id) {
      res.status(400).json({ error: 'Campos item_type e item_id são obrigatórios.' });
      return;
    }

    const userId = req.user!.userId;
    const result = await favoriteController.addFavorite(userId, item_type, item_id);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  // DELETE /favorites/:itemType/:itemId -> Remove favorito
  router.delete('/:itemType/:itemId', async (req: Request, res: Response): Promise<void> => {
    const { itemType, itemId } = req.params;
    const userId = req.user!.userId;

    const result = await favoriteController.removeFavorite(userId, itemType as string, itemId as string);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  return router;
}
