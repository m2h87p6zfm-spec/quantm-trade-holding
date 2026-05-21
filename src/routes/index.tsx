import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, X } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { getApiKey } from "@/lib/finnhub";
import { useAnalysis } from "@/lib/useMarketData";
import { scoreIndicators } from "@/lib/analysis";
import { SignalBadge } from "@/components/SignalBadge";
import { Sparkline } from "@/components/Sparkline";
import { findProduct } from "@/lib/products";

export const Route = createFileRoute("/")({ component: Watchlist });

function Row({ symbol }: { symbol: string }) {
  const product = findProduct(symbol);
  const { indicators, candles } = useAnalysis(symbol);
  const { toggleWatch, settings } = useSettings();
  const sig = indicators ? scoreIndicators(indicators, settings.risk) : null;
  const closes = candles.data?.c ?? [];
  const last = closes.at(-1) ?? indicators?.price ?? 0;
  const prev = closes.at(-2) ?? last;
  const abs = last - prev;
  const change = prev ? (abs / prev) * 100 : 0;
  const price = indicators?.price ?? last;

  return (
    <Link to="/produkte/$symbol" params={{ symbol }} className="grid grid-cols-12 items-center gap-2 border-b border-border px-4 py-3 hover:bg-accent/40 transition-colors">
      <div className="col-span-3 flex items-center gap-2">
        <button onClick={(e) => { e.preventDefault(); toggleWatch(symbol); }} className="text-primary hover:scale-110 transition" aria-label="Entfernen">
          <X className="h-3.5 w-3.5" />
        </button>
        <div>
          <div className="font-semibold text-sm">{symbol}</div>
          <div className="text-[11px] text-muted-foreground">{product?.name ?? "Freier Ticker"}</div>
        </div>
      </div>
      <div className="col-span-2 font-mono text-sm tabular-nums">{price ? price.toFixed(2) : "—"}</div>
      <div className={`col-span-2 font-mono text-sm tabular-nums ${change >= 0 ? "text-bull" : "text-bear"}`}>
        {change >= 0 ? "+" : ""}{change.toFixed(2)}% <span className="text-muted-foreground">({abs >= 0 ? "+" : ""}{abs.toFixed(2)})</span>
      </div>
      <div className="col-span-2">
        <Sparkline data={(candles.data?.c ?? []).slice(-30)} up={change >= 0} />
      </div>
      <div className="col-span-3 flex justify-end">
        {sig ? <SignalBadge verdict={sig.verdict} confidence={sig.confidence} /> : <span className="text-xs text-muted-foreground">{candles.isLoading ? "lädt…" : candles.error ? "Fehler" : "—"}</span>}
      </div>
    </Link>
  );
}

function Watchlist() {
  const { settings } = useSettings();
  const hasKey = typeof window !== "undefined" && !!getApiKey();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
          <p className="text-sm text-muted-foreground">Live-Kurse, statistische Signale und Trendverlauf — alles in Echtzeit.</p>
        </div>
        <Link to="/produkte" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5">
          <Star className="h-4 w-4" /> Produkte hinzufügen
        </Link>
      </div>

      {!hasKey && (
        <div className="rounded-lg border border-bear/40 bg-bear/10 p-4 text-sm">
          <strong className="text-bear">Kein API-Key konfiguriert.</strong> Öffne <Link to="/einstellungen" className="underline">Einstellungen</Link> und hinterlege deinen Finnhub-API-Key, um Echtzeit-Daten zu laden.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-3">Symbol</div>
          <div className="col-span-2">Kurs</div>
          <div className="col-span-2">Tag Δ</div>
          <div className="col-span-2">30T Trend</div>
          <div className="col-span-3 text-right">Signal</div>
        </div>
        {settings.watchlist.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Watchlist ist leer. Füge Produkte aus dem Katalog hinzu.</div>
        ) : (
          settings.watchlist.map((s) => <Row key={s} symbol={s} />)
        )}
      </div>
    </div>
  );
}
