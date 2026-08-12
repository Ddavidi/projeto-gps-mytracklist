import { Router, Request, Response } from 'express';
import { ReviewController } from '../controllers/ReviewController';
import { requireAuth } from '../middleware/auth';

type ItemType = 'track' | 'album' | 'artist';
const VALID_ITEM_TYPES: ItemType[] = ['track', 'album', 'artist'];

export function createReviewRouter(reviewController: ReviewController): Router {
  const router = Router();

  // Todas as rotas de reviews requerem autenticação
  // Caso deseje tornar a rota de stats pública, ela deve vir ANTES do requireAuth.
  // router.get('/stats/:itemType/:itemId', async (req, res) => { ... })
  
  router.use(requireAuth);

  /**
   * GET /reviews/feed
   * Obtém as avaliações mais recentes de toda a rede social.
   */
  router.get('/feed', async (req: Request, res: Response) => {
    const result = await reviewController.getRecentReviews(req.user!.userId);
    if (result.success) res.json(result.reviews);
    else res.status(500).json({ error: result.message });
  });

  /**
   * GET /reviews/stats/:itemType/:itemId
   * Obtém as estatísticas de um item (média de notas e distribuição).
   */
  router.get('/stats/:itemType/:itemId', async (req: Request, res: Response) => {
    const { itemType, itemId } = req.params as { itemType: string; itemId: string };

    if (!VALID_ITEM_TYPES.includes(itemType as ItemType)) {
      res.status(400).json({ error: 'Tipo de item inválido. Use: track, album ou artist.' });
      return;
    }

    const result = await reviewController.getItemStats(itemType as ItemType, itemId);

    if (result.success) {
      res.json(result.stats);
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  /**
   * GET /reviews/:itemType/:itemId
   * Obtém a avaliação do utilizador autenticado para um item (track, album ou artist).
   */
  router.get('/:itemType/:itemId', async (req: Request, res: Response) => {
    const { itemType, itemId } = req.params as { itemType: string; itemId: string };

    if (!VALID_ITEM_TYPES.includes(itemType as ItemType)) {
      res.status(400).json({ error: 'Tipo de item inválido. Use: track, album ou artist.' });
      return;
    }

    const result = await reviewController.getReviewForItem(
      req.user!.userId,
      itemType as ItemType,
      itemId
    );

    if (result.success) {
      res.json(result.review);
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  /**
   * POST /reviews
   * Cria uma nova avaliação.
   * Body: { itemId, itemType, rating, reviewText? }
   */
  router.post('/', async (req: Request, res: Response) => {
    const { itemId, itemType, rating, reviewText, itemName, itemImageUrl, itemPreviewUrl } = req.body;

    if (!itemId) {
      res.status(400).json({ error: 'ID do item é obrigatório.' });
      return;
    }
    if (!itemType || !VALID_ITEM_TYPES.includes(itemType as ItemType)) {
      res.status(400).json({ error: 'Tipo de item inválido. Use: track, album ou artist.' });
      return;
    }

    const result = await reviewController.createReview(
      req.user!.userId,
      itemType as ItemType,
      itemId,
      Number(rating),
      reviewText,
      itemName,
      itemImageUrl,
      itemPreviewUrl
    );

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  /**
   * PUT /reviews/:reviewId
   * Atualiza uma avaliação existente.
   * Body: { rating, reviewText? }
   */
  router.put('/:reviewId', async (req: Request, res: Response) => {
    const result = await reviewController.updateReview(
      Number(req.params.reviewId!),
      req.user!.userId,
      Number(req.body.rating),
      req.body.reviewText
    );

    if (result.success) {
      res.json({ message: 'Avaliação atualizada com sucesso.' });
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  /**
   * DELETE /reviews/:reviewId
   * Apaga uma avaliação.
   */
  router.delete('/:reviewId', async (req: Request, res: Response) => {
    const result = await reviewController.deleteReview(
      Number(req.params.reviewId!),
      req.user!.userId
    );

    if (result.success) {
      res.json({ message: 'Avaliação apagada com sucesso.' });
    } else {
      res.status(400).json({ error: result.message });
    }
  });



  // ==========================
  // COMENTÁRIOS
  // ==========================

  router.get('/:reviewId/comments', async (req: Request, res: Response) => {
    const result = await reviewController.getReviewComments(Number(req.params.reviewId));
    if (result.success) res.json(result.comments);
    else res.status(500).json({ error: result.message });
  });

  router.post('/:reviewId/comments', async (req: Request, res: Response) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'O comentário é obrigatório.' });

    const result = await reviewController.addComment(Number(req.params.reviewId), req.user!.userId, content);
    if (result.success) res.status(201).json({ success: true, message: 'Comentário adicionado.' });
    else res.status(400).json({ error: result.message });
  });

  return router;
}
