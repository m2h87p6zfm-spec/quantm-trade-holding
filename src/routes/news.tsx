import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/lib/settings";
import { Newspaper, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/news")({ component: NewsPage });

type Item = {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
  symbol: string;
  sentiment?: "bullish" | "bearish" | "neutral";
  score?: number;
};

async function fetchNews(symbols: string[]): Promise<Item[]> {
  const res = await fetch("/api/public/news-sentiment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
  });
  if (!res.ok) throw new Error("News fehlgeschlagen");
  const json = (await res.json()) as { items: Item[] };
  return json.items ?? [];
}

function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} h`;
  const d = Math.floor(h / 24);
  return `vor ${d} T`;
}

function SentimentBadge({ s, c }: { s?: Item["sentiment"]; c?: number }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider";
  if (s === "bullish") return <span className={`${base} bg-bull/20 text-bull ring-1 ring-bull/40`}><TrendingUp className="h-3 w-3" /> Bullish {c ? `· ${Math.round(c * 100)}%` : ""}</span>;
  if (s === "bearish") return <span className={`${base} bg-bear/20 text-bear ring-1 ring-bear/40`}><TrendingDown className="h-3 w-3" /> Bearish {c ? `· ${Math.round(c * 100)}%` : ""}</span>;
  return <span className={`${base} bg-muted text-muted-foreground ring-1 ring-border`}><Minus className="h-3 w-3" /> Neutral</span>;
}

function NewsPage() {
  const { settings } = useSettings();
  const symbols = settings.watchlist.length > 0 ? settings.watchlist : ["AAPL", "NVDA", "TSLA", "SPY", "MSFT"];

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["news", symbols.join(",")],
    queryFn: () => fetchNews(symbols.slice(0, 8)),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const items = data ?? [];
  const bull = items.filter((i) => i.sentiment === "bullish").length;
  const bear = items.filter((i) => i.sentiment === "bearish").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Newspaper className="h-3 w-3 text-primary" /> AI News Desk
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              News mit <span className="text-gradient-primary">KI-Sentiment</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Live-Schlagzeilen zu deiner Watchlist, klassifiziert nach Marktwirkung.
            </p>
          </div>
          <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent/40">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Aktualisieren
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card-glow rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Bullish</div>
          <div className="mt-1 font-mono text-2xl font-bold text-bull">{bull}</div>
        </div>
        <div className="card-glow rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Bearish</div>
          <div className="mt-1 font-mono text-2xl font-bold text-bear">{bear}</div>
        </div>
        <div className="card-glow rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Gesamt</div>
          <div className="mt-1 font-mono text-2xl font-bold">{items.length}</div>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-card/50 animate-pulse" />
        ))}
        {error && <div className="rounded-xl border border-bear/40 bg-bear/10 p-4 text-sm text-bear">News konnten nicht geladen werden.</div>}
        {!isLoading && items.length === 0 && !error && (
          <div className="rounded-xl border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
            Keine News verfügbar.
          </div>
        )}
        {items.map((it) => (
          <a key={it.uuid} href={it.link} target="_blank" rel="noopener noreferrer"
            className="group block rounded-xl border border-border bg-card/60 p-4 backdrop-blur transition hover:border-primary/50 hover:shadow-lg animate-fade-up">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Link to="/produkte/$symbol" params={{ symbol: it.symbol }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono font-semibold text-foreground hover:text-primary">
                    {it.symbol}
                  </Link>
                  <span>·</span>
                  <span>{it.publisher}</span>
                  <span>·</span>
                  <span>{timeAgo(it.publishedAt)}</span>
                </div>
                <h3 className="mt-1.5 text-sm font-semibold leading-snug group-hover:text-primary">{it.title}</h3>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <SentimentBadge s={it.sentiment} c={it.score} />
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
