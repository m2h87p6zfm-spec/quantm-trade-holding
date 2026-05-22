import type { NewsSource } from "@/lib/settings";

const META: Record<NewsSource | "other", { label: string; bg: string; fg: string; mark: string }> = {
  reuters:     { label: "Reuters",          bg: "bg-orange-500/15", fg: "text-orange-400",  mark: "R" },
  bloomberg:   { label: "Bloomberg",        bg: "bg-amber-500/15",  fg: "text-amber-400",   mark: "B" },
  ft:          { label: "Financial Times",  bg: "bg-pink-500/15",   fg: "text-pink-400",    mark: "FT" },
  cnbc:        { label: "CNBC",             bg: "bg-sky-500/15",    fg: "text-sky-400",     mark: "C" },
  yahoo:       { label: "Yahoo Finance",    bg: "bg-violet-500/15", fg: "text-violet-400",  mark: "Y!" },
  marketwatch: { label: "MarketWatch",      bg: "bg-emerald-500/15",fg: "text-emerald-400", mark: "MW" },
  investing:   { label: "Investing.com",    bg: "bg-yellow-500/15", fg: "text-yellow-400",  mark: "iC" },
  wsj:         { label: "Wall Street Journal", bg: "bg-slate-500/20", fg: "text-slate-200", mark: "WSJ" },
  other:       { label: "Other",            bg: "bg-muted",         fg: "text-muted-foreground", mark: "·" },
};

export function AgencyLogo({ source, size = "sm" }: { source: NewsSource | "other" | string; size?: "sm" | "xs" }) {
  const m = (META as any)[source] ?? META.other;
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
  const m = (META as any)[source] ?? META.other;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <AgencyLogo source={source} />
      <span className="font-medium text-foreground/80">{publisher || m.label}</span>
    </span>
  );
}

export const AGENCY_META = META;
