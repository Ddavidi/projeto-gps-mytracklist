import { IDatabase } from '../interfaces/IDatabase';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationCodeEmail } from '../utils/email';

export class UserController {
  constructor(private db: IDatabase) {}

  private hashVerificationCode(email: string, code: string): string {
    return crypto
      .createHash('sha256')
      .update(`${email.trim().toLowerCase()}:${code.trim()}`)
      .digest('hex');
  }

  async registerUser(username: string, password: string, email: string) {
    try {
      const normalizedUsername = username.trim();
      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await this.db.get(
        'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
        [normalizedUsername, normalizedEmail]
      );
      if (existingUser) {
        if (existingUser.username.toLowerCase() === normalizedUsername.toLowerCase()) {
          return { success: false, message: 'Nome de utilizador já existe' };
        }
        if (existingUser.email?.toLowerCase() === normalizedEmail) {
          return { success: false, message: 'E-mail já está em uso' };
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await this.db.run(
        'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
        [normalizedUsername, passwordHash, normalizedEmail]
      );

      return { success: true, userId: result.lastInsertRowid };
    } catch (error) {
      console.error('Erro ao registar utilizador:', error);
      return { success: false, message: 'Falha ao registar utilizador' };
    }
  }

  async requestRegistrationCode(username: string, password: string, email: string) {
    try {
      const normalizedUsername = username.trim();
      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await this.db.get(
        'SELECT id, username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
        [normalizedUsername, normalizedEmail]
      );
      if (existingUser) {
        if (existingUser.username?.toLowerCase() === normalizedUsername.toLowerCase()) {
          return { success: false, message: 'Nome de utilizador já existe' };
        }
        if (existingUser.email?.toLowerCase() === normalizedEmail) {
          return { success: false, message: 'E-mail já está em uso' };
        }
      }

      const pending = await this.db.get(
        'SELECT id, last_sent_at FROM email_verifications WHERE LOWER(email) = LOWER(?)',
        [normalizedEmail]
      );

      const now = Date.now();
      if (pending && now - Number(pending.last_sent_at) < 45 * 1000) {
        const waitSeconds = Math.ceil((45 * 1000 - (now - Number(pending.last_sent_at))) / 1000);
        return { success: false, message: `Aguarde ${waitSeconds}s antes de reenviar o código.` };
      }

      const code = crypto.randomInt(100000, 1000000).toString();
      const codeHash = this.hashVerificationCode(normalizedEmail, code);
      const passwordHash = await bcrypt.hash(password, 10);
      const expiresAt = now + 10 * 60 * 1000; // 10 minutos

      if (pending) {
        await this.db.run(
          'UPDATE email_verifications SET username = ?, password_hash = ?, code_hash = ?, attempts = 0, expires_at = ?, last_sent_at = ? WHERE id = ?',
          [normalizedUsername, passwordHash, codeHash, expiresAt, now, pending.id]
        );
      } else {
        await this.db.run(
          'INSERT INTO email_verifications (email, username, password_hash, code_hash, attempts, expires_at, last_sent_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
          [normalizedEmail, normalizedUsername, passwordHash, codeHash, expiresAt, now]
        );
      }

      await sendVerificationCodeEmail(normalizedEmail, normalizedUsername, code);

      return { success: true, email: normalizedEmail };
    } catch (error: any) {
      console.error('Erro ao enviar código de verificação:', error);
      return { success: false, message: error?.message || 'Falha ao enviar código de verificação.' };
    }
  }

  async verifyRegistrationCode(email: string, code: string) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const pending = await this.db.get(
        'SELECT * FROM email_verifications WHERE LOWER(email) = LOWER(?)',
        [normalizedEmail]
      );

      if (!pending) {
        return { success: false, message: 'Nenhum cadastro pendente encontrado para este e-mail. Solicite um novo código.' };
      }

      if (Date.now() > Number(pending.expires_at)) {
        await this.db.run('DELETE FROM email_verifications WHERE id = ?', [pending.id]);
        return { success: false, message: 'Código expirado. Solicite um novo código.' };
      }

      if (Number(pending.attempts) >= 5) {
        await this.db.run('DELETE FROM email_verifications WHERE id = ?', [pending.id]);
        return { success: false, message: 'Muitas tentativas incorretas. Solicite um novo código.' };
      }

      const expectedHash = this.hashVerificationCode(normalizedEmail, code);
      if (expectedHash !== pending.code_hash) {
        await this.db.run('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?', [pending.id]);
        return { success: false, message: 'Código de verificação inválido.' };
      }

      // Garante que ninguém registrou o mesmo username/email enquanto estava pendente
      const existingUser = await this.db.get(
        'SELECT id, username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
        [pending.username, normalizedEmail]
      );
      if (existingUser) {
        await this.db.run('DELETE FROM email_verifications WHERE id = ?', [pending.id]);
        return { success: false, message: 'E-mail ou nome de utilizador já está em uso.' };
      }

      const result = await this.db.run(
        'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
        [pending.username, pending.password_hash, normalizedEmail]
      );

      await this.db.run('DELETE FROM email_verifications WHERE id = ?', [pending.id]);

      return {
        success: true,
        userId: result.lastInsertRowid,
        username: pending.username,
        email: normalizedEmail,
      };
    } catch (error) {
      console.error('Erro ao verificar código de cadastro:', error);
      return { success: false, message: 'Falha ao verificar código de cadastro.' };
    }
  }

  async authenticateUser(identifier: string, password: string) {
    try {
      const normalized = identifier.trim();
      const user = await this.db.get(
        'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
        [normalized, normalized]
      );
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
      const user = await this.db.get(
        'SELECT id, username, email, name, gender, birth_date, avatar_url, cover_url, bio, is_admin, created_at, (CASE WHEN spotify_access_token IS NOT NULL THEN 1 ELSE 0 END) as spotify_connected FROM users WHERE LOWER(username) = LOWER(?)',
        [username.trim()]
      );
      return user || null;
    } catch (error) {
      console.error('Erro ao buscar utilizador por nome:', error);
      return null;
    }
  }

  async checkIdentifierExists(identifier: string) {
    try {
      const normalized = identifier.trim();
      const isEmail = normalized.includes('@');
      const user = await this.db.get(
        'SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)',
        [normalized, normalized]
      );
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

  // --- NOVO MÉTODO: Pesquisar utilizadores (parcial, case-insensitive) ---
  async searchUsers(query: string) {
    try {
      // Busca utilizadores cujo nome contenha a query sem diferenciar maiúsculas/minúsculas
      // Limitamos a 20 resultados para não sobrecarregar
      const users = await this.db.all(
        'SELECT id, username, avatar_url, created_at FROM users WHERE LOWER(username) LIKE LOWER(?) LIMIT 20',
        [`%${query.trim()}%`]
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