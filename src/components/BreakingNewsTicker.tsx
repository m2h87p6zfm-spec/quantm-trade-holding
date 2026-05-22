import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { useSettings, NEWS_SOURCES, type NewsSource } from "@/lib/settings";
import { AgencyLogo } from "@/components/AgencyLogo";

type Item = {
  uuid: string;
  title: string;
  publisher: string;
  source: NewsSource | "other";
  link: string;
  publishedAt: number;
  symbol: string;
  tickers: string[];
  breaking?: boolean;
};

async function fetchBreaking(symbols: string[], sources: NewsSource[]): Promise<Item[]> {
  if (symbols.length === 0) return [];
  const res = await fetch("/api/public/news-sentiment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols, sources, tier1Only: true }),
  });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.items ?? []) as Item[];
}

export function BreakingNewsTicker() {
  const { settings } = useSettings();
  const enabledSources = useMemo(
    () => NEWS_SOURCES.filter((k) => settings.newsSources[k]),
    [settings.newsSources]
  );
  const symbols = useMemo(
    () => (settings.watchlist.length > 0 ? settings.watchlist : ["AAPL", "MSFT", "NVDA", "SPY", "TSLA"]).slice(0, 8),
    [settings.watchlist]
  );

  const { data } = useQuery({
    queryKey: ["news-ticker", symbols.join(","), enabledSources.join(",")],
    queryFn: () => fetchBreaking(symbols, enabledSources),
    refetchInterval: 60_000,
    staleTime: 45_000,
    enabled: enabledSources.length > 0,
  });

  const items = (data ?? []).slice(0, 20);
  const breaking = items.filter((i) => i.breaking);
  const marquee = items.length > 0 ? items : [];

  // Desktop toast on new breaking headline
  const seen = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  useEffect(() => {
    if (!settings.notifBreakingNews) return;
    if (!initialized.current) {
      // Mark all current items as seen on first load (no spam on mount)
      breaking.forEach((b) => seen.current.add(b.uuid));
      initialized.current = true;
      return;
    }
    for (const b of breaking) {
      if (seen.current.has(b.uuid)) continue;
      seen.current.add(b.uuid);
      toast(`${b.publisher} · ${b.symbol}`, {
        description: b.title,
        duration: 8000,
        action: { label: "Öffnen", onClick: () => window.open(b.link, "_blank", "noopener,noreferrer") },
      });
    }
  }, [breaking, settings.notifBreakingNews]);

  if (marquee.length === 0) return null;

  return (
    <div className="border-b border-border/60 bg-card/60 backdrop-blur">
      <div className="flex items-stretch overflow-hidden">
        <div className="flex shrink-0 items-center gap-1.5 bg-bear/15 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-bear ring-1 ring-bear/30">
          <Zap className="h-3 w-3 animate-pulse" /> Live
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="flex animate-ticker whitespace-nowrap py-1.5 will-change-transform" style={{ animationDuration: "90s" }}>
            {[...marquee, ...marquee].map((it, i) => (
              <a
                key={`${it.uuid}-${i}`}
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-4 inline-flex items-center gap-2 text-[12px] text-foreground/90 hover:text-primary transition-colors"
              >
                <AgencyLogo source={it.source} size="xs" />
                <Link
                  to="/produkte/$symbol"
                  params={{ symbol: it.symbol }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[10px] font-bold text-foreground hover:text-primary"
                >
                  {it.symbol}
                </Link>
                <span className="truncate max-w-[480px]">{it.title}</span>
                {it.breaking && (
                  <span className="rounded bg-bear/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-bear">Breaking</span>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
