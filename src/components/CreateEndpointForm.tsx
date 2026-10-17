import { useId, useState, type FormEvent } from "react";
import { SLUG_RE } from "../../shared/endpoint";
import type { Endpoint } from "../../shared/types";
import { api, errorMessage, HttpError } from "../lib/api";
import styles from "./CreateEndpointForm.module.css";
import { IconPlus } from "./icons";

const SLUG_HINT = "3–48 lowercase letters, digits or hyphens";

export function CreateEndpointForm({ onCreated }: { onCreated: (endpoint: Endpoint) => void }) {
  const id = useId();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const s = slug.trim();
    if (s && !SLUG_RE.test(s)) {
      setSlugError(SLUG_HINT);
      return;
    }
    setBusy(true);
    setError(null);
    setSlugError(null);
    try {
      const endpoint = await api.createEndpoint({ name: name.trim() || null, slug: s || null });
      setName("");
      setSlug("");
      onCreated(endpoint);
    } catch (err) {
      if (err instanceof HttpError && (err.status === 409 || /slug/i.test(err.message))) setSlugError(err.message);
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="label">
        New endpoint
      </h2>
      <label className="field">
        <span className="label">Name · optional</span>
        <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Stripe test" />
      </label>
      <div className="field">
        <label className="label" htmlFor={`${id}-slug`}>
          Slug · optional
        </label>
        <div className={styles.slug}>
          <span className={styles.prefix} aria-hidden="true">
            /h/
          </span>
          <input
            id={`${id}-slug`}
            value={slug}
            maxLength={48}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="random"
            aria-invalid={slugError ? true : undefined}
            aria-describedby={slugError ? `${id}-slug-error` : undefined}
            onChange={(e) => {
              const v = e.target.value;
              setSlug(v);
              if (slugError) setSlugError(v.trim() && !SLUG_RE.test(v.trim()) ? SLUG_HINT : null);
            }}
          />
        </div>
        {slugError && (
          <p id={`${id}-slug-error`} className={styles.fieldError}>
            <span className="badge">ERR</span> {slugError}
          </p>
        )}
      </div>
      {error && (
        <p className={styles.fieldError} role="alert">
          <span className="badge">ERR</span> {error}
        </p>
      )}
      <button type="submit" className="btn primary" disabled={busy}>
        <IconPlus />
        {busy ? "Creating…" : "Create endpoint"}
      </button>
    </form>
  );
}
