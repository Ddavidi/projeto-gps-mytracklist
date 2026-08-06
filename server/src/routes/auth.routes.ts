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
   * POST /auth/register
   * Cria uma nova conta de utilizador.
   */
  router.post('/register', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Nome de utilizador e senha são obrigatórios.' });
      return;
    }

    if (username.length < 3) {
      res.status(400).json({ error: 'Nome de utilizador deve ter pelo menos 3 caracteres.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    const result = await userController.registerUser(username, password);

    if (result.success) {
      res.status(201).json({ message: 'Conta criada com sucesso!' });
    } else {
      res.status(400).json({ error: result.message });
    }
  });

  /**
   * POST /auth/login
   * Autentica o utilizador e retorna um JWT.
   */
  router.post('/login', authLimiter, async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Nome de utilizador e senha são obrigatórios.' });
      return;
    }

    const result = await userController.authenticateUser(username, password);

    if (result.success) {
      const token = generateToken({ userId: result.userId!, username });
      res.json({
        message: 'Login realizado com sucesso!',
        token,
        user: { id: result.userId, username }
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
      res.json({ id: user.id, username: user.username });
    } else {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
  });

  return router;
}
