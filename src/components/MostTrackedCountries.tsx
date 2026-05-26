import { Globe2, MapPin } from "lucide-react";
import { useTopTracked } from "@/lib/popularity-tracker";
import { COUNTRIES, type CountryIntel } from "@/lib/global-intel-data";

export function MostTrackedCountries({
  limit = 6,
  onSelect,
}: {
  limit?: number;
  onSelect?: (c: CountryIntel) => void;
}) {
  const items = useTopTracked("country", limit);
  if (items.length < 2) return null;

  const lookup = new Map(COUNTRIES.map((c) => [c.iso2, c] as const));

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      aria-label="Most tracked countries"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
          <Globe2 className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Community pulse
          </div>
          <h3 className="truncate text-sm font-semibold text-foreground">
            Most tracked countries
          </h3>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <MapPin className="h-3 w-3" />
          last 14 days
        </span>
      </div>

      <ol className="flex flex-wrap gap-2">
        {items.map((it, idx) => {
          const c = lookup.get(it.key);
          const label = c?.name ?? it.key;
          const flag = c?.flag ?? "🌐";
          return (
            <li key={it.key}>
              <button
                type="button"
                onClick={() => c && onSelect?.(c)}
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-[12px] transition hover:border-primary/50 hover:bg-primary/5"
                title={label}
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  #{idx + 1}
                </span>
                <span className="text-base leading-none">{flag}</span>
                <span className="font-semibold text-foreground">{label}</span>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {it.count}×
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
