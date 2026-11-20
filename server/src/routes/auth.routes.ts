import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { UserController } from '../controllers/UserController';
import { generateToken } from '../utils/jwt';
import { requireAuth } from '../middleware/auth';

export function createAuthRouter(userController: UserController): Router {
  const router = Router();

  // Rate limiter mais restritivo para login (prevenir brute-force)
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

  /**
   * POST /auth/check
   * Verifica se o identificador (e-mail ou username) já está em uso (Etapa 1).
   */
  router.post('/check', async (req: Request, res: Response) => {
    const { identifier } = req.body;
    if (!identifier) {
      res.status(400).json({ error: 'Identificador (e-mail ou username) é obrigatório.' });
      return;
    }
    const result = await userController.checkIdentifierExists(identifier);
    res.json(result);
  });

  /**
   * POST /auth/register/request-code
   * Etapa 1 do cadastro com 2FA: valida dados e envia código de 6 dígitos para o e-mail.
   */
  router.post('/register/request-code', authLimiter, async (req: Request, res: Response) => {
    const { username, password, confirmPassword, email } = req.body;

    if (!username || !password || !email) {
      res.status(400).json({ error: 'E-mail, nome de utilizador e senha são obrigatórios.' });
      return;
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      res.status(400).json({ error: 'As senhas não coincidem.' });
      return;
    }

    if (username.trim().length < 3) {
      res.status(400).json({ error: 'Nome de utilizador deve ter pelo menos 3 caracteres.' });
      return;
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[\d#?!&@$*^%-]).{10,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400).json({ error: 'A senha deve ter pelo menos 10 caracteres, conter pelo menos 1 letra e 1 número ou caractere especial.' });
      return;
    }

    const result = await userController.requestRegistrationCode(username, password, email);

    if (result.success) {
      res.json({ message: 'Código de verificação enviado para o seu e-mail.', email: result.email });
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  /**
   * POST /auth/register/verify
   * Etapa 2 do cadastro com 2FA: confirma o código de 6 dígitos e cria a conta.
   */
  router.post('/register/verify', authLimiter, async (req: Request, res: Response) => {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ error: 'E-mail e código de verificação são obrigatórios.' });
      return;
    }

    const result = await userController.verifyRegistrationCode(email, String(code));

    if (result.success) {
      const token = generateToken({ userId: result.userId!, username: result.username! });
      res.status(201).json({
        message: 'Conta verificada e criada com sucesso!',
        token,
        user: { id: result.userId, username: result.username, email: result.email },
      });
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  /**
   * POST /auth/register
   * Cria uma nova conta de utilizador.
   */
  router.post('/register', async (req: Request, res: Response) => {
    const { username, password, confirmPassword, email } = req.body;

    if (!username || !password || !email) {
      res.status(400).json({ error: 'E-mail, nome de utilizador e senha são obrigatórios.' });
      return;
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      res.status(400).json({ error: 'As senhas não coincidem.' });
      return;
    }

    if (username.trim().length < 3) {
      res.status(400).json({ error: 'Nome de utilizador deve ter pelo menos 3 caracteres.' });
      return;
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[\d#?!&@$*^%-]).{10,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400).json({ error: 'A senha deve ter pelo menos 10 caracteres, conter pelo menos 1 letra e 1 número ou caractere especial.' });
      return;
    }

    const result = await userController.registerUser(username, password, email);

    if (result.success) {
      // Auto-login after registration
      const token = generateToken({ userId: result.userId!, username: username.trim() });
      res.status(201).json({ message: 'Conta criada com sucesso!', token, user: { id: result.userId, username: username.trim(), email: email.trim().toLowerCase() } });
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  /**
   * POST /auth/login
   * Autentica o utilizador e retorna um JWT.
   */
  router.post('/login', authLimiter, async (req: Request, res: Response) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ error: 'E-mail ou nome de utilizador e senha são obrigatórios.' });
      return;
    }

    const result = await userController.authenticateUser(identifier, password);

    if (result.success) {
      // Fetch full user data to include username se o identifier foi email
      const user = await userController.getUserById(result.userId!);
      const token = generateToken({ userId: result.userId!, username: user?.username || identifier });
      res.json({
        message: 'Login realizado com sucesso!',
        token,
        user: {
          id: result.userId,
          username: user?.username || identifier,
          avatar_url: user?.avatar_url,
          cover_url: user?.cover_url,
          is_admin: user?.is_admin
        }
      });
    } else {
      res.status(401).json({ error: result.message });
    }
  });

  /**
   * GET /auth/me
   * Retorna os dados do utilizador autenticado (valida o JWT).
   */
  router.get('/me', requireAuth, async (req: Request, res: Response) => {
    const user = await userController.getUserById(req.user!.userId);

    if (user) {
      res.json({
        id: user.id,
        username: user.username,
        email: (user as any).email,
        name: (user as any).name,
        gender: (user as any).gender,
        birth_date: (user as any).birth_date,
        avatar_url: user.avatar_url,
        cover_url: user.cover_url,
        bio: (user as any).bio,
        favorite_genres: (user as any).favorite_genres || [],
        is_admin: (user as any).is_admin,
        is_private: Boolean((user as any).is_private),
        listen_later_is_public: (user as any).listen_later_is_public !== false,
        listen_later_visibility: (user as any).listen_later_visibility || ((user as any).listen_later_is_public === false ? 'private' : 'public'),
        created_at: (user as any).created_at,
        spotify_connected: Boolean((user as any).spotify_connected),
      });
    } else {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
  });

  /**
   * PUT /auth/profile
   * Atualiza as informações de perfil (aceita atualização parcial para onboarding/configurações).
   */
  router.put('/profile', requireAuth, async (req: Request, res: Response) => {
    const { name, gender, birthDate, bio, favoriteGenres, is_private, listen_later_is_public, listen_later_visibility } = req.body;

    const result = await userController.updateUserProfile(req.user!.userId, {
      name,
      gender,
      birthDate,
      bio,
      favoriteGenres,
      is_private,
      listen_later_is_public,
      listen_later_visibility,
    });

    if (result.success) {
      const updated = await userController.getUserById(req.user!.userId);
      res.json({ message: 'Perfil atualizado com sucesso!', user: updated });
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  return router;
}
