import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { uploadBufferToCloudinary } from '../utils/cloudinary';
import { UserController } from '../controllers/UserController';

// Configurar multer para armazenar em memória (buffer)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas.'));
    }
  }
});

export function createUploadRouter(userController: UserController): Router {
  const router = Router();

  // Requer autenticação
  router.use(requireAuth);

  /**
   * POST /upload/avatar
   */
  router.post('/avatar', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        return;
      }

      const result = await uploadBufferToCloudinary(req.file.buffer, 'mytracklist/avatars');
      
      // Atualizar banco de dados do usuário
      const userId = req.user!.userId;
      await userController.updateAvatar(userId, result.secure_url);

      res.json({ success: true, url: result.secure_url });
    } catch (error: any) {
      console.error('Erro no upload de avatar:', error);
      res.status(500).json({ error: error.message || 'Falha ao processar upload.' });
    }
  });

  /**
   * POST /upload/cover
   */
  router.post('/cover', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        return;
      }

      const result = await uploadBufferToCloudinary(req.file.buffer, 'mytracklist/covers');
      
      // Atualizar banco de dados do usuário
      const userId = req.user!.userId;
      await userController.updateCover(userId, result.secure_url);

      res.json({ success: true, url: result.secure_url });
    } catch (error: any) {
      console.error('Erro no upload de capa:', error);
      res.status(500).json({ error: error.message || 'Falha ao processar upload.' });
    }
  });

  return router;
}
