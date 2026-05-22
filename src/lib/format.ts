/**
 * Unified financial number formatting (de-DE locale).
 *
 * Rules:
 *   - thousands separator = "."
 *   - decimal separator   = ","
 *   - tabular-nums everywhere (handled via CSS, not here)
 *
 * Examples:
 *   formatNumber(1250)        -> "1.250"
 *   formatNumber(1250.5, 2)   -> "1.250,50"
 *   formatPrice(12540.8, "$") -> "$12.540,80"
 *   formatPercent(1.2345)     -> "+1,23 %"
 *   formatCompact(1_234_567)  -> "1,23 Mio"
 *   formatSignedAbs(-12.4, 2) -> "−12,40"
 */

const MINUS = "\u2212"; // proper minus sign, not hyphen
const NBSP = "\u00A0";

function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

/** Auto-decide decimals based on magnitude (price-style). */
export function priceDecimals(n: number): number {
  const a = Math.abs(n);
  if (a >= 1000) return 2;
  if (a >= 1) return 2;
  if (a >= 0.01) return 4;
  return 6;
}

/** Auto-decide decimals for chart axis ticks (denser, less precise). */
export function axisDecimals(n: number): number {
  const a = Math.abs(n);
  if (a >= 1000) return 0;
  if (a >= 100) return 1;
  if (a >= 1) return 2;
  return 4;
}

export function formatNumber(n: number, decimals?: number): string {
  const v = safe(n);
  const d = decimals ?? (Number.isInteger(v) ? 0 : 2);
  return v.toLocaleString("de-DE", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

/** "12.540,80" with auto decimals — never includes currency. */
export function formatDecimal(n: number, decimals?: number): string {
  return formatNumber(n, decimals);
}

/** "$12.540,80" — currency token then unbreakable space then number. */
export function formatPrice(n: number, currency = "$", decimals?: number): string {
  const v = safe(n);
  const d = decimals ?? priceDecimals(v);
  const isPrefix = currency === "$" || currency === "£" || currency === "¥" || currency === "₣";
  const num = formatNumber(v, d);
  // EUR convention: number then currency. USD: currency then number.
  if (isPrefix) return `${currency}${num}`;
  return `${num}${NBSP}${currency}`;
}

/** "+1,23 %" with proper sign and NBSP before %. Pass null/NaN safe. */
export function formatPercent(n: number, decimals = 2, opts: { signed?: boolean } = {}): string {
  const { signed = true } = opts;
  const v = safe(n);
  const abs = Math.abs(v).toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (!signed) return `${abs}${NBSP}%`;
  if (v > 0) return `+${abs}${NBSP}%`;
  if (v < 0) return `${MINUS}${abs}${NBSP}%`;
  return `0,${"0".repeat(decimals)}${NBSP}%`;
}

/** Signed absolute value: "+12,40" / "−12,40" / "0,00". */
export function formatSignedAbs(n: number, decimals = 2): string {
  const v = safe(n);
  const abs = formatNumber(Math.abs(v), decimals);
  if (v > 0) return `+${abs}`;
  if (v < 0) return `${MINUS}${abs}`;
  return abs;
}

/** Compact scale in German: 1,23 Mio / 4,5 Mrd. */
export function formatCompact(n: number, decimals = 2): string {
  const v = safe(n);
  const a = Math.abs(v);
  const sign = v < 0 ? MINUS : "";
  if (a >= 1e12) return `${sign}${formatNumber(a / 1e12, decimals)}${NBSP}Bio`;
  if (a >= 1e9) return `${sign}${formatNumber(a / 1e9, decimals)}${NBSP}Mrd`;
  if (a >= 1e6) return `${sign}${formatNumber(a / 1e6, decimals)}${NBSP}Mio`;
  if (a >= 1e3) return `${sign}${formatNumber(a / 1e3, decimals === 2 ? 1 : decimals)}${NBSP}Tsd`;
  return `${sign}${formatNumber(a, 0)}`;
}

/** Compute (last - first) / first * 100, robust to zero base. */
export function pctChange(first: number, last: number): number {
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return 0;
  return ((last - first) / first) * 100;
}

/** Compute last - first absolute change, NaN-safe. */
export function absChange(first: number, last: number): number {
  if (!Number.isFinite(first) || !Number.isFinite(last)) return 0;
  return last - first;
}

/** Re-export for symmetry. */
export const fmt = {
  number: formatNumber,
  decimal: formatDecimal,
  price: formatPrice,
  percent: formatPercent,
  signedAbs: formatSignedAbs,
  compact: formatCompact,
  pctChange,
  absChange,
};
