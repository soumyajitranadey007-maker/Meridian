import { useEffect, useRef, useState } from "react";
import type { ActivityEvent } from "../types";

export function useContractEvents(onEvent?: (event: ActivityEvent) => void) {
  const [connected, setConnected] = useState(false);
  const attempts = useRef(0);
  useEffect(() => {
    let socket: WebSocket | undefined;
    let timer: number | undefined;
    let stopped = false;
    const connect = () => {
      const configuredUrl = import.meta.env.VITE_WS_URL;
      if (!configuredUrl) { setConnected(false); return; }
      const wsUrl = configuredUrl.startsWith("/")
        ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}${configuredUrl}`
        : configuredUrl;
      try {
        socket = new WebSocket(wsUrl);
        socket.onopen = () => { attempts.current = 0; setConnected(true); };
        socket.onmessage = ({ data }) => { try { onEvent?.(JSON.parse(data) as ActivityEvent); } catch { /* ignore malformed event */ } };
        socket.onclose = () => { setConnected(false); if (!stopped) { const delay = Math.min(1000 * 2 ** attempts.current++, 15000); timer = window.setTimeout(connect, delay); } };
        socket.onerror = () => socket?.close();
      } catch { setConnected(false); }
    };
    connect();
    return () => { stopped = true; if (timer) window.clearTimeout(timer); socket?.close(); };
  }, [onEvent]);
  return connected;
}
