# Guestbook (projectId=42)

A simple guestbook application: one Node (Express) server exposes a JSON API
backed by the project's provisioned **MySQL** database **and** serves the built
React frontend from the same process.

```
Browser ──> Node server (single port)
             ├── GET  /api/entries   -> list entries        ─┐
             ├── POST /api/entries   -> create an entry      ├─ MySQL (entries table)
             └── /*                  -> static React UI     ─┘
```

## Project layout

```
app/
├── server/
│   ├── index.js        # Express server: API routes + static UI hosting
│   └── db.js           # mysql2 pool, schema bootstrap (entries table)
├── db/
│   └── schema.sql      # reference DDL (created automatically at startup too)
├── src/                # React frontend (Vite)
│   ├── App.jsx         # form + entry list
│   ├── api.js          # fetch helpers for the API
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js      # builds the UI into dist/ (+ dev proxy for /api)
├── .env.example        # copy to .env / or provide real env vars
└── package.json
```

## API

| Method | Path           | Description                                              |
| ------ | -------------- | -------------------------------------------------------- |
| GET    | `/api/entries` | Returns `{ count, entries: [...] }`, newest entries first |
| POST   | `/api/entries` | Creates an entry. Body: `{ "name": "...", "message": "..." }` |
| GET    | `/api/health`  | `{ status, database }` – DB connectivity check            |

Example:

```bash
curl -X POST http://localhost:3000/api/entries \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","message":"Hello from the past!"}'

curl http://localhost:3000/api/entries
```

Validation: both `name` (≤ 100 chars) and `message` (≤ 2000 chars) are required.
Invalid requests get `400` with per-field messages:

```json
{ "error": "Validation failed.", "errors": { "name": "Name is required." } }
```

## Database

Entries are persisted in the provisioned MySQL database in an `entries` table:

```sql
CREATE TABLE IF NOT EXISTS entries (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_entries_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

The server runs this `CREATE TABLE IF NOT EXISTS` automatically on startup
(`server/db.js`), so no manual migration step is required.

### Configuration (environment variables)

| Variable              | Default     | Description                          |
| --------------------- | ----------- | ------------------------------------ |
| `PORT`                | `3000`      | HTTP port of the single Node server  |
| `HOST`                | `0.0.0.0`   | Bind address                         |
| `DB_HOST`             | `127.0.0.1` | Provisioned MySQL host               |
| `DB_PORT`             | `3306`      | Provisioned MySQL port               |
| `DB_USER`             | `guestbook` | Database user                        |
| `DB_PASSWORD`         | `guestbook` | Database password                    |
| `DB_NAME`             | `guestbook` | Database name                        |
| `DB_CONNECTION_LIMIT` | `10`        | Pool size                            |

Set these in the environment (or a `.env` file — see `.env.example`) to point
the app at the project's provisioned MySQL instance. The startup connection
uses retries, so the app also boots cleanly when MySQL starts alongside it.

## Running

```bash
npm install
npm run build    # builds the React frontend into dist/
npm start        # starts the Node server (API + UI) on http://localhost:3000
```

### Development

```bash
npm run dev:server   # API + static hosting (watches server code)
npm run dev:client   # Vite dev server on :5173, proxies /api to :3000
```
