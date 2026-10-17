import { useEffect, useRef, useState } from "react";
import type { ServerMessage } from "../../shared/types";

export type LiveStatus = "connecting" | "live" | "offline";

const PING_MS = 30_000;
const BACKOFF_MIN_MS = 1_000;
const BACKOFF_MAX_MS = 15_000;
/** The backoff resets only once a socket has stayed up this long (avoids flapping at 1s). */
const STABLE_MS = 10_000;

function parseMessage(data: unknown): ServerMessage | null {
  if (typeof data !== "string") return null;
  try {
    const msg: unknown = JSON.parse(data);
    if (msg && typeof msg === "object" && "type" in msg && msg.type === "request" && "request" in msg) {
      return msg as ServerMessage;
    }
  } catch {
    // Not JSON: ignore.
  }
  return null;
}

/**
 * Live request stream with exponential backoff, a pong watchdog and an immediate retry when the
 * browser comes back online. `onReconnect` runs after every reopen (not the first open) so the
 * caller can refetch the gap.
 */
export function useLiveStream(onMessage: (msg: ServerMessage) => void, onReconnect: () => void): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const handlers = useRef({ onMessage, onReconnect });

  useEffect(() => {
    handlers.current = { onMessage, onReconnect };
  });

  useEffect(() => {
    let ws: WebSocket | null = null;
    let disposed = false;
    let hadOpen = false;
    let attempt = 0;
    let awaitingPong = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let stableTimer: ReturnType<typeof setTimeout> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/ws`;

    const stopTimers = () => {
      clearTimeout(stableTimer);
      clearInterval(pingTimer);
    };

    /** Drops the socket without waiting for a close handshake that may never come. */
    const fail = (socket: WebSocket) => {
      if (ws !== socket) return;
      ws = null;
      stopTimers();
      socket.onopen = socket.onmessage = socket.onclose = null;
      socket.close();
      if (disposed) return;
      setStatus("offline");
      const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** attempt);
      attempt++;
      retryTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      clearTimeout(retryTimer);
      setStatus("connecting");
      const socket = new WebSocket(url);
      ws = socket;
      socket.onopen = () => {
        setStatus("live");
        awaitingPong = false;
        stableTimer = setTimeout(() => (attempt = 0), STABLE_MS);
        pingTimer = setInterval(() => {
          // No pong since the last ping: the connection is dead even if it never closed.
          if (awaitingPong) return fail(socket);
          awaitingPong = true;
          socket.send("ping");
        }, PING_MS);
        if (hadOpen) handlers.current.onReconnect();
        hadOpen = true;
      };
      socket.onmessage = (event) => {
        if (event.data === "pong") {
          awaitingPong = false;
          return;
        }
        const msg = parseMessage(event.data);
        if (msg) handlers.current.onMessage(msg);
      };
      socket.onclose = () => fail(socket);
    };

    const onOnline = () => {
      if (ws) return;
      attempt = 0;
      connect();
    };

    connect();
    window.addEventListener("online", onOnline);
    return () => {
      disposed = true;
      window.removeEventListener("online", onOnline);
      clearTimeout(retryTimer);
      if (ws) fail(ws);
    };
  }, []);

  return status;
}
