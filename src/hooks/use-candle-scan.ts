import { useEffect, useRef, useState } from "react";
import { fetchCandles } from "@/lib/finnhub";
import type { Candles } from "@/lib/finnhub";

/**
 * useCandleScan — streaming, concurrency-bounded scanner.
 *
 * Replaces `useQueries` for huge universes (e.g. the "Full" 2 700-symbol
 * Quantm Picks scan). The problem with `useQueries` at that scale:
 *   - React subscribes to 2 700 query instances simultaneously → every
 *     individual query state change re-renders the page
 *   - downstream `useMemo`s iterate 2 700 items per render
 *   - the browser freezes and the progress bar never visibly ticks
 *
 * This hook instead:
 *   - processes symbols through a fixed-size worker pool (default 8)
 *   - mutates an internal Map ref and exposes a *throttled* snapshot
 *     (~250 ms) so the consumer only re-renders ~4× per second
 *   - resets and re-runs cleanly when `symbols` identity changes or
 *     `runId` increments (manual refresh)
 */
export type ScanState = {
  /** Map of symbol → candles. Successful fetches only. */
  results: Map<string, Candles>;
  /** Total symbols planned. */
  total: number;
  /** Number of symbols that have settled (success or error). */
  settled: number;
  /** Number of successful fetches. */
  succeeded: number;
  /** Number of failed fetches. */
  failed: number;
  /** True while the scan is still running. */
  loading: boolean;
};

export function useCandleScan(
  symbols: string[],
  opts: { enabled: boolean; runId?: number; concurrency?: number; days?: number },
) {
  const { enabled, runId = 0, concurrency = 8, days = 260 } = opts;
  const total = symbols.length;

  // Mutable scan progress, batched into setState ~4× per second.
  const resultsRef = useRef<Map<string, Candles>>(new Map());
  const settledRef = useRef(0);
  const failedRef = useRef(0);
  const dirtyRef = useRef(false);
  const flushTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const [snap, setSnap] = useState<ScanState>({
    results: new Map(),
    total,
    settled: 0,
    succeeded: 0,
    failed: 0,
    loading: enabled && total > 0,
  });

  // Stable key so the effect only restarts when the symbol set actually changes.
  const key = symbols.length === 0 ? "" : `${symbols.length}|${symbols[0]}|${symbols[symbols.length - 1]}`;

  useEffect(() => {
    cancelledRef.current = false;
    resultsRef.current = new Map();
    settledRef.current = 0;
    failedRef.current = 0;
    dirtyRef.current = false;

    setSnap({
      results: new Map(),
      total,
      settled: 0,
      succeeded: 0,
      failed: 0,
      loading: enabled && total > 0,
    });

    if (!enabled || total === 0) {
      return () => {};
    }

    const flush = () => {
      if (cancelledRef.current) return;
      dirtyRef.current = false;
      // Clone the map so React sees a new reference.
      const cloned = new Map(resultsRef.current);
      const settled = settledRef.current;
      const failed = failedRef.current;
      const succeeded = cloned.size;
      setSnap({
        results: cloned,
        total,
        settled,
        succeeded,
        failed,
        loading: settled < total,
      });
    };

    const scheduleFlush = () => {
      if (flushTimerRef.current != null || cancelledRef.current) return;
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        if (dirtyRef.current) flush();
      }, 250);
    };

    // Worker pool — pulls from a shared cursor.
    let cursor = 0;
    const workers: Promise<void>[] = [];
    const pool = Math.min(concurrency, total);

    for (let w = 0; w < pool; w++) {
      workers.push(
        (async () => {
          while (!cancelledRef.current) {
            const i = cursor++;
            if (i >= total) return;
            const sym = symbols[i];
            try {
              const data = await fetchCandles(sym, "D", days);
              if (cancelledRef.current) return;
              if (data?.c?.length) {
                resultsRef.current.set(sym, data);
              } else {
                failedRef.current++;
              }
            } catch {
              if (cancelledRef.current) return;
              failedRef.current++;
            } finally {
              if (!cancelledRef.current) {
                settledRef.current++;
                dirtyRef.current = true;
                scheduleFlush();
              }
            }
          }
        })(),
      );
    }

    void Promise.all(workers).then(() => {
      if (cancelledRef.current) return;
      // Force a final flush so loading flips to false immediately.
      if (flushTimerRef.current != null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flush();
    });

    return () => {
      cancelledRef.current = true;
      if (flushTimerRef.current != null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, runId, concurrency, days]);

  return snap;
}
