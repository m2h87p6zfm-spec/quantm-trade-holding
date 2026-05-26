// Maps Yahoo-style symbols (z.B. "HEIA.AS", "BMW.DE", "MC.PA") auf das
// Twelve-Data-Format (Bare-Ticker + mic_code). Ohne diese Normalisierung
// liefert TD für die neu hinzugefügten internationalen Ticker entweder
// "symbol invalid" (404) oder den falschen NYSE/BSE-Doppelgänger.

// Yahoo Finance Exchange-Suffix → ISO 10383 MIC-Code (Twelve Data Param)
const SUFFIX_TO_MIC: Record<string, string> = {
  // DACH / Deutschland
  DE: "XETR", F: "XFRA", MU: "XMUN", BE: "XBER", DU: "XDUS",
  HM: "XHAM", SG: "XSTU", HA: "XHAN",
  VI: "XWBO", // Wien
  // Westeuropa
  AS: "XAMS", BR: "XBRU", PA: "XPAR", LS: "XLIS",
  MC: "XMAD", MI: "XMIL", SW: "XSWX",
  L: "XLON", IR: "XDUB",
  // Nordics & Baltics
  HE: "XHEL", ST: "XSTO", CO: "XCSE", OL: "XOSL", IC: "XICE",
  RG: "XRIS", TL: "XTAL", VS: "XLIT",
  // CEE
  WA: "XWAR", PR: "XPRA", BD: "XBUD", AT: "ASEX", IS: "XIST",
  // MENA / Afrika
  CA: "XCAI", JO: "XJSE", TA: "XTAE", SR: "XSAU",
  QA: "DSMD", KW: "XKUW", BH: "XBAH",
  // APAC
  HK: "XHKG", T: "XTKS", KS: "XKRX", KQ: "XKOS",
  SS: "XSHG", SZ: "XSHE", TW: "XTAI", TWO: "ROCO",
  BO: "XBOM", NS: "XNSE", SI: "XSES", KL: "XKLS",
  BK: "XBKK", JK: "XIDX", AX: "XASX", NZ: "XNZE",
  // Americas
  TO: "XTSE", V: "XTSX", NE: "NEOE", CN: "XCNQ",
  SA: "BVMF", MX: "XMEX", BA: "XBUE", SN: "XSGO", LM: "XLIM",
};

export type TdSymbol = { symbol: string; mic_code?: string };

/** Konvertiert "HEIA.AS" → {symbol:"HEIA", mic_code:"XAMS"}. */
export function normalizeForTd(raw: string): TdSymbol {
  const s = raw.trim().toUpperCase();
  if (!s) return { symbol: s };
  // Krypto- und Futures-Notation unverändert lassen
  if (s.includes("=") || s.includes("-USD") || s.endsWith("-USDT")) {
    return { symbol: s };
  }
  const idx = s.lastIndexOf(".");
  if (idx <= 0) return { symbol: s };
  const base = s.slice(0, idx);
  const suffix = s.slice(idx + 1);
  // BRK.B, BF.B etc. — Punkt ist Class-Trenner, KEIN Exchange-Suffix.
  // Heuristik: 1 Buchstabe nach dem Punkt = US-Class.
  if (suffix.length === 1 && /^[A-Z]$/.test(suffix) && !SUFFIX_TO_MIC[suffix]) {
    return { symbol: s };
  }
  const mic = SUFFIX_TO_MIC[suffix];
  if (mic) return { symbol: base, mic_code: mic };
  return { symbol: s };
}
