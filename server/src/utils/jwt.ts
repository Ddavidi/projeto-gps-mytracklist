import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET é obrigatória em produção.');
    }
    return 'dev-secret-change-in-production';
  }
  return secret;
}

const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: number;
  username: string;
}

/**
 * Gera um JWT a partir dos dados do utilizador.
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifica e decodifica um JWT.
 * Retorna o payload se o token for válido, ou null se for inválido/expirado.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Gera um token temporário (15m) para o parâmetro `state` do fluxo OAuth.
 */
export function generateOAuthStateToken(userId: number): string {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '15m' });
}

/**
 * Verifica e decodifica o token de `state` do fluxo OAuth.
 */
export function verifyOAuthStateToken(token: string): { userId: number } {
  return jwt.verify(token, getJwtSecret()) as { userId: number };
}
