import { useState } from "react";
import { ChevronDown, Plus, Trash2, Check, Edit2 } from "lucide-react";
import { useSettings } from "@/lib/settings";

export function WatchlistSwitcher() {
  const {
    settings,
    createWatchlist,
    deleteWatchlist,
    renameWatchlist,
    setActiveWatchlist,
  } = useSettings();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const lists = settings.watchlists;
  const active = lists.find((w) => w.id === settings.activeWatchlistId) ?? lists[0];

  function startCreate() {
    const id = createWatchlist(`Liste ${lists.length + 1}`);
    setEditing(id);
    setDraft(`Liste ${lists.length + 1}`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/40 transition-colors"
      >
        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Liste</span>
        <span className="font-semibold">{active?.name ?? "—"}</span>
        <span className="num text-muted-foreground text-[11px]">{active?.symbols.length ?? 0}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-72 rounded-lg border border-border bg-popover shadow-xl">
            <ul className="py-1 max-h-72 overflow-auto">
              {lists.map((w) => {
                const isActive = w.id === settings.activeWatchlistId;
                const isEditing = editing === w.id;
                return (
                  <li key={w.id} className="px-1">
                    <div className={`group flex items-center gap-1 rounded-md px-2 py-1.5 ${isActive ? "bg-accent/40" : "hover:bg-accent/30"}`}>
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
                          {isActive ? <Check className="h-3.5 w-3.5 text-primary shrink-0" /> : <span className="h-3.5 w-3.5 shrink-0" />}
                          <span className="truncate">{w.name}</span>
                          <span className="num text-[10px] text-muted-foreground ml-auto">{w.symbols.length}</span>
                        </button>
                      )}
                      {!isEditing && (
                        <>
                          <button
                            onClick={() => { setEditing(w.id); setDraft(w.name); }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground"
                            aria-label="Umbenennen"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          {lists.length > 1 && (
                            <button
                              onClick={() => deleteWatchlist(w.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-bear"
                              aria-label="Löschen"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-border p-1">
              <button
                onClick={startCreate}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-accent/40"
              >
                <Plus className="h-3.5 w-3.5" /> Neue Watchlist
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
