import { IDatabase } from '../interfaces/IDatabase';

type ItemType = 'track' | 'album' | 'artist';

export class SocialController {
  constructor(private db: IDatabase) {}

  // =====================
  // Follow / Unfollow
  // =====================

  /**
   * Segue um utilizador.
   */
  async followUser(followerId: number, followingId: number) {
    if (followerId === followingId) {
      return { success: false, message: 'Não pode seguir a si mesmo.' };
    }
    try {
      await this.db.run(
        'INSERT INTO follows ("followerId", "followingId", "createdAt") VALUES (?, ?, CURRENT_TIMESTAMP)',
        [followerId, followingId]
      );
      return { success: true };
    } catch (error: any) {
      if (
        error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
        error.code === '23505' ||
        (error.message && error.message.includes('unique'))
      ) {
        return { success: false, message: 'Já segue este utilizador.' };
      }
      console.error('Erro ao seguir utilizador:', error);
      return { success: false, message: 'Falha ao seguir utilizador.' };
    }
  }

  /**
   * Deixa de seguir um utilizador.
   */
  async unfollowUser(followerId: number, followingId: number) {
    try {
      const result = await this.db.run(
        'DELETE FROM follows WHERE "followerId" = ? AND "followingId" = ?',
        [followerId, followingId]
      );
      if (result.changes === 0) {
        return { success: false, message: 'Não estava a seguir este utilizador.' };
      }
      return { success: true };
    } catch (error) {
      console.error('Erro ao deixar de seguir:', error);
      return { success: false, message: 'Falha ao deixar de seguir.' };
    }
  }

  /**
   * Retorna a lista de seguidores de um utilizador com contagem total.
   */
  async getFollowers(userId: number) {
    try {
      const followers = await this.db.all(
        `SELECT u.id, u.username, u.name, f."createdAt" as followed_at
         FROM follows f
         JOIN users u ON u.id = f."followerId"
         WHERE f."followingId" = ?
         ORDER BY f."createdAt" DESC`,
        [userId]
      );
      return { success: true, followers, count: followers.length };
    } catch (error) {
      console.error('Erro ao buscar seguidores:', error);
      return { success: false, message: 'Falha ao buscar seguidores.' };
    }
  }

  /**
   * Retorna a lista de utilizadores que um utilizador segue com contagem total.
   */
  async getFollowing(userId: number) {
    try {
      const following = await this.db.all(
        `SELECT u.id, u.username, u.name, f."createdAt" as followed_at
         FROM follows f
         JOIN users u ON u.id = f."followingId"
         WHERE f."followerId" = ?
         ORDER BY f."createdAt" DESC`,
        [userId]
      );
      return { success: true, following, count: following.length };
    } catch (error) {
      console.error('Erro ao buscar seguindo:', error);
      return { success: false, message: 'Falha ao buscar lista de seguindo.' };
    }
  }

  /**
   * Verifica se um utilizador segue outro (para botão Seguir/Seguindo).
   */
  async isFollowing(followerId: number, followingId: number) {
    try {
      const row = await this.db.get(
        'SELECT id FROM follows WHERE "followerId" = ? AND "followingId" = ?',
        [followerId, followingId]
      );
      return { success: true, isFollowing: !!row };
    } catch (error) {
      console.error('Erro ao verificar seguimento:', error);
      return { success: false, message: 'Falha ao verificar seguimento.' };
    }
  }

  // =====================
  // Review Likes
  // =====================

  /**
   * Curte uma avaliação.
   */
  async likeReview(userId: number, reviewId: number) {
    try {
      await this.db.run(
        'INSERT INTO review_likes ("userId", "reviewId", "createdAt") VALUES (?, ?, CURRENT_TIMESTAMP)',
        [userId, reviewId]
      );
      return { success: true };
    } catch (error: any) {
      if (
        error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
        error.code === '23505' ||
        (error.message && error.message.includes('unique'))
      ) {
        return { success: false, message: 'Já curtiu esta avaliação.' };
      }
      console.error('Erro ao curtir avaliação:', error);
      return { success: false, message: 'Falha ao curtir avaliação.' };
    }
  }

  /**
   * Remove curtida de uma avaliação.
   */
  async unlikeReview(userId: number, reviewId: number) {
    try {
      const result = await this.db.run(
        'DELETE FROM review_likes WHERE "userId" = ? AND "reviewId" = ?',
        [userId, reviewId]
      );
      if (result.changes === 0) {
        return { success: false, message: 'Curtida não encontrada.' };
      }
      return { success: true };
    } catch (error) {
      console.error('Erro ao descurtir avaliação:', error);
      return { success: false, message: 'Falha ao descurtir avaliação.' };
    }
  }

  /**
   * Retorna quem curtiu uma avaliação (id do user, username) + contagem total.
   */
  async getReviewLikesWithUsers(reviewId: number) {
    try {
      const likes = await this.db.all(
        `SELECT u.id, u.username, rl."createdAt" as liked_at
         FROM review_likes rl
         JOIN users u ON u.id = rl."userId"
         WHERE rl."reviewId" = ?
         ORDER BY rl."createdAt" DESC`,
        [reviewId]
      );
      return { success: true, likes, count: likes.length };
    } catch (error) {
      console.error('Erro ao buscar curtidas:', error);
      return { success: false, message: 'Falha ao buscar curtidas.' };
    }
  }

  // =====================
  // Feed
  // =====================

  /**
   * Retorna o feed social: avaliações recentes dos utilizadores seguidos.
   * Inclui dados do item e do autor para exibição direta.
   */
  async getFeed(userId: number, limit: number = 20, offset: number = 0) {
    try {
      const feed = await this.db.all(
        `SELECT
           r.id,
           r.item_id,
           r.item_type,
           r.rating,
           r.review_text,
           r."createdAt",
           r."updatedAt",
           u.id as author_id,
           u.username as author_username,
           u.name as author_name,
           (SELECT COUNT(*) FROM review_likes rl WHERE rl."reviewId" = r.id) as likes_count
         FROM reviews r
         JOIN users u ON u.id = r."userId"
         WHERE r."userId" IN (
           SELECT "followingId" FROM follows WHERE "followerId" = ?
         )
         ORDER BY r."createdAt" DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );
      return { success: true, feed, hasMore: feed.length === limit };
    } catch (error) {
      console.error('Erro ao buscar feed:', error);
      return { success: false, message: 'Falha ao buscar feed.' };
    }
  }

  // =====================
  // Friends Reviews (AniList-style)
  // =====================

  /**
   * Retorna as avaliações de amigos (utilizadores seguidos) para um item específico.
   * Usado na página de detalhes de música, álbum ou artista.
   */
  async getFriendsReviews(userId: number, itemType: ItemType, itemId: string) {
    try {
      const friendsReviews = await this.db.all(
        `SELECT
           r.id,
           r.rating,
           r.review_text,
           r."createdAt",
           u.id as author_id,
           u.username as author_username,
           u.name as author_name,
           (SELECT COUNT(*) FROM review_likes rl WHERE rl."reviewId" = r.id) as likes_count
         FROM reviews r
         JOIN users u ON u.id = r."userId"
         WHERE r."userId" IN (
           SELECT "followingId" FROM follows WHERE "followerId" = ?
         )
         AND r.item_id = ?
         AND r.item_type = ?
         ORDER BY r."createdAt" DESC`,
        [userId, itemId, itemType]
      );
      return { success: true, friendsReviews };
    } catch (error) {
      console.error('Erro ao buscar avaliações de amigos:', error);
      return { success: false, message: 'Falha ao buscar avaliações de amigos.' };
    }
  }
}
