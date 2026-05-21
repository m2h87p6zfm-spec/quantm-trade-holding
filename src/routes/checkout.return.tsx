import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Bestätigung — Apex Trades" }] }),
  component: ReturnPage,
});

function ReturnPage() {
  const { session_id } = Route.useSearch();
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="p-8 max-w-md text-center border-primary/40 bg-card/80">
        <div className="h-14 w-14 rounded-full bg-bull/15 text-bull flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Zahlung erfolgreich</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Dein Plan ist freigeschaltet. Es kann ein paar Sekunden dauern, bis alles sichtbar ist.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild><Link to="/">Zur App</Link></Button>
          <Button asChild variant="outline"><Link to="/konto">Konto öffnen</Link></Button>
        </div>
        {session_id && <p className="text-[10px] text-muted-foreground mt-4 font-mono">Ref: {session_id.slice(0, 20)}…</p>}
      </Card>
    </div>
  );
}
