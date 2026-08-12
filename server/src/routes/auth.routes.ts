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
   * POST /auth/register
   * Cria uma nova conta de utilizador.
   */
  router.post('/register', async (req: Request, res: Response) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      res.status(400).json({ error: 'E-mail, nome de utilizador e senha são obrigatórios.' });
      return;
    }

    if (username.length < 3) {
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
      const token = generateToken({ userId: result.userId!, username });
      res.status(201).json({ message: 'Conta criada com sucesso!', token, user: { id: result.userId, username, email } });
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
      res.json({ id: user.id, username: user.username, email: (user as any).email, name: (user as any).name, gender: (user as any).gender, birth_date: (user as any).birth_date, avatar_url: user.avatar_url, cover_url: user.cover_url, bio: (user as any).bio, is_admin: (user as any).is_admin, spotify_connected: (user as any).spotify_connected === 1 });
    } else {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
  });

  /**
   * PUT /auth/profile
   * Atualiza as informações de perfil (nome, gênero, data de nascimento).
   */
  router.put('/profile', requireAuth, async (req: Request, res: Response) => {
    const { name, gender, birthDate, bio } = req.body;
    
    if (!name || !gender || !birthDate) {
      res.status(400).json({ error: 'Nome, gênero e data de nascimento são obrigatórios.' });
      return;
    }

    const result = await userController.updateUserProfile(req.user!.userId, name, gender, birthDate, bio || '');
    
    if (result.success) {
      res.json({ message: 'Perfil atualizado com sucesso!' });
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  return router;
}
