import { Router, Request, Response } from 'express';
import { ReviewController } from '../controllers/ReviewController';
import { requireAuth } from '../middleware/auth';

export function createReviewRouter(reviewController: ReviewController): Router {
  const router = Router();

  // Todas as rotas de reviews requerem autenticação
  router.use(requireAuth);

  /**
   * GET /reviews/:trackId
   * Obtém a avaliação do utilizador autenticado para uma música.
   */
  router.get('/:trackId', async (req: Request, res: Response) => {
    const result = await reviewController.getReviewForTrack(req.user!.userId, req.params.trackId!);

    if (result.success) {
      res.json(result.review);
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  /**
   * POST /reviews
   * Cria uma nova avaliação.
   */
  router.post('/', async (req: Request, res: Response) => {
    const { trackId, rating } = req.body;

    if (!trackId) {
      res.status(400).json({ error: 'ID da música é obrigatório.' });
      return;
    }

    const result = await reviewController.createReview(req.user!.userId, trackId, Number(rating));

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  /**
   * PUT /reviews/:reviewId
   * Atualiza uma avaliação existente.
   */
  router.put('/:reviewId', async (req: Request, res: Response) => {
    const result = await reviewController.updateReview(
      Number(req.params.reviewId!),
      req.user!.userId,
      Number(req.body.rating)
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

  return router;
}
