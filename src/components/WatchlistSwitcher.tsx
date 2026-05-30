import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2, Check, Edit2, Palette } from "lucide-react";
import { useSettings, WATCHLIST_COLORS, WATCHLIST_EMOJIS } from "@/lib/settings";
import { useT } from "@/lib/i18n";

export function WatchlistSwitcher() {
  const t = useT();
  const {
    settings,
    createWatchlist,
    deleteWatchlist,
    renameWatchlist,
    updateWatchlistMeta,
    setActiveWatchlist,
  } = useSettings();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [customizing, setCustomizing] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [popStyle, setPopStyle] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function reposition() {
      const btn = btnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const vw = window.innerWidth;
      const margin = 12;
      const width = Math.min(320, vw - margin * 2);
      // Align right edge to button's right edge, but clamp inside viewport.
      let left = r.right - width;
      if (left < margin) left = margin;
      if (left + width > vw - margin) left = vw - margin - width;
      setPopStyle({
        position: "fixed",
        top: r.bottom + 8,
        left,
        width,
        zIndex: 50,
      });
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);


  const lists = settings.watchlists;
  const active = lists.find((w) => w.id === settings.activeWatchlistId) ?? lists[0];

  function startCreate() {
    const id = createWatchlist(`List ${lists.length + 1}`);
    // Give it a random color so each list looks distinct
    const color = WATCHLIST_COLORS[lists.length % WATCHLIST_COLORS.length];
    updateWatchlistMeta(id, { emoji: "📈", color });
    setEditing(id);
    setDraft(`List ${lists.length + 1}`);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}

        className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs font-medium hover:border-primary/40 transition-colors"
        style={{ borderColor: active?.color ? `${active.color}66` : undefined }}
      >
        <span aria-hidden className="text-sm leading-none">{active?.emoji ?? "📊"}</span>
        <span className="font-semibold" style={{ color: active?.color ?? undefined }}>{active?.name ?? "—"}</span>
        <span className="num text-muted-foreground text-[11px]">{active?.symbols.length ?? 0}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setCustomizing(null); }} />
          <div style={popStyle ?? { visibility: "hidden", position: "fixed" }} className="rounded-lg border border-border bg-popover shadow-xl">
            <ul className="py-1 max-h-[60vh] overflow-auto">


              {lists.map((w) => {
                const isActive = w.id === settings.activeWatchlistId;
                const isEditing = editing === w.id;
                const isCustom = customizing === w.id;
                return (
                  <li key={w.id} className="px-1">
                    <div className={`group flex items-center gap-1 rounded-md px-2 py-1.5 ${isActive ? "bg-accent/40" : "hover:bg-accent/30"}`}>
                      <button
                        onClick={() => setCustomizing(isCustom ? null : w.id)}
                        className="text-base leading-none px-0.5 hover:scale-110 transition-transform"
                        aria-label={t("watchlist.switcher.changeSymbolColor")}
                        title={t("watchlist.switcher.symbolColor")}
                      >
                        {w.emoji ?? "📊"}
                      </button>
                      {isEditing ? (
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => { renameWatchlist(w.id, draft.trim() || w.name); setEditing(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { renameWatchlist(w.id, draft.trim() || w.name); setEditing(null); } }}
                          className="flex-1 bg-background border border-border rounded px-1.5 py-0.5 text-xs"
                        />
                      ) : (
                        <button
                          onClick={() => { setActiveWatchlist(w.id); setOpen(false); }}
                          className="flex-1 flex items-center gap-2 text-left text-sm min-w-0"
                        >
                          {isActive ? <Check className="h-3.5 w-3.5 shrink-0" style={{ color: w.color ?? undefined }} /> : <span className="h-3.5 w-3.5 shrink-0" />}
                          <span className="truncate" style={{ color: isActive ? (w.color ?? undefined) : undefined }}>{w.name}</span>
                          <span className="num text-[10px] text-muted-foreground ml-auto">{w.symbols.length}</span>
                        </button>
                      )}
                      {!isEditing && (
                        <>
                          <button
                            onClick={() => { setEditing(w.id); setDraft(w.name); }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground"
                            aria-label={t("watchlist.switcher.rename")}
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          {lists.length > 1 && (
                            <button
                              onClick={() => deleteWatchlist(w.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-bear"
                              aria-label={t("watchlist.switcher.delete")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {isCustom && (
                      <div className="mt-1 mb-2 rounded-md border border-border/60 bg-background/60 p-2 space-y-2">
                        <div>
                          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{t("watchlist.switcher.symbol")}</div>
                          <div className="grid grid-cols-8 gap-1">
                            {WATCHLIST_EMOJIS.map((e) => (
                              <button
                                key={e}
                                onClick={() => updateWatchlistMeta(w.id, { emoji: e })}
                                className={`text-base rounded p-1 hover:bg-accent ${w.emoji === e ? "ring-1 ring-primary bg-accent/40" : ""}`}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <Palette className="h-3 w-3" /> {t("watchlist.switcher.color")}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {WATCHLIST_COLORS.map((c) => (
                              <button
                                key={c}
                                onClick={() => updateWatchlistMeta(w.id, { color: c })}
                                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${w.color === c ? "border-foreground" : "border-transparent"}`}
                                style={{ backgroundColor: c }}
                                aria-label={t("watchlist.switcher.colorLabel", { color: c })}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-border p-1">
              <button
                onClick={startCreate}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-accent/40"
              >
                <Plus className="h-3.5 w-3.5" /> {t("watchlist.switcher.new")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
