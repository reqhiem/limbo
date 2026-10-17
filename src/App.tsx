import { useCallback, useEffect, useRef, useState } from "react";
import type { Endpoint, RequestSummary, ServerMessage } from "../shared/types";
import styles from "./App.module.css";
import { EndpointList } from "./components/EndpointList";
import { EndpointPanel } from "./components/EndpointPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/Header";
import { Orientation } from "./components/Orientation";
import { RequestDetail, type Tab } from "./components/RequestDetail";
import { RequestList } from "./components/RequestList";
import { Empty, ErrorBlock, Skeleton } from "./components/States";
import { announce, useAnnouncement } from "./lib/announce";
import { api, errorMessage, isAbort } from "./lib/api";
import { useLiveStream } from "./lib/live";
import { hrefFor, navigate, useHashRoute } from "./lib/router";
import { useDocumentTitle } from "./lib/useDocumentTitle";

const MAX_ROWS = 500;
const MAX_UNSEEN = 1000;
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

/** Union by id, newest (largest ULID) first, capped at the retention limit. */
function mergeRequests(a: RequestSummary[], b: RequestSummary[]): RequestSummary[] {
  const byId = new Map<string, RequestSummary>();
  for (const r of [...a, ...b]) byId.set(r.id, r);
  return [...byId.values()].sort((x, y) => (x.id < y.id ? 1 : x.id > y.id ? -1 : 0)).slice(0, MAX_ROWS);
}

export function App() {
  const route = useHashRoute();
  const { slug, requestId, settings } = route;
  // Below 900px only one pane shows; the route decides which.
  const pane = requestId || settings ? "detail" : slug ? "requests" : "endpoints";
  const routeRef = useRef(route);
  useEffect(() => {
    routeRef.current = route;
  });

  const timers = useRef<Partial<Record<TimerKey, Timer>>>({});
  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);
  /** Runs `fn` once, `ms` after the first call of a burst. */
  const schedule = useCallback((key: TimerKey, ms: number, fn: () => void) => {
    if (timers.current[key] !== undefined) return;
    timers.current[key] = setTimeout(() => {
      timers.current[key] = undefined;
      fn();
    }, ms);
  }, []);

  // Endpoints. Every load and local edit takes a sequence number; a response that is no longer
  // the latest (a newer load, or a create/save/delete/arrival meanwhile) is dropped.
  const [endpoints, setEndpoints] = useState<Endpoint[] | null>(null);
  const [endpointsError, setEndpointsError] = useState<string | null>(null);
  const endpointsSeq = useRef(0);
  const endpointsLoaded = useRef(false);
  const loadEndpoints = useCallback(async () => {
    const seq = ++endpointsSeq.current;
    try {
      const list = await api.listEndpoints();
      if (seq !== endpointsSeq.current) return;
      endpointsLoaded.current = true;
      setEndpoints(list);
      setEndpointsError(null);
    } catch (err) {
      if (seq === endpointsSeq.current) setEndpointsError(errorMessage(err));
    }
  }, []);
  /** Local edit; also schedules a refetch so server-side truths (capped counts) come back. */
  const editEndpoints = useCallback(
    (fn: (eps: Endpoint[]) => Endpoint[]) => {
      // Before the first load lands there is nothing to protect, so it is never dropped.
      if (endpointsLoaded.current) endpointsSeq.current++;
      setEndpoints((eps) => (eps ? fn(eps) : eps));
      schedule("endpoints", ENDPOINTS_REFETCH_MS, () => void loadEndpoints());
    },
    [loadEndpoints, schedule],
  );
  useEffect(() => {
    void loadEndpoints();
  }, [loadEndpoints]);

  // Filter: per endpoint, server-side, debounced. Changing endpoint or clearing the input resets
  // the query synchronously, so a stale query is never sent for another endpoint.
  const [filter, setFilter] = useState({ slug, text: "" });
  const [q, setQ] = useState("");
  if (filter.slug !== slug) {
    setFilter({ slug, text: "" });
    setQ("");
  }
  const filterText = filter.slug === slug ? filter.text : "";
  useEffect(() => {
    const text = filterText.trim();
    if (!text) return;
    const t = setTimeout(() => setQ(text), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filterText]);
  const onFilter = (text: string) => {
    setFilter({ slug, text });
    if (!text.trim()) setQ("");
  };

  // Unseen (arrived live, not opened yet; id -> slug) and arriving (the one-frame flash).
  const [unseen, setUnseen] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [arriving, setArriving] = useState<ReadonlySet<string>>(() => new Set());
  const markUnseen = useCallback((rs: RequestSummary[]) => {
    const open = routeRef.current.requestId;
    setUnseen((m) => {
      const next = new Map(m);
      for (const r of rs) if (r.id !== open) next.set(r.id, r.slug);
      while (next.size > MAX_UNSEEN) next.delete(next.keys().next().value!);
      return next;
    });
  }, []);
  const dropUnseen = useCallback((keep: (id: string, slug: string) => boolean) => {
    setUnseen((m) => {
      const next = new Map([...m].filter(([id, s]) => keep(id, s)));
      return next.size === m.size ? m : next;
    });
  }, []);
  const flash = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setArriving((s) => new Set([...s, ...ids]));
    setTimeout(() => setArriving((s) => new Set([...s].filter((id) => !ids.includes(id)))), FLASH_CLEAR_MS);
  }, []);

  // Request list of the selected endpoint
  const [list, setList] = useState<ListState | null>(null);
  const [listError, setListError] = useState<{ slug: string; q: string; message: string } | null>(null);
  const [listTick, setListTick] = useState(0);
  /** Live arrivals recorded while a list fetch is in flight, merged into its result. */
  const inflight = useRef<{ slug: string; q: string; arrivals: RequestSummary[] } | null>(null);
  /** Ids held while paused: flashed and outlined once the resync shows they still exist. */
  const markOnLoad = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!slug) return;
    const ac = new AbortController();
    const flight = { slug, q, arrivals: [] as RequestSummary[] };
    inflight.current = flight;
    api.listRequests(slug, q, ac.signal).then(
      (items) => {
        if (inflight.current === flight) inflight.current = null;
        const merged = q ? items : mergeRequests(items, flight.arrivals);
        setList({ slug, q, items: merged });
        setListError(null);
        const marked = markOnLoad.current;
        if (marked) {
          markOnLoad.current = null;
          const present = merged.filter((r) => marked.has(r.id));
          markUnseen(present);
          flash(present.map((r) => r.id));
        }
      },
      (err) => {
        if (inflight.current === flight) inflight.current = null;
        if (!isAbort(err)) setListError({ slug, q, message: errorMessage(err) });
      },
    );
    return () => ac.abort();
  }, [slug, q, listTick, markUnseen, flash]);

  // Live stream, pause, arrivals
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const held = useRef<RequestSummary[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [phase, setPhase] = useState(0);
  const [hiddenArrivals, setHiddenArrivals] = useState(0);
  const arrivals = useRef(0);
  const toAnnounce = useRef<RequestSummary[]>([]);
  const current = useRef({ slug, q });
  useEffect(() => {
    current.current = { slug, q };
  });

  const announceArrivals = (r: RequestSummary) => {
    toAnnounce.current.push(r);
    schedule("announce", ANNOUNCE_MS, () => {
      const batch = toAnnounce.current;
      toAnnounce.current = [];
      const first = batch[0];
      if (!first) return;
      // The running number keeps identical consecutive requests distinct for screen readers.
      announce(
        batch.length === 1
          ? `Request ${arrivals.current}: ${first.method} ${first.path || "/"} on ${first.slug}`
          : `${batch.length} new requests, ${arrivals.current} so far`,
      );
    });
  };

  const applyArrival = (r: RequestSummary) => {
    arrivals.current++;
    setPhase((p) => p + 1);
    markUnseen([r]);
    editEndpoints((eps) =>
      eps.map((e) =>
        e.slug === r.slug
          ? { ...e, requestCount: e.requestCount + 1, lastRequestAt: Math.max(e.lastRequestAt ?? 0, r.receivedAt) }
          : e,
      ),
    );
    const cur = current.current;
    if (r.slug === cur.slug) {
      if (cur.q) {
        schedule("list", LIST_REFETCH_MS, () => setListTick((t) => t + 1));
      } else {
        const f = inflight.current;
        if (f && f.slug === r.slug && !f.q) f.arrivals.push(r);
        setList((l) => (l && l.slug === r.slug && !l.q ? { ...l, items: mergeRequests(l.items, [r]) } : l));
        flash([r.id]);
      }
    }
    announceArrivals(r);
  };

  const resync = () => {
    void loadEndpoints();
    setListTick((t) => t + 1);
  };

  const onMessage = ({ request: r }: ServerMessage) => {
    if (document.hidden) setHiddenArrivals((n) => n + 1);
    if (pausedRef.current) {
      held.current.push(r);
      setWaiting(held.current.length);
      return;
    }
    applyArrival(r);
  };

  // While paused nothing refetches; resume always resyncs.
  const onReconnect = () => {
    if (!pausedRef.current) resync();
  };

  const status = useLiveStream(onMessage, onReconnect);

  const togglePause = () => {
    if (!pausedRef.current) {
      pausedRef.current = true;
      setPaused(true);
      return;
    }
    pausedRef.current = false;
    setPaused(false);
    const batch = held.current;
    held.current = [];
    setWaiting(0);
    if (batch.length) {
      // No replay: the buffer may hold requests cleared or deleted since. Refetch, then mark what
      // still exists. Other endpoints' requests can't be checked from here; they stay unseen.
      const cur = current.current.slug;
      markUnseen(batch.filter((r) => r.slug !== cur));
      if (cur) markOnLoad.current = new Set(batch.filter((r) => r.slug === cur).map((r) => r.id));
      arrivals.current += batch.length;
      setPhase((p) => p + batch.length);
      announce(`Resumed: ${batch.length} requests arrived while paused, ${arrivals.current} so far`);
    }
    resync();
  };

  // Opening a request marks it seen.
  useEffect(() => {
    if (requestId) dropUnseen((id) => id !== requestId);
  }, [requestId, dropUnseen]);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) setHiddenArrivals(0);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useDocumentTitle(hiddenArrivals ? `(${hiddenArrivals}) Limbo` : "Limbo");

  // The detail tab survives moving between requests.
  const [tab, setTab] = useState<Tab>("body");

  // Mutations from child panels. Async completions navigate only if the route still points at
  // the resource they acted on.
  const onCreated = (ep: Endpoint) => {
    editEndpoints((eps) => [ep, ...eps.filter((e) => e.slug !== ep.slug)]);
    navigate(hrefFor(ep.slug));
  };

  const onRequestDeleted = (s: string, id: string) => {
    setList((l) => (l && l.slug === s ? { ...l, items: l.items.filter((x) => x.id !== id) } : l));
    editEndpoints((eps) => eps.map((e) => (e.slug === s ? { ...e, requestCount: Math.max(0, e.requestCount - 1) } : e)));
    dropUnseen((x) => x !== id);
    const r = routeRef.current;
    if (r.slug === s && r.requestId === id) navigate(hrefFor(s));
  };

  const onCleared = (s: string) => {
    setList((l) => (l && l.slug === s ? { ...l, items: [] } : l));
    editEndpoints((eps) => eps.map((e) => (e.slug === s ? { ...e, requestCount: 0 } : e)));
    dropUnseen((_, x) => x !== s);
  };

  const onEndpointDeleted = (s: string) => {
    editEndpoints((eps) => eps.filter((e) => e.slug !== s));
    dropUnseen((_, x) => x !== s);
    if (routeRef.current.slug === s) navigate(hrefFor(null));
  };

  // Columns
  const endpoint = slug && endpoints ? endpoints.find((e) => e.slug === slug) : undefined;
  const captured = endpoints ? endpoints.reduce((n, e) => n + e.requestCount, 0) : null;
  const shown = slug && list?.slug === slug ? list : null;

  let requests;
  if (slug && endpoint && endpoints) {
    requests = (
      <RequestList
        className={styles.requests}
        endpoint={endpoint}
        endpoints={endpoints}
        requests={shown?.items ?? null}
        shownQuery={shown?.q ?? ""}
        loading={!shown || shown.q !== q || filterText.trim() !== q}
        error={listError && listError.slug === slug && listError.q === q ? listError.message : null}
        filter={filterText}
        onFilter={onFilter}
        onRetry={() => setListTick((t) => t + 1)}
        selectedId={requestId}
        settingsOpen={!requestId}
        unseen={unseen}
        arriving={arriving}
      />
    );
  } else {
    let body;
    if (!slug) {
      body = (
        <Empty title="No endpoint selected">
          {endpoints?.length ? "Pick one on the left." : "Create one on the left."} Its requests stream in here.
        </Empty>
      );
    } else if (endpoints) {
      body = (
        <Empty title="Endpoint not found">
          /h/{slug} does not exist. It may have been deleted. Pick another endpoint or create it again.
        </Empty>
      );
    } else if (endpointsError) {
      body = <ErrorBlock message={endpointsError} onRetry={() => void loadEndpoints()} />;
    } else {
      body = <Skeleton rows={8} />;
    }
    requests = <section className={`${styles.requests} ${styles.placeholder}`}>{body}</section>;
  }

  let detail;
  if (slug && requestId) {
    // Deep links render at once; the request fetch doesn't wait for the endpoint list.
    detail = (
      <RequestDetail
        key={`${slug}/${requestId}`}
        slug={slug}
        id={requestId}
        tab={tab}
        onTab={setTab}
        onDeleted={(id) => onRequestDeleted(slug, id)}
      />
    );
  } else if (slug && endpoint) {
    detail = (
      <EndpointPanel
        key={slug}
        endpoint={endpoint}
        onUpdated={(ep) => editEndpoints((eps) => eps.map((e) => (e.slug === ep.slug ? ep : e)))}
        onCleared={() => onCleared(slug)}
        onDeleted={() => onEndpointDeleted(slug)}
      />
    );
  } else if (slug && endpoints) {
    detail = (
      <Empty title="Endpoint not found">
        <a className={styles.link} href={hrefFor(null)}>
          Back to all endpoints
        </a>
      </Empty>
    );
  } else if (slug) {
    detail = endpointsError ? <ErrorBlock message={endpointsError} /> : <Skeleton rows={6} height={44} />;
  } else {
    detail = <Orientation endpoints={endpoints} />;
  }

  const announcement = useAnnouncement();

  return (
    <div className={styles.app} data-pane={pane}>
      <Header
        status={status}
        paused={paused}
        waiting={waiting}
        endpointCount={endpoints?.length ?? null}
        captured={captured}
        phase={phase}
        onTogglePause={togglePause}
      />
      <EndpointList
        className={styles.endpoints}
        endpoints={endpoints}
        error={endpoints ? null : endpointsError}
        selected={slug}
        onRetry={() => void loadEndpoints()}
        onCreated={onCreated}
      />
      {requests}
      <main className={styles.detail}>
        <ErrorBoundary key={`${slug}/${requestId}/${settings}`}>{detail}</ErrorBoundary>
      </main>
      <div className="visually-hidden" role="status">
        <span key={announcement.n}>{announcement.text}</span>
      </div>
    </div>
  );
}
