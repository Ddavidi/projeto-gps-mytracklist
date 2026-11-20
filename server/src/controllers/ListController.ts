import { IDatabase } from '../interfaces/IDatabase';

export class ListController {
  constructor(private db: IDatabase) {}

  async getPublicLists(limit: number = 24, userId?: number) {
    try {
      const lists = await this.db.all(
        `SELECT l.id, l.user_id, l.title, l.description, l.list_type, l.is_ranked, l.is_public, l.created_at, l.updated_at,
                u.username as author_username, u.avatar_url as author_avatar,
                (SELECT COUNT(*) FROM custom_list_items li WHERE li.list_id = l.id) as items_count,
                (SELECT COUNT(*) FROM custom_list_likes ll WHERE ll.list_id = l.id) as likes_count
         FROM custom_lists l
         JOIN users u ON u.id = l.user_id
         WHERE l.is_public = true OR l.is_public = 1
         ORDER BY likes_count DESC, l.updated_at DESC
         LIMIT ?`,
        [limit]
      );

      const enriched = await Promise.all(
        (lists || []).map(async (list: any) => {
          const previewItems = await this.db.all(
            `SELECT item_id, item_type, item_name, item_image_url
             FROM custom_list_items
             WHERE list_id = ?
             ORDER BY position ASC, added_at ASC
             LIMIT 4`,
            [list.id]
          );
          let isLiked = false;
          if (userId) {
            const like = await this.db.get(
              'SELECT id FROM custom_list_likes WHERE list_id = ? AND user_id = ?',
              [list.id, userId]
            );
            isLiked = Boolean(like);
          }
          return {
            ...list,
            list_type: list.list_type || 'album',
            is_ranked: Boolean(list.is_ranked),
            is_public: Boolean(list.is_public),
            items_count: Number(list.items_count || 0),
            likes_count: Number(list.likes_count || 0),
            is_liked: isLiked,
            preview_covers: (previewItems || []).map((i: any) => i.item_image_url).filter(Boolean),
          };
        })
      );

      return { success: true, lists: enriched };
    } catch (error) {
      console.error('Erro ao buscar listas públicas:', error);
      return { success: false, message: 'Falha ao buscar listas públicas.' };
    }
  }

  async getUserLists(targetUserId: number, requesterId?: number) {
    try {
      const isOwner = requesterId === targetUserId;
      const whereClause = isOwner
        ? 'l.user_id = ?'
        : 'l.user_id = ? AND (l.is_public = true OR l.is_public = 1)';

      const lists = await this.db.all(
        `SELECT l.id, l.user_id, l.title, l.description, l.list_type, l.is_ranked, l.is_public, l.created_at, l.updated_at,
                u.username as author_username, u.avatar_url as author_avatar,
                (SELECT COUNT(*) FROM custom_list_items li WHERE li.list_id = l.id) as items_count,
                (SELECT COUNT(*) FROM custom_list_likes ll WHERE ll.list_id = l.id) as likes_count
         FROM custom_lists l
         JOIN users u ON u.id = l.user_id
         WHERE ${whereClause}
         ORDER BY l.updated_at DESC`,
        [targetUserId]
      );

      const enriched = await Promise.all(
        (lists || []).map(async (list: any) => {
          const previewItems = await this.db.all(
            `SELECT item_image_url FROM custom_list_items WHERE list_id = ? ORDER BY position ASC, added_at ASC LIMIT 4`,
            [list.id]
          );
          return {
            ...list,
            list_type: list.list_type || 'album',
            is_ranked: Boolean(list.is_ranked),
            is_public: Boolean(list.is_public),
            items_count: Number(list.items_count || 0),
            likes_count: Number(list.likes_count || 0),
            preview_covers: (previewItems || []).map((i: any) => i.item_image_url).filter(Boolean),
          };
        })
      );

      return { success: true, lists: enriched };
    } catch (error) {
      console.error('Erro ao buscar listas do usuário:', error);
      return { success: false, message: 'Falha ao buscar listas do usuário.' };
    }
  }

  async getListById(listId: number, requesterId?: number) {
    try {
      const list = await this.db.get(
        `SELECT l.id, l.user_id, l.title, l.description, l.list_type, l.is_ranked, l.is_public, l.created_at, l.updated_at,
                u.username as author_username, u.avatar_url as author_avatar,
                (SELECT COUNT(*) FROM custom_list_likes ll WHERE ll.list_id = l.id) as likes_count
         FROM custom_lists l
         JOIN users u ON u.id = l.user_id
         WHERE l.id = ?`,
        [listId]
      );

      if (!list) return { success: false, status: 404, message: 'Lista não encontrada.' };
      if (!Boolean(list.is_public) && list.user_id !== requesterId) {
        return { success: false, status: 403, message: 'Esta lista é privada.' };
      }

      const items = await this.db.all(
        `SELECT id, list_id, item_id, item_type, item_name, item_artist, item_image_url, position, note, added_at
         FROM custom_list_items
         WHERE list_id = ?
         ORDER BY position ASC, added_at ASC`,
        [listId]
      );

      let isLiked = false;
      if (requesterId) {
        const like = await this.db.get(
          'SELECT id FROM custom_list_likes WHERE list_id = ? AND user_id = ?',
          [listId, requesterId]
        );
        isLiked = Boolean(like);
      }

      return {
        success: true,
        list: {
          ...list,
          list_type: list.list_type || 'album',
          is_ranked: Boolean(list.is_ranked),
          is_public: Boolean(list.is_public),
          likes_count: Number(list.likes_count || 0),
          is_liked: isLiked,
          items: items || [],
        },
      };
    } catch (error) {
      console.error('Erro ao buscar lista:', error);
      return { success: false, status: 500, message: 'Falha ao buscar detalhes da lista.' };
    }
  }

  async createList(userId: number, title: string, description: string = '', isRanked: boolean = true, isPublic: boolean = true, listType: string = 'album') {
    try {
      const cleanTitle = title.trim();
      if (!cleanTitle) return { success: false, message: 'O título da lista é obrigatório.' };
      const normalizedType = ['album', 'track', 'artist'].includes(listType) ? listType : 'album';

      const result = await this.db.run(
        `INSERT INTO custom_lists (user_id, title, description, list_type, is_ranked, is_public, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, cleanTitle, description.trim(), normalizedType, isRanked, isPublic]
      );

      return { success: true, listId: result.lastInsertRowid };
    } catch (error) {
      console.error('Erro ao criar lista:', error);
      return { success: false, message: 'Falha ao criar lista.' };
    }
  }

  async deleteList(listId: number, userId: number) {
    try {
      const result = await this.db.run(
        'DELETE FROM custom_lists WHERE id = ? AND user_id = ?',
        [listId, userId]
      );
      if (result.changes === 0) {
        return { success: false, message: 'Lista não encontrada ou sem permissão.' };
      }
      return { success: true };
    } catch (error) {
      console.error('Erro ao apagar lista:', error);
      return { success: false, message: 'Falha ao apagar lista.' };
    }
  }

  async addItemToList(
    listId: number,
    userId: number,
    item: { itemId: string; itemType: string; itemName: string; itemArtist?: string; itemImageUrl?: string; note?: string }
  ) {
    try {
      const list = await this.db.get('SELECT id, user_id, list_type FROM custom_lists WHERE id = ?', [listId]);
      if (!list || list.user_id !== userId) {
        return { success: false, message: 'Lista não encontrada ou sem permissão.' };
      }

      const allowedType = list.list_type || 'album';
      if (item.itemType !== allowedType) {
        const typeLabel = allowedType === 'album' ? 'álbuns' : allowedType === 'track' ? 'músicas' : 'artistas';
        return {
          success: false,
          message: `Esta lista aceita exclusivamente ${typeLabel}. Não é permitido misturar formatos na mesma lista.`,
        };
      }

      const existing = await this.db.get(
        'SELECT id FROM custom_list_items WHERE list_id = ? AND item_id = ? AND item_type = ?',
        [listId, item.itemId, item.itemType]
      );
      if (existing) {
        return { success: false, message: 'Este item já está nesta lista.' };
      }

      const maxRow = await this.db.get(
        'SELECT COALESCE(MAX(position), 0) as max_pos FROM custom_list_items WHERE list_id = ?',
        [listId]
      );
      const nextPos = Number(maxRow?.max_pos || 0) + 1;

      const result = await this.db.run(
        `INSERT INTO custom_list_items (list_id, item_id, item_type, item_name, item_artist, item_image_url, position, note, added_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [listId, item.itemId, item.itemType, item.itemName, item.itemArtist || '', item.itemImageUrl || '', nextPos, item.note || '']
      );

      await this.db.run('UPDATE custom_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [listId]);

      return { success: true, itemRowId: result.lastInsertRowid };
    } catch (error) {
      console.error('Erro ao adicionar item à lista:', error);
      return { success: false, message: 'Falha ao adicionar item à lista.' };
    }
  }

  async removeItemFromList(listId: number, userId: number, itemRowId: number) {
    try {
      const list = await this.db.get('SELECT id, user_id FROM custom_lists WHERE id = ?', [listId]);
      if (!list || list.user_id !== userId) {
        return { success: false, message: 'Sem permissão para editar esta lista.' };
      }
      await this.db.run('DELETE FROM custom_list_items WHERE id = ? AND list_id = ?', [itemRowId, listId]);
      await this.db.run('UPDATE custom_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [listId]);
      return { success: true };
    } catch (error) {
      console.error('Erro ao remover item da lista:', error);
      return { success: false, message: 'Falha ao remover item da lista.' };
    }
  }

  async toggleLikeList(listId: number, userId: number) {
    try {
      const existing = await this.db.get(
        'SELECT id FROM custom_list_likes WHERE list_id = ? AND user_id = ?',
        [listId, userId]
      );
      if (existing) {
        await this.db.run('DELETE FROM custom_list_likes WHERE id = ?', [existing.id]);
        return { success: true, liked: false };
      } else {
        await this.db.run(
          'INSERT INTO custom_list_likes (list_id, user_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [listId, userId]
        );
        return { success: true, liked: true };
      }
    } catch (error) {
      console.error('Erro ao curtir lista:', error);
      return { success: false, message: 'Falha ao curtir lista.' };
    }
  }
}

