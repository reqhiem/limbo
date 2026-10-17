import type { ReactNode } from "react";
import type { CapturedRequest, CfMeta } from "../../../shared/types";
import { storedBytes } from "../../lib/body";
import { requestTarget } from "../../lib/curl";
import { formatBytes, formatClock, formatDate, formatInt } from "../../lib/format";
import { KeyValueTable } from "../KeyValueTable";
import styles from "./tabs.module.css";

const CF_LABELS: [keyof CfMeta, string][] = [
  ["country", "Country"],
  ["city", "City"],
  ["region", "Region"],
  ["continent", "Continent"],
  ["timezone", "Timezone"],
  ["asn", "ASN"],
  ["asOrganization", "AS organization"],
  ["colo", "Colo"],
  ["httpProtocol", "HTTP protocol"],
  ["tlsVersion", "TLS version"],
  ["tlsCipher", "TLS cipher"],
];

const bytes = (n: number) => `${formatInt(n)} B (${formatBytes(n)})`;

export function MetaTab({ req }: { req: CapturedRequest }) {
  const rows: [string, ReactNode][] = [
    ["Method", req.method],
    ["Full path", requestTarget(req)],
    ["Size", bytes(req.size)],
  ];
  if (req.truncated) rows.push(["Stored", bytes(storedBytes(req))]);
  rows.push(
    ["Content type", req.contentType ?? "none"],
    [
      "Received",
      `${new Date(req.receivedAt).toISOString()}\n${formatDate(req.receivedAt)} ${formatClock(req.receivedAt, true)} local`,
    ],
    ["Request id", req.id],
    ["Digest", req.digest],
    ["IP", req.ip ?? "none"],
  );
  const cf = CF_LABELS.filter(([k]) => req.cf[k] !== undefined).map(([k, label]): [string, ReactNode] => [
    label,
    String(req.cf[k]),
  ]);

  return (
    <>
      <KeyValueTable rows={rows} labelKeys caption="Request metadata" />
      <h3 className={styles.subhead}>Cloudflare edge</h3>
      {cf.length ? (
        <KeyValueTable rows={cf} labelKeys caption="Cloudflare edge metadata" />
      ) : (
        <p className={styles.note}>No edge metadata on this request.</p>
      )}
    </>
  );
}
