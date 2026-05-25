import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { useSettings, NEWS_SOURCES, type NewsSource } from "@/lib/settings";
import { AgencyLogo } from "@/components/AgencyLogo";
import { fetchNewsSentiment, type NewsSentimentItem } from "@/lib/news-sentiment";
import { useSubscription } from "@/hooks/useSubscription";
import { useT } from "@/lib/i18n";

type Item = NewsSentimentItem & { source: NewsSource | "other" };

// Default benchmark symbols to enrich the ticker when the watchlist is small.
// Always merged in so the strip stays lively and varied.
const BENCHMARK_SYMBOLS = ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA", "META", "GOOGL", "AMZN", "BTC-USD"];

export function BreakingNewsTicker() {
  const { settings } = useSettings();
  const t = useT();
  const { isPro, loading: subLoading } = useSubscription();

  // Use ALL configured news sources by default; respect user opt-outs.
  const enabledSources = useMemo(
    () => NEWS_SOURCES.filter((k) => settings.newsSources[k]),
    [settings.newsSources],
  );

  // Merge watchlist with benchmark symbols for a fuller, more varied feed.
  const symbols = useMemo(() => {
    const wl = settings.watchlist ?? [];
    const merged = Array.from(new Set([...wl, ...BENCHMARK_SYMBOLS]));
    return merged.slice(0, 12);
  }, [settings.watchlist]);

  const { data } = useQuery({
    queryKey: ["news-ticker", symbols.join(","), enabledSources.join(",")],
    queryFn: async () => {
      // tier1Only=false → use every enabled source, not only "premium" wires.
      const res = await fetchNewsSentiment({ symbols, sources: enabledSources, tier1Only: false });
      return res.items as Item[];
    },
    refetchInterval: 60_000,
    staleTime: 45_000,
    enabled: !subLoading && isPro && enabledSources.length > 0,
  });

  // De-duplicate by uuid and normalized title, sort by recency, cap at 30.
  const items = useMemo<Item[]>(() => {
    const raw = data ?? [];
    const seenUuid = new Set<string>();
    const seenTitle = new Set<string>();
    const out: Item[] = [];
    for (const it of raw) {
      const titleKey = (it.title || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);
      if (!titleKey) continue;
      if (it.uuid && seenUuid.has(it.uuid)) continue;
      if (seenTitle.has(titleKey)) continue;
      if (it.uuid) seenUuid.add(it.uuid);
      seenTitle.add(titleKey);
      out.push(it);
    }
    out.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
    return out.slice(0, 30);
  }, [data]);

  const breaking = items.filter((i) => i.breaking);

  // Speed: scale duration with item count so density feels constant.
  // ~3 seconds per headline, clamped 25–55s.
  const animationDuration = useMemo(() => {
    const perItem = 3;
    return `${Math.max(25, Math.min(55, items.length * perItem))}s`;
  }, [items.length]);

  // Desktop toast on new breaking headline
  const seen = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  useEffect(() => {
    if (!settings.notifBreakingNews) return;
    if (!initialized.current) {
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
        action: {
          label: t("common.openOriginal"),
          onClick: () => window.open(b.link, "_blank", "noopener,noreferrer"),
        },
      });
    }
  }, [breaking, settings.notifBreakingNews, t]);

  if (items.length === 0) return null;

  return (
    <div className="border-b border-border/60 bg-card/60 backdrop-blur">
      <div className="flex items-stretch overflow-hidden">
        <div className="flex shrink-0 items-center gap-1.5 bg-bear/15 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-bear ring-1 ring-bear/30">
          <Zap className="h-3 w-3 animate-pulse" /> Live
        </div>
        <div className="group relative flex-1 overflow-hidden">
          {/* edge fades */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-card/90 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-card/90 to-transparent"
          />
          <div
            className="flex animate-ticker whitespace-nowrap py-1.5 will-change-transform group-hover:[animation-play-state:paused]"
            style={{ animationDuration }}
          >
            {[...items, ...items].map((it, i) => (
              <span
                key={`${it.uuid}-${i}`}
                className="mx-4 inline-flex items-center gap-2 text-[12px] text-foreground/90 transition-colors hover:text-primary"
              >
                <AgencyLogo source={it.source} size="xs" />
                <Link
                  to="/produkte/$symbol"
                  params={{ symbol: it.symbol }}
                  className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[10px] font-bold text-foreground hover:text-primary"
                >
                  {it.symbol}
                </Link>
                <a
                  href={it.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="max-w-[480px] truncate hover:text-primary"
                >
                  {it.title}
                </a>
                {it.breaking && (
                  <span className="rounded bg-bear/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-bear">
                    Breaking
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
