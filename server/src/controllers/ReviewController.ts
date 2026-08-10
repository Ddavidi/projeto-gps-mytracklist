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
   * Cria uma nova avaliação para uma música, álbum ou artista.
   */
  async createReview(userId: number, itemType: ItemType, itemId: string, rating: number, reviewText?: string) {
    if (!['track', 'album', 'artist'].includes(itemType)) {
      return { success: false, message: 'Tipo de item inválido. Use: track, album ou artist.' };
    }
    if (rating < 0 || rating > 10) {
      return { success: false, message: 'A avaliação deve estar entre 0 e 10.' };
    }
    try {
      const result = await this.db.run(
        'INSERT INTO reviews ("userId", item_id, item_type, rating, review_text, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [userId, itemId, itemType, rating, reviewText || null]
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
}
