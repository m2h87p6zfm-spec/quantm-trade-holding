import type * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, GripVertical, Plus } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSettings } from "@/lib/settings";
import { SymbolSearch } from "@/components/SymbolSearch";
import { useT } from "@/lib/i18n";

export function ManageWatchlistDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT();
  const { settings, addSymbols, removeSymbol, reorderActive } = useSettings();
  // Read directly from settings so adds/removes (including those triggered
  // from elsewhere) reflect immediately — no stale local mirror.
  const items = settings.watchlist;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.indexOf(active.id as string);
    const newIdx = items.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    reorderActive(arrayMove(items, oldIdx, newIdx));
  }

  function handleRemove(sym: string) {
    removeSymbol(sym);
  }

  function handleAdd(syms: string[]) {
    addSymbols(syms);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("watchlist.manage.title")}</DialogTitle>
          <DialogDescription>
            {t("watchlist.manage.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <SymbolSearch existing={items} onAdd={handleAdd} placeholder={t("watchlist.manage.placeholder")} />

          <div className="rounded-lg border border-border bg-card/40 max-h-[55vh] overflow-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Plus className="mx-auto mb-2 h-5 w-5" />
                {t("watchlist.manage.empty")}
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                  <ul className="divide-y divide-border/60">
                    {items.map((sym, i) => (
                      <SortableRow key={sym} id={sym} index={i + 1} onRemove={() => handleRemove(sym)} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-muted-foreground num">{t("watchlist.manage.count", { n: items.length })}</span>
            <Button onClick={() => onOpenChange(false)} size="sm">{t("common.done")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableRow({ id, index, onRemove }: { id: string; index: number; onRemove: () => void }) {
  const t = useT();
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
        aria-label={t("watchlist.manage.move")}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 text-right num text-[11px] text-muted-foreground">{index}</span>
      <span className="font-mono text-sm font-semibold">{id}</span>
      <button
        onClick={onRemove}
        className="ml-auto rounded p-1 text-muted-foreground hover:bg-bear/10 hover:text-bear"
        aria-label={t("watchlist.manage.remove")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
