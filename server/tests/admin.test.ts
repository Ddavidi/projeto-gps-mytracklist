import { vi } from 'vitest';
import { UserController } from '../src/controllers/UserController';
import { AdminController } from '../src/controllers/AdminController';
import { IDatabase } from '../src/interfaces/IDatabase';
import { createTestDatabase, resetDatabase } from './helpers/testDatabase';
import { isAdminEmail } from '../src/utils/admin';
import { sendLoginCodeEmail } from '../src/utils/email';

vi.mock('../src/utils/email', () => ({
  sendLoginCodeEmail: vi.fn().mockResolvedValue(undefined),
  sendVerificationCodeEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('isAdminEmail (ADMIN_EMAILS)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sem a variável, ninguém é admin', () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    expect(isAdminEmail('qualquer@example.com')).toBe(false);
  });

  it('aceita vários e-mails, ignorando espaços e maiúsculas', () => {
    vi.stubEnv('ADMIN_EMAILS', ' Chefe@Example.com , outra@example.com,, ');
    expect(isAdminEmail('chefe@example.com')).toBe(true);
    expect(isAdminEmail('OUTRA@example.com ')).toBe(true);
    expect(isAdminEmail('intrusa@example.com')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });
});

describe('promoção automática a admin ao entrar', () => {
  let db: IDatabase;
  let users: UserController;
  const isAdmin = async (email: string) =>
    Boolean((await db.get('SELECT is_admin FROM users WHERE email = ?', [email])).is_admin);

  beforeAll(async () => {
    db = await createTestDatabase();
    users = new UserController(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
    vi.stubEnv('ADMIN_EMAILS', 'chefe@example.com');
    await users.registerUser('chefe', 'Senha123!', 'chefe@example.com');
    await users.registerUser('comum', 'Senha123!', 'comum@example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  it('login com senha promove só quem está na lista', async () => {
    await users.authenticateUser('chefe', 'Senha123!');
    await users.authenticateUser('comum', 'Senha123!');
    expect(await isAdmin('chefe@example.com')).toBe(true);
    expect(await isAdmin('comum@example.com')).toBe(false);
  });

  it('senha errada não promove', async () => {
    await users.authenticateUser('chefe', 'errada');
    expect(await isAdmin('chefe@example.com')).toBe(false);
  });

  it('login com código por e-mail também promove', async () => {
    await users.requestLoginCode('chefe@example.com');
    const code = String(vi.mocked(sendLoginCodeEmail).mock.calls.at(-1)![2]);
    expect((await users.verifyLoginCode('chefe@example.com', code)).success).toBe(true);
    expect(await isAdmin('chefe@example.com')).toBe(true);
  });

  it('tirar o e-mail da lista não remove um admin já existente', async () => {
    await users.authenticateUser('chefe', 'Senha123!');
    vi.stubEnv('ADMIN_EMAILS', '');
    await users.authenticateUser('chefe', 'Senha123!');
    expect(await isAdmin('chefe@example.com')).toBe(true);
  });
});

describe('AdminController — painel', () => {
  let db: IDatabase;
  let users: UserController;
  let admin: AdminController;

  beforeAll(async () => {
    db = await createTestDatabase();
    users = new UserController(db);
    admin = new AdminController(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  it('estatísticas do painel funcionam com banco vazio e com dados', async () => {
    const empty = await admin.getDashboardStats();
    expect(empty).toMatchObject({ success: true, stats: { totalUsers: 0, totalReviews: 0, recentUsers: [], recentReviews: [] } });

    await users.registerUser('alice', 'Senha123!', 'alice@example.com');
    await users.registerUser('bob', 'Senha123!', 'bob@example.com');
    const { stats } = (await admin.getDashboardStats()) as any;
    expect(stats.totalUsers).toBe(2);
    expect(stats.recentUsers.map((u: any) => u.username).sort()).toEqual(['alice', 'bob']);
  });
});
