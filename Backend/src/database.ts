const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const openDatabase = async () => {
  return open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
};

const initializeDatabase = async () => {
  const db = await openDatabase();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    );
  `);
  await db.close();
};

module.exports = { openDatabase, initializeDatabase };
