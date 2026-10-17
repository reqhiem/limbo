import { useSyncExternalStore } from "react";

export interface Route {
  slug: string | null;
  requestId: string | null;
  /** `#/e/:slug/settings`: the endpoint panel as its own pane on narrow screens. */
  settings: boolean;
}

function parse(hash: string): Route {
  const m = /^#\/e\/([^/]+)(?:\/([^/]+))?\/?$/.exec(hash);
  if (!m) return { slug: null, requestId: null, settings: false };
  const decode = (s: string | undefined) => {
    if (s === undefined) return null;
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  // ULIDs are 26 uppercase chars, so "settings" can never be a request id.
  if (m[2] === "settings") return { slug: decode(m[1]), requestId: null, settings: true };
  return { slug: decode(m[1]), requestId: decode(m[2]), settings: false };
}

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  // Parsing is cheap; returning a fresh object is fine because consumers read primitives.
  return parse(hash);
}

export const hrefFor = (slug?: string | null, requestId?: string | null) =>
  !slug ? "#/" : requestId ? `#/e/${encodeURIComponent(slug)}/${encodeURIComponent(requestId)}` : `#/e/${encodeURIComponent(slug)}`;

export const settingsHref = (slug: string) => `#/e/${encodeURIComponent(slug)}/settings`;

export const navigate = (href: string) => {
  window.location.hash = href.slice(1);
};
