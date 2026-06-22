// Map a ticker symbol to its trading currency based on exchange suffix.
// Used everywhere we render a price so the value carries the right symbol.

export type CurrencyInfo = {
  code: string;
  symbol: string;
  /** "prefix" -> "$10.00", "suffix" -> "10,00 €" */
  position: "prefix" | "suffix";
};

const SUFFIX_MAP: Record<string, CurrencyInfo> = {
  // Europe — EUR (suffix)
  ".DE": { code: "EUR", symbol: "€", position: "suffix" },
  ".F": { code: "EUR", symbol: "€", position: "suffix" },
  ".PA": { code: "EUR", symbol: "€", position: "suffix" },
  ".AS": { code: "EUR", symbol: "€", position: "suffix" },
  ".MI": { code: "EUR", symbol: "€", position: "suffix" },
  ".MC": { code: "EUR", symbol: "€", position: "suffix" },
  ".BR": { code: "EUR", symbol: "€", position: "suffix" },
  ".LS": { code: "EUR", symbol: "€", position: "suffix" },
  ".HE": { code: "EUR", symbol: "€", position: "suffix" },
  ".IR": { code: "EUR", symbol: "€", position: "suffix" },
  ".VI": { code: "EUR", symbol: "€", position: "suffix" },
  // UK
  ".L": { code: "GBP", symbol: "£", position: "prefix" },
  // Switzerland
  ".SW": { code: "CHF", symbol: "CHF ", position: "prefix" },
  ".VX": { code: "CHF", symbol: "CHF ", position: "prefix" },
  // Scandi
  ".ST": { code: "SEK", symbol: "kr ", position: "suffix" },
  ".OL": { code: "NOK", symbol: "kr ", position: "suffix" },
  ".CO": { code: "DKK", symbol: "kr ", position: "suffix" },
  // North America
  ".TO": { code: "CAD", symbol: "C$", position: "prefix" },
  ".V": { code: "CAD", symbol: "C$", position: "prefix" },
  ".MX": { code: "MXN", symbol: "MX$", position: "prefix" },
  // APAC
  ".T": { code: "JPY", symbol: "¥", position: "prefix" },
  ".HK": { code: "HKD", symbol: "HK$", position: "prefix" },
  ".AX": { code: "AUD", symbol: "A$", position: "prefix" },
  ".NZ": { code: "NZD", symbol: "NZ$", position: "prefix" },
  ".KS": { code: "KRW", symbol: "₩", position: "prefix" },
  ".SS": { code: "CNY", symbol: "¥", position: "prefix" },
  ".SZ": { code: "CNY", symbol: "¥", position: "prefix" },
  ".SI": { code: "SGD", symbol: "S$", position: "prefix" },
  ".BO": { code: "INR", symbol: "₹", position: "prefix" },
  ".NS": { code: "INR", symbol: "₹", position: "prefix" },
};

const DEFAULT_USD: CurrencyInfo = { code: "USD", symbol: "$", position: "prefix" };

export function currencyForTicker(ticker: string | null | undefined): CurrencyInfo {
  if (!ticker) return DEFAULT_USD;
  const t = ticker.toUpperCase();
  const dot = t.lastIndexOf(".");
  if (dot < 0) return DEFAULT_USD; // bare US ticker
  const suffix = t.slice(dot);
  return SUFFIX_MAP[suffix] ?? DEFAULT_USD;
}

/** Format a price with the ticker's native currency. */
export function formatPrice(value: number, ticker: string | null | undefined, opts?: { digits?: number }): string {
  const c = currencyForTicker(ticker);
  const digits = opts?.digits ?? 2;
  const num = value.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return c.position === "prefix" ? `${c.symbol}${num}` : `${num} ${c.symbol}`;
}

/** Format a P&L money amount in the same currency. */
export function formatMoney(value: number, ticker: string | null | undefined): string {
  return formatPrice(value, ticker);
}
