// Derive an individual price target & stop-loss for one position.
// Priority: stored indicator values (if sane), otherwise computed from the
// real entry price + verdict + confidence so every pick gets its OWN values
// in its OWN currency.
import type { DerivedPosition } from "@/components/track-record/PickDetailDrawer";

export type PriceLevels = {
  target: number;
  stop: number;
  /** "stored" if values came from the recorded indicators, otherwise "derived". */
  source: "stored" | "derived";
  /** % distance from entry — handy for UI. */
  targetPct: number;
  stopPct: number;
};

function isSane(level: number | null | undefined, entry: number): boolean {
  if (level == null || !Number.isFinite(level) || level <= 0) return false;
  const ratio = level / entry;
  return ratio >= 0.4 && ratio <= 2.5;
}

export function priceLevelsFor(position: DerivedPosition): PriceLevels {
  const entry = position.entryPrice;
  const ind = (position.analysis.indicators ?? {}) as Record<string, unknown>;
  const rawTarget = typeof ind.target === "number" ? (ind.target as number) : null;
  const rawStop = typeof ind.stop === "number" ? (ind.stop as number) : null;

  if (isSane(rawTarget, entry) && isSane(rawStop, entry)) {
    return {
      target: rawTarget!,
      stop: rawStop!,
      source: "stored",
      targetPct: ((rawTarget! - entry) / entry) * 100,
      stopPct: ((rawStop! - entry) / entry) * 100,
    };
  }

  const conf = position.analysis.confidence_score; // 0..100
  const isBuy = position.analysis.verdict !== "VERKAUFEN";

  // Confidence shifts the target between +6 % and +14 % from entry.
  const targetPct = (isBuy ? 1 : -1) * (0.06 + (conf / 100) * 0.08);
  // Stop is tighter, scales softly with confidence (more confidence = tighter stop allowed)
  const stopPct = (isBuy ? -1 : 1) * (0.04 + (1 - conf / 100) * 0.04);

  const target = round2(entry * (1 + targetPct));
  const stop = round2(entry * (1 + stopPct));

  return {
    target,
    stop,
    source: "derived",
    targetPct: targetPct * 100,
    stopPct: stopPct * 100,
  };
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}
