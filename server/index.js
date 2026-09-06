import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { connectWithRetry, ensureSchema, pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const indexHtml = path.join(distDir, 'index.html');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 2000;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

/* ---------------------------------- API ---------------------------------- */

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch (err) {
    res.status(500).json({ status: 'degraded', database: 'down', detail: err.code || err.message });
  }
});

// GET /api/entries - list all guestbook entries (newest first).
app.get('/api/entries', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, message, created_at FROM entries ORDER BY created_at DESC, id DESC',
    );
    res.json({ count: rows.length, entries: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/entries - save a new guestbook entry.
app.post('/api/entries', async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    const errors = {};
    if (!name) errors.name = 'Name is required.';
    else if (name.length > MAX_NAME_LENGTH) {
      errors.name = `Name must be at most ${MAX_NAME_LENGTH} characters long.`;
    }
    if (!message) errors.message = 'Message is required.';
    else if (message.length > MAX_MESSAGE_LENGTH) {
      errors.message = `Message must be at most ${MAX_MESSAGE_LENGTH} characters long.`;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed.', errors });
    }

    const [result] = await pool.execute('INSERT INTO entries (name, message) VALUES (?, ?)', [
      name,
      message,
    ]);

    const [rows] = await pool.execute(
      'SELECT id, name, message, created_at FROM entries WHERE id = ?',
      [result.insertId],
    );

    return res.status(201).json({ message: 'Entry created.', entry: rows[0] });
  } catch (err) {
    return next(err);
  }
});

// Unknown API routes -> JSON 404 (no HTML fallback).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

/* ------------------------------- Static UI ------------------------------- */

if (fs.existsSync(indexHtml)) {
  app.use(express.static(distDir));
  // SPA fallback: every non-API GET request serves the frontend.
  app.get('*', (_req, res) => {
    res.sendFile(indexHtml);
  });
} else {
  app.get('*', (_req, res) => {
    res
      .status(503)
      .send('Frontend build not found. Run "npm run build" and restart the server.');
  });
}

/* ----------------------------- Error handling ---------------------------- */

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  console.error('[guestbook] request failed:', err);
  return res.status(500).json({ error: 'Internal server error.' });
});

/* -------------------------------- Startup -------------------------------- */

async function start() {
  try {
    await connectWithRetry();
    await ensureSchema();
    console.log('[guestbook] MySQL connected and table "entries" is ready.');
  } catch (err) {
    console.error(`[guestbook] WARNING: database unavailable (${err.code || err.message}).`);
    console.error('[guestbook] The UI will still be served; API calls will fail until the database is reachable.');
  }

  app.listen(PORT, HOST, () => {
    const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log(`[guestbook] server listening on http://${displayHost}:${PORT}`);
  });
}

start();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`[guestbook] ${signal} received, shutting down.`);
    pool
      .end()
      .catch(() => {})
      .finally(() => process.exit(0));
  });
}
