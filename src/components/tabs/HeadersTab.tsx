import type { CapturedRequest } from "../../../shared/types";
import { KeyValueTable } from "../KeyValueTable";
import styles from "./tabs.module.css";

export function HeadersTab({ req }: { req: CapturedRequest }) {
  return (
    <>
      <p className={styles.note}>
        The Workers runtime lowercases header names and comma-joins duplicate headers (except set-cookie).
      </p>
      <KeyValueTable rows={req.headers} caption="Request headers" />
    </>
  );
}
