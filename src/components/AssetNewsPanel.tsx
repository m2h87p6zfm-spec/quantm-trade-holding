import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Sparkles, TrendingUp, TrendingDown, Minus, Loader2, Newspaper, Lock } from "lucide-react";
import { fetchNewsSentiment, type NewsSentimentItem } from "@/lib/news-sentiment";
import { Link } from "@tanstack/react-router";

type Category = "all" | "earnings" | "analyst" | "insider" | "macro" | "other";

const CATEGORY_RX: Record<Exclude<Category, "all" | "other">, RegExp> = {
  earnings: /\b(earnings|q[1-4]|quarter|results|revenue|eps|beat|miss|guidance|profit|loss|outlook)\b/i,
  analyst: /\b(upgrade|downgrade|price target|rating|analyst|buy|sell|hold|overweight|underweight|raises?|cuts?)\b/i,
  insider: /\b(insider|ceo|cfo|board|stake|shares?\s+(?:bought|sold)|filing|13[dfg]|sec filing)\b/i,
  macro: /\b(fed|fomc|rate|inflation|cpi|jobs|gdp|recession|treasury|powell|ecb|bond yields?|trade war|tariff)\b/i,
};

function classifyCategory(title: string): Exclude<Category, "all"> {
  for (const k of ["earnings", "analyst", "insider", "macro"] as const) {
    if (CATEGORY_RX[k].test(title)) return k;
  }
  return "other";
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} T`;
}

function sentimentClasses(s: NewsSentimentItem["sentiment"]) {
  if (s === "bullish") return { wrap: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", icon: TrendingUp };
  if (s === "bearish") return { wrap: "border-rose-500/30 bg-rose-500/10 text-rose-300", icon: TrendingDown };
  return { wrap: "border-border bg-muted/40 text-muted-foreground", icon: Minus };
}

const CATEGORY_LABEL: Record<Category, string> = {
  all: "Alle",
  earnings: "Earnings",
  analyst: "Analyst",
  insider: "Insider",
  macro: "Makro",
  other: "Sonstige",
};

export function AssetNewsPanel({ symbol }: { symbol: string }) {
  const [items, setItems] = useState<NewsSentimentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [gated, setGated] = useState(false);
  const [cat, setCat] = useState<Category>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNewsSentiment({ symbols: [symbol], withSummary: true })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setGated(res.gated);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [symbol]);

  const enriched = useMemo(
    () => items.map((i) => ({ ...i, category: classifyCategory(i.title) })),
    [items],
  );

  const counts = useMemo(() => {
    const c = { bullish: 0, bearish: 0, neutral: 0 };
    enriched.forEach((i) => {
      if (i.sentiment === "bullish") c.bullish++;
      else if (i.sentiment === "bearish") c.bearish++;
      else c.neutral++;
    });
    return c;
  }, [enriched]);

  const sentimentScore = useMemo(() => {
    const total = counts.bullish + counts.bearish + counts.neutral;
    if (!total) return 50;
    // 0..100, 50 = neutral
    return Math.round(((counts.bullish - counts.bearish) / total) * 50 + 50);
  }, [counts]);

  const gaugeLabel = sentimentScore >= 65 ? "Bullish" : sentimentScore <= 35 ? "Bearish" : "Neutral";
  const gaugeTone = sentimentScore >= 65 ? "text-emerald-300" : sentimentScore <= 35 ? "text-rose-300" : "text-muted-foreground";

  const visible = useMemo(
    () => (cat === "all" ? enriched : enriched.filter((i) => i.category === cat)),
    [enriched, cat],
  );

  const categoryCounts = useMemo(() => {
    const out: Record<Category, number> = { all: enriched.length, earnings: 0, analyst: 0, insider: 0, macro: 0, other: 0 };
    enriched.forEach((i) => { out[i.category]++; });
    return out;
  }, [enriched]);

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header + Gauge */}
      <div className="flex flex-col gap-4 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">News & KI-Sentiment</div>
            <div className="text-xs text-muted-foreground">
              {loading ? "Lade Schlagzeilen…" : `${enriched.length} aktuelle Meldungen · KI-analysiert`}
            </div>
          </div>
        </div>

        {!loading && !gated && enriched.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={`text-2xl font-bold tabular-nums ${gaugeTone}`}>{sentimentScore}<span className="text-sm text-muted-foreground">/100</span></div>
              <div className={`text-[10px] uppercase tracking-wider ${gaugeTone}`}>{gaugeLabel}</div>
            </div>
            <SentimentBars counts={counts} />
          </div>
        )}
      </div>

      {/* Filters */}
      {!loading && !gated && enriched.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border/60 px-5 py-3">
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => (
            <button
              key={k}
              onClick={() => setCat(k)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                cat === k
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              {CATEGORY_LABEL[k]} <span className="ml-1 text-[10px] opacity-60">{categoryCounts[k]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> KI analysiert Schlagzeilen für {symbol}…
          </div>
        ) : gated ? (
          <GatedHint />
        ) : enriched.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Aktuell keine News zu {symbol} verfügbar.
          </div>
        ) : visible.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Keine Meldungen in dieser Kategorie.
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => <NewsCard key={item.uuid} item={item} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function SentimentBars({ counts }: { counts: { bullish: number; bearish: number; neutral: number } }) {
  const total = counts.bullish + counts.bearish + counts.neutral || 1;
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="hidden w-48 sm:block">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div className="bg-emerald-500/70" style={{ width: w(counts.bullish) }} />
        <div className="bg-muted-foreground/40" style={{ width: w(counts.neutral) }} />
        <div className="bg-rose-500/70" style={{ width: w(counts.bearish) }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span className="text-emerald-400">{counts.bullish} bull</span>
        <span>{counts.neutral} neutral</span>
        <span className="text-rose-400">{counts.bearish} bear</span>
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsSentimentItem & { category: Exclude<Category, "all"> } }) {
  const s = sentimentClasses(item.sentiment);
  const Icon = s.icon;
  return (
    <li className="group rounded-lg border border-border/70 bg-background/30 p-4 transition-colors hover:border-border hover:bg-background/60">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground/80">{item.publisher}</span>
        <span>·</span>
        <span>{timeAgo(item.publishedAt)} ago</span>
        {item.breaking && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            Breaking
          </span>
        )}
        <span className="rounded border border-border/60 bg-card px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
          {CATEGORY_LABEL[item.category]}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.wrap}`}>
            <Icon className="h-3 w-3" />
            {item.sentiment ?? "neutral"}
            {typeof item.score === "number" && (
              <span className="opacity-70">· {Math.round(item.score * 100)}%</span>
            )}
          </span>
        </div>
      </div>

      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm font-semibold leading-snug text-foreground hover:text-primary"
      >
        {item.title}
        <ExternalLink className="ml-1 inline h-3 w-3 opacity-50" />
      </a>

      {item.aiSummary && (
        <div className="mt-2 flex gap-2 rounded-md bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
          <span>{item.aiSummary}</span>
        </div>
      )}
    </li>
  );
}

function GatedHint() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/70 bg-background/30 py-10 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-5 w-5" />
      </div>
      <div className="max-w-sm">
        <div className="text-sm font-semibold">KI-News & Sentiment ist Pro-Feature</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Aktuelle Schlagzeilen mit KI-Sentiment-Analyse und deutscher Zusammenfassung — verfügbar im Pro-Tarif.
        </p>
      </div>
      <Link
        to="/account"
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
      >
        Pro freischalten
      </Link>
    </div>
  );
}
