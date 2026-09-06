import { useCallback, useEffect, useState } from 'react';
import { createEntry, getEntries } from './api.js';

const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 2000;

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [justPosted, setJustPosted] = useState(false);

  const refreshEntries = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await getEntries();
      setEntries(data.entries ?? []);
    } catch (err) {
      setLoadError(err.message || 'Failed to load guestbook entries.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshEntries();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshEntries]);

  async function handleManualRefresh() {
    setRefreshing(true);
    await refreshEntries();
    setRefreshing(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});
    setJustPosted(false);

    try {
      await createEntry({ name, message });
      setMessage('');
      setJustPosted(true);
      // Refresh the list from GET /api/entries after a successful submission.
      await refreshEntries();
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length > 0) {
        setFieldErrors(err.fields);
      } else {
        setSubmitError(err.message || 'Failed to submit your entry. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>📝 Guestbook</h1>
        <p className="subtitle">
          Leave a note for future visitors — every entry is stored in the database for everyone to
          see.
        </p>
      </header>

      <section className="card form-card" aria-labelledby="form-heading">
        <h2 id="form-heading">Sign the guestbook</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(event) => {
                setName(event.target.value);
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
                setJustPosted(false);
              }}
            />
            {fieldErrors.name && (
              <p className="field-error" role="alert">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              rows={4}
              placeholder="Write something nice…"
              value={message}
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.message)}
              onChange={(event) => {
                setMessage(event.target.value);
                setFieldErrors((prev) => ({ ...prev, message: undefined }));
                setJustPosted(false);
              }}
            />
            <div className="field-footer">
              {fieldErrors.message ? (
                <p className="field-error" role="alert">
                  {fieldErrors.message}
                </p>
              ) : (
                <span />
              )}
              <span className="char-count">
                {message.length}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
          </div>

          {submitError && (
            <p className="alert alert-error" role="alert">
              {submitError}
            </p>
          )}
          {justPosted && !submitError && (
            <p className="alert alert-success" role="status">
              Thanks for signing the guestbook! 🎉
            </p>
          )}

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Signing…' : 'Sign guestbook'}
          </button>
        </form>
      </section>

      <section className="card list-card" aria-labelledby="list-heading">
        <div className="list-header">
          <h2 id="list-heading">
            Entries{' '}
            {entries.length > 0 && <span className="count-badge">{entries.length}</span>}
          </h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <p className="muted">Loading entries…</p>
        ) : loadError ? (
          <div>
            <p className="alert alert-error" role="alert">
              {loadError}
            </p>
            <button type="button" className="btn btn-ghost" onClick={handleManualRefresh}>
              Try again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <p className="muted empty">No entries yet — be the first to sign!</p>
        ) : (
          <ul className="entries">
            {entries.map((entry) => (
              <li key={entry.id} className="entry">
                <div className="entry-head">
                  <span className="entry-name">{entry.name}</span>
                  <time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
                </div>
                <p className="entry-message">{entry.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="page-footer">
        Guestbook · Express + MySQL + React · served by a single Node server
      </footer>
    </div>
  );
}
