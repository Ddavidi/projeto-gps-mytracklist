import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { ControllerFactory } from './factories/ControllerFactory';
import { SpotifyService } from './services/SpotifyService';

import { createAuthRouter } from './routes/auth.routes';
import { createReviewRouter } from './routes/review.routes';
import { createSpotifyRouter } from './routes/spotify.routes';
import { createUserRouter } from './routes/user.routes';
import { createSocialRouter } from './routes/social.routes';
import { createSpotifyAuthRouter } from './routes/spotify.auth.routes';
import { createUploadRouter } from './routes/upload.routes';
import { createFavoriteRouter } from './routes/favorites.routes';
import { createListRouter } from './routes/lists.routes';
import { createListenLaterRouter } from './routes/listenLater.routes';
import { createAdminRouter } from './routes/admin.routes';
import { AdminController } from './controllers/AdminController';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Confia no proxy reverso (Render / Vercel / Nginx) para IP real no rate limiter
app.set('trust proxy', 1);

// ========================
// Middlewares Globais
// ========================

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim().replace(/\/+$/, '')).filter(Boolean)
  : [];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);

    const normalized = origin.replace(/\/+$/, '');
    const isExactAllowed = envOrigins.includes(normalized);
    const isVercelProject =
      normalized === 'https://projeto-gps-mytracklist.vercel.app' ||
      /^https:\/\/projeto-gps-mytracklist[a-z0-9-]*\.vercel\.app$/i.test(normalized) ||
      /^https:\/\/projeto-gps-mytracklis[a-z0-9-]*\.vercel\.app$/i.test(normalized);

    if (isExactAllowed || isVercelProject || envOrigins.length === 0) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiter global (ignora preflight OPTIONS para nunca quebrar CORS)
const maxRequests = process.env.NODE_ENV === 'production' ? 2000 : 5000;
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: maxRequests,
  skip: (req) => req.method === 'OPTIONS',
});
app.use(globalLimiter);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

app.use(express.json());

// ========================
// Health check
// ========================

app.get('/api/v1/health', async (_req, res) => {
  try {
    const db = ControllerFactory.getDatabase();
    await db.get('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  }
});

// ========================
// Inicialização e Rotas
// ========================

async function startServer() {
  try {
    // Inicializar banco de dados
    await ControllerFactory.initializeDatabase();
    console.log('✅ Banco de dados inicializado');

    // Criar controllers
    const userController = ControllerFactory.createUserController();
    const reviewController = ControllerFactory.createReviewController();
    const socialController = ControllerFactory.createSocialController();
    const favoriteController = ControllerFactory.createFavoriteController();
    const listController = ControllerFactory.createListController();
    const listenLaterController = ControllerFactory.createListenLaterController();
    const adminController = new AdminController(ControllerFactory.getDatabase());
    const spotifyService = new SpotifyService();

    // Montar rotas
    app.use('/api/v1/auth', createAuthRouter(userController));
    app.use('/api/v1/auth/spotify', createSpotifyAuthRouter(spotifyService, userController));
    app.use('/api/v1/reviews', createReviewRouter(reviewController));
    app.use('/api/v1/spotify', createSpotifyRouter(spotifyService, userController));
    app.use('/api/v1/users', createUserRouter(userController));
    app.use('/api/v1/social', createSocialRouter(socialController));
    app.use('/api/v1/upload', createUploadRouter(userController));
    app.use('/api/v1/favorites', createFavoriteRouter(favoriteController));
    app.use('/api/v1/lists', createListRouter(listController));
    app.use('/api/v1/listen-later', createListenLaterRouter(listenLaterController));
    app.use('/api/v1/admin', createAdminRouter(adminController));

    // Error handler global para evitar queda do processo sem headers CORS
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Erro não tratado na rota:', err);
      if (!res.headersSent) {
        res.status(err?.status || 500).json({ error: err?.message || 'Erro interno do servidor.' });
      }
    });

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor MyTrackList rodando na porta ${PORT}`);
      console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error: any) {
    console.error('❌ Falha ao inicializar o servidor:', error.message);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

startServer();