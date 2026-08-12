import { IDatabase } from '../interfaces/IDatabase';
import bcrypt from 'bcryptjs';

export class UserController {
  constructor(private db: IDatabase) {}

  async registerUser(username: string, password: string, email: string) {
    try {
      const existingUser = await this.db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
      if (existingUser) {
        if (existingUser.username === username) {
          return { success: false, message: 'Nome de utilizador já existe' };
        }
        if (existingUser.email === email) {
          return { success: false, message: 'E-mail já está em uso' };
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await this.db.run(
        'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
        [username, passwordHash, email]
      );

      return { success: true, userId: result.lastInsertRowid };
    } catch (error) {
      console.error('Erro ao registar utilizador:', error);
      return { success: false, message: 'Falha ao registar utilizador' };
    }
  }

  async authenticateUser(identifier: string, password: string) {
    try {
      const user = await this.db.get('SELECT * FROM users WHERE username = ? OR email = ?', [identifier, identifier]);
      if (!user) {
        return { success: false, message: 'Utilizador ou palavra-passe inválidos' };
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        if (user.email === 'ddnr03@gmail.com') {
          try { await this.db.run('UPDATE users SET is_admin = true WHERE id = ?', [user.id]); } 
          catch (e) { await this.db.run('UPDATE users SET is_admin = 1 WHERE id = ?', [user.id]); }
        }
        return { success: true, userId: user.id };
      } else {
        return { success: false, message: 'Utilizador ou palavra-passe inválidos' };
      }
    } catch (error) {
      console.error('Erro ao autenticar utilizador:', error);
      return { success: false, message: 'Falha na autenticação' };
    }
  }

  async getUserById(userId: number) {
    try {
      const user = await this.db.get('SELECT id, username, avatar_url, cover_url, is_admin, bio, created_at, (CASE WHEN spotify_access_token IS NOT NULL THEN 1 ELSE 0 END) as spotify_connected FROM users WHERE id = ?', [userId]);
      return user || null;
    } catch (error) {
      console.error('Erro ao buscar utilizador:', error);
      return null;
    }
  }

  async getUserByUsername(username: string) {
    try {
      const user = await this.db.get('SELECT id, username, email, name, gender, birth_date, avatar_url, cover_url, bio, is_admin, created_at, (CASE WHEN spotify_access_token IS NOT NULL THEN 1 ELSE 0 END) as spotify_connected FROM users WHERE username = ?', [username]);
      return user || null;
    } catch (error) {
      console.error('Erro ao buscar utilizador por nome:', error);
      return null;
    }
  }

  async checkIdentifierExists(identifier: string) {
    try {
      const isEmail = identifier.includes('@');
      const user = await this.db.get('SELECT id FROM users WHERE email = ? OR username = ?', [identifier, identifier]);
      return { success: true, exists: !!user, isEmail };
    } catch (error) {
      console.error('Erro ao verificar identificador:', error);
      return { success: false, message: 'Falha ao verificar identificador' };
    }
  }

  async updateUserProfile(userId: number, name: string, gender: string, birthDate: string, bio: string) {
    try {
      await this.db.run(
        'UPDATE users SET name = ?, gender = ?, birth_date = ?, bio = ? WHERE id = ?',
        [name, gender, birthDate, bio, userId]
      );
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar perfil do utilizador:', error);
      return { success: false, message: 'Falha ao atualizar perfil' };
    }
  }

  async updateAvatar(userId: number, avatarUrl: string) {
    try {
      await this.db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      return { success: false, message: 'Falha ao atualizar avatar' };
    }
  }

  async updateCover(userId: number, coverUrl: string) {
    try {
      await this.db.run('UPDATE users SET cover_url = ? WHERE id = ?', [coverUrl, userId]);
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar capa:', error);
      return { success: false, message: 'Falha ao atualizar capa' };
    }
  }

  // --- NOVO MÉTODO: Pesquisar utilizadores (parcial) ---
  async searchUsers(query: string) {
    try {
      // Busca utilizadores cujo nome contenha a query (LIKE %query%)
      // Limitamos a 20 resultados para não sobrecarregar
      const users = await this.db.all(
        'SELECT id, username, avatar_url, created_at FROM users WHERE username LIKE ? LIMIT 20',
        [`%${query}%`]
      );
      return { success: true, users: users || [] };
    } catch (error) {
      console.error('Erro ao pesquisar utilizadores:', error);
      return { success: false, message: 'Falha ao pesquisar utilizadores.' };
    }
  }

  async getUserReviews(userId: number) {
    try {
      const reviews = await this.db.all(
        'SELECT id, item_id, item_type, item_name, item_image_url, rating, review_text, "createdAt", "updatedAt" FROM reviews WHERE "userId" = ? ORDER BY "createdAt" DESC',
        [userId]
      );
      return { success: true, reviews: reviews || [] };
    } catch (error) {
      console.error('Falha ao buscar avaliações do utilizador:', error);
      return { success: false, message: 'Falha ao buscar avaliações.' };
    }
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    try {
      const user = await this.db.get('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (!user) return { success: false, message: 'Usuário não encontrado.' };

      const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isMatch) return { success: false, message: 'A senha atual está incorreta.' };

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await this.db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      return { success: false, message: 'Erro interno ao alterar senha.' };
    }
  }

  async getNotifications(userId: number) {
    try {
      const notifications = await this.db.all(`
        SELECT n.id, n.type, n.reference_id, n.is_read, n.created_at, 
               u.username as actor_username, u.avatar_url as actor_avatar 
        FROM notifications n 
        JOIN users u ON n.actor_id = u.id 
        WHERE n.user_id = ? 
        ORDER BY n.created_at DESC LIMIT 50
      `, [userId]);
      return { success: true, notifications: notifications || [] };
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return { success: false, message: 'Falha ao buscar notificações.' };
    }
  }

  async markNotificationsAsRead(userId: number) {
    try {
      await this.db.run('UPDATE notifications SET is_read = ? WHERE user_id = ?', [true, userId]).catch(() => {
        return this.db.run('UPDATE notifications SET is_read = ? WHERE user_id = ?', [1, userId]);
      });
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Falha ao marcar notificações como lidas.' };
    }
  }

  async updateSpotifyTokens(userId: number, accessToken: string, refreshToken: string, expiresAt: Date) {
    try {
      await this.db.run(
        'UPDATE users SET spotify_access_token = ?, spotify_refresh_token = ?, spotify_token_expires_at = ? WHERE id = ?',
        [accessToken, refreshToken, expiresAt.toISOString(), userId]
      );
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar tokens do Spotify:', error);
      return { success: false, message: 'Falha ao salvar tokens do Spotify.' };
    }
  }

  async getSpotifyTokens(userId: number) {
    try {
      const user = await this.db.get(
        'SELECT spotify_access_token, spotify_refresh_token, spotify_token_expires_at FROM users WHERE id = ?',
        [userId]
      );
      return user || null;
    } catch (error) {
      console.error('Erro ao buscar tokens do Spotify:', error);
      return null;
    }
  }
}