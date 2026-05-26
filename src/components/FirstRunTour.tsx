import { useEffect, useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

// localStorage acts as a fast cache so we don't re-show the tour during the
// brief window before the DB row loads. Source of truth is the
// `user_trading_profile.tour_completed` column.
const STORAGE_KEY = "quantm_first_run_tour_v2";

type Step = {
  /** data-tour value on the target element in the sidebar / page. */
  target: string;
  title: string;
  body: string;
  /** Preferred tooltip side relative to the highlighted element. */
  side?: "right" | "bottom";
};

const STEPS: Step[] = [
  {
    target: "watchlist",
    title: "Watchlist",
    body: "Hier siehst du deine Favoriten mit Live-Signalen, RSI, MACD & Z-Score auf einen Blick.",
    side: "right",
  },
  {
    target: "picks",
    title: "Quantm Picks",
    body: "Täglich KI-kuratierte Trade-Ideen mit der höchsten statistischen Konfidenz.",
    side: "right",
  },
  {
    target: "analyse",
    title: "Aktien-Analyse",
    body: "Tiefenanalyse für jedes Symbol — Indikatoren, Score, Decision und Erklärung.",
    side: "right",
  },
  {
    target: "radar",
    title: "Markt-Radar",
    body: "Live-Scan über alle Märkte — wo gerade ungewöhnliche Bewegung herrscht.",
    side: "right",
  },
  {
    target: "portfolio",
    title: "Portfolio",
    body: "Tracke deine Positionen, Performance, Risiko und nutze den KI-Portfolio-Chat.",
    side: "right",
  },
  {
    target: "alerts",
    title: "Smart Alerts",
    body: "Setze präzise Preis- und Indikator-Alerts — wir benachrichtigen dich sofort.",
    side: "right",
  },
  {
    target: "global",
    title: "Global Macro",
    body: "Geopolitik, Makro-Daten und Länder-Risiken — wichtiger Kontext für jeden Trade.",
    side: "right",
  },
];

function localSeen(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return true; }
}
function markLocalSeen() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* noop */ }
}

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(key: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(`[data-tour="${key}"]`);
}

export function FirstRunTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Decide once per user whether to show the tour.
  // Source of truth = user_trading_profile.tour_completed in DB.
  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    // Fast path: if local cache says seen, don't even query.
    if (localSeen()) return;

    (async () => {
      const { data, error } = await supabase
        .from("user_trading_profile")
        .select("tour_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        // Network/RLS issue — fall back to local cache (already false here).
        setOpen(true);
        return;
      }
      if (data?.tour_completed) {
        markLocalSeen();
        return;
      }
      // Slight delay so sidebar is mounted before we measure targets.
      window.setTimeout(() => { if (!cancelled) setOpen(true); }, 400);
    })();

    return () => { cancelled = true; };
  }, [user]);
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = findTarget(STEPS[step].target);
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    update();
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const interval = window.setInterval(update, 250); // keep aligned while layout settles
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      window.clearInterval(interval);
    };
  }, [open, step]);

  if (!open) return null;

  const persistSeen = async () => {
    markLocalSeen();
    if (!user) return;
    // Upsert so the row is created if onboarding hadn't already inserted it.
    await supabase
      .from("user_trading_profile")
      .upsert(
        { user_id: user.id, tour_completed: true },
        { onConflict: "user_id" },
      );
  };

  const close = () => { void persistSeen(); setOpen(false); };
  const next = () => {
    if (step >= STEPS.length - 1) { close(); return; }
    setStep((s) => s + 1);
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Compute tooltip placement
  const PAD = 12;
  const TOOLTIP_W = 320;
  let tipStyle: React.CSSProperties = {};
  if (rect) {
    const side = s.side ?? "right";
    if (side === "right") {
      const left = Math.min(window.innerWidth - TOOLTIP_W - 16, rect.left + rect.width + PAD);
      const top = Math.max(16, Math.min(window.innerHeight - 220, rect.top));
      tipStyle = { top, left, width: TOOLTIP_W };
    } else {
      const top = Math.min(window.innerHeight - 220, rect.top + rect.height + PAD);
      const left = Math.max(16, Math.min(window.innerWidth - TOOLTIP_W - 16, rect.left));
      tipStyle = { top, left, width: TOOLTIP_W };
    }
  } else {
    tipStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: TOOLTIP_W,
    };
  }

  // Spotlight box rendered as a transparent rect with 4 dark overlay panels around it
  // (works without SVG masks across browsers and supports clicks on backdrop edges).
  const hole = rect
    ? { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }
    : null;

  return (
    <div className="fixed inset-0 z-[9999]" aria-live="polite">
      {/* Dark overlay panels with cutout */}
      {hole ? (
        <>
          <div className="absolute bg-black/70 backdrop-blur-[1px]" style={{ top: 0, left: 0, right: 0, height: hole.top }} />
          <div className="absolute bg-black/70 backdrop-blur-[1px]" style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
          <div className="absolute bg-black/70 backdrop-blur-[1px]" style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <div className="absolute bg-black/70 backdrop-blur-[1px]" style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
          {/* Highlight ring around hole */}
          <div
            className="absolute rounded-xl ring-2 ring-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.25),0_0_40px_hsl(var(--primary)/0.5)] pointer-events-none animate-pulse"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
          {/* Arrow pointing from tooltip toward the target */}
          <div
            className="absolute h-0.5 bg-primary/80 pointer-events-none"
            style={{
              top: hole.top + hole.height / 2,
              left: hole.left + hole.width,
              width: Math.max(0, (typeof tipStyle.left === "number" ? tipStyle.left : 0) - (hole.left + hole.width)),
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px]" />
      )}

      {/* Tooltip card */}
      <div
        className="absolute rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/20 p-4 sm:p-5"
        style={tipStyle}
        role="dialog"
        aria-label={s.title}
      >
        <button
          onClick={close}
          aria-label="Tour schließen"
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
          Tour · {step + 1} / {STEPS.length}
        </div>
        <div className="mt-1 text-base font-semibold tracking-tight text-foreground">{s.title}</div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>

        {/* Progress dots */}
        <div className="mt-3 flex items-center gap-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border/60"}`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={close}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Überspringen
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={prev}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Zurück
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {isLast ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" /> Fertig
                </>
              ) : (
                <>
                  Weiter <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
