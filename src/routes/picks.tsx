import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, TrendingUp, Trophy, Crown, Medal, Zap, Target, ShieldAlert, ArrowRight, Filter, RefreshCw, Search, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PRODUCTS, type Product } from "@/lib/products";
import { fetchCandles, getApiKey } from "@/lib/finnhub";
import { computeAll } from "@/lib/indicators";
import { scoreIndicators, buildDecision, stabilizeDecision, whyNow } from "@/lib/analysis";
import { detectRegime, type MarketRegime } from "@/lib/ai-learning";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { recordApexAnalysis } from "@/lib/trackrecord.functions";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";

function regimeLabel(r: MarketRegime) {
  return { bull: "Bullisch", bear: "Bärisch", chop: "Seitwärts", high_vol: "Hochvolatil", low_vol: "Ruhig" }[r];
}

export const Route = createFileRoute("/picks")({
  head: () => ({
    meta: [
      { title: "Quantm Picks — KI-Aktien-Empfehlungen" },
      { name: "description", content: "Proaktive KI-Vorschläge: Aktien & ETFs mit der höchsten Wahrscheinlichkeit auf steigende Kurse — belegt durch Z-Score, RSI, MACD, Trend & Momentum." },
      { property: "og:title", content: "Quantm Picks — KI-Aktien-Empfehlungen" },
      { property: "og:description", content: "Proaktive KI-Vorschläge: Aktien & ETFs mit der höchsten Wahrscheinlichkeit auf steigende Kurse." },
    ],
  }),
  component: PicksPage,
});

const SECTORS = ["Alle", "Technologie", "Gesundheit", "Finanzen", "Konsum", "Energie", "Industrie", "Rohstoffe", "Index"] as const;
const REGIONS = ["Alle", "US", "DE", "EU", "UK", "JP"] as const;

type Sector = (typeof SECTORS)[number];
type Region = (typeof REGIONS)[number];

function PicksPage() {
  const t = useT();
  const { user } = useAuth();
  const { settings, toggleWatch } = useSettings();
  const [sector, setSector] = useState<Sector>("Alle");
  const [region, setRegion] = useState<Region>("Alle");
  const [universe, setUniverse] = useState<"top" | "extended" | "all">("top");
  const [mode, setMode] = useState<"ki" | "browse">("ki");
  const [query, setQuery] = useState("");

  const filtered = useMemo<Product[]>(() => {
    let list = PRODUCTS;
    if (sector !== "Alle") list = list.filter((p) => p.sector === sector);
    if (region !== "Alle") list = list.filter((p) => p.region === region);
    if (mode === "browse") {
      const q = query.trim().toLowerCase();
      if (q) list = list.filter((p) => p.symbol.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
      return list;
    }
    // Tier-Scan: top = 80 liquideste · extended = 250 · all = volles Universum (~600)
    if (universe === "top") list = list.slice(0, 80);
    else if (universe === "extended") list = list.slice(0, 250);
    return list;
  }, [sector, region, universe, mode, query]);

  const candleQs = useQueries({
    queries: (mode === "ki" ? filtered : []).map((p) => ({
      queryKey: ["candles", p.symbol],
      queryFn: () => fetchCandles(p.symbol, "D", 260),
      enabled: !!getApiKey() && mode === "ki",
      staleTime: 12 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });

  // CRITICAL FIX: ein gescheiterter Request (z. B. Symbol vom Yahoo-Proxy nicht
  // gefunden, Rate-Limit, Timeout) hat den Scan-Zähler bei "loaded/total"
  // einfrieren lassen, weil nur `data` gezählt wurde. Jetzt zählen wir auch
  // erledigte Fehler als "fertig", damit der Fortschritt immer 100 % erreicht.
  const settled = candleQs.filter((q) => q.data || q.isError || (!q.isLoading && !q.isFetching)).length;
  const succeeded = candleQs.filter((q) => q.data).length;
  const failed = candleQs.filter((q) => q.isError).length;
  const pendingFeed = failed;
  const total = filtered.length;
  const loading = settled < total;
  const progress = total > 0 ? Math.round((settled / total) * 100) : 0;

  // Auto-Heal: fehlgeschlagene Symbole automatisch erneut abrufen (max. 3 Runden,
  // exponentielles Backoff), damit "ohne Daten" sich von selbst auflöst.
  const autoRetryRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (loading) return;
    const toRetry: number[] = [];
    candleQs.forEach((q, i) => {
      if (!q.isError) return;
      const sym = filtered[i]?.symbol;
      if (!sym) return;
      const n = autoRetryRef.current.get(sym) ?? 0;
      if (n >= 3) return;
      autoRetryRef.current.set(sym, n + 1);
      toRetry.push(i);
    });
    if (toRetry.length === 0) return;
    const delay = 1200 + Math.random() * 800;
    const t = setTimeout(() => {
      toRetry.forEach((i) => { candleQs[i]?.refetch?.(); });
    }, delay);
    return () => clearTimeout(t);
  }, [loading, candleQs, filtered]);



  const picks = useMemo(() => {
    type Row = {
      p: Product;
      ind: ReturnType<typeof computeAll>;
      regime: MarketRegime;
      report: ReturnType<typeof buildDecision>;
      upsidePct: number;
      score: number; // ranking
      change: number;
      last: number;
    };
    const rows: Row[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const c = candleQs[i].data;
      const p = filtered[i];
      if (!c || !c.c || c.c.length < 60) continue;
      const ind = computeAll(c.c);
      const sig = scoreIndicators(ind, settings.risk);
      const regime = detectRegime(ind);
      const raw = buildDecision(p.symbol, p.name, ind, sig, regime);
      const stable = stabilizeDecision(p.symbol, raw.decision, raw.confidence);
      const report = stable.decision === raw.decision ? raw : { ...raw, decision: stable.decision };
      if (report.decision !== "BUY") continue;
      const last = c.c.at(-1) ?? 0;
      const prev = c.c.at(-2) ?? last;
      const change = prev ? ((last - prev) / prev) * 100 : 0;
      const upsidePct = sig.target && sig.entry ? ((sig.target - sig.entry) / sig.entry) * 100 : 0;
      // Ranking: Konfidenz dominiert, Upside als Tiebreaker, Bonus für Bull-Regime
      const regimeBonus = regime === "bull" ? 5 : regime === "low_vol" ? 2 : regime === "bear" ? -8 : 0;
      const score = report.confidence + upsidePct * 0.4 + regimeBonus;
      rows.push({ p, ind, regime, report, upsidePct, score, change, last });
    }
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, 15);
  }, [candleQs, filtered, settings.risk]);

  // Persist BUY picks into the public Track Record (dedup per symbol per day).
  const recordedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (loading || picks.length === 0) return;
    if (!user) return; // requires auth — skip for guests
    const today = new Date().toISOString().slice(0, 10);
    let stored: Record<string, string> = {};
    try { stored = JSON.parse(localStorage.getItem("apex_picks_recorded") || "{}"); } catch { /* ignore */ }
    for (const row of picks) {
      const key = row.p.symbol;
      if (recordedRef.current.has(key)) continue;
      if (stored[key] === today) { recordedRef.current.add(key); continue; }
      recordedRef.current.add(key);
      stored[key] = today;
      recordApexAnalysis({
        data: {
          ticker: row.p.symbol,
          name: row.p.name,
          sector: row.p.sector ?? null,
          asset_type: "Aktie",
          verdict: "KAUF",
          confidence_score: row.report.confidence,
          price_at_analysis: row.last,
          indicators: {
            zScore: row.ind.zScore,
            rsi: row.ind.rsi,
            macdHist: row.ind.macd.histogram,
            sma50: row.ind.sma50,
            sma200: row.ind.sma200,
            volatility: row.ind.volatility,
            momentum: row.ind.momentum,
            regime: row.regime,
            upsidePct: row.upsidePct,
            source: "picks-scan",
          },
        },
      }).catch(() => { /* fire-and-forget */ });
    }
    try { localStorage.setItem("apex_picks_recorded", JSON.stringify(stored)); } catch { /* ignore */ }
  }, [loading, picks, user]);

  const podium = picks.slice(0, 3);
  const rest = picks.slice(3);

  const apiMissing = !getApiKey();

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-violet-accent/10 p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-16 h-48 w-48 rounded-full bg-violet-accent/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3 w-3" /> Quantm AI Picks
            </div>
            <h1 className="mt-3 font-display text-2xl md:text-3xl font-bold tracking-tight">
              {t("page.picks.title")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("page.picks.subtitle")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Scan-Universum</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-primary">{total}</div>
            <div className="text-[11px] text-muted-foreground">{picks.length} BUY-Kandidaten</div>
          </div>
        </div>
      </header>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filter:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SECTORS.map((s) => (
            <button key={s} onClick={() => setSector(s)} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${sector === s ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-accent/40"}`}>{s}</button>
          ))}
        </div>
        <div className="mx-2 h-4 w-px bg-border" />
        <div className="flex flex-wrap gap-1.5">
          {REGIONS.map((r) => (
            <button key={r} onClick={() => setRegion(r)} className={`rounded-md border px-2.5 py-1 text-xs ${region === r ? "border-primary text-primary" : "border-border hover:bg-accent/40"}`}>{r}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Umfang:</span>
          {(["top", "extended", "all"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUniverse(u)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${universe === u ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-accent/40"}`}
            >
              {u === "top" ? "Top 80" : u === "extended" ? "Erweitert 250" : `Vollständig (${PRODUCTS.length})`}
            </button>
          ))}
        </div>
      </div>

      {apiMissing && (
        <Card className="border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          API-Key für Marktdaten fehlt. Hinterlege ihn in den <Link to="/einstellungen" className="text-primary underline">Einstellungen</Link>.
        </Card>
      )}

      {loading && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Scan läuft — {settled}/{total} verarbeitet
              {pendingFeed > 0 && <span className="text-amber-500">· {pendingFeed} warten auf Datenfeed</span>}
            </span>
            <span className="font-mono tabular-nums">{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-to-r from-primary to-violet-accent transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Berechnung läuft lokal (Z-Score, RSI, MACD, Trend, Sharpe) — verbraucht <span className="text-foreground font-semibold">keine AI-Credits</span>, nur Marktdaten-Abrufe.
          </p>
        </div>
      )}

      {!loading && pendingFeed > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-muted-foreground">
          {succeeded} von {total} Werten erfolgreich analysiert · {pendingFeed} Werte werden beim nächsten Scan automatisch erneut abgefragt.
        </div>
      )}


      {!loading && picks.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Aktuell keine BUY-Kandidaten in diesem Filter — die KI bleibt diszipliniert und schlägt nur vor, wenn die Konfidenz ≥ 60 % ist.
        </Card>
      )}

      {/* Podium Top 3 */}
      {podium.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold" />
            <h2 className="font-display text-lg font-semibold tracking-tight">Top 3 — Höchste Aufwärts-Wahrscheinlichkeit</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {podium.map((row, idx) => (
              <PodiumCard key={row.p.symbol} row={row} rank={idx + 1} watched={settings.watchlist.includes(row.p.symbol)} onToggleWatch={() => toggleWatch(row.p.symbol)} />
            ))}
          </div>
        </section>
      )}

      {/* Weitere Picks */}
      {rest.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-bull" />
            <h2 className="font-display text-lg font-semibold tracking-tight">Weitere starke Kandidaten</h2>
            <span className="text-xs text-muted-foreground">({rest.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rest.map((row, idx) => (
              <PickRow key={row.p.symbol} row={row} rank={idx + 4} watched={settings.watchlist.includes(row.p.symbol)} onToggleWatch={() => toggleWatch(row.p.symbol)} />
            ))}
          </div>
        </section>
      )}

      <Card className="border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
        <p><span className="font-semibold text-foreground">Wie ranken wir?</span> Adjustierte Konfidenz (regime- &amp; smart-money-gefiltert) + erwartetes Upside zum Kursziel (Gewicht 0,4) + Regime-Bonus. Nur Werte mit BUY-Decision &amp; ≥ 60 % Konfidenz erscheinen.</p>
        <p><span className="font-semibold text-foreground">Kein Hype, nur Statistik.</span> Z-Score, RSI, MACD-Histogramm, SMA50/200, Momentum &amp; Sharpe — pro Pick einsehbar.</p>
      </Card>
    </div>
  );
}

type PickRowData = {
  p: Product;
  ind: ReturnType<typeof computeAll>;
  regime: MarketRegime;
  report: ReturnType<typeof buildDecision>;
  upsidePct: number;
  score: number;
  change: number;
  last: number;
};

function PodiumCard({ row, rank, watched, onToggleWatch }: { row: PickRowData; rank: number; watched: boolean; onToggleWatch: () => void }) {
  const { p, ind, regime, report, upsidePct, change, last } = row;
  const sig = scoreIndicators(ind);
  const trigger = whyNow(ind, sig);
  const RankIcon = rank === 1 ? Crown : rank === 2 ? Trophy : Medal;
  const rankColor = rank === 1 ? "text-gold" : rank === 2 ? "text-zinc-300" : "text-amber-600";
  const rankRing = rank === 1 ? "border-gold/40 from-gold/15" : rank === 2 ? "border-zinc-400/30 from-zinc-400/10" : "border-amber-600/30 from-amber-600/10";

  return (
    <Card className={`relative overflow-hidden border bg-gradient-to-br ${rankRing} via-card to-card p-5`}>
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-bull/10 blur-2xl`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background/60 ring-1 ring-border ${rankColor}`}>
            <RankIcon className="h-5 w-5" />
          </div>
          <span className="rounded-md border border-bull/40 bg-bull/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bull">BUY</span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-bold">{p.symbol}</span>
            <span className={`font-mono text-xs tabular-nums ${change >= 0 ? "text-bull" : "text-bear"}`}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>
          </div>
          <div className="truncate text-xs text-muted-foreground">{p.name} · {p.sector}</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-background/40 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Konfidenz</div>
            <div className="font-mono text-xl font-bold text-primary tabular-nums">{report.confidence}%</div>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Upside</div>
            <div className="font-mono text-xl font-bold text-bull tabular-nums">+{upsidePct.toFixed(1)}%</div>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-1.5 rounded-md border border-bull/20 bg-bull/5 p-2 text-[11px] leading-snug text-bull/90">
          <Zap className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{trigger}</span>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[10px]">
          <MiniStat label="Z" value={ind.zScore.toFixed(2)} tone={Math.abs(ind.zScore) > 1.5 ? "warn" : "neutral"} />
          <MiniStat label="RSI" value={ind.rsi.toFixed(0)} tone={ind.rsi < 30 ? "bull" : ind.rsi > 70 ? "warn" : "neutral"} />
          <MiniStat label="Vola" value={`${(ind.volatility * 100).toFixed(0)}%`} tone={ind.volatility > 0.5 ? "warn" : "neutral"} />
          <MiniStat label="Regime" value={regimeLabel(regime).slice(0, 5)} tone={regime === "bull" ? "bull" : regime === "bear" ? "warn" : "neutral"} />
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Kurs <span className="font-mono text-foreground">{last.toFixed(2)}</span></span>
          <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Ziel <span className="font-mono text-foreground">{report ? (last * (1 + upsidePct / 100)).toFixed(2) : "-"}</span></span>
        </div>

        <div className="mt-4 flex gap-2">
          <Button asChild size="sm" className="flex-1 h-8 text-xs">
            <Link to="/produkte/$symbol" params={{ symbol: p.symbol }}>
              Vollanalyse <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
          <Button size="sm" variant={watched ? "secondary" : "outline"} onClick={onToggleWatch} className="h-8 text-xs">
            {watched ? "Beobachtet" : "+ Watchlist"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PickRow({ row, rank, watched, onToggleWatch }: { row: PickRowData; rank: number; watched: boolean; onToggleWatch: () => void }) {
  const { p, ind, regime, report, upsidePct, change, last } = row;
  const sig = scoreIndicators(ind);
  const trigger = whyNow(ind, sig);

  return (
    <Card className="group relative overflow-hidden border-border bg-card p-4 hover:border-primary/40 transition">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 font-mono text-xs font-bold text-muted-foreground">
          #{rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">{p.symbol}</span>
            <span className="rounded border border-bull/40 bg-bull/10 px-1.5 py-0.5 text-[9px] font-bold text-bull">BUY</span>
            <span className={`font-mono text-xs tabular-nums ${change >= 0 ? "text-bull" : "text-bear"}`}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>
          </div>
          <div className="truncate text-xs text-muted-foreground">{p.name} · {p.sector} · {regimeLabel(regime)}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-bold text-primary tabular-nums leading-none">{report.confidence}%</div>
          <div className="font-mono text-[10px] text-bull tabular-nums">+{upsidePct.toFixed(1)}% Upside</div>
        </div>
      </div>

      <div className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-bull/90">
        <Zap className="mt-0.5 h-3 w-3 shrink-0" />
        <span className="truncate">{trigger}</span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <div className="flex gap-3 font-mono tabular-nums">
          <span>Z <span className="text-foreground">{ind.zScore.toFixed(2)}</span></span>
          <span>RSI <span className="text-foreground">{ind.rsi.toFixed(0)}</span></span>
          <span>MACD <span className={ind.macd.histogram >= 0 ? "text-bull" : "text-bear"}>{ind.macd.histogram >= 0 ? "+" : ""}{ind.macd.histogram.toFixed(2)}</span></span>
          <span>{last.toFixed(2)}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onToggleWatch} className={`rounded border px-2 py-0.5 text-[10px] transition ${watched ? "border-primary/40 text-primary" : "border-border hover:bg-accent/40"}`}>
            {watched ? "✓ WL" : "+ WL"}
          </button>
          <Link to="/produkte/$symbol" params={{ symbol: p.symbol }} className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20">
            Analyse →
          </Link>
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "bull" | "warn" | "neutral" }) {
  const cls = tone === "bull" ? "text-bull" : tone === "warn" ? "text-amber-500" : "text-foreground";
  return (
    <div className="rounded border border-border bg-background/30 px-1 py-1">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono text-xs font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
