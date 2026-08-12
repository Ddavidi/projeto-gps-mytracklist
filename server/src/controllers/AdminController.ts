import { IDatabase } from '../interfaces/IDatabase';

export class AdminController {
  constructor(private db: IDatabase) {}

  async getDashboardStats() {
    try {
      const totalUsersResult = await this.db.get('SELECT COUNT(id) as count FROM users');
      const totalReviewsResult = await this.db.get('SELECT COUNT(id) as count FROM reviews');
      
      const recentUsers = await this.db.all('SELECT id, username, email, created_at, avatar_url FROM users ORDER BY created_at DESC LIMIT 10');
      
      const recentReviews = await this.db.all(`
        SELECT r.id, r.item_id, r.item_type, r.rating, r."createdAt" as created_at, u.username
        FROM reviews r
        JOIN users u ON r."userId" = u.id
        ORDER BY r."createdAt" DESC LIMIT 10
      `);

      return {
        success: true,
        stats: {
          totalUsers: parseInt(totalUsersResult.count, 10) || 0,
          totalReviews: parseInt(totalReviewsResult.count, 10) || 0,
          recentUsers: recentUsers || [],
          recentReviews: recentReviews || []
        }
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas do admin:', error);
      return { success: false, message: 'Falha ao buscar estatísticas.' };
    }
  }
}
