import { IDatabase } from '../interfaces/IDatabase';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationCodeEmail, sendPasswordResetEmail } from '../utils/email';

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

      if (user.password_hash === '__GOOGLE_OAUTH__') {
        return {
          success: false,
          message: 'Esta conta foi criada com o Google. Clique em "Continuar com Google" para entrar.',
          code: 'GOOGLE_ONLY_ACCOUNT',
        };
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

  private parseFavoriteGenres(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async getUserById(userId: number) {
    try {
      const user = await this.db.get(
        `SELECT id, username, email, name, gender, birth_date, avatar_url, cover_url, bio, favorite_genres, is_admin, is_private, listen_later_is_public, listen_later_visibility, created_at,
         (CASE WHEN spotify_access_token IS NOT NULL AND spotify_access_token != '' THEN 1 ELSE 0 END) as spotify_connected
         FROM users WHERE id = ?`,
        [userId]
      );
      if (!user) return null;
      return {
        ...user,
        is_private: Boolean(user.is_private),
        listen_later_is_public: user.listen_later_is_public === null || user.listen_later_is_public === undefined ? true : Boolean(user.listen_later_is_public),
        listen_later_visibility: user.listen_later_visibility || (user.listen_later_is_public === false || user.listen_later_is_public === 0 ? 'private' : 'public'),
        favorite_genres: this.parseFavoriteGenres(user.favorite_genres),
        spotify_connected: Number(user.spotify_connected) === 1,
      };
    } catch (error) {
      console.error('Erro ao buscar utilizador:', error);
      return null;
    }
  }

  async getUserByUsername(username: string) {
    try {
      const user = await this.db.get(
        `SELECT id, username, email, name, gender, birth_date, avatar_url, cover_url, bio, favorite_genres, is_admin, is_private, listen_later_is_public, created_at,
         (CASE WHEN spotify_access_token IS NOT NULL AND spotify_access_token != '' THEN 1 ELSE 0 END) as spotify_connected
         FROM users WHERE LOWER(username) = LOWER(?)`,
        [username.trim()]
      );
      if (!user) return null;
      return {
        ...user,
        is_private: Boolean(user.is_private),
        listen_later_is_public: user.listen_later_is_public === null || user.listen_later_is_public === undefined ? true : Boolean(user.listen_later_is_public),
        favorite_genres: this.parseFavoriteGenres(user.favorite_genres),
        spotify_connected: Number(user.spotify_connected) === 1,
      };
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
        'SELECT id, google_id, password_hash FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)',
        [normalized, normalized]
      );
      return {
        success: true,
        exists: !!user,
        isEmail,
        isGoogleOnly: Boolean(user && user.password_hash === '__GOOGLE_OAUTH__'),
        hasGoogle: Boolean(user && user.google_id),
      };
    } catch (error) {
      console.error('Erro ao verificar identificador:', error);
      return { success: false, message: 'Falha ao verificar identificador' };
    }
  }

  /**
   * Autentica ou cria conta utilizando ID Token do Google Identity Services.
   * Regra: se já existir conta (nativa ou Google) com o mesmo e-mail, vincula o google_id e faz login direto sem duplicar.
   */
  async authenticateWithGoogle(credential: string) {
    try {
      if (!credential || typeof credential !== 'string') {
        return { success: false, message: 'Token do Google inválido.' };
      }

      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      if (!tokenInfoRes.ok) {
        return { success: false, message: 'Não foi possível validar sua conta Google. Tente novamente.' };
      }

      const payload: any = await tokenInfoRes.json();
      const expectedClientId = process.env.GOOGLE_CLIENT_ID;
      if (expectedClientId && payload.aud !== expectedClientId) {
        return { success: false, message: 'Token Google não pertence a este aplicativo.' };
      }

      const email = String(payload.email || '').trim().toLowerCase();
      const googleId = String(payload.sub || '').trim();
      const fullName = String(payload.name || '').trim();
      const picture = String(payload.picture || '').trim();

      if (!email || !googleId) {
        return { success: false, message: 'Não foi possível obter o e-mail da sua conta Google.' };
      }

      // 1. Verifica se já existe conta pelo google_id ou pelo mesmo e-mail (conta nativa)
      const existing = await this.db.get(
        'SELECT * FROM users WHERE google_id = ? OR LOWER(email) = LOWER(?)',
        [googleId, email]
      );

      if (existing) {
        // Vincula google_id e foto (se ainda não tiver) e realiza login direto
        const updates: string[] = [];
        const params: any[] = [];
        if (!existing.google_id) {
          updates.push('google_id = ?');
          params.push(googleId);
        }
        if (!existing.avatar_url && picture) {
          updates.push('avatar_url = ?');
          params.push(picture);
        }
        if (!existing.name && fullName) {
          updates.push('name = ?');
          params.push(fullName);
        }
        if (updates.length > 0) {
          params.push(existing.id);
          await this.db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        if (email === 'ddnr03@gmail.com') {
          try { await this.db.run('UPDATE users SET is_admin = true WHERE id = ?', [existing.id]); }
          catch { await this.db.run('UPDATE users SET is_admin = 1 WHERE id = ?', [existing.id]); }
        }

        return {
          success: true,
          userId: existing.id,
          username: existing.username,
          isNewUser: false,
          accountLinked: !existing.google_id,
        };
      }

      // 2. Cria nova conta com username único limpo
      const baseRaw = (email.split('@')[0] || fullName || 'usuario')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 18);
      const baseUsername = baseRaw.length >= 3 ? baseRaw : `user${Math.floor(1000 + Math.random() * 9000)}`;

      let finalUsername = baseUsername;
      for (let suffix = 0; suffix < 20; suffix++) {
        const candidate = suffix === 0 ? baseUsername : `${baseUsername}${Math.floor(10 + Math.random() * 989)}`;
        const taken = await this.db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [candidate]);
        if (!taken) {
          finalUsername = candidate;
          break;
        }
      }

      const result = await this.db.run(
        'INSERT INTO users (username, password_hash, email, name, avatar_url, google_id) VALUES (?, ?, ?, ?, ?, ?)',
        [finalUsername, '__GOOGLE_OAUTH__', email, fullName || finalUsername, picture || null, googleId]
      );

      const newUserId = result.lastInsertRowid;
      if (email === 'ddnr03@gmail.com') {
        try { await this.db.run('UPDATE users SET is_admin = true WHERE id = ?', [newUserId]); }
        catch { await this.db.run('UPDATE users SET is_admin = 1 WHERE id = ?', [newUserId]); }
      }

      return {
        success: true,
        userId: newUserId,
        username: finalUsername,
        isNewUser: true,
        accountLinked: false,
      };
    } catch (error) {
      console.error('Erro na autenticação com Google:', error);
      return { success: false, message: 'Falha ao entrar com o Google.' };
    }
  }

  async updateUserProfile(
    userId: number,
    fields: {
      name?: string;
      gender?: string;
      birthDate?: string;
      bio?: string;
      favoriteGenres?: string[];
      is_private?: boolean;
      listen_later_is_public?: boolean;
      listen_later_visibility?: string;
    }
  ) {
    try {
      const updates: string[] = [];
      const params: any[] = [];

      if (fields.name !== undefined) {
        updates.push('name = ?');
        params.push(fields.name);
      }
      if (fields.gender !== undefined) {
        updates.push('gender = ?');
        params.push(fields.gender);
      }
      if (fields.birthDate !== undefined) {
        updates.push('birth_date = ?');
        params.push(fields.birthDate || null);
      }
      if (fields.bio !== undefined) {
        updates.push('bio = ?');
        params.push(fields.bio);
      }
      if (fields.favoriteGenres !== undefined) {
        updates.push('favorite_genres = ?');
        params.push(JSON.stringify(Array.isArray(fields.favoriteGenres) ? fields.favoriteGenres : []));
      }
      if (fields.is_private !== undefined) {
        updates.push('is_private = ?');
        params.push(Boolean(fields.is_private));
      }
      if (fields.listen_later_is_public !== undefined) {
        updates.push('listen_later_is_public = ?');
        params.push(Boolean(fields.listen_later_is_public));
      }
      if (fields.listen_later_visibility !== undefined) {
        updates.push('listen_later_visibility = ?');
        params.push(fields.listen_later_visibility);
      }

      if (updates.length === 0) {
        return { success: true };
      }

      params.push(userId);
      await this.db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
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

  // --- Pesquisar utilizadores com ranking inteligente + tolerância a erros de digitação ---
  async searchUsers(query: string) {
    try {
      const q = String(query || '').trim().toLowerCase();
      if (!q) return { success: true, users: [] };

      const direct = await this.db.all(
        'SELECT id, username, name, avatar_url, created_at FROM users WHERE LOWER(username) LIKE LOWER(?) OR LOWER(COALESCE(name, \'\')) LIKE LOWER(?) LIMIT 40',
        [`%${q}%`, `%${q}%`]
      );

      let pool = direct || [];
      if (pool.length < 6) {
        const allCandidates = await this.db.all(
          'SELECT id, username, name, avatar_url, created_at FROM users LIMIT 200'
        );
        const existingIds = new Set(pool.map((u: any) => u.id));
        for (const u of allCandidates || []) {
          if (!existingIds.has(u.id)) pool.push(u);
        }
      }

      const levenshtein = (a: string, b: string): number => {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        const prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
        for (let i = 1; i <= a.length; i++) {
          let curr = i;
          for (let j = 1; j <= b.length; j++) {
            const temp = prev[j] ?? 0;
            const prevDiag = prev[j - 1] ?? 0;
            prev[j] = Math.min(temp + 1, curr + 1, prevDiag + (a[i - 1] === b[j - 1] ? 0 : 1));
            curr = temp;
          }
          prev[0] = i;
        }
        return prev[b.length] ?? 0;
      };

      const scored = pool
        .map((u: any) => {
          const uname = String(u.username || '').toLowerCase();
          const name = String(u.name || '').toLowerCase();
          let score = 0;
          if (uname === q) score = 1000;
          else if (name === q) score = 900;
          else if (uname.startsWith(q)) score = 700;
          else if (name.startsWith(q)) score = 600;
          else if (uname.includes(q)) score = 450;
          else if (name.includes(q)) score = 380;
          else {
            const distU = levenshtein(q, uname);
            const distN = name ? levenshtein(q, name) : 99;
            const simU = 1 - distU / Math.max(q.length, uname.length, 1);
            const simN = name ? 1 - distN / Math.max(q.length, name.length, 1) : 0;
            const best = Math.max(simU, simN);
            if (best >= 0.55) score = Math.round(best * 320);
          }
          return { ...u, _score: score };
        })
        .filter((u: any) => u._score > 0)
        .sort((a: any, b: any) => b._score - a._score)
        .slice(0, 20)
        .map(({ _score, ...rest }: any) => rest);

      return { success: true, users: scored };
    } catch (error) {
      console.error('Erro ao pesquisar utilizadores:', error);
      return { success: false, message: 'Falha ao pesquisar utilizadores.' };
    }
  }

  async getUserReviews(userId: number, requesterId?: number) {
    try {
      const isOwner = requesterId === userId;
      if (!isOwner) {
        const target = await this.db.get('SELECT is_private FROM users WHERE id = ?', [userId]);
        if (target && Boolean(target.is_private)) {
          const isFollower = requesterId
            ? await this.db.get(
                'SELECT id FROM follows WHERE "followerId" = ? AND "followingId" = ?',
                [requesterId, userId]
              )
            : null;
          if (!isFollower) {
            const countRow = await this.db.get(
              'SELECT COUNT(*) as cnt FROM reviews WHERE "userId" = ?',
              [userId]
            );
            return {
              success: true,
              reviews: [],
              reviewsCount: Number(countRow?.cnt || 0),
              isPrivateLocked: true,
            };
          }
        }
      }

      const viewerId = requesterId || -1;
      let rows: any[];
      if (isOwner) {
        rows = await this.db.all(
          `SELECT r.id, r.item_id, r.item_type, r.item_name, r.item_image_url, r.rating, r.review_text,
                  r.listened_at, r.is_relisten, r.vibe_tags, r.has_spoiler,
                  COALESCE(r.visibility, 'public') as visibility, r."createdAt", r."updatedAt",
                  (SELECT COUNT(*) FROM review_likes rl WHERE rl."reviewId" = r.id) as likes_count,
                  (SELECT 1 FROM review_likes rl2 WHERE rl2."reviewId" = r.id AND rl2."userId" = ?) as is_liked,
                  (SELECT COUNT(*) FROM review_comments rc WHERE rc.review_id = r.id) as comments_count
           FROM reviews r
           WHERE r."userId" = ?
           ORDER BY r."createdAt" DESC`,
          [viewerId, userId]
        );
      } else {
        rows = await this.db.all(
          `SELECT r.id, r.item_id, r.item_type, r.item_name, r.item_image_url, r.rating, r.review_text,
                  r.listened_at, r.is_relisten, r.vibe_tags, r.has_spoiler,
                  COALESCE(r.visibility, 'public') as visibility, r."createdAt", r."updatedAt",
                  (SELECT COUNT(*) FROM review_likes rl WHERE rl."reviewId" = r.id) as likes_count,
                  (SELECT 1 FROM review_likes rl2 WHERE rl2."reviewId" = r.id AND rl2."userId" = ?) as is_liked,
                  (SELECT COUNT(*) FROM review_comments rc WHERE rc.review_id = r.id) as comments_count
           FROM reviews r
           WHERE r."userId" = ?
           AND (
             COALESCE(r.visibility, 'public') = 'public'
             OR (
               r.visibility = 'close_friends'
               AND EXISTS (SELECT 1 FROM close_friends cf WHERE cf.user_id = ? AND cf.friend_id = ?)
             )
           )
           ORDER BY r."createdAt" DESC`,
          [viewerId, userId, userId, viewerId]
        );
      }
      const reviews = (rows || []).map((r: any) => ({
        ...r,
        visibility: r.visibility || 'public',
        vibe_tags: this.parseFavoriteGenres(r.vibe_tags),
        is_relisten: Boolean(r.is_relisten),
        has_spoiler: Boolean(r.has_spoiler),
      }));
      return { success: true, reviews };
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

  private hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  async requestPasswordReset(email: string, frontendBaseUrl: string) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const user = await this.db.get(
        'SELECT id, username, email FROM users WHERE LOWER(email) = LOWER(?)',
        [normalizedEmail]
      );

      if (!user) {
        return { success: false, message: 'Nenhuma conta encontrada com este e-mail.' };
      }

      const now = Date.now();
      const existing = await this.db.get(
        'SELECT id, last_sent_at FROM password_resets WHERE user_id = ? ORDER BY last_sent_at DESC LIMIT 1',
        [user.id]
      );

      if (existing && now - Number(existing.last_sent_at) < 45 * 1000) {
        const waitSeconds = Math.ceil((45 * 1000 - (now - Number(existing.last_sent_at))) / 1000);
        return { success: false, message: `Aguarde ${waitSeconds}s antes de solicitar um novo link.` };
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashResetToken(rawToken);
      const expiresAt = now + 30 * 60 * 1000; // 30 minutos

      // Invalida solicitações anteriores deste usuário
      await this.db.run('DELETE FROM password_resets WHERE user_id = ?', [user.id]);
      await this.db.run(
        'INSERT INTO password_resets (user_id, email, token_hash, expires_at, last_sent_at) VALUES (?, ?, ?, ?, ?)',
        [user.id, normalizedEmail, tokenHash, expiresAt, now]
      );

      const cleanBase = frontendBaseUrl.replace(/\/+$/, '');
      const resetUrl = `${cleanBase}/reset-password?token=${encodeURIComponent(rawToken)}`;

      await sendPasswordResetEmail(normalizedEmail, user.username, resetUrl);

      return { success: true, email: normalizedEmail };
    } catch (error: any) {
      console.error('Erro ao solicitar redefinição de senha:', error);
      return { success: false, message: error?.message || 'Falha ao enviar e-mail de redefinição.' };
    }
  }

  async verifyPasswordResetToken(token: string) {
    try {
      const cleanToken = String(token || '').trim();
      if (!cleanToken) {
        return { valid: false, message: 'Link de redefinição inválido.' };
      }

      const tokenHash = this.hashResetToken(cleanToken);
      const record = await this.db.get(
        `SELECT pr.id, pr.user_id, pr.email, pr.expires_at, u.username
         FROM password_resets pr
         JOIN users u ON u.id = pr.user_id
         WHERE pr.token_hash = ?`,
        [tokenHash]
      );

      if (!record) {
        return { valid: false, message: 'Este link de redefinição é inválido ou já foi utilizado.' };
      }

      if (Date.now() > Number(record.expires_at)) {
        await this.db.run('DELETE FROM password_resets WHERE id = ?', [record.id]);
        return { valid: false, message: 'Este link expirou. Solicite um novo link para trocar sua senha.' };
      }

      return {
        valid: true,
        email: record.email,
        username: record.username,
      };
    } catch (error) {
      console.error('Erro ao verificar token de redefinição:', error);
      return { valid: false, message: 'Erro ao validar link de redefinição.' };
    }
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    try {
      const cleanToken = String(token || '').trim();
      if (!cleanToken) {
        return { success: false, message: 'Link de redefinição inválido.' };
      }

      const tokenHash = this.hashResetToken(cleanToken);
      const record = await this.db.get(
        'SELECT id, user_id, expires_at FROM password_resets WHERE token_hash = ?',
        [tokenHash]
      );

      if (!record) {
        return { success: false, message: 'Este link de redefinição é inválido ou já foi utilizado.' };
      }

      if (Date.now() > Number(record.expires_at)) {
        await this.db.run('DELETE FROM password_resets WHERE id = ?', [record.id]);
        return { success: false, message: 'Este link expirou. Solicite um novo link para trocar sua senha.' };
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await this.db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, record.user_id]);
      await this.db.run('DELETE FROM password_resets WHERE user_id = ?', [record.user_id]);

      return { success: true };
    } catch (error) {
      console.error('Erro ao confirmar nova senha:', error);
      return { success: false, message: 'Erro interno ao redefinir a senha.' };
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