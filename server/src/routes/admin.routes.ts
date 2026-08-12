import { Router, Request, Response } from 'express';
import { AdminController } from '../controllers/AdminController';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

export function createAdminRouter(adminController: AdminController): Router {
  const router = Router();

  // Protege as rotas para apenas administradores autenticados
  router.use(requireAuth);
  router.use(requireAdmin);

  /**
   * GET /admin/stats
   * Retorna estatísticas globais da plataforma
   */
  router.get('/stats', async (req: Request, res: Response) => {
    const result = await adminController.getDashboardStats();

    if (result.success) {
      res.json(result.stats);
    } else {
      res.status(500).json({ error: result.message });
    }
  });

  return router;
}
