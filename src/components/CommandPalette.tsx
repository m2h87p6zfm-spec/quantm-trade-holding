import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Activity, Bell, Bot, Calendar, FlaskConical, Flame, LineChart, ListOrdered, MessageSquare, Newspaper, Search, Settings, Sparkles, Swords, Wallet, Star, Eye } from "lucide-react";
import { PRODUCTS } from "@/lib/products";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";

const ROUTES = [
  { labelKey: "nav.watchlist", to: "/", icon: ListOrdered },
  { labelKey: "nav.picks", to: "/picks", icon: Sparkles },
  { label: "War Room", to: "/war-room", icon: Swords },
  { labelKey: "nav.analyse", to: "/analyse", icon: MessageSquare },
  { labelKey: "nav.portfolio", to: "/portfolio", icon: Wallet },
  { labelKey: "nav.alerts", to: "/alerts", icon: Bell },
  { label: "Backtest Lab", to: "/backtest", icon: FlaskConical },
  { labelKey: "nav.news", to: "/news", icon: Newspaper },
  { labelKey: "nav.calendar", to: "/kalender", icon: Calendar },
  { labelKey: "side.markets", to: "/maerkte", icon: Activity },
  { labelKey: "nav.marktRadar", to: "/markt-radar", icon: Flame },
  { labelKey: "watchlist.title", to: "/", icon: Sparkles },
  { labelKey: "nav.catalog", to: "/produkte", icon: LineChart },
  { labelKey: "nav.settings", to: "/einstellungen", icon: Settings },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { settings, toggleWatch, update } = useSettings();
  const t = useT();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(to: string) { setOpen(false); navigate({ to }); }
  function focus(symbol: string) {
    setOpen(false);
    update({ lastSelected: symbol });
    navigate({ to: "/produkte/$symbol", params: { symbol } });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent/30 hover:text-foreground transition"
      >
        <Search className="h-3.5 w-3.5" />
        <span>{t("command.searchButton")}</span>
        <kbd className="ml-2 hidden lg:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-semibold">⌘K</kbd>
      </button>
      <button onClick={() => setOpen(true)} className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent/30">
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("command.placeholder")} />
        <CommandList>
          <CommandEmpty>{t("command.empty")}</CommandEmpty>

          {settings.watchlist.length > 0 && (
            <CommandGroup heading="Watchlist">
              {settings.watchlist.slice(0, 8).map((s) => (
                <CommandItem key={`wl-${s}`} value={`watchlist ${s}`} onSelect={() => focus(s)}>
                  <Star className="mr-2 h-4 w-4 fill-current text-primary" />
                  <span className="font-mono">{s}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          <CommandGroup heading={t("command.nav")}>
            {ROUTES.map((r) => {
              const Icon = r.icon;
              const label = "labelKey" in r ? t(r.labelKey) : r.label;
              return (
                <CommandItem key={`${r.to}-${label}`} value={label} onSelect={() => go(r.to)}>
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={t("command.symbols")}>
            {PRODUCTS.slice(0, 80).map((p) => (
              <CommandItem key={p.symbol} value={`${p.symbol} ${p.name} ${p.sector}`} onSelect={() => focus(p.symbol)}>
                <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="font-mono w-16 truncate">{p.symbol}</span>
                <span className="truncate text-sm text-muted-foreground">{p.name}</span>
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{p.sector}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          {settings.lastSelected && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t("command.actions")}>
                <CommandItem
                  value={`watchlist toggle ${settings.lastSelected}`}
                  onSelect={() => { toggleWatch(settings.lastSelected!); setOpen(false); }}
                >
                  <Star className="mr-2 h-4 w-4" />
                  {t("command.toggleWatchlist", { symbol: settings.lastSelected })}
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
