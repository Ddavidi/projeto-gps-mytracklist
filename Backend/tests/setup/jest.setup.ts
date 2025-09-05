import { DatabaseFactory } from '../../src/database/DatabaseFactory';
import { ControllerFactory } from '../../src/factories/ControllerFactory';

// Configurar banco de teste antes de todos os testes
beforeAll(async () => {
  // Usar banco em memória para testes
  process.env.NODE_ENV = 'test';
  process.env.DB_TYPE = 'memory';

  // Inicializar banco de teste
  const db = DatabaseFactory.create();
  await ControllerFactory.initializeDatabase(db);
});

// Limpar banco após cada teste
afterEach(async () => {
  const db = DatabaseFactory.create();

  // Limpar todas as tabelas para isolamento completo entre testes
  try {
    await db.exec('DELETE FROM admin_logs');
    await db.exec('DELETE FROM admins');
    await db.exec('DELETE FROM users');
  } catch (error) {
    // Ignorar erros se as tabelas não existirem ainda
  }
});

// Limpar após todos os testes
afterAll(async () => {
  const db = DatabaseFactory.create();
  await db.disconnect();
});