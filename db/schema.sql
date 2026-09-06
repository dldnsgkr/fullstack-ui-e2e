-- Reference schema for the guestbook's "entries" table.
-- The server creates this automatically on startup (server/db.js: ensureSchema),
-- so running this file manually is optional.

CREATE TABLE IF NOT EXISTS entries (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_entries_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
