import { useId, useState, type FormEvent } from "react";
import type { Endpoint, ResponseConfig } from "../../shared/types";
import { api, errorMessage } from "../lib/api";
import { sampleCurl } from "../lib/curl";
import { formatAgo, formatDate, formatInt, useNow } from "../lib/format";
import { ConfirmButton } from "./ConfirmButton";
import { CopyButton } from "./CopyButton";
import styles from "./EndpointPanel.module.css";
import { BackToRequests } from "./BackToRequests";
import { IconTrash } from "./icons";
import { ResponseEditor, statusValid, type FieldError } from "./ResponseEditor";
import { ErrorBlock } from "./States";

interface Props {
  endpoint: Endpoint;
  /** Unseen requests of this endpoint, shown on the narrow back control. */
  unseenCount: number;
  onUpdated: (endpoint: Endpoint) => void;
  onCleared: () => void;
  onDeleted: () => void;
}

const isBlankRow = ([k, v]: [string, string]) => !k.trim() && !v.trim();

/** What a save would send: trimmed name, blank header rows dropped. */
const normalized = (name: string, r: ResponseConfig) =>
  JSON.stringify([name.trim(), r.status, r.contentType, r.body, r.headers.filter((h) => !isBlankRow(h))]);

export function EndpointPanel({ endpoint, unseenCount, onUpdated, onCleared, onDeleted }: Props) {
  const now = useNow(15_000);
  const id = useId();
  const url = `${location.origin}/h/${endpoint.slug}`;
  const sample = sampleCurl(url);
  const [name, setName] = useState(endpoint.name ?? "");
  const [response, setResponse] = useState(endpoint.response);
  const [base, setBase] = useState(endpoint);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<FieldError | null>(null);
  const [dangerError, setDangerError] = useState<string | null>(null);

  // While the form is clean, follow updates to the endpoint (refetches, saves from another tab).
  if (base !== endpoint) {
    setBase(endpoint);
    if (normalized(name, response) === normalized(base.name ?? "", base.response)) {
      setName(endpoint.name ?? "");
      setResponse(endpoint.response);
    }
  }
  const dirty = normalized(name, response) !== normalized(endpoint.name ?? "", endpoint.response);
  const valid = statusValid(response.status);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!dirty || !valid) return;
    setSaving(true);
    setSaveError(null);
    // Rows left completely blank are editing leftovers, not headers; `kept` maps sent index -> editor row.
    const kept = response.headers.flatMap((h, i) => (isBlankRow(h) ? [] : [i]));
    try {
      const updated = await api.updateEndpoint(endpoint.slug, {
        name: name.trim() || null,
        response: { ...response, headers: kept.map((i) => response.headers[i]!) },
      });
      setName(updated.name ?? "");
      setResponse(updated.response);
      onUpdated(updated);
    } catch (err) {
      const message = errorMessage(err);
      // The server names the offending row as `response.headers[n]`, counting only the rows sent.
      const n = /response\.headers\[(\d+)\]/.exec(message)?.[1];
      const row = n === undefined ? null : (kept[Number(n)] ?? null);
      setSaveError({
        message: row === null ? message : message.replace(/response\.headers\[\d+\]/, `Header ${row + 1}`),
        headerRow: row,
      });
    } finally {
      setSaving(false);
    }
  };

  const run = (fn: () => Promise<void>, then: () => void) => async () => {
    setDangerError(null);
    try {
      await fn();
      then();
    } catch (err) {
      setDangerError(errorMessage(err));
    }
  };

  const waiting = endpoint.requestCount === 0;
  const sampleBlock = (
    <div className={styles.block}>
      <div className={styles.blockHead}>
        <span className="label">Sample cURL</span>
        <CopyButton text={sample} label="Copy cURL" small />
      </div>
      <pre className={styles.code}>{sample}</pre>
    </div>
  );

  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`}>
      <header className={styles.head}>
        <BackToRequests slug={endpoint.slug} unseen={unseenCount} className={styles.back} />
        <h1 id={`${id}-title`} className={styles.title}>
          {endpoint.name ?? endpoint.slug}
        </h1>
        <p className={styles.sub}>
          <span className="label">Created</span> {formatDate(endpoint.createdAt)}
          <span className="label">Requests</span> {formatInt(endpoint.requestCount)}
          <span className="label">Last</span>{" "}
          {endpoint.lastRequestAt === null ? "no requests yet" : formatAgo(endpoint.lastRequestAt, now)}
        </p>
      </header>

      {waiting && (
        <div className={styles.waiting}>
          <h2 className={styles.waitingTitle}>Waiting for the first request</h2>
          <p>Paste the URL into your provider, or fire this from a terminal. It lands in the list within a second.</p>
          <pre className={styles.code}>{sample}</pre>
          <div>
            <CopyButton text={sample} label="Copy cURL" small />
          </div>
        </div>
      )}

      <div className={styles.block}>
        <div className={styles.blockHead}>
          <span className="label">Webhook URL</span>
          <CopyButton text={url} label="Copy URL" small />
        </div>
        <code className={styles.url} title={url}>
          {url}
        </code>
      </div>

      {!waiting && sampleBlock}

      <form className={styles.form} onSubmit={onSave} noValidate>
        <h2 className={styles.section}>Settings</h2>
        <label className="field">
          <span className="label">Name</span>
          <input value={name} maxLength={100} placeholder={endpoint.slug} onChange={(e) => setName(e.target.value)} />
        </label>
        <h3 className={styles.subsection}>Response sent to callers</h3>
        <ResponseEditor
          value={response}
          onChange={(next) => {
            setResponse(next);
            setSaveError(null);
          }}
          error={saveError}
        />
        <div className={styles.saveRow}>
          <button type="submit" className="btn" disabled={!dirty || !valid || saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {dirty && !saving && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setName(endpoint.name ?? "");
                setResponse(endpoint.response);
                setSaveError(null);
              }}
            >
              Discard
            </button>
          )}
          <span className="label">{dirty ? "Unsaved changes" : "Saved"}</span>
        </div>
        {saveError && saveError.headerRow === null && <ErrorBlock message={saveError.message} />}
      </form>

      <section className={styles.danger} aria-labelledby={`${id}-danger`}>
        <h2 id={`${id}-danger`} className={styles.section}>
          Danger zone
        </h2>
        <div className={styles.dangerRow}>
          <div>
            <p className={styles.dangerTitle}>Clear requests</p>
            <p className={styles.dangerText}>Deletes every captured request. The URL and settings stay.</p>
          </div>
          <ConfirmButton
            label="Clear requests"
            icon={<IconTrash />}
            onConfirm={run(() => api.clearRequests(endpoint.slug), onCleared)}
            disabled={endpoint.requestCount === 0}
          />
        </div>
        <div className={styles.dangerRow}>
          <div>
            <p className={styles.dangerTitle}>Delete endpoint</p>
            <p className={styles.dangerText}>Deletes the URL and all its requests. Senders get a 404 from then on.</p>
          </div>
          <ConfirmButton
            label="Delete endpoint"
            icon={<IconTrash />}
            onConfirm={run(() => api.deleteEndpoint(endpoint.slug), onDeleted)}
          />
        </div>
        {dangerError && <ErrorBlock message={dangerError} />}
      </section>
    </section>
  );
}
