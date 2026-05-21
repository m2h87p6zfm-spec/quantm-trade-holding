export type EconEvent = {
  id: string;
  date: string; // ISO yyyy-mm-ddTHH:mm:ssZ (UTC)
  title: string;
  country: "US" | "EU" | "DE" | "JP" | "UK" | "CN";
  impact: "high" | "medium" | "low";
  category: "Inflation" | "Zinsen" | "Arbeit" | "Wachstum" | "Earnings" | "Notenbank";
  detail?: string;
};

// Kuratierte Makro-Events 2026. In Produktion durch Live-Feed (Trading Economics, FRED) ersetzbar.
export const ECON_EVENTS: EconEvent[] = [
  { id: "fomc-1", date: "2026-05-28T18:00:00Z", title: "FOMC Sitzungsprotokoll", country: "US", impact: "high", category: "Notenbank", detail: "Hinweise auf den nächsten Zinsschritt der Fed." },
  { id: "us-pce-1", date: "2026-05-29T12:30:00Z", title: "US Core PCE (April)", country: "US", impact: "high", category: "Inflation", detail: "Bevorzugter Inflations-Indikator der Fed." },
  { id: "eu-cpi-1", date: "2026-06-02T09:00:00Z", title: "Eurozone CPI Flash", country: "EU", impact: "high", category: "Inflation" },
  { id: "us-ism-1", date: "2026-06-02T14:00:00Z", title: "US ISM Manufacturing PMI", country: "US", impact: "medium", category: "Wachstum" },
  { id: "us-nfp-1", date: "2026-06-05T12:30:00Z", title: "US Non-Farm Payrolls", country: "US", impact: "high", category: "Arbeit", detail: "Wichtigster monatlicher Arbeitsmarktbericht." },
  { id: "ecb-1",   date: "2026-06-04T12:15:00Z", title: "EZB Zinsentscheid", country: "EU", impact: "high", category: "Zinsen" },
  { id: "us-cpi-1", date: "2026-06-11T12:30:00Z", title: "US CPI (Mai)", country: "US", impact: "high", category: "Inflation" },
  { id: "fomc-2", date: "2026-06-17T18:00:00Z", title: "FOMC Zinsentscheid + Powell", country: "US", impact: "high", category: "Notenbank", detail: "Inkl. Dot-Plot Update." },
  { id: "boj-1", date: "2026-06-19T03:00:00Z", title: "Bank of Japan Zinsentscheid", country: "JP", impact: "medium", category: "Zinsen" },
  { id: "de-ifo-1", date: "2026-06-24T08:00:00Z", title: "ifo Geschäftsklima", country: "DE", impact: "medium", category: "Wachstum" },
  { id: "us-gdp-1", date: "2026-06-26T12:30:00Z", title: "US GDP Q1 (Final)", country: "US", impact: "medium", category: "Wachstum" },
  { id: "earn-nvda", date: "2026-08-20T20:00:00Z", title: "NVIDIA Earnings Q2", country: "US", impact: "high", category: "Earnings", detail: "Marktbewegender Tech-Bericht." },
  { id: "earn-aapl", date: "2026-07-30T20:00:00Z", title: "Apple Earnings Q3", country: "US", impact: "high", category: "Earnings" },
  { id: "earn-msft", date: "2026-07-23T20:00:00Z", title: "Microsoft Earnings Q4", country: "US", impact: "high", category: "Earnings" },
  { id: "us-cpi-2", date: "2026-07-15T12:30:00Z", title: "US CPI (Juni)", country: "US", impact: "high", category: "Inflation" },
  { id: "fomc-3", date: "2026-07-29T18:00:00Z", title: "FOMC Zinsentscheid", country: "US", impact: "high", category: "Notenbank" },
];

export function upcomingEvents(now = Date.now()): EconEvent[] {
  return ECON_EVENTS
    .filter((e) => new Date(e.date).getTime() >= now - 6 * 60 * 60 * 1000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function timeUntil(iso: string, now = Date.now()): { label: string; live: boolean; past: boolean } {
  const t = new Date(iso).getTime();
  const diff = t - now;
  if (diff < -2 * 60 * 60 * 1000) return { label: "abgeschlossen", live: false, past: true };
  if (diff < 0 && diff > -2 * 60 * 60 * 1000) return { label: "läuft", live: true, past: false };
  const m = Math.floor(diff / 60000);
  if (m < 60) return { label: `in ${m} min`, live: false, past: false };
  const h = Math.floor(m / 60);
  if (h < 48) return { label: `in ${h} h ${m % 60} min`, live: false, past: false };
  const d = Math.floor(h / 24);
  return { label: `in ${d} Tagen`, live: false, past: false };
}
