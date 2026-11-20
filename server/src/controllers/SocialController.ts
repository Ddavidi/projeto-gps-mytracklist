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
        `SELECT u.id, u.username, u.name, u.avatar_url as user_avatar, f."createdAt" as followed_at
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
        `SELECT u.id, u.username, u.name, u.avatar_url as user_avatar, f."createdAt" as followed_at
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

  private parseJsonArray(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Retorna o feed social: avaliações recentes dos utilizadores seguidos.
   */
  async getFeed(userId: number, limit: number = 20, offset: number = 0) {
    try {
      const rows = await this.db.all(
        `SELECT
           r.id,
           r.item_id,
           r.item_type,
           r.item_name,
           r.item_image_url,
           r.item_preview_url,
           r.rating,
           r.review_text,
           r.listened_at,
           r.is_relisten,
           r.vibe_tags,
           r.has_spoiler,
           r."createdAt",
           r."updatedAt",
           u.id as author_id,
           u.username as author_username,
           u.name as author_name,
           u.avatar_url as author_avatar,
           (SELECT COUNT(*) FROM review_likes rl WHERE rl."reviewId" = r.id) as likes_count,
           (SELECT 1 FROM review_likes rl2 WHERE rl2."reviewId" = r.id AND rl2."userId" = ?) as is_liked,
           (SELECT COUNT(*) FROM review_comments rc WHERE rc.review_id = r.id) as comments_count
         FROM reviews r
         JOIN users u ON u.id = r."userId"
         WHERE r."userId" IN (
           SELECT "followingId" FROM follows WHERE "followerId" = ?
         )
         ORDER BY r."createdAt" DESC
         LIMIT ? OFFSET ?`,
        [userId, userId, limit, offset]
      );
      const feed = (rows || []).map((row: any) => ({
        ...row,
        vibe_tags: this.parseJsonArray(row.vibe_tags),
        is_relisten: Boolean(row.is_relisten),
        has_spoiler: Boolean(row.has_spoiler),
      }));
      return { success: true, feed, hasMore: feed.length === limit };
    } catch (error) {
      console.error('Erro ao buscar feed:', error);
      return { success: false, message: 'Falha ao buscar feed.' };
    }
  }

  /**
   * Retorna as avaliações de amigos (utilizadores seguidos) para um item específico.
   */
  async getFriendsReviews(userId: number, itemType: ItemType, itemId: string) {
    try {
      const rows = await this.db.all(
        `SELECT
           r.id,
           r.rating,
           r.review_text,
           r.vibe_tags,
           r.has_spoiler,
           r.is_relisten,
           r."createdAt",
           u.id as author_id,
           u.username as author_username,
           u.name as author_name,
           u.avatar_url as author_avatar,
           (SELECT COUNT(*) FROM review_likes rl WHERE rl."reviewId" = r.id) as likes_count,
           (SELECT 1 FROM review_likes rl2 WHERE rl2."reviewId" = r.id AND rl2."userId" = ?) as is_liked,
           (SELECT COUNT(*) FROM review_comments rc WHERE rc.review_id = r.id) as comments_count
         FROM reviews r
         JOIN users u ON u.id = r."userId"
         WHERE r."userId" IN (
           SELECT "followingId" FROM follows WHERE "followerId" = ?
         )
         AND r.item_id = ?
         AND r.item_type = ?
         ORDER BY r."createdAt" DESC`,
        [userId, userId, itemId, itemType]
      );
      const friendsReviews = (rows || []).map((row: any) => ({
        ...row,
        vibe_tags: this.parseJsonArray(row.vibe_tags),
        is_relisten: Boolean(row.is_relisten),
        has_spoiler: Boolean(row.has_spoiler),
      }));
      return { success: true, friendsReviews };
    } catch (error) {
      console.error('Erro ao buscar avaliações de amigos:', error);
      return { success: false, message: 'Falha ao buscar avaliações de amigos.' };
    }
  }

  /**
   * Calcula a compatibilidade musical (Taste Match %) entre dois usuários.
   */
  async getCompatibility(currentUserId: number, targetUserId: number) {
    try {
      const [meUser, targetUser, myReviews, targetReviews] = await Promise.all([
        this.db.get('SELECT id, username, favorite_genres FROM users WHERE id = ?', [currentUserId]),
        this.db.get('SELECT id, username, favorite_genres FROM users WHERE id = ?', [targetUserId]),
        this.db.all('SELECT item_id, item_type, item_name, item_image_url, rating FROM reviews WHERE "userId" = ?', [currentUserId]),
        this.db.all('SELECT item_id, item_type, item_name, item_image_url, rating FROM reviews WHERE "userId" = ?', [targetUserId]),
      ]);

      const myGenres = this.parseJsonArray(meUser?.favorite_genres);
      const targetGenres = this.parseJsonArray(targetUser?.favorite_genres);
      const sharedGenres = myGenres.filter((g) => targetGenres.includes(g));

      const targetMap = new Map<string, any>();
      for (const r of targetReviews || []) {
        targetMap.set(`${r.item_type}:${r.item_id}`, r);
      }

      const common: Array<{
        item_id: string;
        item_type: string;
        item_name: string;
        item_image_url: string;
        my_rating: number;
        their_rating: number;
        diff: number;
      }> = [];

      for (const mine of myReviews || []) {
        const theirs = targetMap.get(`${mine.item_type}:${mine.item_id}`);
        if (theirs) {
          const myScore = Number(mine.rating);
          const theirScore = Number(theirs.rating);
          common.push({
            item_id: mine.item_id,
            item_type: mine.item_type,
            item_name: mine.item_name || theirs.item_name || 'Item',
            item_image_url: mine.item_image_url || theirs.item_image_url || '',
            my_rating: myScore,
            their_rating: theirScore,
            diff: Math.abs(myScore - theirScore),
          });
        }
      }

      let ratingScore: number | null = null;
      if (common.length > 0) {
        const avgDiff = common.reduce((acc, c) => acc + c.diff, 0) / common.length;
        ratingScore = Math.max(0, Math.min(100, Math.round(100 - avgDiff * 11)));
      }

      let genreScore: number | null = null;
      const unionGenres = new Set([...myGenres, ...targetGenres]);
      if (unionGenres.size > 0 && myGenres.length > 0 && targetGenres.length > 0) {
        genreScore = Math.round((sharedGenres.length / Math.min(myGenres.length, targetGenres.length)) * 100);
      }

      let score: number | null = null;
      if (ratingScore !== null && genreScore !== null) {
        score = Math.round(ratingScore * 0.72 + genreScore * 0.28);
      } else if (ratingScore !== null) {
        score = ratingScore;
      } else if (genreScore !== null) {
        score = genreScore;
      }

      const lovedByBoth = common
        .filter((c) => c.my_rating >= 8 && c.their_rating >= 8)
        .sort((a, b) => (b.my_rating + b.their_rating) - (a.my_rating + a.their_rating))
        .slice(0, 4);

      const disagreements = common
        .filter((c) => c.diff >= 3)
        .sort((a, b) => b.diff - a.diff)
        .slice(0, 3);

      return {
        success: true,
        compatibility: {
          score,
          commonCount: common.length,
          sharedGenres,
          lovedByBoth,
          disagreements,
        },
      };
    } catch (error) {
      console.error('Erro ao calcular compatibilidade:', error);
      return { success: false, message: 'Falha ao calcular compatibilidade.' };
    }
  }
}
