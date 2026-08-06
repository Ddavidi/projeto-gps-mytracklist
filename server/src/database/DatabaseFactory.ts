import { IDatabase, DatabaseConfig } from '../interfaces/IDatabase';
import { PostgresDatabase } from './PostgresDatabase';

export class DatabaseFactory {
  static create(config?: DatabaseConfig): IDatabase {
    const dbType = config?.type || process.env.DB_TYPE || 'postgres';

    switch (dbType) {
      case 'postgres':
      default:
        const connectionString = process.env.DATABASE_URL;
        return new PostgresDatabase(connectionString);
    }
  }

  static async createAndConnect(config?: DatabaseConfig): Promise<IDatabase> {
    const db = this.create(config);
    await db.connect();
    return db;
  }
}