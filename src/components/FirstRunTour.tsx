import { useEffect, useLayoutEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTradingProfile } from "@/hooks/use-trading-profile";

const TOUR_KEY = "qt.tour.v1.done";

type Step = {
  target: string; // data-tour value
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    target: "watchlist",
    title: "Watchlist & Cockpit",
    body: "Dein Startbildschirm. Live-Kurse, Sentiment und KI-Signale für deine Werte.",
  },
  {
    target: "picks",
    title: "Quantm Picks",
    body: "Tägliche, KI-kuratierte Trade-Ideen mit Score, Begründung und Risiko.",
  },
  {
    target: "analyse",
    title: "Aktienanalyse-Agent",
    body: "Stelle Fragen zu jeder Aktie – RSI, MACD, Bollinger, Monte Carlo, alles erklärt.",
  },
  {
    target: "portfolio",
    title: "Portfolio",
    body: "Trage deine Positionen ein. Erhalte Risiko-Analyse und Allokations-Hinweise.",
  },
  {
    target: "alerts",
    title: "Alerts",
    body: "Lass dich benachrichtigen, sobald Setups, Levels oder Signale eintreten.",
  },
  {
    target: "more",
    title: "Mehr Tools",
    body: "News, Kalender, Markt-Radar, Global Intel & Methodik – alles dahinter.",
  },
  {
    target: "settings",
    title: "Einstellungen",
    body: "Sprache, Light/Dark/Auto-Theme und alle Präferenzen – jederzeit anpassbar.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function findRect(target: string): { rect: Rect; el: HTMLElement } | null {
  if (typeof document === "undefined") return null;
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`),
  );
  const visible = candidates.find((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = window.getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  });
  if (!visible) return null;
  const r = visible.getBoundingClientRect();
  return {
    el: visible,
    rect: { top: r.top, left: r.left, width: r.width, height: r.height },
  };
}

export function FirstRunTour() {
  const { user, loading } = useAuth();
  const { profile, loading: profLoading } = useTradingProfile();
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [hit, setHit] = useState<{ rect: Rect; el: HTMLElement } | null>(null);

  // Decide whether to start the tour
  useEffect(() => {
    if (loading || profLoading) return;
    if (!user) return;
    if (!profile?.onboarding_completed) return;
    try {
      if (localStorage.getItem(TOUR_KEY)) return;
    } catch {
      return;
    }
    // Delay so the app shell has time to mount
    const t = window.setTimeout(() => setRunning(true), 600);
    return () => window.clearTimeout(t);
  }, [user, loading, profile?.onboarding_completed, profLoading]);

  // Lock body scroll while running
  useEffect(() => {
    if (!running) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [running]);

  // Recompute target rect on step, resize, scroll
  useLayoutEffect(() => {
    if (!running) return;
    const update = () => {
      const target = STEPS[step]?.target;
      if (!target) return;
      const found = findRect(target);
      setHit(found);
      if (found) {
        found.el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    };
    update();
    const t = window.setTimeout(update, 120);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [running, step]);

  function finish() {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* ignore */
    }
    setRunning(false);
  }

  function next() {
    if (step >= STEPS.length - 1) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  }

  if (!running) return null;

  const current = STEPS[step];
  const pad = 8;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;

  // Tooltip placement: prefer placing near the highlighted element.
  let tooltipStyle: React.CSSProperties = {};
  if (hit) {
    const rect = hit.rect;
    const tooltipWidth = Math.min(340, window.innerWidth - 24);
    const tooltipHeight = 200;
    const spaceBelow = window.innerHeight - (rect.top + rect.height);
    const placeAbove = spaceBelow < tooltipHeight + 20 && rect.top > tooltipHeight + 20;

    let top = placeAbove ? rect.top - tooltipHeight - 14 : rect.top + rect.height + 14;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    // Clamp to viewport
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));
    top = Math.max(12, Math.min(top, window.innerHeight - tooltipHeight - 12));

    tooltipStyle = { top, left, width: tooltipWidth };
  } else {
    // Center fallback
    tooltipStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: Math.min(340, (typeof window !== "undefined" ? window.innerWidth : 360) - 24),
    };
  }

  // Spotlight via SVG mask
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App-Einführung"
      className="fixed inset-0 z-[200] pointer-events-auto"
    >
      {/* Backdrop with spotlight hole */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="none"
      >
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width={vw} height={vh} fill="white" />
            {hit && (
              <rect
                x={Math.max(0, hit.rect.left - pad)}
                y={Math.max(0, hit.rect.top - pad)}
                width={hit.rect.width + pad * 2}
                height={hit.rect.height + pad * 2}
                rx={12}
                ry={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={vw}
          height={vh}
          fill="rgba(0,0,0,0.72)"
          mask="url(#tour-mask)"
        />
        {hit && (
          <rect
            x={Math.max(0, hit.rect.left - pad)}
            y={Math.max(0, hit.rect.top - pad)}
            width={hit.rect.width + pad * 2}
            height={hit.rect.height + pad * 2}
            rx={12}
            ry={12}
            fill="none"
            stroke="color-mix(in oklab, var(--bull) 90%, white)"
            strokeWidth={2}
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Tooltip card */}
      <div
        style={tooltipStyle}
        className="absolute rounded-2xl border border-border bg-card text-card-foreground shadow-2xl p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-bull">
            Schritt {step + 1} / {STEPS.length}
          </div>
          <button
            type="button"
            onClick={finish}
            aria-label="Tour schließen"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <h3 className="mt-2 text-lg font-semibold text-foreground">{current.title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{current.body}</p>

        {!hit && (
          <p className="mt-2 text-[11px] text-muted-foreground/80">
            {isMobile
              ? 'Tipp: Tippe unten auf "Mehr", um alle Bereiche zu sehen.'
              : "Hinweis: Element nicht sichtbar – klicke auf Weiter."}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={finish}
            className="text-[12px] text-muted-foreground hover:text-foreground"
          >
            Überspringen
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground/80 hover:text-foreground"
              >
                Zurück
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-lg bg-bull px-3.5 py-2 text-xs font-semibold text-background hover:bg-bull/90"
            >
              {step === STEPS.length - 1 ? "Fertig" : "Weiter"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
