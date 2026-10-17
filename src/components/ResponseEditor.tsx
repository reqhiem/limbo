import { useEffect, useId, useRef } from "react";
import { MAX_STATUS, MIN_STATUS } from "../../shared/endpoint";
import type { KV, ResponseConfig } from "../../shared/types";
import { IconClose, IconPlus } from "./icons";
import styles from "./ResponseEditor.module.css";

const CONTENT_TYPES = [
  "application/json",
  "text/plain; charset=utf-8",
  "text/html; charset=utf-8",
  "application/xml",
  "application/x-www-form-urlencoded",
  "application/octet-stream",
];

export const statusValid = (s: number) => Number.isInteger(s) && s >= MIN_STATUS && s <= MAX_STATUS;

export interface FieldError {
  /** Index into `value.headers`, or null when the server error is not about one header row. */
  headerRow: number | null;
  message: string;
}

interface Props {
  value: ResponseConfig;
  onChange: (value: ResponseConfig) => void;
  /** Server rejection of the last save, shown in place. */
  error?: FieldError | null;
}

export function ResponseEditor({ value, onChange, error = null }: Props) {
  const id = useId();
  const set = (patch: Partial<ResponseConfig>) => onChange({ ...value, ...patch });
  const setHeader = (i: number, kv: KV) => set({ headers: value.headers.map((h, j) => (j === i ? kv : h)) });
  const badStatus = !statusValid(value.status);
  const headersRef = useRef<HTMLFieldSetElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const focusAfterRemove = useRef<number | null>(null);

  // After a row is removed, focus the row that took its place (or the one above, or "Add header").
  useEffect(() => {
    const i = focusAfterRemove.current;
    if (i === null) return;
    focusAfterRemove.current = null;
    const rows = headersRef.current?.querySelectorAll<HTMLElement>("[data-header-row]") ?? [];
    const row = rows[Math.min(i, rows.length - 1)];
    (row?.querySelector("input") ?? addRef.current)?.focus();
  }, [value.headers.length]);

  return (
    <div className={styles.editor}>
      <div className={styles.row}>
        <div className={`field ${styles.status}`}>
          <label className="label" htmlFor={`${id}-status`}>
            Status
          </label>
          <input
            id={`${id}-status`}
            type="number"
            inputMode="numeric"
            min={MIN_STATUS}
            max={MAX_STATUS}
            step={1}
            value={Number.isNaN(value.status) ? "" : value.status}
            onChange={(e) => set({ status: e.target.valueAsNumber })}
            aria-invalid={badStatus || undefined}
            aria-describedby={`${id}-status-hint`}
          />
          <span id={`${id}-status-hint`} className={badStatus ? styles.hintError : "label"}>
            {MIN_STATUS}–{MAX_STATUS}
          </span>
        </div>
        <div className="field">
          <label className="label" htmlFor={`${id}-type`}>
            Content type
          </label>
          <input
            id={`${id}-type`}
            list={`${id}-types`}
            value={value.contentType}
            maxLength={200}
            spellCheck={false}
            onChange={(e) => set({ contentType: e.target.value })}
          />
          <datalist id={`${id}-types`}>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor={`${id}-body`}>
          Body
        </label>
        <textarea
          id={`${id}-body`}
          rows={6}
          value={value.body}
          spellCheck={false}
          onChange={(e) => set({ body: e.target.value })}
        />
      </div>

      <fieldset ref={headersRef} className={styles.headers}>
        <legend className="label">Extra headers · {value.headers.length}</legend>
        {value.headers.map(([k, v], i) => {
          const rowError = error?.headerRow === i ? error.message : null;
          const errorId = `${id}-header-${i}-error`;
          return (
            <div key={i} className={styles.headerGroup} data-header-row>
              <div className={styles.headerRow}>
                <input
                  aria-label={`Header ${i + 1} name`}
                  placeholder="x-name"
                  value={k}
                  spellCheck={false}
                  aria-invalid={rowError ? true : undefined}
                  aria-describedby={rowError ? errorId : undefined}
                  onChange={(e) => setHeader(i, [e.target.value, v])}
                />
                <input
                  aria-label={`Header ${i + 1} value`}
                  placeholder="value"
                  value={v}
                  spellCheck={false}
                  aria-invalid={rowError ? true : undefined}
                  aria-describedby={rowError ? errorId : undefined}
                  onChange={(e) => setHeader(i, [k, e.target.value])}
                />
                <button
                  type="button"
                  className="btn"
                  aria-label={`Remove header ${i + 1}`}
                  onClick={() => {
                    focusAfterRemove.current = i;
                    set({ headers: value.headers.filter((_, j) => j !== i) });
                  }}
                >
                  <IconClose />
                </button>
              </div>
              {rowError && (
                <p id={errorId} className={styles.rowError} role="alert">
                  <span className="badge solid">ERR</span> {rowError}
                </p>
              )}
            </div>
          );
        })}
        <div>
          <button
            ref={addRef}
            type="button"
            className="btn small"
            onClick={() => set({ headers: [...value.headers, ["", ""]] })}
            disabled={value.headers.length >= 50}
          >
            <IconPlus />
            Add header
          </button>
        </div>
      </fieldset>
    </div>
  );
}
