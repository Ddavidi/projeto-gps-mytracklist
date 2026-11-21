import { IDatabase } from '../interfaces/IDatabase';
import { DatabaseFactory } from '../database/DatabaseFactory';
import { UserController } from '../controllers/UserController';
import { ReviewController } from '../controllers/ReviewController';
import { SocialController } from '../controllers/SocialController';
import { FavoriteController } from '../controllers/FavoriteController';
import { ListController } from '../controllers/ListController';
import { ListenLaterController } from '../controllers/ListenLaterController';

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

  static createFavoriteController(db?: IDatabase): FavoriteController {
    const database = db || this.getDatabase();
    return new FavoriteController(database);
  }

  static createListController(db?: IDatabase): ListController {
    const database = db || this.getDatabase();
    return new ListController(database);
  }

  static createListenLaterController(db?: IDatabase): ListenLaterController {
    const database = db || this.getDatabase();
    return new ListenLaterController(database);
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
          avatar_url TEXT,
          cover_url TEXT,
          bio TEXT,
          favorite_genres TEXT,
          is_admin BOOLEAN DEFAULT FALSE,
          spotify_access_token TEXT,
          spotify_refresh_token TEXT,
          spotify_token_expires_at TIMESTAMPTZ,
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
          ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_genres TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_access_token TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_refresh_token TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_token_expires_at TIMESTAMPTZ;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS listen_later_is_public BOOLEAN DEFAULT TRUE;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS listen_later_visibility TEXT NOT NULL DEFAULT 'public';
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
          item_name TEXT,
          item_image_url TEXT,
          item_preview_url TEXT,
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
      } catch (e) { }
      try {
        await database.exec(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_text TEXT`);
      } catch (e) { }
      try {
        await database.exec(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS item_name TEXT`);
        await database.exec(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS item_image_url TEXT`);
        await database.exec(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS item_preview_url TEXT`);
        await database.exec(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS listened_at TEXT`);
        await database.exec(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_relisten BOOLEAN DEFAULT FALSE`);
        await database.exec(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS vibe_tags TEXT`);
        await database.exec(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS has_spoiler BOOLEAN DEFAULT FALSE`);
      } catch (e) { }
      try {
        // Drop old unique constraint and add new one
        await database.exec(`ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_userId_trackId_key`);
        await database.exec(`ALTER TABLE reviews DROP CONSTRAINT IF EXISTS "reviews_userId_trackId_key"`);
        await database.exec(`ALTER TABLE reviews ADD CONSTRAINT reviews_userid_itemid_itemtype_unique UNIQUE ("userId", item_id, item_type)`);
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

      // PostgreSQL schema — notifications
      await database.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          actor_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          reference_id INTEGER,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE CASCADE
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

      // PostgreSQL schema — user_favorites
      await database.exec(`
        CREATE TABLE IF NOT EXISTS user_favorites (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          item_id TEXT NOT NULL,
          item_type TEXT NOT NULL,
          position INTEGER DEFAULT 0,
          "createdAt" TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY ("userId") REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE ("userId", item_id, item_type)
        )
      `);
      try {
        await database.exec(`ALTER TABLE user_favorites ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0`);
      } catch (e) { }

      // PostgreSQL schema — review_comments
      await database.exec(`
        CREATE TABLE IF NOT EXISTS review_comments (
          id SERIAL PRIMARY KEY,
          review_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // PostgreSQL schema — cadastros pendentes de verificação por e-mail
      await database.exec(`
        CREATE TABLE IF NOT EXISTS email_verifications (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          username TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          code_hash TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          expires_at BIGINT NOT NULL,
          last_sent_at BIGINT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // PostgreSQL schema — listas customizadas (estilo Musicboard/Letterboxd)
      await database.exec(`
        CREATE TABLE IF NOT EXISTS custom_lists (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          list_type TEXT NOT NULL DEFAULT 'album',
          is_ranked BOOLEAN DEFAULT TRUE,
          is_public BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      try {
        await database.exec(`ALTER TABLE custom_lists ADD COLUMN IF NOT EXISTS list_type TEXT NOT NULL DEFAULT 'album'`);
      } catch (e) { }

      await database.exec(`
        CREATE TABLE IF NOT EXISTS custom_list_items (
          id SERIAL PRIMARY KEY,
          list_id INTEGER NOT NULL,
          item_id TEXT NOT NULL,
          item_type TEXT NOT NULL,
          item_name TEXT NOT NULL,
          item_artist TEXT,
          item_image_url TEXT,
          position INTEGER DEFAULT 0,
          note TEXT,
          added_at TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY (list_id) REFERENCES custom_lists (id) ON DELETE CASCADE
        )
      `);

      await database.exec(`
        CREATE TABLE IF NOT EXISTS custom_list_likes (
          id SERIAL PRIMARY KEY,
          list_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY (list_id) REFERENCES custom_lists (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (list_id, user_id)
        )
      `);

      // PostgreSQL schema — Quero Ouvir (Listen Later)
      await database.exec(`
        CREATE TABLE IF NOT EXISTS listen_later (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          item_id TEXT NOT NULL,
          item_type TEXT NOT NULL,
          item_name TEXT NOT NULL,
          item_artist TEXT,
          item_image_url TEXT,
          position INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (user_id, item_id, item_type)
        )
      `);

      try {
        await database.exec(`ALTER TABLE listen_later ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0`);
      } catch (e) { }

      // PostgreSQL schema — Visibilidade das reviews (public | close_friends | private) e lista Close Friends
      try {
        await database.exec(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'`);
      } catch (e) { }

      await database.exec(`
        CREATE TABLE IF NOT EXISTS close_friends (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          friend_id INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (user_id, friend_id)
        )
      `);

      await database.exec(`
        CREATE TABLE IF NOT EXISTS follow_requests (
          id SERIAL PRIMARY KEY,
          requester_id INTEGER NOT NULL,
          target_id INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (target_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (requester_id, target_id)
        )
      `);

      // Username e e-mail únicos sem diferenciar maiúsculas/minúsculas ("Manga" == "manga")
      try {
        await database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique ON users (LOWER(username))`);
      } catch (e) {
        console.warn('Aviso: não foi possível criar índice único LOWER(username) — existem usernames duplicados ignorando maiúsculas.', e);
      }
      try {
        await database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (LOWER(email))`);
      } catch (e) {
        console.warn('Aviso: não foi possível criar índice único LOWER(email) — existem e-mails duplicados ignorando maiúsculas.', e);
      }

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
          avatar_url TEXT,
          cover_url TEXT,
          bio TEXT,
          favorite_genres TEXT,
          is_admin BOOLEAN DEFAULT FALSE,
          spotify_access_token TEXT,
          spotify_refresh_token TEXT,
          spotify_token_expires_at TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Migrations for existing SQLite user columns
      try { await database.exec('ALTER TABLE users ADD COLUMN email TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN name TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN gender TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN birth_date TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN cover_url TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN bio TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN favorite_genres TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN spotify_access_token TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN spotify_refresh_token TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN spotify_token_expires_at TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN is_private BOOLEAN DEFAULT 0;'); } catch (e) { }
      try { await database.exec('ALTER TABLE users ADD COLUMN listen_later_is_public BOOLEAN DEFAULT 1;'); } catch (e) { }
      try { await database.exec("ALTER TABLE users ADD COLUMN listen_later_visibility TEXT NOT NULL DEFAULT 'public';"); } catch (e) { }

      // SQLite schema — reviews (generic: track, album, artist)
      await database.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          item_id TEXT NOT NULL,
          item_type TEXT NOT NULL DEFAULT 'track',
          item_name TEXT,
          item_image_url TEXT,
          item_preview_url TEXT,
          rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 10),
          review_text TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (userId, item_id, item_type)
        );
      `);

      // Migrations for existing SQLite reviews (trackId -> item_id)
      try { await database.exec('ALTER TABLE reviews RENAME COLUMN trackId TO item_id;'); } catch (e) { }
      try { await database.exec('ALTER TABLE reviews ADD COLUMN item_type TEXT NOT NULL DEFAULT \'track\';'); } catch (e) { }
      try { await database.exec('ALTER TABLE reviews ADD COLUMN review_text TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE reviews ADD COLUMN item_name TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE reviews ADD COLUMN item_image_url TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE reviews ADD COLUMN item_preview_url TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE reviews ADD COLUMN listened_at TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE reviews ADD COLUMN is_relisten BOOLEAN DEFAULT 0;'); } catch (e) { }
      try { await database.exec('ALTER TABLE reviews ADD COLUMN vibe_tags TEXT;'); } catch (e) { }
      try { await database.exec('ALTER TABLE reviews ADD COLUMN has_spoiler BOOLEAN DEFAULT 0;'); } catch (e) { }

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

      // SQLite schema — notifications
      await database.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          actor_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          reference_id INTEGER,
          is_read BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE CASCADE
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

      // SQLite schema — user_favorites
      await database.exec(`
        CREATE TABLE IF NOT EXISTS user_favorites (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          item_id TEXT NOT NULL,
          item_type TEXT NOT NULL,
          position INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (userId, item_id, item_type)
        );
      `);
      try { await database.exec('ALTER TABLE user_favorites ADD COLUMN position INTEGER DEFAULT 0;'); } catch (e) { }

      // SQLite schema — review_comments
      await database.exec(`
        CREATE TABLE IF NOT EXISTS review_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          review_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `);

      // SQLite schema — cadastros pendentes de verificação por e-mail
      await database.exec(`
        CREATE TABLE IF NOT EXISTS email_verifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          username TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          code_hash TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          expires_at INTEGER NOT NULL,
          last_sent_at INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await database.exec(`
        CREATE TABLE IF NOT EXISTS custom_lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          list_type TEXT NOT NULL DEFAULT 'album',
          is_ranked BOOLEAN DEFAULT 1,
          is_public BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `);
      try { await database.exec("ALTER TABLE custom_lists ADD COLUMN list_type TEXT NOT NULL DEFAULT 'album';"); } catch (e) { }

      await database.exec(`
        CREATE TABLE IF NOT EXISTS custom_list_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          list_id INTEGER NOT NULL,
          item_id TEXT NOT NULL,
          item_type TEXT NOT NULL,
          item_name TEXT NOT NULL,
          item_artist TEXT,
          item_image_url TEXT,
          position INTEGER DEFAULT 0,
          note TEXT,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (list_id) REFERENCES custom_lists (id) ON DELETE CASCADE
        );
      `);

      await database.exec(`
        CREATE TABLE IF NOT EXISTS custom_list_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          list_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (list_id) REFERENCES custom_lists (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (list_id, user_id)
        );
      `);

      await database.exec(`
        CREATE TABLE IF NOT EXISTS listen_later (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          item_id TEXT NOT NULL,
          item_type TEXT NOT NULL,
          item_name TEXT NOT NULL,
          item_artist TEXT,
          item_image_url TEXT,
          position INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (user_id, item_id, item_type)
        );
      `);
      try { await database.exec("ALTER TABLE listen_later ADD COLUMN position INTEGER DEFAULT 0;"); } catch (e) { }
      try { await database.exec("ALTER TABLE reviews ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';"); } catch (e) { }

      await database.exec(`
        CREATE TABLE IF NOT EXISTS close_friends (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          friend_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (user_id, friend_id)
        );
      `);

      await database.exec(`
        CREATE TABLE IF NOT EXISTS follow_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          requester_id INTEGER NOT NULL,
          target_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (target_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE (requester_id, target_id)
        );
      `);
    }

    console.log('Banco de dados inicializado com todas as tabelas.');
  }
}
