import { memo, useEffect, useMemo, useState } from "react";
import { allSessions, statusLabel, type SessionState } from "@/lib/marketHours";

/**
 * Compact, header-grade market clock strip.
 * - All times rendered through Intl.DateTimeFormat with IANA timezones.
 * - Updates every second; no flicker (only the time string and indicator change).
 * - Status: OPEN (green) · PRE-MARKET (amber) · CLOSED (muted).
 */
function MarketClockImpl() {
  const [states, setStates] = useState<SessionState[] | null>(null);

  useEffect(() => {
    const tick = () => setStates(allSessions());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const anyOpen = useMemo(() => states?.some((s) => s.isOpen) ?? false, [states]);

  if (!states) {
    return <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground h-5" />;
  }

  return (
    <div className="hidden md:flex items-center gap-3 text-[11px] font-mono tabular-nums whitespace-nowrap">
      <div className="flex items-center gap-1.5 pr-3 mr-1 border-r border-border/60">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            anyOpen ? "bg-bull tick-glow-bull animate-pulse" : "bg-muted-foreground/40"
          }`}
        />
        <span className="uppercase tracking-[0.14em] text-[10px] font-semibold text-muted-foreground">
          {anyOpen ? "Markets Live" : "All Closed"}
        </span>
      </div>
      <div className="flex items-center gap-3.5">
        {states.map((s) => (
          <MarketTile key={s.session.id} state={s} />
        ))}
      </div>
    </div>
  );
}

const MarketTile = memo(function MarketTile({ state }: { state: SessionState }) {
  const dot =
    state.status === "open"
      ? "bg-bull tick-glow-bull"
      : state.status === "pre-market"
        ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
        : "bg-muted-foreground/35";

  const label =
    state.status === "open"
      ? "text-bull"
      : state.status === "pre-market"
        ? "text-amber-400"
        : "text-muted-foreground/70";

  return (
    <div
      className="flex items-center gap-1.5"
      title={`${state.session.city} · ${state.localTime12} · ${statusLabel(state)}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${state.isOpen ? "animate-pulse" : ""}`} />
      <span className="text-foreground/90 font-semibold tracking-wide">{state.session.id}</span>
      <span className="text-foreground/70">{state.localTime}</span>
      <span className={`uppercase tracking-[0.1em] text-[9px] font-semibold ${label}`}>
        {state.status === "open" ? "OPEN" : state.status === "pre-market" ? "PRE" : "CLD"}
      </span>
    </div>
  );
});

export const MarketClock = memo(MarketClockImpl);

/**
 * Full market grid — premium hedge-fund style cards. Drop into any page:
 *   <MarketClockGrid />
 */
export const MarketClockGrid = memo(function MarketClockGrid() {
  const [states, setStates] = useState<SessionState[] | null>(null);

  useEffect(() => {
    const tick = () => setStates(allSessions());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!states) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[104px] rounded-xl border border-border/60 bg-card/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {states.map((s) => (
        <MarketCard key={s.session.id} state={s} />
      ))}
    </div>
  );
});

const MarketCard = memo(function MarketCard({ state }: { state: SessionState }) {
  const isOpen = state.status === "open";
  const isPre = state.status === "pre-market";

  const ring = isOpen
    ? "ring-1 ring-bull/30 shadow-[0_0_24px_-8px_hsl(var(--bull)/0.4)]"
    : isPre
      ? "ring-1 ring-amber-400/25"
      : "ring-1 ring-border/60";

  const dot = isOpen
    ? "bg-bull shadow-[0_0_10px_hsl(var(--bull)/0.8)]"
    : isPre
      ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
      : "bg-muted-foreground/40";

  const statusText = isOpen
    ? `${state.session.exchange} OPEN`
    : isPre
      ? "PRE-MARKET"
      : "MARKET CLOSED";

  const statusClass = isOpen
    ? "text-bull"
    : isPre
      ? "text-amber-400"
      : "text-muted-foreground";

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-xl p-4 transition-all duration-300 ${ring}`}
    >
      {isOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bull/60 to-transparent" />
      )}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {state.session.city}
          </div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold tracking-tight text-foreground">
            {state.localTime12}
          </div>
        </div>
        <span className={`mt-1 h-2 w-2 rounded-full ${dot} ${isOpen ? "animate-pulse" : ""}`} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${statusClass}`}>
          {statusText}
        </span>
        <span className="text-[10px] text-muted-foreground/70 font-mono">{state.session.tz.split("/")[1]?.replace(/_/g, " ")}</span>
      </div>
    </div>
  );
});
