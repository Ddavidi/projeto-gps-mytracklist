import { PostgresDatabase } from '../../src/database/PostgresDatabase';
import { ControllerFactory } from '../../src/factories/ControllerFactory';
import { IDatabase } from '../../src/interfaces/IDatabase';

/**
 * Os testes rodam contra um PostgreSQL de verdade (o mesmo banco usado em produção).
 * Localmente: suba um Postgres e defina TEST_DATABASE_URL (veja server/README.md).
 * No CI: o GitHub Actions sobe um serviço Postgres e define a variável sozinho.
 */
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mytracklist_test';

export async function createTestDatabase(): Promise<IDatabase> {
  if (!/test/i.test(TEST_DATABASE_URL)) {
    // Proteção: a limpeza entre testes apaga TODOS os dados do banco.
    throw new Error('TEST_DATABASE_URL precisa apontar para um banco de teste (o nome deve conter "test").');
  }
  const db = new PostgresDatabase(TEST_DATABASE_URL);
  await ControllerFactory.initializeDatabase(db);
  return db;
}

/** Apaga todos os dados (mantém o schema) para cada teste começar do zero. */
export async function resetDatabase(db: IDatabase): Promise<void> {
  const tables = await db.all(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  if (tables.length === 0) return;
  const list = tables.map((t: any) => `"${t.tablename}"`).join(', ');
  await db.exec(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}
