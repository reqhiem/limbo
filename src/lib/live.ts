import { useEffect, useRef, useState } from "react";
import type { ServerMessage } from "../../shared/types";

export type LiveStatus = "connecting" | "live" | "offline";

const PING_MS = 30_000;
const BACKOFF_MIN_MS = 1_000;
const BACKOFF_MAX_MS = 15_000;

function parseMessage(data: unknown): ServerMessage | null {
  if (typeof data !== "string" || data === "pong") return null;
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
 * Live request stream. Reconnects with exponential backoff and calls `onReconnect`
 * after every reopen (not the first open) so the caller can refetch the gap.
 * While `paused`, messages are buffered and flushed in order on resume.
 */
export function useLiveStream(
  paused: boolean,
  onMessage: (msg: ServerMessage) => void,
  onReconnect: () => void,
): { status: LiveStatus; waiting: number } {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [waiting, setWaiting] = useState(0);
  const buffer = useRef<ServerMessage[]>([]);
  const pausedRef = useRef(paused);
  const handlers = useRef({ onMessage, onReconnect });

  useEffect(() => {
    handlers.current = { onMessage, onReconnect };
  });

  useEffect(() => {
    let ws: WebSocket | null = null;
    let disposed = false;
    let hadOpen = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/ws`;

    const connect = () => {
      setStatus("connecting");
      const socket = new WebSocket(url);
      ws = socket;
      socket.onopen = () => {
        if (disposed) return;
        attempt = 0;
        setStatus("live");
        pingTimer = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send("ping");
        }, PING_MS);
        if (hadOpen) handlers.current.onReconnect();
        hadOpen = true;
      };
      socket.onmessage = (event) => {
        if (disposed) return;
        const msg = parseMessage(event.data);
        if (!msg) return;
        if (pausedRef.current) {
          buffer.current.push(msg);
          setWaiting(buffer.current.length);
        } else {
          handlers.current.onMessage(msg);
        }
      };
      socket.onclose = () => {
        clearInterval(pingTimer);
        if (disposed) return;
        setStatus("offline");
        const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** attempt);
        attempt++;
        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      ws?.close();
    };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused || buffer.current.length === 0) return;
    const pending = buffer.current;
    buffer.current = [];
    setWaiting(0);
    for (const msg of pending) handlers.current.onMessage(msg);
  }, [paused]);

  return { status, waiting };
}
