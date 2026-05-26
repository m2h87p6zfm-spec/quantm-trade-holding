import { memo, useMemo } from "react";
import { PRODUCTS } from "@/lib/products";

/**
 * Datalist mit den ersten N Symbolen. 3.300+ <option>-Knoten in jedes Formular
 * zu rendern war messbar teuer (Re-Layout, GC-Pressure) — der Cap deckt
 * realistische Autocompletes ab; die globale Suche kennt sowieso mehr Symbole.
 */
function ProductsDatalistImpl({ id, limit = 600 }: { id: string; limit?: number }) {
  const opts = useMemo(() => PRODUCTS.slice(0, limit), [limit]);
  return (
    <datalist id={id}>
      {opts.map((p) => (
        <option key={p.symbol} value={p.symbol}>{p.name}</option>
      ))}
    </datalist>
  );
}

export const ProductsDatalist = memo(ProductsDatalistImpl);
