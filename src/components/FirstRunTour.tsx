import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  ListOrdered,
  MoreHorizontal,
  Rocket,
  Settings as SettingsIcon,
  Sigma,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTradingProfile } from "@/hooks/use-trading-profile";

const TOUR_KEY = "qt.tour.v1.done";

type Step = {
  target: string; // value of data-tour="..."
  icon: typeof Sparkles;
  title: string;
  body: string;
  tip: string;
};

const STEPS: Step[] = [
  {
    target: "watchlist",
    icon: ListOrdered,
    title: "Watchlist & Cockpit",
    body: "Dein Startbildschirm. Live-Kurse, Sentiment-Verteilung und KI-Signale für alle deine beobachteten Werte auf einen Blick.",
    tip: "Trading-Tipp: Lege hier nur 8-12 Werte ab, die du wirklich verstehst - Qualität schlägt Quantität.",
  },
  {
    target: "picks",
    icon: Sparkles,
    title: "Quantm Picks",
    body: "Täglich KI-kuratierte Trade-Ideen mit Score, Confidence, Begründung und Risiko-Profil. Long und Short.",
    tip: "Trading-Tipp: Filtere nach Confidence > 70 % und prüfe immer Score + Begründung, bevor du eine Position aufbaust.",
  },
  {
    target: "analyse",
    icon: Sigma,
    title: "Aktienanalyse-Agent",
    body: "Frage natürlichsprachlich zu jeder Aktie: RSI, MACD, Bollinger, Z-Score, Monte-Carlo-Verteilung und Broker-Konsens.",
    tip: 'Trading-Tipp: Frage gezielt nach "Setup, Risk/Reward und Invalidation" - das spart Stunden Recherche.',
  },
  {
    target: "portfolio",
    icon: Wallet,
    title: "Portfolio",
    body: "Trage deine Positionen ein und erhalte Allokation, Konzentrationsrisiko, Beta zum S&P und automatische Re-Bewertung.",
    tip: "Trading-Tipp: Halte Einzelpositionen unter 10 % - das schützt dich vor Single-Stock-Events.",
  },
  {
    target: "alerts",
    icon: Bell,
    title: "Alerts",
    body: "Trigger auf Preis, RSI, Volumen oder KI-Signale. Push direkt aufs Gerät, sobald dein Setup eintritt.",
    tip: "Trading-Tipp: Setze Alerts auf deine Invalidation-Level - nicht nur auf Einstiege.",
  },
  {
    target: "more",
    icon: MoreHorizontal,
    title: "Mehr Tools",
    body: "News, Wirtschaftskalender, Markt-Radar, Global Intel, Heatmaps und Methodik - die ganze Tiefe der Plattform.",
    tip: "Trading-Tipp: Checke vor jedem Trade den Kalender - CPI, FOMC und Earnings verändern alles.",
  },
  {
    target: "settings",
    icon: SettingsIcon,
    title: "Einstellungen",
    body: "Sprache, Theme (Light / Dark / Auto), Benachrichtigungen und Risiko-Profil - alles jederzeit anpassbar.",
    tip: "Trading-Tipp: Stelle dein Risiko-Profil ehrlich ein - die KI gewichtet ihre Picks danach.",
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
  const [done, setDone] = useState(false);

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
    const t = window.setTimeout(() => setRunning(true), 600);
    return () => window.clearTimeout(t);
  }, [user, loading, profile?.onboarding_completed, profLoading]);

  // Lock body scroll while running
  useEffect(() => {
    if (!running && !done) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [running, done]);

  // Recompute target rect on step, resize, scroll
  useLayoutEffect(() => {
    if (!running) return;
    const update = () => {
      const target = STEPS[step]?.target;
      if (!target) return;
      const found = findRect(target);
      setHit(found);
      if (found) {
        found.el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }
    };
    update();
    const t1 = window.setTimeout(update, 120);
    const t2 = window.setTimeout(update, 400);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [running, step]);

  function persist() {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function skip() {
    persist();
    setRunning(false);
    setDone(false);
  }

  function next() {
    if (step >= STEPS.length - 1) {
      persist();
      setRunning(false);
      setDone(true);
      return;
    }
    setStep((s) => s + 1);
  }

  function closeSuccess() {
    setDone(false);
  }

  // SUCCESS MODAL ------------------------------------------------------------
  if (done) {
    return <SuccessModal onClose={closeSuccess} />;
  }

  if (!running) return null;

  const current = STEPS[step];
  const pad = 10;

  // Tooltip placement
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const isMobile = vw < 1024;
  const tooltipWidth = Math.min(360, vw - 24);
  const tooltipHeight = 240;

  type Placement = "top" | "bottom" | "left" | "right" | "center";
  let placement: Placement = "bottom";
  let tooltipStyle: React.CSSProperties = {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: tooltipWidth,
  };
  let arrowStyle: React.CSSProperties | null = null;

  if (hit) {
    const r = hit.rect;
    const spaceBelow = vh - (r.top + r.height);
    const spaceAbove = r.top;
    const spaceRight = vw - (r.left + r.width);
    const spaceLeft = r.left;

    if (!isMobile && spaceRight >= tooltipWidth + 32) placement = "right";
    else if (!isMobile && spaceLeft >= tooltipWidth + 32) placement = "left";
    else if (spaceBelow >= tooltipHeight + 24) placement = "bottom";
    else if (spaceAbove >= tooltipHeight + 24) placement = "top";
    else placement = "center";

    let top = 0;
    let left = 0;

    if (placement === "bottom") {
      top = r.top + r.height + 18;
      left = r.left + r.width / 2 - tooltipWidth / 2;
    } else if (placement === "top") {
      top = r.top - tooltipHeight - 18;
      left = r.left + r.width / 2 - tooltipWidth / 2;
    } else if (placement === "right") {
      top = r.top + r.height / 2 - tooltipHeight / 2;
      left = r.left + r.width + 18;
    } else if (placement === "left") {
      top = r.top + r.height / 2 - tooltipHeight / 2;
      left = r.left - tooltipWidth - 18;
    }

    if (placement !== "center") {
      left = Math.max(12, Math.min(left, vw - tooltipWidth - 12));
      top = Math.max(12, Math.min(top, vh - tooltipHeight - 12));
      tooltipStyle = { top, left, width: tooltipWidth, transform: "none" };

      // Arrow points from tooltip edge toward the spotlight center
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (placement === "bottom") {
        arrowStyle = {
          top: -8,
          left: Math.max(16, Math.min(cx - left - 8, tooltipWidth - 24)),
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderBottom: "8px solid var(--card)",
        };
      } else if (placement === "top") {
        arrowStyle = {
          bottom: -8,
          left: Math.max(16, Math.min(cx - left - 8, tooltipWidth - 24)),
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "8px solid var(--card)",
        };
      } else if (placement === "right") {
        arrowStyle = {
          left: -8,
          top: Math.max(16, Math.min(cy - top - 8, tooltipHeight - 24)),
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          borderRight: "8px solid var(--card)",
        };
      } else if (placement === "left") {
        arrowStyle = {
          right: -8,
          top: Math.max(16, Math.min(cy - top - 8, tooltipHeight - 24)),
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          borderLeft: "8px solid var(--card)",
        };
      }
    }
  }

  const Icon = current.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App-Einführung"
      className="fixed inset-0 z-[200]"
      style={{ pointerEvents: "auto" }}
    >
      {/* Backdrop with spotlight hole (SVG mask) */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="none"
        aria-hidden
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
                rx={14}
                ry={14}
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
          fill="rgba(0,0,0,0.75)"
          mask="url(#tour-mask)"
          style={{ transition: "all 300ms ease" }}
        />
        {hit && (
          <g style={{ transition: "all 300ms ease" }}>
            <rect
              x={Math.max(0, hit.rect.left - pad)}
              y={Math.max(0, hit.rect.top - pad)}
              width={hit.rect.width + pad * 2}
              height={hit.rect.height + pad * 2}
              rx={14}
              ry={14}
              fill="none"
              stroke="var(--bull)"
              strokeWidth={2}
              className="tour-spotlight-pulse"
            />
          </g>
        )}
      </svg>

      {/* Tooltip card */}
      <div
        style={tooltipStyle}
        className="absolute rounded-2xl border border-border bg-card text-card-foreground shadow-2xl animate-fade-in"
      >
        {arrowStyle && (
          <span
            aria-hidden
            className="absolute h-0 w-0"
            style={arrowStyle}
          />
        )}
        <div className="flex items-start gap-3 p-5 pb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bull/30 bg-bull/10">
            <Icon className="h-5 w-5 text-bull" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-bull">
              Schritt {step + 1} von {STEPS.length}
            </div>
            <h3 className="mt-1 text-lg font-semibold leading-tight text-foreground">
              {current.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={skip}
            aria-label="Tour überspringen"
            className="-mr-1 -mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {current.body}
          </p>
          <div className="mt-3 rounded-lg border border-bull/20 bg-bull/[0.06] px-3 py-2 text-[12px] leading-snug text-foreground/90">
            <span className="font-semibold text-bull">💡 </span>
            {current.tip}
          </div>
        </div>

        {/* progress bar */}
        <div className="mt-4 px-5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-bull transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 p-5 pt-4">
          <button
            type="button"
            onClick={skip}
            className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            Überspringen
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground/80 transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Zurück
            </button>
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-lg bg-bull px-3.5 py-2 text-xs font-semibold text-background transition hover:bg-bull/90"
            >
              {step === STEPS.length - 1 ? "Tour abschließen" : "Weiter"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .tour-spotlight-pulse {
          filter: drop-shadow(0 0 12px color-mix(in oklab, var(--bull) 70%, transparent));
          animation: tour-spot-pulse 1.8s ease-in-out infinite;
        }
        @keyframes tour-spot-pulse {
          0%, 100% {
            opacity: 1;
            filter: drop-shadow(0 0 6px color-mix(in oklab, var(--bull) 55%, transparent));
          }
          50% {
            opacity: 0.85;
            filter: drop-shadow(0 0 18px color-mix(in oklab, var(--bull) 90%, transparent));
          }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Success modal with lightweight confetti
// ─────────────────────────────────────────────────────────────────────────────
function SuccessModal({ onClose }: { onClose: () => void }) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.6 + Math.random() * 1.4,
        rotate: Math.random() * 360,
        color: [
          "var(--bull)",
          "color-mix(in oklab, var(--bull) 60%, white)",
          "var(--primary)",
          "#fbbf24",
          "#f472b6",
        ][i % 5],
        size: 6 + Math.random() * 6,
      })),
    [],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tour abgeschlossen"
      className="fixed inset-0 z-[210] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Confetti layer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c) => (
          <span
            key={c.id}
            className="absolute -top-4 block rounded-sm"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size * 0.4,
              background: c.color,
              transform: `rotate(${c.rotate}deg)`,
              animation: `tour-confetti ${c.duration}s ${c.delay}s ease-in forwards`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl animate-scale-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-bull/30 bg-bull/10">
          <Rocket className="h-7 w-7 text-bull" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-foreground">
          Du bist bereit zu traden! 🚀
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Du kennst jetzt die wichtigsten Bereiche von Quantm Trade. Starte mit
          den heutigen <span className="font-semibold text-bull">Quantm Picks</span>{" "}
          oder lasse den{" "}
          <span className="font-semibold text-foreground">Analyse-Agent</span>{" "}
          deine erste Aktie zerlegen.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground/80 hover:text-foreground"
          >
            Später
          </button>
          <a
            href="/picks"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-bull px-4 py-2.5 text-sm font-semibold text-background hover:bg-bull/90"
          >
            <Sparkles className="h-4 w-4" />
            Heutige Picks ansehen
          </a>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 inline-flex items-center justify-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <BookOpen className="h-3 w-3" /> Methodik nachlesen
        </button>
      </div>

      <style>{`
        @keyframes tour-confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
