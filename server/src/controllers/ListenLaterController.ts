import { IDatabase } from '../interfaces/IDatabase';

export class ListenLaterController {
  constructor(private db: IDatabase) {}

  async getUserItems(userId: number) {
    try {
      const items = await this.db.all(
        `SELECT id, user_id, item_id, item_type, item_name, item_artist, item_image_url, created_at
         FROM listen_later
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId]
      );
      return { success: true, items: items || [] };
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

      await this.db.run(
        `INSERT INTO listen_later (user_id, item_id, item_type, item_name, item_artist, item_image_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, item.itemId, item.itemType, item.itemName, item.itemArtist || '', item.itemImageUrl || '']
      );
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar em Quero Ouvir:', error);
      return { success: false, message: 'Falha ao salvar em Quero Ouvir.' };
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

