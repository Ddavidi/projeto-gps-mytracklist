import { Pool, PoolClient } from 'pg';
import { IDatabase } from '../interfaces/IDatabase';

export class PostgresDatabase implements IDatabase {
  private pool: Pool | null = null;
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString = connectionString || process.env.DATABASE_URL || '';
    if (!this.connectionString) {
      throw new Error('DATABASE_URL não está definida. Configure a variável de ambiente.');
    }
  }

  async connect(): Promise<void> {
    this.pool = new Pool({
      connectionString: this.connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test the connection
    const client = await this.pool.connect();
    client.release();
    console.log('Conectado ao PostgreSQL com sucesso.');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Converts SQLite-style `?` placeholders to PostgreSQL `$1, $2, $3` style.
   */
  private convertPlaceholders(query: string): string {
    let index = 0;
    return query.replace(/\?/g, () => {
      index++;
      return `$${index}`;
    });
  }

  /**
   * Fetches a single row from the database.
   */
  async get(query: string, params?: any[]): Promise<any> {
    if (!this.pool) throw new Error('Database not connected');
    const pgQuery = this.convertPlaceholders(query);
    const result = await this.pool.query(pgQuery, params);
    return result.rows[0] || null;
  }

  /**
   * Executes an INSERT, UPDATE, or DELETE statement.
   * Returns an object compatible with SQLite's result shape:
   * - `lastInsertRowid` for INSERTs (via RETURNING)
   * - `changes` for UPDATE/DELETE (via rowCount)
   */
  async run(query: string, params?: any[]): Promise<any> {
    if (!this.pool) throw new Error('Database not connected');
    let pgQuery = this.convertPlaceholders(query);

    // For INSERT statements, add RETURNING id to get the inserted row's id
    const isInsert = pgQuery.trim().toUpperCase().startsWith('INSERT');
    if (isInsert && !pgQuery.toUpperCase().includes('RETURNING')) {
      pgQuery += ' RETURNING id';
    }

    const result = await this.pool.query(pgQuery, params);

    return {
      lastInsertRowid: isInsert && result.rows[0] ? result.rows[0].id : undefined,
      changes: result.rowCount,
    };
  }

  /**
   * Fetches all rows matching the query.
   */
  async all(query: string, params?: any[]): Promise<any[]> {
    if (!this.pool) throw new Error('Database not connected');
    const pgQuery = this.convertPlaceholders(query);
    const result = await this.pool.query(pgQuery, params);
    return result.rows;
  }

  /**
   * Executes raw SQL (used for schema creation, etc.).
   * Splits multiple statements separated by semicolons and executes them sequentially.
   */
  async exec(query: string): Promise<void> {
    if (!this.pool) throw new Error('Database not connected');

    // Split by semicolons, filter empty statements
    const statements = query
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const statement of statements) {
        await client.query(statement);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
