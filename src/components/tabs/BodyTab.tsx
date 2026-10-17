import { useState } from "react";
import type { CapturedRequest } from "../../../shared/types";
import { bodyInfo } from "../../lib/body";
import { formatInt } from "../../lib/format";
import { Barcode } from "../Barcode";
import { HexView } from "../HexView";
import { JsonTree } from "../JsonTree";
import { KeyValueTable } from "../KeyValueTable";
import { Empty, ErrorBlock } from "../States";
import styles from "./tabs.module.css";

const HEX_LIMIT = 4096;
const FORM_LIMIT = 1000;
const SMALL_BODY = 64 * 1024;

function Toggle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.toggle} role="group" aria-label="Body view">
      {options.map((o) => (
        <button key={o} type="button" className="btn small" aria-pressed={o === value} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

/** The digest as signal: the row's barcode at hero scale, plus the byte facts beside the body. */
function Signal({ req, stored }: { req: CapturedRequest; stored: number }) {
  const edge = [req.cf.country, req.cf.colo, req.cf.asn !== undefined ? `AS${req.cf.asn}` : undefined]
    .filter(Boolean)
    .join(" · ");
  return (
    <aside className={styles.signal} aria-label="Signal">
      <Barcode digest={req.digest} unit={3} className={styles.signalCode} />
      {/* Four groups of 8 for reading; margins, not spaces, so a copy stays one token. */}
      <code className={styles.digest} aria-label={`Digest ${req.digest}`}>
        {[0, 8, 16, 24].map((i) => (
          <span key={i}>{req.digest.slice(i, i + 8)}</span>
        ))}
      </code>
      <dl className={styles.signalFacts}>
        <div>
          <dt className="label">Stored / original</dt>
          <dd>
            {formatInt(stored)} / {formatInt(req.size)} B
          </dd>
        </div>
        <div>
          <dt className="label">Encoding</dt>
          <dd>{req.bodyEncoding === "base64" ? "binary · base64" : "UTF-8 text"}</dd>
        </div>
        <div>
          <dt className="label">Edge</dt>
          <dd>{edge || "none"}</dd>
        </div>
        <div>
          <dt className="label">IP</dt>
          <dd>{req.ip ?? "none"}</dd>
        </div>
      </dl>
    </aside>
  );
}

export function BodyTab({ req }: { req: CapturedRequest }) {
  const { view, stored } = bodyInfo(req);
  const [mode, setMode] = useState(view.kind === "json" ? "Tree" : "Table");

  let content;
  switch (view.kind) {
    case "empty":
      content = <Empty title="No body">This request carried no payload.</Empty>;
      break;
    case "invalid":
      content = <ErrorBlock message={view.message} />;
      break;
    case "binary":
      content = (
        <>
          <div className={styles.toolbar}>
            <span className="label">
              Binary · {formatInt(view.bytes.byteLength)} bytes
              {view.bytes.byteLength > HEX_LIMIT && ` · first ${formatInt(HEX_LIMIT)} shown`}
            </span>
          </div>
          <HexView bytes={view.bytes} limit={HEX_LIMIT} />
        </>
      );
      break;
    case "json":
      content = (
        <>
          <div className={styles.toolbar}>
            <span className="label">JSON</span>
            <Toggle options={["Tree", "Raw"]} value={mode} onChange={setMode} />
          </div>
          {mode === "Raw" ? (
            <pre className={styles.pre}>{view.text}</pre>
          ) : (
            <JsonTree value={view.value} small={stored <= SMALL_BODY} />
          )}
        </>
      );
      break;
    case "form":
      content = (
        <>
          <div className={styles.toolbar}>
            <span className="label">
              Form · {formatInt(view.pairs.length)} {view.pairs.length === 1 ? "field" : "fields"}
            </span>
            <Toggle options={["Table", "Raw"]} value={mode} onChange={setMode} />
          </div>
          {mode === "Raw" ? (
            <pre className={styles.pre}>{view.text}</pre>
          ) : (
            <>
              {view.pairs.length > FORM_LIMIT && (
                <p className={styles.note}>
                  Showing the first {formatInt(FORM_LIMIT)} of {formatInt(view.pairs.length)} fields. Raw has all of
                  them.
                </p>
              )}
              <KeyValueTable rows={view.pairs.slice(0, FORM_LIMIT)} caption="Form fields" />
            </>
          )}
        </>
      );
      break;
    case "text":
      content = <pre className={styles.pre}>{view.text}</pre>;
      break;
  }

  return (
    <div className={`${styles.bodyGrid}${view.kind === "binary" ? ` ${styles.wide}` : ""}`}>
      <div className={styles.bodyMain}>
        {req.truncated && (
          <p className={styles.notice}>
            <span className="badge">Truncated</span>
            Stored first {formatInt(stored)} of {formatInt(req.size)} bytes
          </p>
        )}
        {content}
      </div>
      <Signal req={req} stored={stored} />
    </div>
  );
}
