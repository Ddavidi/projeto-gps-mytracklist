import { Router, Request, Response } from 'express';
import { SocialController } from '../controllers/SocialController';
import { requireAuth } from '../middleware/auth';

type ItemType = 'track' | 'album' | 'artist';
const VALID_ITEM_TYPES: ItemType[] = ['track', 'album', 'artist'];

export function createSocialRouter(socialController: SocialController): Router {
  const router = Router();

  // =====================
  // Follow / Unfollow
  // =====================

  /**
   * POST /social/follow/:targetUserId
   * Segue um utilizador. Requer autenticação.
   */
  router.post('/follow/:targetUserId', requireAuth, async (req: Request, res: Response) => {
    const followingId = Number(req.params.targetUserId);
    const result = await socialController.followUser(req.user!.userId, followingId);

    if (result.success) {
      res.status(201).json({ message: 'A seguir utilizador com sucesso.' });
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  /**
   * DELETE /social/follow/:targetUserId
   * Deixa de seguir um utilizador. Requer autenticação.
   */
  router.delete('/follow/:targetUserId', requireAuth, async (req: Request, res: Response) => {
    const followingId = Number(req.params.targetUserId);
    const result = await socialController.unfollowUser(req.user!.userId, followingId);

    if (result.success) {
      res.json({ message: 'Deixou de seguir o utilizador.' });
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  /**
   * GET /social/followers/:userId
   * Lista seguidores de um utilizador. Público.
   */
  router.get('/followers/:userId', async (req: Request, res: Response) => {
    const result = await socialController.getFollowers(Number(req.params.userId));
    if (result.success) {
      res.json({ followers: result.followers, count: result.count });
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  /**
   * GET /social/following/:userId
   * Lista quem um utilizador segue. Público.
   */
  router.get('/following/:userId', async (req: Request, res: Response) => {
    const result = await socialController.getFollowing(Number(req.params.userId));
    if (result.success) {
      res.json({ following: result.following, count: result.count });
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  /**
   * GET /social/is-following/:targetUserId
   * Verifica se o utilizador autenticado segue outro. Requer autenticação.
   */
  router.get('/is-following/:targetUserId', requireAuth, async (req: Request, res: Response) => {
    const result = await socialController.isFollowing(
      req.user!.userId,
      Number(req.params.targetUserId)
    );
    if (result.success) {
      res.json({ isFollowing: result.isFollowing });
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  // =====================
  // Review Likes
  // =====================

  /**
   * POST /social/reviews/:reviewId/like
   * Curte uma avaliação. Requer autenticação.
   */
  router.post('/reviews/:reviewId/like', requireAuth, async (req: Request, res: Response) => {
    const result = await socialController.likeReview(
      req.user!.userId,
      Number(req.params.reviewId)
    );
    if (result.success) {
      res.status(201).json({ message: 'Avaliação curtida.' });
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  /**
   * DELETE /social/reviews/:reviewId/like
   * Remove curtida de uma avaliação. Requer autenticação.
   */
  router.delete('/reviews/:reviewId/like', requireAuth, async (req: Request, res: Response) => {
    const result = await socialController.unlikeReview(
      req.user!.userId,
      Number(req.params.reviewId)
    );
    if (result.success) {
      res.json({ message: 'Curtida removida.' });
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  /**
   * GET /social/reviews/:reviewId/likes
   * Retorna quem curtiu uma avaliação. Público.
   */
  router.get('/reviews/:reviewId/likes', async (req: Request, res: Response) => {
    const result = await socialController.getReviewLikesWithUsers(Number(req.params.reviewId));
    if (result.success) {
      res.json({ likes: result.likes, count: result.count });
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  // =====================
  // Feed
  // =====================

  /**
   * GET /social/feed?limit=20&offset=0
   * Retorna o feed social do utilizador autenticado. Requer autenticação.
   */
  router.get('/feed', requireAuth, async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;
    const result = await socialController.getFeed(req.user!.userId, limit, offset);
    if (result.success) {
      res.json({ feed: result.feed, hasMore: result.hasMore });
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  // =====================
  // Friends Reviews (AniList-style)
  // =====================

  /**
   * GET /social/friends-reviews/:itemType/:itemId
   * Retorna avaliações de amigos (seguidos) para um item específico.
   * Requer autenticação.
   */
  router.get('/friends-reviews/:itemType/:itemId', requireAuth, async (req: Request, res: Response) => {
    const { itemType, itemId } = req.params as { itemType: string; itemId: string };

    if (!VALID_ITEM_TYPES.includes(itemType as ItemType)) {
      res.status(400).json({ error: 'Tipo de item inválido. Use: track, album ou artist.' });
      return;
    }

    const result = await socialController.getFriendsReviews(
      req.user!.userId,
      itemType as ItemType,
      itemId
    );

    if (result.success) {
      res.json({ friendsReviews: result.friendsReviews });
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  return router;
}
