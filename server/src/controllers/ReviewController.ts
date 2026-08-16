import { IDatabase } from '../interfaces/IDatabase';

type ItemType = 'track' | 'album' | 'artist';

export class ReviewController {
  constructor(private db: IDatabase) {}

  /**
   * Obtém a avaliação de um utilizador para um item específico (música, álbum ou artista).
   */
  async getReviewForItem(userId: number, itemType: ItemType, itemId: string) {
    try {
      const review = await this.db.get(
        'SELECT * FROM reviews WHERE "userId" = ? AND item_id = ? AND item_type = ?',
        [userId, itemId, itemType]
      );
      return { success: true, review: review || null };
    } catch (error) {
      console.error('Falha ao obter avaliação:', error);
      return { success: false, message: 'Falha ao obter avaliação.' };
    }
  }

  /**
   * @deprecated Use getReviewForItem instead.
   * Mantido temporariamente para compatibilidade com rotas antigas.
   */
  async getReviewForTrack(userId: number, trackId: string) {
    return this.getReviewForItem(userId, 'track', trackId);
  }

  /**
   * Obtém as avaliações de um utilizador para um lote de itens específicos.
   */
  async getReviewsForItems(userId: number, items: { itemType: ItemType, itemId: string }[]) {
    if (!items || items.length === 0) return { success: true, reviews: [] };
    
    try {
      const conditions = items.map(() => '(item_type = ? AND item_id = ?)').join(' OR ');
      const params = items.flatMap(i => [i.itemType, i.itemId]);
      
      const reviews = await this.db.all(
        `SELECT * FROM reviews WHERE "userId" = ? AND (${conditions})`,
        [userId, ...params]
      );
      return { success: true, reviews: reviews || [] };
    } catch (error) {
      console.error('Falha ao obter avaliações em lote:', error);
      return { success: false, message: 'Falha ao obter avaliações em lote.' };
    }
  }

  /**
   * Cria uma nova avaliação para uma música, álbum ou artista.
   */
  async createReview(userId: number, itemType: ItemType, itemId: string, rating: number, reviewText?: string, itemName?: string, itemImageUrl?: string, itemPreviewUrl?: string) {
    if (!['track', 'album', 'artist'].includes(itemType)) {
      return { success: false, message: 'Tipo de item inválido. Use: track, album ou artist.' };
    }
    if (rating < 0 || rating > 10) {
      return { success: false, message: 'A avaliação deve estar entre 0 e 10.' };
    }
    try {
      const result = await this.db.run(
        'INSERT INTO reviews ("userId", item_id, item_type, rating, review_text, item_name, item_image_url, item_preview_url, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [userId, itemId, itemType, rating, reviewText || null, itemName || null, itemImageUrl || null, itemPreviewUrl || null]
      );
      return { success: true, reviewId: result.lastInsertRowid };
    } catch (error: any) {
      // Handle duplicate review (unique constraint violation)
      if (
        error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
        error.code === '23505' || // PostgreSQL unique violation
        (error.message && error.message.includes('unique'))
      ) {
        return { success: false, message: 'Já avaliou este item.' };
      }
      console.error('Falha ao criar avaliação:', error);
      return { success: false, message: 'Falha ao criar avaliação.' };
    }
  }

  /**
   * Atualiza uma avaliação existente (nota e/ou texto).
   */
  async updateReview(reviewId: number, userId: number, rating: number, reviewText?: string) {
    if (rating < 0 || rating > 10) {
      return { success: false, message: 'A avaliação deve estar entre 0 e 10.' };
    }
    try {
      const result = await this.db.run(
        'UPDATE reviews SET rating = ?, review_text = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ? AND "userId" = ?',
        [rating, reviewText !== undefined ? reviewText : null, reviewId, userId]
      );

      if (result.changes === 0) {
        return { success: false, message: 'Avaliação não encontrada ou não pertence ao utilizador.' };
      }
      return { success: true };
    } catch (error) {
      console.error('Falha ao atualizar avaliação:', error);
      return { success: false, message: 'Falha ao atualizar avaliação.' };
    }
  }

  /**
   * Apaga uma avaliação.
   */
  async deleteReview(reviewId: number, userId: number) {
    try {
      const result = await this.db.run(
        'DELETE FROM reviews WHERE id = ? AND "userId" = ?',
        [reviewId, userId]
      );

      if (result.changes === 0) {
        return { success: false, message: 'Avaliação não encontrada ou não pertence ao utilizador.' };
      }
      return { success: true };
    } catch (error) {
      console.error('Falha ao apagar avaliação:', error);
      return { success: false, message: 'Falha ao apagar avaliação.' };
    }
  }

  /**
   * Obtém estatísticas de um item (média de notas, total de avaliações e distribuição).
   */
  async getItemStats(itemType: ItemType, itemId: string) {
    try {
      const stats = await this.db.get(
        'SELECT AVG(rating) as averageScore, COUNT(id) as totalReviews FROM reviews WHERE item_type = ? AND item_id = ? AND rating IS NOT NULL',
        [itemType, itemId]
      );
      
      const distributionRows = await this.db.all(
        'SELECT rating, COUNT(id) as count FROM reviews WHERE item_type = ? AND item_id = ? AND rating IS NOT NULL GROUP BY rating',
        [itemType, itemId]
      );
      
      const distribution: Record<number, number> = {
        0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0
      };
      
      for (const row of distributionRows) {
        distribution[row.rating] = row.count;
      }

      return { 
        success: true, 
        stats: {
          averageScore: stats?.averageScore ? parseFloat(stats.averageScore.toFixed(1)) : 0,
          totalReviews: stats?.totalReviews || 0,
          distribution
        }
      };
    } catch (error) {
      console.error('Falha ao obter estatísticas:', error);
      return { success: false, message: 'Falha ao obter estatísticas.' };
    }
  }

  // =====================
  // Comentários
  // =====================

  async getReviewComments(reviewId: number) {
    try {
      const comments = await this.db.all(
        `SELECT c.id, c.content, c.created_at, u.username as user_username, u.avatar_url as user_avatar, u.id as user_id 
         FROM review_comments c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.review_id = ? 
         ORDER BY c.created_at ASC`,
        [reviewId]
      );
      return { success: true, comments: comments || [] };
    } catch (error) {
      console.error('Falha ao buscar comentários:', error);
      return { success: false, message: 'Falha ao buscar comentários.' };
    }
  }

  async addComment(reviewId: number, userId: number, content: string) {
    try {
      if (!content || content.trim() === '') {
        return { success: false, message: 'O comentário não pode ser vazio.' };
      }

      const result = await this.db.run(
        'INSERT INTO review_comments (review_id, user_id, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [reviewId, userId, content.trim()]
      );

      // Enviar notificação para o autor da review
      const review = await this.db.get('SELECT "userId" FROM reviews WHERE id = ?', [reviewId]);
      if (review && review.userId !== userId) {
        await this.db.run(
          'INSERT INTO notifications (user_id, actor_id, type, reference_id) VALUES (?, ?, ?, ?)',
          [review.userId, userId, 'comment', reviewId]
        );
      }

      return { success: true, commentId: result.lastInsertRowid };
    } catch (error) {
      console.error('Falha ao adicionar comentário:', error);
      return { success: false, message: 'Falha ao adicionar comentário.' };
    }
  }

  // =====================
  // Discovery
  // =====================

  async getTopRatedItems(itemType: ItemType, limit: number = 10) {
    try {
      const items = await this.db.all(
        `SELECT item_id, item_type, item_name, item_image_url, 
                AVG(rating) as avg_rating, COUNT(id) as review_count 
         FROM reviews 
         WHERE item_type = ? AND rating IS NOT NULL 
         GROUP BY item_id 
         HAVING review_count > 0 
         ORDER BY avg_rating DESC, review_count DESC 
         LIMIT ?`,
        [itemType, limit]
      );
      
      const formattedItems = items.map((item: any) => ({
        ...item,
        avg_rating: parseFloat(item.avg_rating.toFixed(1))
      }));
      
      return { success: true, items: formattedItems };
    } catch (error) {
      console.error('Falha ao buscar top items:', error);
      return { success: false, message: 'Falha ao buscar top items.' };
    }
  }
}
