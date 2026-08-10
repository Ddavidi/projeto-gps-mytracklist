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
      const user = await this.db.get('SELECT id, username, avatar_url, cover_url, created_at FROM users WHERE id = ?', [userId]);
      return user || null;
    } catch (error) {
      console.error('Erro ao buscar utilizador:', error);
      return null;
    }
  }

  async getUserByUsername(username: string) {
    try {
      const user = await this.db.get('SELECT id, username, email, name, gender, birth_date, avatar_url, cover_url, created_at FROM users WHERE username = ?', [username]);
      return user || null;
    } catch (error) {
      console.error('Erro ao buscar utilizador por nome:', error);
      return null;
    }
  }

  async checkEmailExists(email: string) {
    try {
      const user = await this.db.get('SELECT id FROM users WHERE email = ?', [email]);
      return { success: true, exists: !!user };
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      return { success: false, message: 'Falha ao verificar email' };
    }
  }

  async updateUserProfile(userId: number, name: string, gender: string, birthDate: string) {
    try {
      await this.db.run(
        'UPDATE users SET name = ?, gender = ?, birth_date = ? WHERE id = ?',
        [name, gender, birthDate, userId]
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
        'SELECT id, item_id, item_type, rating, review_text, "createdAt", "updatedAt" FROM reviews WHERE "userId" = ? ORDER BY "createdAt" DESC',
        [userId]
      );
      return { success: true, reviews: reviews || [] };
    } catch (error) {
      console.error('Falha ao buscar avaliações do utilizador:', error);
      return { success: false, message: 'Falha ao buscar avaliações.' };
    }
  }
}