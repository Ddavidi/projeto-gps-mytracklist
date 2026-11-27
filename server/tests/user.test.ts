import { UserController } from '../src/controllers/UserController';
import { IDatabase } from '../src/interfaces/IDatabase';
import { createTestDatabase, resetDatabase } from './helpers/testDatabase';

describe('UserController', () => {
  let db: IDatabase;
  let users: UserController;

  beforeAll(async () => {
    db = await createTestDatabase();
    users = new UserController(db);
  });

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterAll(async () => {
    await db.disconnect();
  });

  describe('registerUser', () => {
    it('cria o usuário e guarda a senha com hash', async () => {
      const result = await users.registerUser('alice', 'Senha123!', 'Alice@Example.com');
      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();

      const row = await db.get('SELECT * FROM users WHERE id = ?', [result.userId]);
      expect(row.username).toBe('alice');
      expect(row.email).toBe('alice@example.com');
      expect(row.password_hash).not.toBe('Senha123!');
    });

    it('rejeita nome de usuário repetido, sem diferenciar maiúsculas', async () => {
      await users.registerUser('alice', 'Senha123!', 'alice@example.com');
      const result = await users.registerUser('ALICE', 'Outra123!', 'outra@example.com');
      expect(result).toMatchObject({ success: false, message: 'Nome de utilizador já existe' });
    });

    it('rejeita e-mail repetido', async () => {
      await users.registerUser('alice', 'Senha123!', 'alice@example.com');
      const result = await users.registerUser('bob', 'Senha123!', 'ALICE@example.com');
      expect(result).toMatchObject({ success: false, message: 'E-mail já está em uso' });
    });
  });

  describe('authenticateUser', () => {
    beforeEach(async () => {
      await users.registerUser('alice', 'Senha123!', 'alice@example.com');
    });

    it('entra com o nome de usuário', async () => {
      const result = await users.authenticateUser('alice', 'Senha123!');
      expect(result.success).toBe(true);
    });

    it('entra com o e-mail', async () => {
      const result = await users.authenticateUser('Alice@Example.com', 'Senha123!');
      expect(result.success).toBe(true);
    });

    it('recusa senha errada', async () => {
      const result = await users.authenticateUser('alice', 'errada');
      expect(result.success).toBe(false);
    });

    it('recusa usuário inexistente', async () => {
      const result = await users.authenticateUser('ninguem', 'Senha123!');
      expect(result.success).toBe(false);
    });
  });

  describe('changePassword', () => {
    it('troca a senha quando a atual está correta', async () => {
      const { userId } = await users.registerUser('alice', 'Senha123!', 'alice@example.com');
      const result = await users.changePassword(Number(userId), 'Senha123!', 'NovaSenha456!');
      expect(result.success).toBe(true);
      expect((await users.authenticateUser('alice', 'NovaSenha456!')).success).toBe(true);
      expect((await users.authenticateUser('alice', 'Senha123!')).success).toBe(false);
    });

    it('não troca a senha quando a atual está errada', async () => {
      const { userId } = await users.registerUser('alice', 'Senha123!', 'alice@example.com');
      const result = await users.changePassword(Number(userId), 'errada', 'NovaSenha456!');
      expect(result.success).toBe(false);
    });
  });
});
