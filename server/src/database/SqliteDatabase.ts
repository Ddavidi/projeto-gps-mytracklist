import { IDatabase } from '../interfaces/IDatabase';

export class SqliteDatabase implements IDatabase {
  private db: any = null;
  private filename: string;

  constructor(filename: string = './database.sqlite') {
    this.filename = filename;
  }

  async connect(): Promise<void> {
    try {
      const Database = require('better-sqlite3');
      this.db = new Database(this.filename);
    } catch (e) {
      console.error('Falha ao carregar better-sqlite3:', e);
      throw new Error('Driver better-sqlite3 não disponível.');
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async get(query: string, params?: any[]): Promise<any> {
    if (!this.db) throw new Error('Database not connected');
    return this.db.prepare(query).get(params || []);
  }

  async run(query: string, params?: any[]): Promise<any> {
    if (!this.db) {
      console.error('Database not connected in run method');
      throw new Error('Database not connected');
    }
    const result = this.db.prepare(query).run(params || []);
    return {
      lastInsertRowid: result.lastInsertRowid,
      changes: result.changes
    };
  }

  async all(query: string, params?: any[]): Promise<any[]> {
    if (!this.db) throw new Error('Database not connected');
    return this.db.prepare(query).all(params || []);
  }

  async exec(query: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    this.db.exec(query);
  }
}
