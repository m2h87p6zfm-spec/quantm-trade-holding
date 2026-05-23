import type { NewsSource } from "@/lib/settings";

type Meta = { label: string; bg: string; fg: string; mark: string };

const META: Record<NewsSource | "other", Meta> = {
  // Tier-1 wires & financial press
  reuters:         { label: "Reuters",              bg: "bg-orange-500/15", fg: "text-orange-400",  mark: "R" },
  bloomberg:       { label: "Bloomberg",            bg: "bg-amber-500/15",  fg: "text-amber-400",   mark: "B" },
  wsj:             { label: "Wall Street Journal",  bg: "bg-slate-500/20",  fg: "text-slate-200",   mark: "WSJ" },
  ft:              { label: "Financial Times",      bg: "bg-pink-500/15",   fg: "text-pink-400",    mark: "FT" },
  economist:       { label: "The Economist",        bg: "bg-red-500/15",    fg: "text-red-400",     mark: "E" },
  nytimes:         { label: "New York Times",       bg: "bg-zinc-500/20",   fg: "text-zinc-200",    mark: "NYT" },
  washingtonpost:  { label: "Washington Post",      bg: "bg-slate-600/20",  fg: "text-slate-200",   mark: "WP" },
  guardian:        { label: "The Guardian",         bg: "bg-blue-600/15",   fg: "text-blue-300",    mark: "G" },
  barrons:         { label: "Barron's",             bg: "bg-rose-500/15",   fg: "text-rose-300",    mark: "Br" },
  // US business & markets
  cnbc:            { label: "CNBC",                 bg: "bg-sky-500/15",    fg: "text-sky-400",     mark: "C" },
  marketwatch:     { label: "MarketWatch",          bg: "bg-emerald-500/15",fg: "text-emerald-400", mark: "MW" },
  yahoo:           { label: "Yahoo Finance",        bg: "bg-violet-500/15", fg: "text-violet-400",  mark: "Y!" },
  investing:       { label: "Investing.com",        bg: "bg-yellow-500/15", fg: "text-yellow-400",  mark: "iC" },
  forbes:          { label: "Forbes",               bg: "bg-indigo-500/15", fg: "text-indigo-300",  mark: "Fb" },
  fortune:         { label: "Fortune",              bg: "bg-amber-600/15",  fg: "text-amber-300",   mark: "Ft" },
  businessinsider: { label: "Business Insider",     bg: "bg-orange-600/15", fg: "text-orange-300",  mark: "BI" },
  axios:           { label: "Axios",                bg: "bg-fuchsia-500/15",fg: "text-fuchsia-300", mark: "Ax" },
  seekingalpha:    { label: "Seeking Alpha",        bg: "bg-orange-400/15", fg: "text-orange-300",  mark: "SA" },
  benzinga:        { label: "Benzinga",             bg: "bg-lime-500/15",   fg: "text-lime-300",    mark: "Bz" },
  motleyfool:      { label: "Motley Fool",          bg: "bg-teal-500/15",   fg: "text-teal-300",    mark: "MF" },
  thestreet:       { label: "TheStreet",            bg: "bg-emerald-600/15",fg: "text-emerald-300", mark: "TS" },
  zerohedge:       { label: "ZeroHedge",            bg: "bg-zinc-700/30",   fg: "text-zinc-300",    mark: "ZH" },
  // Tech & enterprise
  theinformation:  { label: "The Information",      bg: "bg-rose-600/15",   fg: "text-rose-300",    mark: "Ti" },
  techcrunch:      { label: "TechCrunch",           bg: "bg-green-500/15",  fg: "text-green-400",   mark: "TC" },
  theverge:        { label: "The Verge",            bg: "bg-orange-500/15", fg: "text-orange-300",  mark: "Vg" },
  wired:           { label: "Wired",                bg: "bg-neutral-500/20",fg: "text-neutral-200", mark: "W" },
  // Crypto
  coindesk:        { label: "CoinDesk",             bg: "bg-cyan-500/15",   fg: "text-cyan-300",    mark: "CD" },
  cointelegraph:   { label: "Cointelegraph",        bg: "bg-yellow-600/15", fg: "text-yellow-300",  mark: "CT" },
  theblock:        { label: "The Block",            bg: "bg-stone-500/20",  fg: "text-stone-200",   mark: "TB" },
  decrypt:         { label: "Decrypt",              bg: "bg-violet-600/15", fg: "text-violet-300",  mark: "Dc" },
  // Asia
  nikkei:          { label: "Nikkei",               bg: "bg-red-600/15",    fg: "text-red-300",     mark: "Nk" },
  scmp:            { label: "South China MP",       bg: "bg-yellow-700/15", fg: "text-yellow-300",  mark: "SC" },
  reutersasia:     { label: "Reuters Asia",         bg: "bg-orange-600/15", fg: "text-orange-300",  mark: "RA" },
  bloombergasia:   { label: "Bloomberg Asia",       bg: "bg-amber-600/15",  fg: "text-amber-300",   mark: "BA" },
  // Europe / DACH / FR
  handelsblatt:    { label: "Handelsblatt",         bg: "bg-orange-500/15", fg: "text-orange-300",  mark: "Hb" },
  manager:         { label: "Manager Magazin",      bg: "bg-blue-500/15",   fg: "text-blue-300",    mark: "Mm" },
  faz:             { label: "F.A.Z.",               bg: "bg-stone-600/20",  fg: "text-stone-200",   mark: "FAZ" },
  boerse:          { label: "Börse Online",         bg: "bg-amber-700/15",  fg: "text-amber-300",   mark: "Bö" },
  lesechos:        { label: "Les Échos",            bg: "bg-rose-700/15",   fg: "text-rose-300",    mark: "LE" },
  // Macro / policy
  politico:        { label: "Politico",             bg: "bg-red-500/15",    fg: "text-red-300",     mark: "Po" },
  semafor:         { label: "Semafor",              bg: "bg-blue-600/15",   fg: "text-blue-300",    mark: "Sm" },
  // Fallback
  other:           { label: "Other",                bg: "bg-muted",         fg: "text-muted-foreground", mark: "·" },
};

export function AgencyLogo({ source, size = "sm" }: { source: NewsSource | "other" | string; size?: "sm" | "xs" }) {
  const m = (META as Record<string, Meta>)[source] ?? META.other;
  const dim = size === "xs" ? "h-4 w-4 text-[8px]" : "h-5 w-5 text-[10px]";
  return (
    <span
      title={m.label}
      className={`inline-flex shrink-0 items-center justify-center rounded font-bold tracking-tight ring-1 ring-border/40 ${m.bg} ${m.fg} ${dim}`}
    >
      {m.mark}
    </span>
  );
}

export function AgencyChip({ source, publisher }: { source: NewsSource | "other" | string; publisher?: string }) {
  const m = (META as Record<string, Meta>)[source] ?? META.other;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <AgencyLogo source={source} />
      <span className="font-medium text-foreground/80">{publisher || m.label}</span>
    </span>
  );
}

export const AGENCY_META = META;
