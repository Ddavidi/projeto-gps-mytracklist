import { IDatabase } from '../interfaces/IDatabase';

type ItemType = 'track' | 'album' | 'artist';

export class ReviewController {
  constructor(private db: IDatabase) {}

  private formatReviewRow(row: any) {
    if (!row) return row;
    let vibeTags: string[] = [];
    if (Array.isArray(row.vibe_tags)) {
      vibeTags = row.vibe_tags;
    } else if (typeof row.vibe_tags === 'string' && row.vibe_tags.trim()) {
      try {
        const parsed = JSON.parse(row.vibe_tags);
        vibeTags = Array.isArray(parsed) ? parsed : [];
      } catch {
        vibeTags = [];
      }
    }
    return {
      ...row,
      vibe_tags: vibeTags,
      is_relisten: Boolean(row.is_relisten),
      has_spoiler: Boolean(row.has_spoiler),
    };
  }

  /**
   * Obtém a avaliação de um utilizador para um item específico (música, álbum ou artista).
   */
  async getReviewForItem(userId: number, itemType: ItemType, itemId: string) {
    try {
      const review = await this.db.get(
        'SELECT * FROM reviews WHERE "userId" = ? AND item_id = ? AND item_type = ?',
        [userId, itemId, itemType]
      );
      return { success: true, review: review ? this.formatReviewRow(review) : null };
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
  async createReview(
    userId: number,
    itemType: ItemType,
    itemId: string,
    rating: number,
    reviewText?: string,
    itemName?: string,
    itemImageUrl?: string,
    itemPreviewUrl?: string,
    extras?: { listenedAt?: string; isRelisten?: boolean; vibeTags?: string[]; hasSpoiler?: boolean }
  ) {
    if (!['track', 'album', 'artist'].includes(itemType)) {
      return { success: false, message: 'Tipo de item inválido. Use: track, album ou artist.' };
    }
    if (rating < 0 || rating > 10) {
      return { success: false, message: 'A avaliação deve estar entre 0 e 10.' };
    }
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const listenedAt = extras?.listenedAt || todayIso;
      const isRelisten = Boolean(extras?.isRelisten);
      const vibeTags = JSON.stringify(Array.isArray(extras?.vibeTags) ? extras!.vibeTags : []);
      const hasSpoiler = Boolean(extras?.hasSpoiler);

      const result = await this.db.run(
        `INSERT INTO reviews
          ("userId", item_id, item_type, rating, review_text, item_name, item_image_url, item_preview_url, listened_at, is_relisten, vibe_tags, has_spoiler, "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          userId,
          itemId,
          itemType,
          rating,
          reviewText || null,
          itemName || null,
          itemImageUrl || null,
          itemPreviewUrl || null,
          listenedAt,
          isRelisten,
          vibeTags,
          hasSpoiler,
        ]
      );
      return { success: true, reviewId: result.lastInsertRowid };
    } catch (error: any) {
      if (
        error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
        error.code === '23505' ||
        (error.message && error.message.includes('unique'))
      ) {
        return { success: false, message: 'Já avaliou este item.' };
      }
      console.error('Falha ao criar avaliação:', error);
      return { success: false, message: 'Falha ao criar avaliação.' };
    }
  }

  /**
   * Atualiza uma avaliação existente (nota, texto, diário, vibes e spoiler).
   */
  async updateReview(
    reviewId: number,
    userId: number,
    rating: number,
    reviewText?: string,
    extras?: { listenedAt?: string; isRelisten?: boolean; vibeTags?: string[]; hasSpoiler?: boolean }
  ) {
    if (rating < 0 || rating > 10) {
      return { success: false, message: 'A avaliação deve estar entre 0 e 10.' };
    }
    try {
      const updates: string[] = ['rating = ?', 'review_text = ?', '"updatedAt" = CURRENT_TIMESTAMP'];
      const params: any[] = [rating, reviewText !== undefined ? reviewText : null];

      if (extras?.listenedAt !== undefined) {
        updates.push('listened_at = ?');
        params.push(extras.listenedAt || null);
      }
      if (extras?.isRelisten !== undefined) {
        updates.push('is_relisten = ?');
        params.push(Boolean(extras.isRelisten));
      }
      if (extras?.vibeTags !== undefined) {
        updates.push('vibe_tags = ?');
        params.push(JSON.stringify(Array.isArray(extras.vibeTags) ? extras.vibeTags : []));
      }
      if (extras?.hasSpoiler !== undefined) {
        updates.push('has_spoiler = ?');
        params.push(Boolean(extras.hasSpoiler));
      }

      params.push(reviewId, userId);

      const result = await this.db.run(
        `UPDATE reviews SET ${updates.join(', ')} WHERE id = ? AND "userId" = ?`,
        params
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
        distribution[row.rating] = Number(row.count);
      }

      return { 
        success: true, 
        stats: {
          averageScore: stats?.averageScore ? parseFloat(Number(stats.averageScore).toFixed(1)) : 0,
          totalReviews: stats?.totalReviews ? Number(stats.totalReviews) : 0,
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
         GROUP BY item_id, item_type, item_name, item_image_url 
         HAVING COUNT(id) > 0 
         ORDER BY avg_rating DESC, review_count DESC 
         LIMIT ?`,
        [itemType, limit]
      );
      
      const formattedItems = items.map((item: any) => ({
        ...item,
        avg_rating: parseFloat(Number(item.avg_rating).toFixed(1)),
        review_count: Number(item.review_count)
      }));
      
      return { success: true, items: formattedItems };
    } catch (error) {
      console.error('Falha ao buscar top items:', error);
      return { success: false, message: 'Falha ao buscar top items.' };
    }
  }

  /**
   * Charts da comunidade por tipo, período (week | month | all), vibe opcional e ordenação (rating | popular).
   */
  async getCommunityCharts(
    itemType: ItemType = 'album',
    period: 'week' | 'month' | 'all' = 'all',
    vibe?: string,
    sort: 'rating' | 'popular' = 'rating',
    limit: number = 24
  ) {
    try {
      const rows = await this.db.all(
        `SELECT id, item_id, item_type, item_name, item_image_url, rating, vibe_tags, "createdAt"
         FROM reviews
         WHERE item_type = ? AND rating IS NOT NULL`,
        [itemType]
      );

      const now = Date.now();
      const cutoff =
        period === 'week'
          ? now - 7 * 24 * 60 * 60 * 1000
          : period === 'month'
            ? now - 30 * 24 * 60 * 60 * 1000
            : 0;

      const grouped = new Map<string, { item_id: string; item_type: string; item_name: string; item_image_url: string; sum: number; count: number; vibes: Record<string, number> }>();

      for (const raw of rows || []) {
        const row = this.formatReviewRow(raw);
        if (cutoff > 0) {
          const ts = new Date(row.createdAt).getTime();
          if (Number.isNaN(ts) || ts < cutoff) continue;
        }
        if (vibe && !row.vibe_tags.includes(vibe)) continue;

        const key = row.item_id;
        const curr = grouped.get(key) || {
          item_id: row.item_id,
          item_type: row.item_type,
          item_name: row.item_name || '',
          item_image_url: row.item_image_url || '',
          sum: 0,
          count: 0,
          vibes: {} as Record<string, number>,
        };

        curr.sum += Number(row.rating);
        curr.count += 1;
        if (!curr.item_name && row.item_name) curr.item_name = row.item_name;
        if (!curr.item_image_url && row.item_image_url) curr.item_image_url = row.item_image_url;
        for (const v of row.vibe_tags as string[]) {
          curr.vibes[v] = (curr.vibes[v] || 0) + 1;
        }
        grouped.set(key, curr);
      }

      const items = Array.from(grouped.values()).map((g) => ({
        item_id: g.item_id,
        item_type: g.item_type,
        item_name: g.item_name,
        item_image_url: g.item_image_url,
        avg_rating: parseFloat((g.sum / g.count).toFixed(1)),
        review_count: g.count,
        top_vibes: Object.entries(g.vibes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([v]) => v),
      }));

      items.sort((a, b) => {
        if (sort === 'popular') {
          if (b.review_count !== a.review_count) return b.review_count - a.review_count;
          return b.avg_rating - a.avg_rating;
        }
        if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
        return b.review_count - a.review_count;
      });

      return { success: true, items: items.slice(0, limit) };
    } catch (error) {
      console.error('Falha ao buscar charts da comunidade:', error);
      return { success: false, message: 'Falha ao buscar charts.' };
    }
  }

  /**
   * Diário musical de um usuário ordenado por data de audição.
   */
  async getUserDiary(userId: number) {
    try {
      const rows = await this.db.all(
        `SELECT id, item_id, item_type, item_name, item_image_url, rating, review_text,
                listened_at, is_relisten, vibe_tags, has_spoiler, "createdAt"
         FROM reviews
         WHERE "userId" = ?
         ORDER BY COALESCE(listened_at, SUBSTRING(CAST("createdAt" AS TEXT), 1, 10)) DESC, "createdAt" DESC`,
        [userId]
      );
      const entries = (rows || []).map((r: any) => {
        const formatted = this.formatReviewRow(r);
        const dateKey = formatted.listened_at || String(formatted.createdAt || '').slice(0, 10);
        return { ...formatted, diary_date: dateKey };
      });
      return { success: true, entries };
    } catch (error) {
      // Fallback compatível com SQLite (SUBSTR)
      try {
        const rows = await this.db.all(
          `SELECT id, item_id, item_type, item_name, item_image_url, rating, review_text,
                  listened_at, is_relisten, vibe_tags, has_spoiler, "createdAt"
           FROM reviews
           WHERE "userId" = ?
           ORDER BY "createdAt" DESC`,
          [userId]
        );
        const entries = (rows || []).map((r: any) => {
          const formatted = this.formatReviewRow(r);
          const dateKey = formatted.listened_at || String(formatted.createdAt || '').slice(0, 10);
          return { ...formatted, diary_date: dateKey };
        });
        entries.sort((a: any, b: any) => (b.diary_date || '').localeCompare(a.diary_date || ''));
        return { success: true, entries };
      } catch (innerErr) {
        console.error('Falha ao buscar diário musical:', innerErr);
        return { success: false, message: 'Falha ao buscar diário musical.' };
      }
    }
  }

  /**
   * Retrospectiva anual (MyTrackList Wrapped) de um usuário.
   */
  async getUserWrapped(userId: number, year: number) {
    try {
      const diaryRes = await this.getUserDiary(userId);
      if (!diaryRes.success) {
        return { success: false as const, message: diaryRes.message || 'Falha ao gerar retrospectiva.' };
      }

      const all = diaryRes.entries || [];
      const yearPrefix = String(year);
      const yearEntries = all.filter((e: any) => String(e.diary_date || '').startsWith(yearPrefix));

      const total = yearEntries.length;
      const albums = yearEntries.filter((e: any) => e.item_type === 'album');
      const tracks = yearEntries.filter((e: any) => e.item_type === 'track');
      const artists = yearEntries.filter((e: any) => e.item_type === 'artist');
      const relistens = yearEntries.filter((e: any) => e.is_relisten).length;
      const avgRating = total > 0
        ? parseFloat((yearEntries.reduce((acc: number, e: any) => acc + Number(e.rating), 0) / total).toFixed(1))
        : 0;

      const monthly = Array.from({ length: 12 }, (_, idx) => ({
        month: idx + 1,
        count: 0,
      }));
      const vibeCounts: Record<string, number> = {};

      for (const entry of yearEntries) {
        const monthNum = parseInt(String(entry.diary_date || '').slice(5, 7), 10);
        if (monthNum >= 1 && monthNum <= 12) {
          monthly[monthNum - 1]!.count += 1;
        }
        for (const v of entry.vibe_tags || []) {
          vibeCounts[v] = (vibeCounts[v] || 0) + 1;
        }
      }

      const topAlbums = [...albums]
        .sort((a: any, b: any) => Number(b.rating) - Number(a.rating))
        .slice(0, 4);

      const topVibes = Object.entries(vibeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([vibe, count]) => ({ vibe, count }));

      return {
        success: true as const,
        wrapped: {
          year,
          total,
          albumsCount: albums.length,
          tracksCount: tracks.length,
          artistsCount: artists.length,
          relistensCount: relistens,
          avgRating,
          topAlbums,
          topVibes,
          monthly,
        },
      };
    } catch (error) {
      console.error('Falha ao gerar Wrapped:', error);
      return { success: false as const, message: 'Falha ao gerar retrospectiva.' };
    }
  }
}
