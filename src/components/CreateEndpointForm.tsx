import { useEffect, useRef, useState, type FormEvent } from "react";
import { SLUG_RE } from "../../shared/endpoint";
import type { Endpoint } from "../../shared/types";
import { api, errorMessage, HttpError } from "../lib/api";
import styles from "./CreateEndpointForm.module.css";
import { IconPlus } from "./icons";

const SLUG_HINT = "3–48 lowercase letters, digits or hyphens";

interface Props {
  id: string;
  onCreated: (endpoint: Endpoint) => void;
  onCancel: () => void;
}

export function CreateEndpointForm({ id, onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);

  useEffect(() => nameRef.current?.focus(), []);

  const rejectSlug = (message: string) => {
    setSlugError(message);
    slugRef.current?.focus();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const s = slug.trim();
    if (s && !SLUG_RE.test(s)) return rejectSlug(SLUG_HINT);
    setBusy(true);
    setError(null);
    setSlugError(null);
    try {
      const endpoint = await api.createEndpoint({ name: name.trim() || null, slug: s || null });
      setName("");
      setSlug("");
      onCreated(endpoint);
    } catch (err) {
      if (err instanceof HttpError && (err.status === 409 || /slug/i.test(err.message))) rejectSlug(err.message);
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      id={id}
      className={styles.form}
      onSubmit={onSubmit}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
      noValidate
      aria-label="New endpoint"
    >
      <label className="field">
        <span className="label">Name · optional</span>
        <input
          ref={nameRef}
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Stripe test"
        />
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
            ref={slugRef}
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
          <p id={`${id}-slug-error`} className={styles.fieldError} role="alert">
            <span className="badge solid">ERR</span> {slugError}
          </p>
        )}
      </div>
      {error && (
        <p className={styles.fieldError} role="alert">
          <span className="badge solid">ERR</span> {error}
        </p>
      )}
      <button type="submit" className="btn" disabled={busy}>
        <IconPlus />
        {busy ? "Creating…" : "Create endpoint"}
      </button>
    </form>
  );
}
