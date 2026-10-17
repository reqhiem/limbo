import { useSyncExternalStore } from "react";

/** One polite live region for the whole app; `n` changes on every call so repeats are re-announced. */
let current = { text: "", n: 0 };
const listeners = new Set<() => void>();

export function announce(text: string): void {
  current = { text, n: current.n + 1 };
  for (const l of listeners) l();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const useAnnouncement = () => useSyncExternalStore(subscribe, () => current);
