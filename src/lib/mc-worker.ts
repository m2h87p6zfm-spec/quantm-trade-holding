// ============================================================================
//  Monte-Carlo Web Worker — führt die 10k-Pfad-Simulation off-thread aus,
//  damit die UI während rechenintensiver Composite-Analysen flüssig bleibt.
// ----------------------------------------------------------------------------
//  Eingabe : { id, payload: { ind, regime, ext, opts } }
//  Ausgabe : { id, ok, result?: CompositeAnalysis, error?, runtimeMs }
// ============================================================================

import { analyzeComposite, type CompositeAnalysis, type ExternalInputs } from "./composite-engine";
import type { IndicatorSet } from "./indicators";
import type { MarketRegime } from "./ai-learning";

export type McJob = {
  id: string;
  payload: {
    ind: IndicatorSet;
    regime: MarketRegime;
    ext?: ExternalInputs;
    opts?: { horizonDays?: number; paths?: number; muOverride?: number; seed?: number };
  };
};

export type McResponse =
  | { id: string; ok: true; result: CompositeAnalysis; runtimeMs: number }
  | { id: string; ok: false; error: string; runtimeMs: number };

self.addEventListener("message", (ev: MessageEvent<McJob>) => {
  const { id, payload } = ev.data;
  const t0 = performance.now();
  try {
    const result = analyzeComposite(payload.ind, payload.regime, payload.ext ?? {}, payload.opts ?? {});
    const runtimeMs = performance.now() - t0;
    (self as unknown as Worker).postMessage({ id, ok: true, result, runtimeMs } satisfies McResponse);
  } catch (err) {
    const runtimeMs = performance.now() - t0;
    (self as unknown as Worker).postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      runtimeMs,
    } satisfies McResponse);
  }
});
