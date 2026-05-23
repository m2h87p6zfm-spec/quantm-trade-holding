import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSettings, NEWS_SOURCES, type NewsSource } from "@/lib/settings";
import { AgencyLogo, AGENCY_META } from "@/components/AgencyLogo";
import { Newspaper, TrendingUp, TrendingDown, Minus, RefreshCw, Zap, Sparkles, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useSubscription } from "@/hooks/useSubscription";

const COLLAPSED_SOURCES_COUNT = 8;


export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Professional Newsroom — Apex Trades" },
      { name: "description", content: "Tier-1 Marktnachrichten von Reuters, Bloomberg, Yahoo Finance, CNBC und Financial Times — gefiltert nach deinem Portfolio." },
    ],
  }),
  component: NewsPage,
});

type Item = {
  uuid: string;
  title: string;
  publisher: string;
  source: NewsSource | "other";
  link: string;
  publishedAt: number;
  symbol: string;
  tickers: string[];
  sentiment?: "bullish" | "bearish" | "neutral";
  score?: number;
  breaking?: boolean;
  aiSummary?: string;
};

import { fetchNewsSentiment } from "@/lib/news-sentiment";

async function fetchNews(symbols: string[], sources: NewsSource[]): Promise<{ items: Item[]; gated: boolean }> {
  const res = await fetchNewsSentiment({ symbols, sources, tier1Only: false, withSummary: true });
  return { items: res.items as Item[], gated: res.gated };
}

function useTimeAgo() {
  const t = useT();
  return (ts: number) => {
    const diff = Math.max(0, Date.now() - ts);
    const m = Math.floor(diff / 60000);
    if (m < 1) return t("news.time.now");
    if (m < 60) return t("news.time.minAgo").replace("{n}", String(m));
    const h = Math.floor(m / 60);
    if (h < 24) return t("news.time.hAgo").replace("{n}", String(h));
    const d = Math.floor(h / 24);
    return t("news.time.dAgo").replace("{n}", String(d));
  };
}

function SentimentBadge({ s, c }: { s?: Item["sentiment"]; c?: number }) {
  const t = useT();
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider";
  if (s === "bullish") return <span className={`${base} bg-bull/20 text-bull ring-1 ring-bull/40`}><TrendingUp className="h-3 w-3" /> {t("news.sentiment.bullish")}{c ? ` · ${Math.round(c * 100)}%` : ""}</span>;
  if (s === "bearish") return <span className={`${base} bg-bear/20 text-bear ring-1 ring-bear/40`}><TrendingDown className="h-3 w-3" /> {t("news.sentiment.bearish")}{c ? ` · ${Math.round(c * 100)}%` : ""}</span>;
  return <span className={`${base} bg-muted text-muted-foreground ring-1 ring-border`}><Minus className="h-3 w-3" /> {t("news.sentiment.neutral")}</span>;
}

function NewsCard({ it, portfolio, onOpen }: { it: Item; portfolio: Set<string>; onOpen: (it: Item) => void }) {
  const timeAgo = useTimeAgo();
  return (
    <button
      type="button"
      onClick={() => onOpen(it)}
      className="group block w-full rounded-xl border border-border bg-card/60 p-4 text-left backdrop-blur transition hover:border-primary/50 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <AgencyLogo source={it.source} />
            <span className="font-medium text-foreground/80">{it.publisher}</span>
            <span>·</span>
            <span>{timeAgo(it.publishedAt)}</span>
            {it.breaking && (
              <span className="inline-flex items-center gap-1 rounded bg-bear/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-bear">
                <Zap className="h-2.5 w-2.5" /> Breaking
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-sm font-semibold leading-snug group-hover:text-primary">{it.title}</h3>
          {it.aiSummary && (
            <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-foreground/75">
              {it.aiSummary}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {it.tickers.slice(0, 6).map((t) => {
              const owned = portfolio.has(t);
              return (
                <Link
                  key={t}
                  to="/produkte/$symbol"
                  params={{ symbol: t }}
                  onClick={(e) => e.stopPropagation()}
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors ${
                    owned
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30 hover:bg-primary/25"
                      : "bg-muted text-foreground/80 hover:text-primary"
                  }`}
                  title={owned ? "In deinem Portfolio" : "Chart öffnen"}
                >
                  {t}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <SentimentBadge s={it.sentiment} c={it.score} />
        </div>
      </div>
    </button>
  );
}

function ArticleModal({ it, portfolio, onClose }: { it: Item; portfolio: Set<string>; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mt-12 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <AgencyLogo source={it.source} />
          <span className="font-medium text-foreground/80">{it.publisher}</span>
          <span>·</span>
          <span>{timeAgo(it.publishedAt)}</span>
          {it.breaking && (
            <span className="inline-flex items-center gap-1 rounded bg-bear/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-bear">
              <Zap className="h-2.5 w-2.5" /> Breaking
            </span>
          )}
        </div>

        <h2 className="mt-3 text-xl font-bold leading-tight">{it.title}</h2>

        <div className="mt-3 flex flex-wrap items-center gap-1">
          {it.tickers.slice(0, 10).map((t) => {
            const owned = portfolio.has(t);
            return (
              <Link
                key={t}
                to="/produkte/$symbol"
                params={{ symbol: t }}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors ${
                  owned
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30 hover:bg-primary/25"
                    : "bg-muted text-foreground/80 hover:text-primary"
                }`}
              >
                {t}
              </Link>
            );
          })}
          <SentimentBadge s={it.sentiment} c={it.score} />
        </div>

        <div className="mt-5 rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" /> Artikel-Zusammenfassung
          </div>
          {it.aiSummary ? (
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-foreground/90">
              {it.aiSummary}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Zusammenfassung wird noch generiert — bitte einen Moment Geduld und neu laden.
            </p>
          )}
        </div>

        <a
          href={it.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
        >
          Originalartikel öffnen ↗
        </a>

        <p className="mt-4 text-[10px] text-muted-foreground/70">
          Inhalte werden durch KI verdichtet und ersetzen keine Originalrecherche. Quelle: {it.publisher}.
        </p>
      </div>
    </div>
  );
}

function NewsPage() {
  const t = useT();
  const { settings, update } = useSettings();
  const { isPro, loading: subLoading } = useSubscription();
  const [tab, setTab] = useState<"foryou" | "all">("foryou");
  const [openItem, setOpenItem] = useState<Item | null>(null);
  const enabledSources = useMemo(
    () => NEWS_SOURCES.filter((k) => settings.newsSources[k]),
    [settings.newsSources]
  );
  const portfolio = useMemo(() => new Set(settings.watchlist.map((s) => s.toUpperCase())), [settings.watchlist]);
  const symbols = settings.watchlist.length > 0 ? settings.watchlist : ["AAPL", "NVDA", "TSLA", "SPY", "MSFT"];

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["news", symbols.join(","), enabledSources.join(",")],
    queryFn: () => fetchNews(symbols.slice(0, 12), enabledSources),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    enabled: !subLoading && isPro && enabledSources.length > 0,
  });

  const items = data?.items ?? [];
  const gated = data?.gated ?? (!subLoading && !isPro);
  const forYou = items.filter((it) => it.tickers.some((t) => portfolio.has(t)));
  const visible = tab === "foryou" ? forYou : items;

  const bull = items.filter((i) => i.sentiment === "bullish").length;
  const bear = items.filter((i) => i.sentiment === "bearish").length;
  const breakingCount = items.filter((i) => i.breaking).length;

  const toggleSource = (k: NewsSource) =>
    update({ newsSources: { ...settings.newsSources, [k]: !settings.newsSources[k] } });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Newspaper className="h-3 w-3 text-primary" /> Professional Newsroom
        </div>
        <div className="mt-3 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              {t("page.news.title")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("page.news.subtitle")}
            </p>
          </div>
          <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent/40">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Aktualisieren
          </button>
        </div>
      </div>

      {/* Source toggles */}
      <div className="rounded-xl border border-border bg-card/40 p-4 backdrop-blur">
        <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Filter className="h-3 w-3 text-primary" /> News-Quellen
        </div>
        <div className="flex flex-wrap gap-2">
          {NEWS_SOURCES.map((k) => {
            const on = settings.newsSources[k];
            const meta = AGENCY_META[k];
            return (
              <button
                key={k}
                onClick={() => toggleSource(k)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  on
                    ? "bg-primary/10 text-foreground ring-1 ring-primary/40"
                    : "bg-muted/40 text-muted-foreground ring-1 ring-border hover:text-foreground"
                }`}
              >
                <AgencyLogo source={k} size="xs" />
                <span>{meta.label}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-bull" : "bg-muted-foreground/40"}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Bullish" value={bull} tone="bull" />
        <Stat label="Bearish" value={bear} tone="bear" />
        <Stat label="Breaking" value={breakingCount} tone="warn" icon={<Zap className="h-3 w-3" />} />
        <Stat label="Gesamt" value={items.length} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <TabBtn active={tab === "foryou"} onClick={() => setTab("foryou")} icon={<Sparkles className="h-3.5 w-3.5" />}>
          Für dich <span className="ml-1.5 rounded bg-primary/15 px-1.5 text-[10px] num text-primary">{forYou.length}</span>
        </TabBtn>
        <TabBtn active={tab === "all"} onClick={() => setTab("all")}>
          Alle <span className="ml-1.5 rounded bg-muted px-1.5 text-[10px] num text-muted-foreground">{items.length}</span>
        </TabBtn>
      </div>

      <div className="space-y-3">
        {gated && (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-6 text-sm text-foreground">
            <div className="font-semibold mb-1">Pro- oder Elite-Tier erforderlich</div>
            <p className="text-muted-foreground">
              Der Professional Newsroom mit KI-Sentiment & Zusammenfassungen ist Teil von Apex Pro/Elite.
              {" "}
              <Link to="/preise" className="text-primary underline-offset-2 hover:underline">Plan ansehen</Link>
            </p>
          </div>
        )}
        {!gated && isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-card/50 animate-pulse" />
        ))}
        {!gated && error && <div className="rounded-xl border border-bear/40 bg-bear/10 p-4 text-sm text-bear">News konnten nicht geladen werden.</div>}
        {!isLoading && enabledSources.length === 0 && (
          <div className="rounded-xl border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
            Keine News-Quelle aktiv. Aktiviere oben mindestens eine.
          </div>
        )}
        {!isLoading && visible.length === 0 && enabledSources.length > 0 && (
          <div className="rounded-xl border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
            {tab === "foryou"
              ? "Aktuell keine News zu deinen Werten. Wechsle zu \u201EAlle\u201C f\u00fcr globale Schlagzeilen."
              : "Keine News verf\u00fcgbar."}
          </div>
        )}

        {visible.map((it) => (
          <NewsCard key={it.uuid} it={it} portfolio={portfolio} onOpen={setOpenItem} />
        ))}
      </div>
      {openItem && <ArticleModal it={openItem} portfolio={portfolio} onClose={() => setOpenItem(null)} />}
    </div>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: number; tone?: "bull" | "bear" | "warn"; icon?: React.ReactNode }) {
  const c = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "warn" ? "text-gold" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}{label}
      </div>
      <div className={`mt-1 font-mono text-2xl font-bold ${c}`}>{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}{children}
      {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
    </button>
  );
}
