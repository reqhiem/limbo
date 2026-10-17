import type { CapturedRequest } from "../../../shared/types";
import { KeyValueTable } from "../KeyValueTable";
import { Empty } from "../States";

export function QueryTab({ req }: { req: CapturedRequest }) {
  if (req.query.length === 0) return <Empty title="No query parameters">The URL had no query string.</Empty>;
  return <KeyValueTable rows={req.query} caption="Query parameters" />;
}
