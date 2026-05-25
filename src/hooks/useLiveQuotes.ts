// useLiveQuotes — abonniert SSE-Stream und liefert Live-Quotes für eine Symbolliste.
// Fallback auf Batch-Polling, wenn der Browser kein EventSource hat.
import { useEffect, useRef, useState } from "react";
import type { Quote } from "@/lib/finnhub";
import { getAccessTokenForUrl } from "@/lib/authed-fetch";

export type LiveQuotes = Record<string, Quote>;

export function useLiveQuotes(symbols: string[], enabled = true): {
  quotes: LiveQuotes;
  connected: boolean;
  lastUpdate: number;
} {
  const [quotes, setQuotes] = useState<LiveQuotes>({});
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const key = symbols.slice().sort().join(",");
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if (!enabled || !key) { setConnected(false); return; }
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;

    let alive = true;
    let es: EventSource | null = null;

    (async () => {
      const token = await getAccessTokenForUrl();
      if (!alive) return;
      const url = `/api/public/stream?symbols=${encodeURIComponent(key)}${token ? `&token=${encodeURIComponent(token)}` : ""}`;
      es = new EventSource(url);

      es.addEventListener("ready", () => { if (alive) setConnected(true); });
      es.addEventListener("quotes", (ev) => {
        if (!alive) return;
        try {
          const payload = JSON.parse((ev as MessageEvent).data) as { quotes: LiveQuotes; t: number };
          setQuotes((prev) => ({ ...prev, ...payload.quotes }));
          setLastUpdate(payload.t);
        } catch { /* ignore */ }
      });
      es.onerror = () => { if (alive) setConnected(false); };
    })();

    return () => { alive = false; es?.close(); };
  }, [key, enabled]);

  return { quotes, connected, lastUpdate };
}
