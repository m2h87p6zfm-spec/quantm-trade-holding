import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useSettings } from "@/lib/settings";
import { Star, Zap, Keyboard, X, ArrowRight, Bell } from "lucide-react";
import { toast } from "sonner";

// Globale Hotkeys + Floating Quick-Action-Panel.
// B = toggle watchlist · S = scroll to signals · 1-9 = wechselt zwischen Watchlist-Symbolen · ? = Hilfe
export function QuickPanel() {
  const navigate = useNavigate();
  const { settings, toggleWatch } = useSettings();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [helpOpen, setHelpOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const current = settings.lastSelected;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Digit shortcut: 1-9 → watchlist nth symbol
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const sym = settings.watchlist[idx];
        if (sym) {
          e.preventDefault();
          navigate({ to: "/produkte/$symbol", params: { symbol: sym } });
          toast.success(`→ ${sym}`, { duration: 1200 });
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "b":
          if (current) {
            e.preventDefault();
            toggleWatch(current);
            const inList = !settings.watchlist.includes(current);
            toast.success(inList ? `${current} zur Watchlist hinzugefügt` : `${current} entfernt`, { duration: 1500 });
          }
          break;
        case "a":
          e.preventDefault();
          navigate({ to: "/alerts" });
          break;
        case "n":
          e.preventDefault();
          navigate({ to: "/news" });
          break;
        case "h":
          e.preventDefault();
          navigate({ to: "/heatmap" });
          break;
        case "c":
          e.preventDefault();
          navigate({ to: "/kalender" });
          break;
        case "w":
          e.preventDefault();
          navigate({ to: "/war-room" });
          break;
        case "?":
          e.preventDefault();
          setHelpOpen((v) => !v);
          break;
        case "escape":
          setHelpOpen(false);
          setOpen(false);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, navigate, settings.watchlist, toggleWatch]);

  // Show only on data-heavy routes
  const showOn = ["/produkte", "/", "/war-room", "/portfolio", "/news", "/heatmap"];
  const visible = showOn.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {open && (
          <div className="w-72 rounded-xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl animate-fade-up">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Quick Actions</span>
              <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-accent/40"><X className="h-3 w-3" /></button>
            </div>
            <div className="space-y-1.5">
              {current && (
                <button onClick={() => toggleWatch(current)}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2 text-sm hover:bg-accent/40">
                  <span className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-gold" /> Watchlist {settings.watchlist.includes(current) ? "entfernen" : "hinzufügen"}</span>
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px]">B</kbd>
                </button>
              )}
              <button onClick={() => navigate({ to: "/alerts" })}
                className="flex w-full items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2 text-sm hover:bg-accent/40">
                <span className="flex items-center gap-2"><Bell className="h-3.5 w-3.5 text-primary" /> Alerts</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px]">A</kbd>
              </button>
              <button onClick={() => setHelpOpen(true)}
                className="flex w-full items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2 text-sm hover:bg-accent/40">
                <span className="flex items-center gap-2"><Keyboard className="h-3.5 w-3.5 text-violet-accent" /> Alle Hotkeys</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px]">?</kbd>
              </button>
              {settings.watchlist.length > 0 && (
                <div className="pt-2">
                  <div className="mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">Springe zu</div>
                  <div className="flex flex-wrap gap-1">
                    {settings.watchlist.slice(0, 9).map((s, i) => (
                      <button key={s} onClick={() => navigate({ to: "/produkte/$symbol", params: { symbol: s } })}
                        className="group inline-flex items-center gap-1 rounded-md border border-border bg-background/50 px-2 py-1 font-mono text-[11px] hover:border-primary/50 hover:bg-primary/10">
                        <kbd className="rounded bg-muted px-1 text-[9px] text-muted-foreground">{i + 1}</kbd>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button onClick={() => setOpen((o) => !o)}
          className="group inline-flex items-center gap-2 rounded-full border border-primary/40 bg-gradient-to-br from-primary/20 via-primary/10 to-violet-accent/20 px-4 py-2.5 text-xs font-semibold shadow-xl backdrop-blur-xl transition hover:scale-105 hover:shadow-2xl animate-pulse-glow">
          <Zap className="h-4 w-4 text-primary" />
          <span>Quick</span>
          <kbd className="hidden sm:inline-flex rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[9px]">?</kbd>
        </button>
      </div>

      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4" onClick={() => setHelpOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Keyboard className="h-4 w-4 text-primary" /> Tastatur-Shortcuts</h2>
              <button onClick={() => setHelpOpen(false)} className="rounded p-1 hover:bg-accent/40"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2 text-sm">
              <Row k="⌘ + K" desc="Command Palette öffnen" />
              <Row k="B" desc="Symbol zur Watchlist toggeln" />
              <Row k="1 – 9" desc="Zu Watchlist-Symbol springen" />
              <Row k="A" desc="Smart Alerts" />
              <Row k="N" desc="News-Feed" />
              <Row k="H" desc="Heatmap" />
              <Row k="C" desc="Wirtschaftskalender" />
              <Row k="W" desc="War Room" />
              <Row k="?" desc="Diese Hilfe" />
              <Row k="Esc" desc="Schließen" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ k, desc }: { k: string; desc: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2">
      <span className="text-muted-foreground flex items-center gap-2"><ArrowRight className="h-3 w-3 text-primary" /> {desc}</span>
      <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold">{k}</kbd>
    </div>
  );
}
