import { vi } from 'vitest';
import { UserController } from '../src/controllers/UserController';
import { IDatabase } from '../src/interfaces/IDatabase';
import { createTestDatabase, resetDatabase } from './helpers/testDatabase';
import { sendLoginCodeEmail } from '../src/utils/email';

vi.mock('../src/utils/email', () => ({
  sendLoginCodeEmail: vi.fn().mockResolvedValue(undefined),
  sendVerificationCodeEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

const sentCode = () => {
  const calls = vi.mocked(sendLoginCodeEmail).mock.calls;
  return String(calls[calls.length - 1]![2]);
};

describe('Login com código por e-mail (estilo Spotify)', () => {
  let db: IDatabase;
  let users: UserController;

  beforeAll(async () => {
    db = await createTestDatabase();
    users = new UserController(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
    vi.mocked(sendLoginCodeEmail).mockClear();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  async function createGoogleOnlyUser() {
    await db.run(
      'INSERT INTO users (username, password_hash, email, google_id) VALUES (?, ?, ?, ?)',
      ['alicegoogle', '__GOOGLE_OAUTH__', 'alice@gmail.com', 'google-123']
    );
    return db.get('SELECT * FROM users WHERE email = ?', ['alice@gmail.com']);
  }

  it('conta criada pelo Google consegue entrar com código enviado ao e-mail', async () => {
    const user = await createGoogleOnlyUser();
    expect((await users.authenticateUser('alice@gmail.com', 'qualquer')).success).toBe(false);

    const request = await users.requestLoginCode('Alice@Gmail.com');
    expect(request).toMatchObject({ success: true, email: 'al•••@gmail.com' });
    expect(sendLoginCodeEmail).toHaveBeenCalledWith('alice@gmail.com', 'alicegoogle', expect.stringMatching(/^\d{6}$/));

    const result = await users.verifyLoginCode('alice@gmail.com', sentCode());
    expect(result).toMatchObject({ success: true, userId: user.id });
  });

  it('também funciona para conta com senha e pelo nome de usuário', async () => {
    const { userId } = await users.registerUser('bob', 'Senha123!', 'bob@example.com');
    await users.requestLoginCode('bob');
    expect((await users.verifyLoginCode('bob', sentCode())).userId).toBe(userId);
  });

  it('o código só pode ser usado uma vez', async () => {
    await createGoogleOnlyUser();
    await users.requestLoginCode('alice@gmail.com');
    const code = sentCode();
    expect((await users.verifyLoginCode('alice@gmail.com', code)).success).toBe(true);
    expect((await users.verifyLoginCode('alice@gmail.com', code)).success).toBe(false);
  });

  it('recusa código errado e bloqueia depois de 5 tentativas', async () => {
    await createGoogleOnlyUser();
    await users.requestLoginCode('alice@gmail.com');
    const code = sentCode();
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      expect(await users.verifyLoginCode('alice@gmail.com', wrong)).toMatchObject({ success: false, message: 'Código incorreto.' });
    }
    // Mesmo o código certo não vale mais: precisa pedir outro.
    expect((await users.verifyLoginCode('alice@gmail.com', code)).success).toBe(false);
  });

  it('recusa código expirado', async () => {
    await createGoogleOnlyUser();
    await users.requestLoginCode('alice@gmail.com');
    await db.run('UPDATE login_codes SET expires_at = ?', [Date.now() - 1000]);
    expect(await users.verifyLoginCode('alice@gmail.com', sentCode())).toMatchObject({
      success: false,
      message: 'Código expirado. Peça um novo código.',
    });
  });

  it('o código de uma pessoa não serve para outra conta', async () => {
    await createGoogleOnlyUser();
    await users.registerUser('bob', 'Senha123!', 'bob@example.com');
    await users.requestLoginCode('alice@gmail.com');
    expect(await users.verifyLoginCode('bob@example.com', sentCode())).toMatchObject({
      success: false,
      message: 'Nenhum código ativo. Peça um novo código.',
    });
  });

  it('não reenvia antes de 45 segundos', async () => {
    await createGoogleOnlyUser();
    await users.requestLoginCode('alice@gmail.com');
    const again = await users.requestLoginCode('alice@gmail.com');
    expect(again.success).toBe(false);
    expect(again.message).toMatch(/^Aguarde \d+s/);
    expect(sendLoginCodeEmail).toHaveBeenCalledTimes(1);
  });

  it('conta inexistente não recebe código', async () => {
    const result = await users.requestLoginCode('ninguem@example.com');
    expect(result.success).toBe(false);
    expect(sendLoginCodeEmail).not.toHaveBeenCalled();
  });
});
