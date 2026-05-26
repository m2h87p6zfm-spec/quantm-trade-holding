import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Check, Radar, Star, Sparkles, Wallet, MessageSquare } from "lucide-react";

const STORAGE_KEY = "apex_first_run_tour_v1";

type Slide = {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    eyebrow: "Willkommen",
    title: "Dein KI-gestütztes Trading-Dashboard",
    body: "In 60 Sekunden zeigen wir dir die wichtigsten Bereiche von Quantm Trade — damit du sofort loslegen kannst.",
  },
  {
    icon: Star,
    eyebrow: "Watchlist",
    title: "Behalte deine Favoriten im Blick",
    body: "Speichere Aktien, ETFs und Krypto in deiner persönlichen Watchlist und erhalte live KI-Signale, RSI, MACD & Z-Score auf einen Blick.",
  },
  {
    icon: Radar,
    eyebrow: "Global Radar",
    title: "Was bewegt die Märkte gerade?",
    body: "Der Global Radar scannt laufend News, Sektor-Bewegungen und Makro-Events und meldet dir, was wirklich wichtig ist.",
  },
  {
    icon: Sparkles,
    eyebrow: "Apex Picks",
    title: "KI-kuratierte Trade-Ideen",
    body: "Unsere Quant-Engine analysiert tausende Setups täglich und filtert die mit der höchsten Konfidenz heraus — inkl. KI-Erklärung auf Deutsch.",
  },
  {
    icon: Wallet,
    eyebrow: "Portfolio",
    title: "Tracking & Analytics",
    body: "Lege dein Portfolio an und erhalte automatisch Performance-Auswertung, Risiko-Metriken und tägliche KI-Insights.",
  },
  {
    icon: MessageSquare,
    eyebrow: "KI-Chat",
    title: "Frag die KI alles über jeden Trade",
    body: "Klick auf jedes Setup oder jede Aktie und lass dir den Grund, die Risiken und den Konsens in einfacher Sprache erklären.",
  },
];

function hasSeenTour(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* noop */
  }
}

export function FirstRunTour() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Defer until after first paint to avoid SSR/hydration flash.
    if (!hasSeenTour()) {
      setOpen(true);
    }
  }, []);

  const close = () => {
    markSeen();
    setOpen(false);
  };

  const finish = () => {
    markSeen();
    setOpen(false);
    navigate({ to: "/" });
  };

  if (!open) return null;

  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;
  const progress = ((step + 1) / SLIDES.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent
        className="max-w-lg border-border/40 bg-card/95 backdrop-blur-xl p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Erste Schritte mit Quantm Trade</DialogTitle>

        {/* progress */}
        <div className="h-1 w-full bg-border/40">
          <div
            className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                {slide.eyebrow}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Schritt {step + 1} von {SLIDES.length}
              </div>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight">
            {slide.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {slide.body}
          </p>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={close}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Überspringen
            </button>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Zurück
                </Button>
              )}
              {isLast ? (
                <Button size="sm" onClick={finish}>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Loslegen
                </Button>
              ) : (
                <Button size="sm" onClick={() => setStep((s) => Math.min(SLIDES.length - 1, s + 1))}>
                  Weiter
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
