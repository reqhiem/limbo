import { useSyncExternalStore } from "react";

export interface Route {
  slug: string | null;
  requestId: string | null;
}

function parse(hash: string): Route {
  const m = /^#\/e\/([^/]+)(?:\/([^/]+))?\/?$/.exec(hash);
  if (!m) return { slug: null, requestId: null };
  const decode = (s: string | undefined) => {
    if (s === undefined) return null;
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  return { slug: decode(m[1]), requestId: decode(m[2]) };
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

export const navigate = (href: string) => {
  window.location.hash = href.slice(1);
};
