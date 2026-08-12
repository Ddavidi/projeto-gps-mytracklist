import { Request, Response, NextFunction } from 'express';
import { ControllerFactory } from '../factories/ControllerFactory';

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user || !req.user.userId) {
    res.status(401).json({ error: 'Acesso negado. Não autenticado.' });
    return;
  }

  try {
    const db = ControllerFactory.getDatabase();
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [req.user.userId]);

    if (!user || (user.is_admin !== true && user.is_admin !== 1)) {
      res.status(403).json({ error: 'Acesso negado. Requer privilégios de administrador.' });
      return;
    }

    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar privilégios.' });
  }
}
