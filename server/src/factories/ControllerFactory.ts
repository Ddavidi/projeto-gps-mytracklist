import { IDatabase } from '../interfaces/IDatabase';
import { DatabaseFactory } from '../database/DatabaseFactory';
import { UserController } from '../controllers/UserController';
import { ReviewController } from '../controllers/ReviewController';
import { SocialController } from '../controllers/SocialController';

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

  static createSocialController(db?: IDatabase): SocialController {
    const database = db || this.getDatabase();
    return new SocialController(database);
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
      // PostgreSQL schema — users
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

      // Migrations for existing user columns
      try {
        await database.exec(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
        `);
      } catch (e) {
        console.log('Postgres migration info (user columns might already exist):', e);
      }

      // PostgreSQL schema — reviews (generic: track, album, artist)
      await database.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          item_id TEXT NOT NULL,
          item_type TEXT NOT NULL DEFAULT 'track',
          rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 10),
          review_text TEXT,
          "createdAt" TIMESTAMPTZ DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY ("userId") REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE ("userId", item_id, item_type)
        )
      `);

      // Migrations for existing reviews table (trackId -> item_id + new columns)
      try {
        await database.exec(`ALTER TABLE reviews RENAME COLUMN "trackId" TO item_id`);
        console.log('Migration: renamed trackId to item_id in reviews');
      } catch (e) {
        // Column already renamed or doesn't exist — safe to ignore
      }
      try {
        await database.exec(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'track'`);
      } catch (e) {}
      try {
        await database.exec(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_text TEXT`);
      } catch (e) {}
      try {
        // Drop old unique constraint and add new one
        await database.exec(`ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_userId_trackId_key`);
        await database.exec(`ALTER TABLE reviews DROP CONSTRAINT IF EXISTS "reviews_userId_trackId_key"`);
        await database.exec(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'reviews_userid_itemid_itemtype_unique'
            ) THEN
              ALTER TABLE reviews ADD CONSTRAINT reviews_userid_itemid_itemtype_unique
                UNIQUE ("userId", item_id, item_type);
            END IF;
          END $$
        `);
      } catch (e) {
        console.log('Postgres migration info (unique constraint update):', e);
      }

      // PostgreSQL schema — activity_logs
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

      // PostgreSQL schema — follows
      await database.exec(`
        CREATE TABLE IF NOT EXISTS follows (
          id SERIAL PRIMARY KEY,
          "followerId" INTEGER NOT NULL,
          "followingId" INTEGER NOT NULL,
          "createdAt" TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY ("followerId") REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY ("followingId") REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE ("followerId", "followingId")
        )
      `);

      // PostgreSQL schema — review_likes
      await database.exec(`
        CREATE TABLE IF NOT EXISTS review_likes (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "reviewId" INTEGER NOT NULL,
          "createdAt" TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY ("userId") REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY ("reviewId") REFERENCES reviews (id) ON DELETE CASCADE,
          UNIQUE ("userId", "reviewId")
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

      // Migrations for existing SQLite user columns
      try { await database.exec('ALTER TABLE users ADD COLUMN email TEXT;'); } catch (e) {}
      try { await database.exec('ALTER TABLE users ADD COLUMN name TEXT;'); } catch (e) {}
      try { await database.exec('ALTER TABLE users ADD COLUMN gender TEXT;'); } catch (e) {}
      try { await database.exec('ALTER TABLE users ADD COLUMN birth_date TEXT;'); } catch (e) {}

      // SQLite schema — reviews (generic: track, album, artist)
      await database.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          item_id TEXT NOT NULL,
          item_type TEXT NOT NULL DEFAULT 'track',
          rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 10),
          review_text TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (userId, item_id, item_type)
        );
      `);

      // Migrations for existing SQLite reviews (trackId -> item_id)
      // SQLite does not support RENAME COLUMN in older versions; we handle gracefully
      try { await database.exec('ALTER TABLE reviews ADD COLUMN item_type TEXT NOT NULL DEFAULT \'track\';'); } catch (e) {}
      try { await database.exec('ALTER TABLE reviews ADD COLUMN review_text TEXT;'); } catch (e) {}

      // SQLite schema — activity_logs
      await database.exec(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        );
      `);

      // SQLite schema — follows
      await database.exec(`
        CREATE TABLE IF NOT EXISTS follows (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          followerId INTEGER NOT NULL,
          followingId INTEGER NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (followerId) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (followingId) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (followerId, followingId)
        );
      `);

      // SQLite schema — review_likes
      await database.exec(`
        CREATE TABLE IF NOT EXISTS review_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          reviewId INTEGER NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (reviewId) REFERENCES reviews (id) ON DELETE CASCADE,
          UNIQUE (userId, reviewId)
        );
      `);
    }

    console.log('Banco de dados inicializado com todas as tabelas.');
  }
}
