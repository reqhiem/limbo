import { useMemo, useState } from "react";
import type { CapturedRequest } from "../../../shared/types";
import { downloadBytes, downloadName, storedBytes, viewBody } from "../../lib/body";
import { formatInt } from "../../lib/format";
import { HexView } from "../HexView";
import { IconDownload } from "../icons";
import { JsonTree } from "../JsonTree";
import { KeyValueTable } from "../KeyValueTable";
import { Empty } from "../States";
import styles from "./tabs.module.css";

const HEX_LIMIT = 4096;

function Toggle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.toggle} role="group" aria-label="Body view">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="btn small"
          aria-pressed={o === value}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function BodyTab({ req }: { req: CapturedRequest }) {
  const view = useMemo(() => viewBody(req), [req]);
  const [mode, setMode] = useState(view.kind === "json" ? "Tree" : "Table");

  const notice = req.truncated && (
    <p className={styles.notice}>
      <span className="badge">Truncated</span>
      Stored first {formatInt(storedBytes(req))} of {formatInt(req.size)} bytes
    </p>
  );

  let content;
  switch (view.kind) {
    case "empty":
      content = <Empty title="No body">This request carried no payload.</Empty>;
      break;
    case "binary":
      content = (
        <>
          <div className={styles.toolbar}>
            <span className="label">
              Binary · {formatInt(view.bytes.byteLength)} bytes
              {view.bytes.byteLength > HEX_LIMIT && ` · first ${formatInt(HEX_LIMIT)} shown`}
            </span>
            <button
              type="button"
              className="btn small"
              onClick={() => downloadBytes(view.bytes, downloadName(req.id, req.contentType))}
            >
              <IconDownload />
              Download
            </button>
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
          {mode === "Raw" ? <pre className={styles.pre}>{view.text}</pre> : <JsonTree value={view.value} />}
        </>
      );
      break;
    case "form":
      content = (
        <>
          <div className={styles.toolbar}>
            <span className="label">Form · {view.pairs.length} fields</span>
            <Toggle options={["Table", "Raw"]} value={mode} onChange={setMode} />
          </div>
          {mode === "Raw" ? (
            <pre className={styles.pre}>{view.text}</pre>
          ) : (
            <KeyValueTable rows={view.pairs} caption="Form fields" />
          )}
        </>
      );
      break;
    case "text":
      content = <pre className={styles.pre}>{view.text}</pre>;
      break;
  }

  return (
    <>
      {notice}
      {content}
    </>
  );
}
