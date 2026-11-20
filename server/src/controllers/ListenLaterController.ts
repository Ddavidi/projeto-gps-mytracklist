import { IDatabase } from '../interfaces/IDatabase';

export type ListenLaterVisibility = 'public' | 'close_friends' | 'private';

export class ListenLaterController {
  constructor(private db: IDatabase) {}

  private normalizeVisibility(userRow: any): ListenLaterVisibility {
    if (userRow?.listen_later_visibility && ['public', 'close_friends', 'private'].includes(userRow.listen_later_visibility)) {
      return userRow.listen_later_visibility as ListenLaterVisibility;
    }
    if (userRow && (userRow.listen_later_is_public === false || userRow.listen_later_is_public === 0)) {
      return 'private';
    }
    return 'public';
  }

  async getUserItems(userId: number, requesterId?: number) {
    try {
      const isOwner = requesterId === userId;
      const user = await this.db.get(
        'SELECT listen_later_visibility, listen_later_is_public FROM users WHERE id = ?',
        [userId]
      );
      const visibility = this.normalizeVisibility(user);

      if (!isOwner) {
        if (visibility === 'private') {
          return { success: true, isPrivate: true, visibility, items: [] };
        }
        if (visibility === 'close_friends') {
          if (!requesterId) {
            return { success: true, isPrivate: true, visibility, items: [] };
          }
          const isCf = await this.db.get(
            'SELECT id FROM close_friends WHERE user_id = ? AND friend_id = ?',
            [userId, requesterId]
          );
          if (!isCf) {
            return { success: true, isPrivate: true, visibility, items: [] };
          }
        }
      }

      const items = await this.db.all(
        `SELECT id, user_id, item_id, item_type, item_name, item_artist, item_image_url, position, created_at
         FROM listen_later
         WHERE user_id = ?
         ORDER BY position ASC, created_at DESC`,
        [userId]
      );
      return { success: true, isPrivate: false, visibility, items: items || [] };
    } catch (error) {
      console.error('Erro ao buscar Quero Ouvir:', error);
      return { success: false, message: 'Falha ao buscar lista Quero Ouvir.' };
    }
  }

  async checkItem(userId: number, itemType: string, itemId: string) {
    try {
      const row = await this.db.get(
        'SELECT id FROM listen_later WHERE user_id = ? AND item_type = ? AND item_id = ?',
        [userId, itemType, itemId]
      );
      return { success: true, saved: Boolean(row) };
    } catch {
      return { success: true, saved: false };
    }
  }

  async addItem(
    userId: number,
    item: { itemId: string; itemType: string; itemName: string; itemArtist?: string; itemImageUrl?: string }
  ) {
    try {
      const existing = await this.db.get(
        'SELECT id FROM listen_later WHERE user_id = ? AND item_type = ? AND item_id = ?',
        [userId, item.itemType, item.itemId]
      );
      if (existing) {
        return { success: true, alreadyExists: true };
      }

      const maxPosRow = await this.db.get(
        'SELECT COALESCE(MAX(position), 0) as max_pos FROM listen_later WHERE user_id = ?',
        [userId]
      );
      const nextPos = Number(maxPosRow?.max_pos || 0) + 1;

      await this.db.run(
        `INSERT INTO listen_later (user_id, item_id, item_type, item_name, item_artist, item_image_url, position, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, item.itemId, item.itemType, item.itemName, item.itemArtist || '', item.itemImageUrl || '', nextPos]
      );
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar em Quero Ouvir:', error);
      return { success: false, message: 'Falha ao salvar em Quero Ouvir.' };
    }
  }

  async reorderItems(userId: number, orderedItems: { id: number; position: number }[]) {
    try {
      for (const item of orderedItems) {
        await this.db.run(
          'UPDATE listen_later SET position = ? WHERE id = ? AND user_id = ?',
          [item.position, item.id, userId]
        );
      }
      return { success: true };
    } catch (error) {
      console.error('Erro ao reordenar Quero Ouvir:', error);
      return { success: false, message: 'Falha ao reordenar itens.' };
    }
  }

  async updateVisibility(userId: number, visibility: ListenLaterVisibility) {
    const clean: ListenLaterVisibility = ['public', 'close_friends', 'private'].includes(visibility)
      ? visibility
      : 'public';
    try {
      await this.db.run(
        'UPDATE users SET listen_later_visibility = ?, listen_later_is_public = ? WHERE id = ?',
        [clean, clean === 'public', userId]
      );
      return { success: true, visibility: clean, isPublic: clean === 'public' };
    } catch (error) {
      console.error('Erro ao alterar visibilidade de Quero Ouvir:', error);
      return { success: false, message: 'Falha ao alterar visibilidade.' };
    }
  }

  async removeItem(userId: number, itemType: string, itemId: string) {
    try {
      await this.db.run(
        'DELETE FROM listen_later WHERE user_id = ? AND item_type = ? AND item_id = ?',
        [userId, itemType, itemId]
      );
      return { success: true };
    } catch (error) {
      console.error('Erro ao remover de Quero Ouvir:', error);
      return { success: false, message: 'Falha ao remover de Quero Ouvir.' };
    }
  }
}
