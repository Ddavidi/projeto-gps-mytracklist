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
import { createUploadRouter } from './routes/upload.routes';
import { createFavoriteRouter } from './routes/favorites.routes';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ========================
// Middlewares Globais
// ========================

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiter global
const maxRequests = process.env.NODE_ENV === 'production' ? 200 : 2000;
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: maxRequests });
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

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
    const spotifyService = new SpotifyService();

    // Montar rotas
    app.use('/api/v1/auth', createAuthRouter(userController));
    app.use('/api/v1/reviews', createReviewRouter(reviewController));
    app.use('/api/v1/spotify', createSpotifyRouter(spotifyService));
    app.use('/api/v1/users', createUserRouter(userController));
    app.use('/api/v1/social', createSocialRouter(socialController));
    app.use('/api/v1/upload', createUploadRouter(userController));
    app.use('/api/v1/favorites', createFavoriteRouter(favoriteController));

    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor MyTrackList rodando na porta ${PORT}`);
      console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error: any) {
    console.error('❌ Falha ao inicializar o servidor:', error.message);
    process.exit(1);
  }
}

startServer();