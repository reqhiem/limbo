import { useCallback, useEffect, useRef, useState } from "react";
import type { Endpoint, RequestSummary, ServerMessage } from "../shared/types";
import styles from "./App.module.css";
import { EndpointList } from "./components/EndpointList";
import { EndpointPanel } from "./components/EndpointPanel";
import { Header } from "./components/Header";
import { Orientation } from "./components/Orientation";
import { RequestDetail } from "./components/RequestDetail";
import { RequestList } from "./components/RequestList";
import { Empty, ErrorBlock, Skeleton } from "./components/States";
import { api, errorMessage, isAbort } from "./lib/api";
import { useNow } from "./lib/format";
import { useLiveStream } from "./lib/live";
import { hrefFor, navigate, useHashRoute } from "./lib/router";
import { useDocumentTitle } from "./lib/useDocumentTitle";

const MAX_ROWS = 500;
const FILTER_DEBOUNCE_MS = 250;
const ENDPOINTS_REFETCH_MS = 1000;
const LIST_REFETCH_MS = 300;
const FLASH_CLEAR_MS = 400;
const ANNOUNCE_MS = 1500;

type Timer = ReturnType<typeof setTimeout>;
type TimerKey = "endpoints" | "list" | "announce";

interface ListState {
  slug: string;
  q: string;
  items: RequestSummary[];
}

const without = (set: ReadonlySet<string>, id: string): ReadonlySet<string> => {
  if (!set.has(id)) return set;
  const next = new Set(set);
  next.delete(id);
  return next;
};

export function App() {
  const { slug, requestId } = useHashRoute();
  const now = useNow(15_000);

  // Endpoints
  const [endpoints, setEndpoints] = useState<Endpoint[] | null>(null);
  const [endpointsError, setEndpointsError] = useState<string | null>(null);
  const loadEndpoints = useCallback(async () => {
    try {
      setEndpoints(await api.listEndpoints());
      setEndpointsError(null);
    } catch (err) {
      setEndpointsError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    void loadEndpoints();
  }, [loadEndpoints]);

  // Filter: per endpoint, cleared when the endpoint changes; server-side and debounced.
  const [filter, setFilter] = useState({ slug, text: "" });
  if (filter.slug !== slug) setFilter({ slug, text: "" });
  const filterText = filter.slug === slug ? filter.text : "";
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(filterText.trim()), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filterText]);
  const q = filterText.trim() ? debounced : "";

  // Request list of the selected endpoint
  const [list, setList] = useState<ListState | null>(null);
  const [listError, setListError] = useState<{ slug: string; q: string; message: string } | null>(null);
  const [listTick, setListTick] = useState(0);
  useEffect(() => {
    if (!slug) return;
    const ac = new AbortController();
    api.listRequests(slug, q, ac.signal).then(
      (items) => {
        setList({ slug, q, items });
        setListError(null);
      },
      (err) => {
        if (!isAbort(err)) setListError({ slug, q, message: errorMessage(err) });
      },
    );
    return () => ac.abort();
  }, [slug, q, listTick]);

  // Live stream
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState(0);
  const [unseen, setUnseen] = useState<ReadonlySet<string>>(() => new Set());
  const [arriving, setArriving] = useState<ReadonlySet<string>>(() => new Set());
  const [hiddenArrivals, setHiddenArrivals] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const current = useRef({ slug, q });
  const timers = useRef<Partial<Record<TimerKey, Timer>>>({});
  const toAnnounce = useRef<RequestSummary[]>([]);

  useEffect(() => {
    current.current = { slug, q };
  });
  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  /** Runs `fn` once, `ms` after the first call of a burst. */
  const schedule = (key: TimerKey, ms: number, fn: () => void) => {
    if (timers.current[key] !== undefined) return;
    timers.current[key] = setTimeout(() => {
      timers.current[key] = undefined;
      fn();
    }, ms);
  };

  const onMessage = ({ request: r }: ServerMessage) => {
    setPhase((p) => p + 1);
    setUnseen((s) => new Set(s).add(r.id));
    setEndpoints(
      (eps) =>
        eps &&
        eps.map((e) =>
          e.slug === r.slug
            ? { ...e, requestCount: e.requestCount + 1, lastRequestAt: Math.max(e.lastRequestAt ?? 0, r.receivedAt) }
            : e,
        ),
    );
    // The server caps counts at the retention limit; refetch so they stay true.
    schedule("endpoints", ENDPOINTS_REFETCH_MS, () => void loadEndpoints());

    const cur = current.current;
    if (r.slug === cur.slug) {
      if (cur.q) {
        schedule("list", LIST_REFETCH_MS, () => setListTick((t) => t + 1));
      } else {
        setList((l) =>
          l && l.slug === r.slug && l.q === ""
            ? { ...l, items: [r, ...l.items.filter((x) => x.id !== r.id)].slice(0, MAX_ROWS) }
            : l,
        );
        setArriving((s) => new Set(s).add(r.id));
        setTimeout(() => setArriving((s) => without(s, r.id)), FLASH_CLEAR_MS);
      }
    }

    if (document.hidden) setHiddenArrivals((n) => n + 1);

    toAnnounce.current.push(r);
    schedule("announce", ANNOUNCE_MS, () => {
      const batch = toAnnounce.current;
      toAnnounce.current = [];
      const first = batch[0];
      if (!first) return;
      setAnnouncement(
        batch.length === 1
          ? `New ${first.method} request on ${first.slug}${first.path || "/"}`
          : `${batch.length} new requests`,
      );
    });
  };

  const onReconnect = () => {
    void loadEndpoints();
    setListTick((t) => t + 1);
  };

  const { status, waiting } = useLiveStream(paused, onMessage, onReconnect);

  // Opening a request marks it seen.
  useEffect(() => {
    if (requestId) setUnseen((s) => without(s, requestId));
  }, [requestId]);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) setHiddenArrivals(0);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useDocumentTitle(hiddenArrivals ? `(${hiddenArrivals}) Limbo` : "Limbo");

  // Mutations from child panels
  const patchEndpoint = (s: string, patch: (e: Endpoint) => Endpoint) =>
    setEndpoints((eps) => eps && eps.map((e) => (e.slug === s ? patch(e) : e)));

  const onCreated = (ep: Endpoint) => {
    setEndpoints((eps) => [ep, ...(eps ?? []).filter((e) => e.slug !== ep.slug)]);
    navigate(hrefFor(ep.slug));
  };

  const onRequestDeleted = (s: string, id: string) => {
    setList((l) => l && { ...l, items: l.items.filter((x) => x.id !== id) });
    patchEndpoint(s, (e) => ({ ...e, requestCount: Math.max(0, e.requestCount - 1) }));
    schedule("endpoints", LIST_REFETCH_MS, () => void loadEndpoints());
    navigate(hrefFor(s));
  };

  const onCleared = (s: string) => {
    setList((l) => (l && l.slug === s ? { ...l, items: [] } : l));
    patchEndpoint(s, (e) => ({ ...e, requestCount: 0 }));
    void loadEndpoints();
  };

  const onEndpointDeleted = (s: string) => {
    setEndpoints((eps) => eps && eps.filter((e) => e.slug !== s));
    navigate(hrefFor(null));
  };

  // Columns 2 and 3
  const endpoint = slug && endpoints ? endpoints.find((e) => e.slug === slug) : undefined;
  const captured = endpoints ? endpoints.reduce((n, e) => n + e.requestCount, 0) : null;

  let requests;
  let detail;
  if (!slug) {
    requests = (
      <Empty title="No endpoint selected">
        {endpoints?.length ? "Pick one on the left." : "Create one on the left."} Its requests stream in here.
      </Empty>
    );
    detail = <Orientation hasEndpoints={!!endpoints?.length} />;
  } else if (endpoint) {
    const shown = list?.slug === slug ? list : null;
    requests = (
      <RequestList
        endpoint={endpoint}
        requests={shown?.items ?? null}
        shownQuery={shown?.q ?? ""}
        loading={!shown || shown.q !== q || filterText.trim() !== q}
        error={listError && listError.slug === slug && listError.q === q ? listError.message : null}
        filter={filterText}
        onFilter={(text) => setFilter({ slug, text })}
        onRetry={() => setListTick((t) => t + 1)}
        selectedId={requestId}
        unseen={unseen}
        arriving={arriving}
        now={now}
      />
    );
    detail = requestId ? (
      <RequestDetail slug={slug} id={requestId} now={now} onDeleted={(id) => onRequestDeleted(slug, id)} />
    ) : (
      <EndpointPanel
        key={slug}
        endpoint={endpoint}
        now={now}
        onUpdated={(ep) => patchEndpoint(ep.slug, () => ep)}
        onCleared={() => onCleared(slug)}
        onDeleted={() => onEndpointDeleted(slug)}
      />
    );
  } else if (endpoints) {
    requests = (
      <Empty title="Endpoint not found">
        /h/{slug} does not exist. It may have been deleted. Pick another endpoint or create it again.
      </Empty>
    );
    detail = null;
  } else if (endpointsError) {
    requests = <ErrorBlock message={endpointsError} onRetry={() => void loadEndpoints()} />;
    detail = null;
  } else {
    requests = <Skeleton rows={8} />;
    detail = <Skeleton rows={6} height={44} />;
  }

  return (
    <div className={styles.app}>
      <Header
        status={status}
        paused={paused}
        waiting={waiting}
        endpointCount={endpoints?.length ?? null}
        captured={captured}
        phase={phase}
        onTogglePause={() => setPaused((p) => !p)}
      />
      <EndpointList
        endpoints={endpoints}
        error={endpoints ? null : endpointsError}
        selected={slug}
        now={now}
        onRetry={() => void loadEndpoints()}
        onCreated={onCreated}
      />
      {endpoint ? requests : <section className={styles.requests}>{requests}</section>}
      <main className={styles.detail}>{detail}</main>
      <div className="visually-hidden" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
