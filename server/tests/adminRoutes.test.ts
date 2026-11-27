import express from 'express';
import request from 'supertest';
import { createAdminRouter } from '../src/routes/admin.routes';
import { AdminController } from '../src/controllers/AdminController';
import { UserController } from '../src/controllers/UserController';
import { ControllerFactory } from '../src/factories/ControllerFactory';
import { generateToken } from '../src/utils/jwt';
import { IDatabase } from '../src/interfaces/IDatabase';
import { createTestDatabase, resetDatabase } from './helpers/testDatabase';

describe('Rotas /admin — só administradores', () => {
  let db: IDatabase;
  let app: express.Express;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    ControllerFactory.setDatabase(db); // o middleware requireAdmin usa o banco da factory
    app = express();
    app.use(express.json());
    app.use('/api/v1/admin', createAdminRouter(new AdminController(db)));
  });

  beforeEach(async () => {
    await resetDatabase(db);
    const users = new UserController(db);
    const adminId = Number((await users.registerUser('chefe', 'Senha123!', 'chefe@example.com')).userId);
    const userId = Number((await users.registerUser('comum', 'Senha123!', 'comum@example.com')).userId);
    await db.run('UPDATE users SET is_admin = TRUE WHERE id = ?', [adminId]);
    adminToken = generateToken({ userId: adminId, username: 'chefe' });
    userToken = generateToken({ userId, username: 'comum' });
  });

  afterAll(async () => {
    await db.disconnect();
  });

  it('sem login: 401', async () => {
    const res = await request(app).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });

  it('token inválido: 401', async () => {
    const res = await request(app).get('/api/v1/admin/stats').set('Authorization', 'Bearer token-falso');
    expect(res.status).toBe(401);
  });

  it('usuário comum: 403', async () => {
    const res = await request(app).get('/api/v1/admin/stats').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('administrador: 200 com as estatísticas', async () => {
    const res = await request(app).get('/api/v1/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain('"totalUsers":2');
  });
});
