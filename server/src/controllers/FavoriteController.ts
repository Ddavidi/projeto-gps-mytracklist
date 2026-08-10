import { IDatabase } from '../interfaces/IDatabase';

export class FavoriteController {
  constructor(private db: IDatabase) {}

  /**
   * Adiciona um item aos favoritos (música, álbum, artista).
   * Restrição: Máximo 5 itens por categoria.
   */
  async addFavorite(userId: number, itemType: string, itemId: string) {
    try {
      // 1. Contar quantos itens desse tipo já existem para o usuário
      const countResult = await this.db.get(
        'SELECT COUNT(*) as count FROM user_favorites WHERE "userId" = ? AND item_type = ?',
        [userId, itemType]
      );
      
      const currentCount = parseInt(countResult.count, 10);
      if (currentCount >= 5) {
        return { success: false, message: `Você já atingiu o limite de 5 favoritos para a categoria ${itemType}.` };
      }

      // 2. Inserir (O banco de dados bloqueará duplicações por causa da constraint UNIQUE)
      await this.db.run(
        'INSERT INTO user_favorites ("userId", item_id, item_type) VALUES (?, ?, ?)',
        [userId, itemId, itemType]
      );

      return { success: true };
    } catch (error: any) {
      if (error.message?.includes('UNIQUE') || error.message?.includes('constraint')) {
        return { success: false, message: 'Este item já está nos seus favoritos.' };
      }
      console.error('Erro ao adicionar favorito:', error);
      return { success: false, message: 'Falha ao adicionar favorito.' };
    }
  }

  /**
   * Remove um item dos favoritos.
   */
  async removeFavorite(userId: number, itemType: string, itemId: string) {
    try {
      await this.db.run(
        'DELETE FROM user_favorites WHERE "userId" = ? AND item_type = ? AND item_id = ?',
        [userId, itemType, itemId]
      );
      return { success: true };
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      return { success: false, message: 'Falha ao remover favorito.' };
    }
  }

  /**
   * Lista todos os favoritos de um usuário.
   */
  async getUserFavorites(userId: number) {
    try {
      const favorites = await this.db.all(
        'SELECT id, item_id, item_type, "createdAt" FROM user_favorites WHERE "userId" = ? ORDER BY "createdAt" DESC',
        [userId]
      );
      return { success: true, favorites: favorites || [] };
    } catch (error) {
      console.error('Erro ao listar favoritos:', error);
      return { success: false, message: 'Falha ao buscar favoritos.' };
    }
  }
}
