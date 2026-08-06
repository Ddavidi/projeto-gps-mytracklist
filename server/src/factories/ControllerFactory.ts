import { IDatabase } from '../interfaces/IDatabase';
import { DatabaseFactory } from '../database/DatabaseFactory';
import { UserController } from '../controllers/UserController';
import { ReviewController } from '../controllers/ReviewController';

export class ControllerFactory {
  private static db: IDatabase | null = null;

  static setDatabase(db: IDatabase) {
    this.db = db;
  }

  static getDatabase(): IDatabase {
    if (!this.db) {
      this.db = DatabaseFactory.create();
    }
    return this.db;
  }

  static createUserController(db?: IDatabase): UserController {
    const database = db || this.getDatabase();
    return new UserController(database);
  }

  static createReviewController(db?: IDatabase): ReviewController {
    const database = db || this.getDatabase();
    return new ReviewController(database);
  }

  /**
   * Inicializa o banco de dados e cria as tabelas.
   * SQL compatível com PostgreSQL (SERIAL, TIMESTAMPTZ, etc.)
   * Também funciona com SQLite graças ao IF NOT EXISTS.
   */
  static async initializeDatabase(db?: IDatabase): Promise<void> {
    const database = db || this.getDatabase();
    await database.connect();

    const isPostgres = process.env.DB_TYPE !== 'sqlite' && process.env.DB_TYPE !== 'memory';

    if (isPostgres) {
      // PostgreSQL schema
      await database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          email TEXT UNIQUE,
          name TEXT,
          gender TEXT,
          birth_date DATE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      // Migrations for existing tables
      try {
        await database.exec(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
        `);
      } catch (e) {
        console.log('Postgres migration info (columns might already exist):', e);
      }

      await database.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "trackId" TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 10),
          "createdAt" TIMESTAMPTZ DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY ("userId") REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE ("userId", "trackId")
        )
      `);

      await database.exec(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
      `);
    } else {
      // SQLite schema (for local dev / testing)
      await database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          email TEXT UNIQUE,
          name TEXT,
          gender TEXT,
          birth_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Migrations for existing SQLite tables
      try {
        await database.exec('ALTER TABLE users ADD COLUMN email TEXT;');
      } catch (e) {}
      try {
        await database.exec('ALTER TABLE users ADD COLUMN name TEXT;');
      } catch (e) {}
      try {
        await database.exec('ALTER TABLE users ADD COLUMN gender TEXT;');
      } catch (e) {}
      try {
        await database.exec('ALTER TABLE users ADD COLUMN birth_date TEXT;');
      } catch (e) {}

      await database.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          trackId TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 10),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (userId, trackId)
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        );
      `);
    }

    console.log('Banco de dados inicializado com todas as tabelas.');
  }
}
