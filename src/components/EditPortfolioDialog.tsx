import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, GripVertical, Plus, Sparkles } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSettings } from "@/lib/settings";
import { SymbolSearch } from "@/components/SymbolSearch";
import { useSubscription } from "@/hooks/useSubscription";
import { getPortfolioLimit, limitLabel, promptUpgrade } from "@/lib/portfolio-limits";
import { Link } from "@tanstack/react-router";

export function EditPortfolioDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { settings, setPortfolio, reorderPortfolio, removeFromPortfolio, setCostBasis } = useSettings();
  const { tier } = useSubscription();
  const limit = getPortfolioLimit(tier);
  const [items, setItems] = useState<string[]>(settings.portfolioSymbols);

  useEffect(() => { if (open) setItems(settings.portfolioSymbols); }, [open, settings.portfolioSymbols]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((cur) => {
      const oldIdx = cur.indexOf(active.id as string);
      const newIdx = cur.indexOf(over.id as string);
      if (oldIdx < 0 || newIdx < 0) return cur;
      const next = arrayMove(cur, oldIdx, newIdx);
      reorderPortfolio(next);
      return next;
    });
  }

  function handleRemove(sym: string) {
    setItems((cur) => cur.filter((x) => x !== sym));
    removeFromPortfolio(sym);
  }

  function handleAdd(syms: string[]) {
    const remaining = Number.isFinite(limit) ? Math.max(0, limit - items.length) : syms.length;
    if (remaining < syms.length) {
      promptUpgrade({ reason: "portfolio_limit", currentTier: tier, currentCount: items.length, limit });
    }
    const accepted = syms.slice(0, remaining).map((s) => s.toUpperCase());
    if (accepted.length === 0) return;
    const next = Array.from(new Set([...items, ...accepted]));
    setItems(next);
    setPortfolio(next);
  }

  const remaining = Number.isFinite(limit) ? Math.max(0, limit - items.length) : Infinity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Portfolio verwalten
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/30">
              {tier}
            </span>
          </DialogTitle>
          <DialogDescription>
            {items.length} / {limitLabel(limit)} Werte · Per Drag-and-Drop neu sortieren · Cost Basis pro Position ergänzen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <SymbolSearch
            existing={items}
            onAdd={handleAdd}
            placeholder="Ticker hinzufügen — z. B. AAPL, BMW.DE, ASML.AS"
            limit={Number.isFinite(limit) ? limit : undefined}
            currentCount={items.length}
          />

          {Number.isFinite(limit) && remaining <= 3 && (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
              <span className="text-foreground/90">
                Noch <span className="font-mono font-semibold text-primary">{remaining}</span> Plätze frei in deinem {tier.toUpperCase()}-Plan.
              </span>
              <Button asChild size="sm" variant="ghost" className="h-7 text-[11px]">
                <Link to="/preise" onClick={() => onOpenChange(false)}>
                  <Sparkles className="mr-1 h-3 w-3 text-primary" /> Upgrade
                </Link>
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card/40 max-h-[55vh] overflow-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Plus className="mx-auto mb-2 h-5 w-5" />
                Noch keine Holdings. Suche oben einen Ticker.
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                  <ul className="divide-y divide-border/60">
                    {items.map((sym, i) => (
                      <SortableRow
                        key={sym}
                        id={sym}
                        index={i + 1}
                        costBasis={settings.costBasis[sym]}
                        onCost={(v) => setCostBasis(sym, v)}
                        onRemove={() => handleRemove(sym)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-muted-foreground num">{items.length} Holdings</span>
            <Button onClick={() => onOpenChange(false)} size="sm">Fertig</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableRow({
  id, index, costBasis, onCost, onRemove,
}: { id: string; index: number; costBasis?: number; onCost: (v: number | undefined) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 ${isDragging ? "bg-accent/40" : "hover:bg-accent/20"}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label="Verschieben"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 text-right num text-[11px] text-muted-foreground">{index}</span>
      <span className="font-mono text-sm font-semibold w-20">{id}</span>
      <div className="ml-auto flex items-center gap-1.5">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cost</label>
        <input
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="—"
          value={Number.isFinite(costBasis) ? costBasis : ""}
          onChange={(e) => {
            const v = e.target.value;
            onCost(v === "" ? undefined : Number(v));
          }}
          className="w-20 rounded border border-border bg-card px-1.5 py-1 text-right text-xs font-mono focus:border-primary/60 focus:outline-none"
        />
      </div>
      <button
        onClick={onRemove}
        className="rounded p-1 text-muted-foreground hover:bg-bear/10 hover:text-bear"
        aria-label="Entfernen"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
