import { Router, Request, Response } from 'express';
import { ListenLaterController } from '../controllers/ListenLaterController';
import { requireAuth } from '../middleware/auth';

export function createListenLaterRouter(controller: ListenLaterController): Router {
  const router = Router();

  // Público: ver fila "Quero Ouvir" de um perfil
  router.get('/user/:userId', async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }
    const result = await controller.getUserItems(userId);
    if (result.success) res.json(result.items);
    else res.status(500).json({ error: result.message });
  });

  router.use(requireAuth);

  router.get('/me', async (req: Request, res: Response) => {
    const result = await controller.getUserItems(req.user!.userId);
    if (result.success) res.json(result.items);
    else res.status(500).json({ error: result.message });
  });

  router.get('/check/:itemType/:itemId', async (req: Request, res: Response) => {
    const result = await controller.checkItem(
      req.user!.userId,
      req.params.itemType as string,
      req.params.itemId as string
    );
    res.json({ saved: result.saved });
  });

  router.post('/', async (req: Request, res: Response) => {
    const { itemId, itemType, itemName, itemArtist, itemImageUrl } = req.body;
    if (!itemId || !itemType || !itemName) {
      res.status(400).json({ error: 'itemId, itemType e itemName são obrigatórios.' });
      return;
    }
    const result = await controller.addItem(req.user!.userId, {
      itemId,
      itemType,
      itemName,
      itemArtist,
      itemImageUrl,
    });
    if (result.success) res.status(201).json({ success: true });
    else res.status(400).json({ error: result.message });
  });

  router.delete('/:itemType/:itemId', async (req: Request, res: Response) => {
    const result = await controller.removeItem(
      req.user!.userId,
      req.params.itemType as string,
      req.params.itemId as string
    );
    if (result.success) res.json({ success: true });
    else res.status(400).json({ error: result.message });
  });

  return router;
}

