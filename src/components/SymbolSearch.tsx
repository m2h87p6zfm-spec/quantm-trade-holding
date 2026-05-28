import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Plus, X, Loader2, Check, Lock } from "lucide-react";
import { searchSymbols, type SymbolSearchHit } from "@/lib/finnhub";
import { Link } from "@tanstack/react-router";
import { promptUpgrade } from "@/lib/portfolio-limits";
import { useSubscription } from "@/hooks/useSubscription";

type Props = {
  /** Symbols already in the active list — shown as "added" state. */
  existing?: string[];
  /** Called when user adds one or more symbols (deduped, uppercased). */
  onAdd?: (symbols: string[]) => void;
  /** Compact = no inline staging tray, single-click add. */
  compact?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  /** When set, the typeahead row links to /produkte/$symbol on click (catalog mode). */
  linkOnSelect?: boolean;
  /** Optional hard cap. When reached, triggers the Upgrade modal instead of adding. */
  limit?: number;
  /** Current count for limit comparison (defaults to existing.length). */
  currentCount?: number;
};

export function SymbolSearch({
  existing = [],
  onAdd,
  compact = false,
  placeholder = "Suche Ticker oder Firma — z. B. AAPL, Siemens, BMW.DE",
  autoFocus = false,
  linkOnSelect = false,
  limit,
  currentCount,
}: Props) {
  const { tier } = useSubscription();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SymbolSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<string[]>([]);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const exists = new Set(existing.map((s) => s.toUpperCase()));

  // Debounced search
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await searchSymbols(term);
      setHits(res);
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (!boxRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (!open || !q.trim()) return;
    const updateRect = () => setMenuRect(boxRef.current?.getBoundingClientRect() ?? null);
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open, q]);

  function reachedLimit(extra = 0): boolean {
    if (limit == null || !Number.isFinite(limit)) return false;
    const count = (currentCount ?? existing.length) + staged.length + extra;
    return count >= limit;
  }

  function stage(sym: string) {
    const SYM = sym.toUpperCase();
    if (exists.has(SYM)) return;
    if (reachedLimit(1)) {
      promptUpgrade({
        reason: "portfolio_limit",
        currentTier: tier,
        currentCount: (currentCount ?? existing.length) + staged.length,
        limit,
      });
      return;
    }
    if (compact) {
      onAdd?.([SYM]);
      setQ("");
      setOpen(false);
      return;
    }
    setStaged((cur) => (cur.includes(SYM) ? cur : [...cur, SYM]));
    setQ("");
  }

  function commit() {
    if (staged.length === 0) return;
    onAdd?.(staged);
    setStaged([]);
    setOpen(false);
  }

  const menuLeft = menuRect
    ? Math.max(12, Math.min(menuRect.left, window.innerWidth - menuRect.width - 12))
    : 0;

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card/80 backdrop-blur px-4 py-3 shadow-sm focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <Search className="h-5 w-5 text-muted-foreground shrink-0" />
        <input
          autoFocus={autoFocus}
          value={q}
          aria-controls={open ? menuId : undefined}
          aria-expanded={open}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits[0]) stage(hits[0].symbol);
            if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-base placeholder:text-muted-foreground/60 focus:outline-none min-w-0"
        />
        {loading && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
        {!compact && staged.length > 0 && (
          <button
            onClick={commit}
            className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> {staged.length} hinzufügen
          </button>
        )}
      </div>

      {/* Staged chips */}
      {!compact && staged.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {staged.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-md bg-primary/15 text-primary text-[11px] font-semibold px-2 py-0.5 ring-1 ring-primary/30"
            >
              {s}
              <button
                onClick={() => setStaged((c) => c.filter((x) => x !== s))}
                aria-label={`${s} entfernen`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open &&
        q.trim() &&
        menuRect &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className="fixed z-[9999] max-h-[min(24rem,calc(100vh-7rem))] overflow-auto rounded-xl border border-border bg-popover shadow-2xl ring-1 ring-primary/20"
            style={{
              isolation: "isolate",
              zIndex: 9999,
              top: menuRect.bottom + 8,
              left: menuLeft,
              width: Math.min(menuRect.width, window.innerWidth - 24),
            }}
          >
            {loading && hits.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Suche weltweit (Twelve Data)…
              </div>
            ) : hits.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Keine Treffer.{" "}
                <button onClick={() => stage(q)} className="text-primary hover:underline">
                  "{q.toUpperCase()}" trotzdem hinzufügen
                </button>
              </div>
            ) : (
              <ul className="py-1">
                {hits.map((h) => {
                  const already =
                    exists.has(h.symbol.toUpperCase()) || staged.includes(h.symbol.toUpperCase());
                  const inner = (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm">{h.symbol}</span>
                          {h.exchange && (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {h.exchange}
                            </span>
                          )}
                          {h.type && (
                            <span className="text-[10px] rounded bg-muted px-1 py-0.5 text-muted-foreground">
                              {h.type}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{h.name}</div>
                      </div>
                      {already ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-bull">
                          <Check className="h-3 w-3" /> dabei
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                          <Plus className="h-3 w-3" /> hinzufügen
                        </span>
                      )}
                    </>
                  );
                  return (
                    <li key={h.symbol}>
                      {linkOnSelect ? (
                        <Link
                          to="/produkte/$symbol"
                          params={{ symbol: h.symbol }}
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-accent/40 transition-colors"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={already}
                          onClick={() => stage(h.symbol)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent/40 transition-colors disabled:opacity-60 disabled:cursor-default"
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
