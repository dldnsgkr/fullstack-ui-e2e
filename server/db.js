import mysql from 'mysql2/promise';

/**
 * MySQL connection pool for the project's provisioned database.
 *
 * All values can be overridden through environment variables so the app can
 * be pointed at the provisioned MySQL instance of this project without any
 * code changes (see .env.example). The defaults match the local development
 * database described in the README.
 */
export const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'guestbook',
  password: process.env.DB_PASSWORD || 'guestbook',
  database: process.env.DB_NAME || 'guestbook',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  connectTimeout: 10_000,
  enableKeepAlive: true,
  charset: 'utf8mb4',
};

export const pool = mysql.createPool(DB_CONFIG);

export const ENTRIES_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS entries (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_entries_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

/** Creates the entries table if it does not exist yet. */
export async function ensureSchema() {
  await pool.query(ENTRIES_TABLE_DDL);
}

/**
 * Connects to the database, retrying a few times so the server also comes up
 * cleanly when the (provisioned) MySQL instance is started alongside it.
 * Retry behaviour is tunable via DB_CONNECT_RETRIES / DB_CONNECT_RETRY_DELAY_MS.
 */
export async function connectWithRetry(
  retries = Number(process.env.DB_CONNECT_RETRIES || 12),
  delayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 2500),
) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        console.warn(
          `[db] connection attempt ${attempt}/${retries} failed (${err.code || err.message}); retrying in ${delayMs}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}
