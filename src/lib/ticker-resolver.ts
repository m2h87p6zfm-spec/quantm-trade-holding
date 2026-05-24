// Robuste, gemeinsame Ticker-Erkennung für Frontend (analyse.tsx) und Server
// (agent-chat.ts via quant-fetch.server). Mehrstufiger Fallback mit harten
// Word-Boundaries — verhindert z. B. dass "rheinmetall" zu META wird (weil
// "meta" als Substring vorkommt).
import { PRODUCTS } from "@/lib/products";

const NAME_STOPWORDS = new Set([
  "inc", "inc.", "corp", "corp.", "corporation", "company", "co", "co.", "ag", "se", "sa", "nv", "plc",
  "ltd", "ltd.", "limited", "holdings", "holding", "group", "the", "and", "of", "&",
  "technologies", "technology", "tech", "systems", "industries", "international", "global",
  "platforms", "motors", "motor", "bank", "banco", "vz", "pharmaceuticals", "pharma",
]);

// Stopwords für den letzten "irgendein Großbuchstaben-Wort"-Fallback.
const TICKER_BLOCKLIST = new Set([
  "ICH", "DU", "WIE", "WO", "WAS", "WANN", "WARUM", "WER",
  "KAUF", "KAUFEN", "VERKAUF", "VERKAUFEN", "HALTEN", "SOLL", "SOLLEN", "LONG", "SHORT",
  "AKTIE", "AKTIEN", "ETF", "BUY", "SELL", "HOLD", "STOCK", "USD", "EUR", "USA",
  "APEX", "PRIME", "TOP", "RSI", "MACD", "SMA", "EMA", "ATR", "VAR",
  "DASHBOARD", "SIGNAL", "SIGNALE", "SCAN", "SCANNE", "ANALYSE",
  "BITTE", "DANKE", "OK", "JA", "NEIN", "UND", "ODER", "DER", "DIE", "DAS",
  "EIN", "EINE", "DEN", "DEM", "MIT", "VON", "FÜR", "FUR", "ÜBER", "UEBER",
]);

// Bekannte Spitznamen / Volltext-Aliase → Yahoo-Ticker.
// CRITICAL: Wird mit Word-Boundary geprüft (nicht mit String.includes), damit
// "meta" nicht in "rheinmetall" matcht.
const ALIASES: Record<string, string> = {
  // US Mega-Caps
  apple: "AAPL", tesla: "TSLA", nvidia: "NVDA", microsoft: "MSFT", amazon: "AMZN",
  meta: "META", facebook: "META", google: "GOOGL", alphabet: "GOOGL", netflix: "NFLX",
  palantir: "PLTR", vertiv: "VRT", berkshire: "BRK.B", buffett: "BRK.B",
  // DE / EU Blue Chips
  rheinmetall: "RHM.DE", allianz: "ALV.DE", siemens: "SIE.DE", "deutsche bank": "DBK.DE",
  commerzbank: "CBK.DE", volkswagen: "VOW3.DE", bmw: "BMW.DE", mercedes: "MBG.DE",
  daimler: "MBG.DE", porsche: "P911.DE", bayer: "BAYN.DE", basf: "BAS.DE",
  henkel: "HEN3.DE", "deutsche telekom": "DTE.DE", telekom: "DTE.DE", post: "DHL.DE",
  lufthansa: "LHA.DE", eon: "EOAN.DE", "e.on": "EOAN.DE", rwe: "RWE.DE",
  sap: "SAP", airbus: "AIR.PA", asml: "ASML", lvmh: "MC.PA", nestle: "NESN.SW",
  novartis: "NOVN.SW", roche: "ROG.SW", shell: "SHEL.L", bp: "BP.L",
  zalando: "ZAL.DE", "hello fresh": "HFG.DE", hellofresh: "HFG.DE",
  // Indizes
  dax: "EWG", "s&p": "SPY", "s&p 500": "SPY", sp500: "SPY", spx: "SPY",
  nasdaq: "QQQ", "dow jones": "DIA", dow: "DIA", nikkei: "EWJ", mdax: "EWG",
  // Krypto (Yahoo-Notation)
  bitcoin: "BTC-USD", btc: "BTC-USD", ethereum: "ETH-USD", eth: "ETH-USD",
  // Rohstoffe
  gold: "GC=F", silber: "SI=F", silver: "SI=F", öl: "CL=F", oel: "CL=F", oil: "CL=F",
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .split(/[^a-zäöüß0-9]+/)
    .filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t));
}

/** Word-boundary-Test, der auch Umlaute respektiert. */
function wordHit(haystack: string, needle: string): boolean {
  // Erlaubt auch mehrteilige Bedarfe wie "deutsche bank" (Leerzeichen bleiben drin).
  const re = new RegExp(`(^|[^a-zäöüß0-9])${escapeRe(needle)}($|[^a-zäöüß0-9])`, "i");
  return re.test(haystack);
}

/**
 * Mehrstufige Ticker-Erkennung. Reihenfolge nach Spezifität:
 *  1. Aliase mit Word-Boundary (z. B. "rheinmetall" → RHM.DE)
 *  2. Firmenname (längster passender Token gewinnt — "rheinmetall" >> "meta")
 *  3. Direktes Symbol als Wort (z. B. "NVDA")
 *  4. Generischer 1–5-Letter-Upper-Token-Fallback
 */
export function resolveTicker(query: string): string | null {
  if (!query) return null;
  const upper = query.toUpperCase();
  const lower = query.toLowerCase();

  // 1) Aliase — längste Keys zuerst, damit "deutsche bank" vor "bank" greift.
  const aliasKeys = Object.keys(ALIASES).sort((a, b) => b.length - a.length);
  for (const k of aliasKeys) {
    if (wordHit(lower, k)) return ALIASES[k];
  }

  // 2) Firmenname-Token-Match. Längere Tokens haben Vorrang
  //    ("rheinmetall"=11 schlägt "meta"=4 deutlich).
  const candidates: Array<{ symbol: string; score: number }> = [];
  for (const p of PRODUCTS) {
    const tokens = nameTokens(p.name);
    let best = 0;
    for (const t of tokens) {
      if (wordHit(lower, t) && t.length > best) best = t.length;
    }
    if (best > 0) candidates.push({ symbol: p.symbol, score: best });
  }
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].symbol;
  }

  // 3) Direktes Symbol als Wort (case-insensitive ist hier riskant — Ticker sind UPPER).
  for (const p of [...PRODUCTS].sort((a, b) => b.symbol.length - a.symbol.length)) {
    const sym = p.symbol.toUpperCase();
    const re = new RegExp(`(^|[^A-Z0-9])${escapeRe(sym)}($|[^A-Z0-9])`);
    if (re.test(upper)) return p.symbol;
  }

  // 4) Generischer Fallback — nur Tokens, die im ORIGINAL bereits all-caps sind
  //    (verhindert dass "Hallo" → "HALLO" als Ticker erkannt wird).
  for (const m of query.matchAll(/\b[A-Z]{2,5}(?:[.:-][A-Z]{1,5})?\b/g)) {
    if (!TICKER_BLOCKLIST.has(m[0])) return m[0];
  }


  return null;
}
