/**
 * Small fetch wrapper for the guestbook API.
 * Throws Error objects that carry the HTTP status (`status`) and, for
 * validation failures, per-field messages (`fields`).
 */
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...options,
    });
  } catch {
    throw new Error('Network error: could not reach the server.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response body; treat as empty payload.
  }

  if (!response.ok) {
    const error = new Error(
      payload?.error || `Request failed with status ${response.status}.`,
    );
    error.status = response.status;
    error.fields = payload?.errors || null;
    throw error;
  }

  return payload;
}

/** GET /api/entries -> { count, entries: [...] } */
export function getEntries() {
  return request('/api/entries');
}

/** POST /api/entries -> { message, entry } */
export function createEntry({ name, message }) {
  return request('/api/entries', {
    method: 'POST',
    body: JSON.stringify({ name, message }),
  });
}
