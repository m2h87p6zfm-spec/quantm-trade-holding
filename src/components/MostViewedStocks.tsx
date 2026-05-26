import { Link } from "@tanstack/react-router";
import { Flame, TrendingUp } from "lucide-react";
import { useTopTracked } from "@/lib/popularity-tracker";
import { findProduct } from "@/lib/products";
import { useT } from "@/lib/i18n";

export function MostViewedStocks({ limit = 6 }: { limit?: number }) {
  const items = useTopTracked("stock", limit);
  const t = useT();
  if (items.length < 2) return null; // not enough signal yet

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      aria-label="Most viewed stocks"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FF8A3D]/15 ring-1 ring-[#FF8A3D]/30">
          <Flame className="h-3.5 w-3.5 text-[#FF8A3D]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {t("mostViewed.eyebrow") || "Community pulse"}
          </div>
          <h3 className="truncate text-sm font-semibold text-foreground">
            {t("mostViewed.stocks.title") || "Most viewed stocks"}
          </h3>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          {t("mostViewed.last14d") || "last 14 days"}
        </span>
      </div>

      <ol className="flex flex-wrap gap-2">
        {items.map((it, idx) => {
          const p = findProduct(it.key);
          const label = p?.symbol ?? it.key;
          const name = p?.name;
          return (
            <li key={it.key}>
              <Link
                to="/produkte/$symbol"
                params={{ symbol: it.key }}
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-[12px] transition hover:border-[#22FF88]/50 hover:bg-[#22FF88]/5"
                title={name ? `${label} — ${name}` : label}
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  #{idx + 1}
                </span>
                <span className="font-semibold text-foreground">{label}</span>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {it.count}×
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
