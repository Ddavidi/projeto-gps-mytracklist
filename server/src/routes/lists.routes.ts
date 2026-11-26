import { Router, Request, Response } from 'express';
import { ListController } from '../controllers/ListController';
import { requireAuth } from '../middleware/auth';
import { verifyToken } from '../utils/jwt';

function getOptionalUserId(req: Request): number | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  const payload = verifyToken(header.slice(7));
  return payload?.userId;
}

export function createListRouter(listController: ListController): Router {
  const router = Router();

  // Público: listar listas da comunidade
  router.get('/public', async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 24, 50);
    const result = await listController.getPublicLists(limit, getOptionalUserId(req));
    if (result.success) res.json(result.lists);
    else res.status(500).json({ error: result.message });
  });

  // Listas de um usuário específico
  router.get('/user/:userId', async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }
    const result = await listController.getUserLists(userId, getOptionalUserId(req));
    if (result.success) res.json(result.lists);
    else res.status(500).json({ error: result.message });
  });

  // Detalhes de uma lista
  router.get('/:id', async (req: Request, res: Response) => {
    const listId = Number(req.params.id);
    if (isNaN(listId)) {
      res.status(400).json({ error: 'ID de lista inválido.' });
      return;
    }
    const result = await listController.getListById(listId, getOptionalUserId(req));
    if (result.success) res.json(result.list);
    else res.status(result.status || 500).json({ error: result.message });
  });

  // Rotas autenticadas
  router.use(requireAuth);

  router.post('/', async (req: Request, res: Response) => {
    const { title, description, isRanked, isPublic, listType } = req.body;
    const result = await listController.createList(
      req.user!.userId,
      title || '',
      description || '',
      isRanked !== false,
      isPublic !== false,
      listType || 'album'
    );
    if (result.success) res.status(201).json(result);
    else res.status(400).json({ error: result.message });
  });

  router.put('/:id', async (req: Request, res: Response) => {
    const { title, description, isRanked, isPublic } = req.body;
    const result = await listController.updateList(Number(req.params.id), req.user!.userId, {
      title,
      description,
      isRanked,
      isPublic,
    });
    if (result.success) res.json({ success: true });
    else res.status(400).json({ error: result.message });
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const result = await listController.deleteList(Number(req.params.id), req.user!.userId);
    if (result.success) res.json({ success: true });
    else res.status(400).json({ error: result.message });
  });

  router.post('/:id/items', async (req: Request, res: Response) => {
    const { itemId, itemType, itemName, itemArtist, itemImageUrl, note } = req.body;
    if (!itemId || !itemType || !itemName) {
      res.status(400).json({ error: 'itemId, itemType e itemName são obrigatórios.' });
      return;
    }
    const result = await listController.addItemToList(Number(req.params.id), req.user!.userId, {
      itemId,
      itemType,
      itemName,
      itemArtist,
      itemImageUrl,
      note,
    });
    if (result.success) res.status(201).json(result);
    else res.status(400).json({ error: result.message });
  });

  router.post('/:id/items/bulk', async (req: Request, res: Response) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items deve ser um array.' });
      return;
    }
    const result = await listController.addItemsBulk(Number(req.params.id), req.user!.userId, items);
    if (result.success) res.status(201).json(result);
    else res.status(400).json({ error: result.message });
  });

  router.delete('/:id/items/:itemRowId', async (req: Request, res: Response) => {
    const result = await listController.removeItemFromList(
      Number(req.params.id),
      req.user!.userId,
      Number(req.params.itemRowId)
    );
    if (result.success) res.json({ success: true });
    else res.status(400).json({ error: result.message });
  });

  router.put('/:id/reorder', async (req: Request, res: Response) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items deve ser um array com id e position.' });
      return;
    }
    const result = await listController.reorderItems(Number(req.params.id), req.user!.userId, items);
    if (result.success) res.json({ success: true });
    else res.status(400).json({ error: result.message });
  });

  router.post('/:id/like', async (req: Request, res: Response) => {
    const result = await listController.toggleLikeList(Number(req.params.id), req.user!.userId);
    if (result.success) res.json(result);
    else res.status(400).json({ error: result.message });
  });

  return router;
}

