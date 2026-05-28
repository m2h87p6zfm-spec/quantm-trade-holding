// useLiveQuotes — Premium-Nutzer bekommen SSE-Stream (2 s Tick),
// Free-Nutzer fallen automatisch auf Polling (30 s) zurück.
//
// Credit-Sparende Drosselung:
//   - Tab im Hintergrund → Stream/Polling pausiert
//   - 402 vom Server → Polling-Modus + tier="free" zurückgemeldet
import { useCallback, useEffect, useRef, useState } from "react";
import type { Quote } from "@/lib/finnhub";
import { getAccessTokenForUrl, authedFetch } from "@/lib/authed-fetch";

export type LiveQuotes = Record<string, Quote>;
export type RealtimeTier = "premium" | "free" | "unknown";

const POLL_FREE_MS = 30_000;

export function useLiveQuotes(symbols: string[], enabled = true): {
  quotes: LiveQuotes;
  connected: boolean;
  lastUpdate: number;
  tier: RealtimeTier;
  refetch: () => Promise<void>;
} {
  const [quotes, setQuotes] = useState<LiveQuotes>({});
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [tier, setTier] = useState<RealtimeTier>("unknown");
  const [visible, setVisible] = useState<boolean>(
    typeof document === "undefined" ? true : !document.hidden,
  );
  const key = symbols.slice().sort().join(",");
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!enabled || !key || !visible) {
      setConnected(false);
      return;
    }
    if (typeof window === "undefined") return;

    let alive = true;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const startPolling = async () => {
      setTier("free");
      const tick = async () => {
        if (!alive) return;
        try {
          const res = await authedFetch(`/api/public/quotes-batch?symbols=${encodeURIComponent(key)}`);
          if (res.ok) {
            const json = (await res.json()) as { quotes?: LiveQuotes; lastUpdated?: number };
            if (json.quotes) {
              setQuotes((prev) => ({ ...prev, ...json.quotes }));
              setLastUpdate(json.lastUpdated ?? Date.now());
              setConnected(true);
            }
          }
        } catch { /* noop */ }
        if (alive) pollTimer = setTimeout(tick, POLL_FREE_MS);
      };
      tick();
    };

    (async () => {
      if (typeof EventSource === "undefined") {
        startPolling();
        return;
      }
      const token = await getAccessTokenForUrl();
      if (!alive) return;

      // Vor dem Stream-Aufbau einen Probe-Request, um Tier zu erkennen.
      // (EventSource gibt 402 nicht als auswertbaren Status zurück, deshalb HEAD/GET vorab.)
      try {
        const probe = await fetch(
          `/api/public/stream?symbols=${encodeURIComponent(key)}${token ? `&token=${encodeURIComponent(token)}` : ""}`,
          { method: "GET", headers: { Accept: "text/event-stream" } },
        );
        if (probe.status === 402 || probe.status === 401) {
          probe.body?.cancel().catch(() => undefined);
          startPolling();
          return;
        }
        probe.body?.cancel().catch(() => undefined);
      } catch { /* fallthrough */ }

      setTier("premium");
      const streamUrl = `/api/public/stream?symbols=${encodeURIComponent(key)}${token ? `&token=${encodeURIComponent(token)}` : ""}`;
      es = new EventSource(streamUrl);
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

    return () => {
      alive = false;
      es?.close();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [key, enabled, visible]);

  const refetch = useCallback(async () => {
    if (!key) return;
    try {
      const res = await authedFetch(`/api/public/quotes-batch?symbols=${encodeURIComponent(key)}&t=${Date.now()}`);
      if (!res.ok) return;
      const json = (await res.json()) as { quotes?: LiveQuotes; lastUpdated?: number };
      if (json.quotes) {
        setQuotes((prev) => ({ ...prev, ...json.quotes }));
        setLastUpdate(json.lastUpdated ?? Date.now());
      }
    } catch { /* noop */ }
  }, [key]);

  return { quotes, connected, lastUpdate, tier, refetch };
}
