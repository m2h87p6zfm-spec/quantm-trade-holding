import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Bestätigung — Apex Trades" }] }),
  component: ReturnPage,
});

function ReturnPage() {
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const { tier, loading } = useSubscription();
  // useSubscription läuft mit Realtime; sobald der Webhook die DB-Zeile schreibt,
  // wechselt tier von "free" auf "pro"/"elite" – wir warten bis zu 15s darauf.
  const [waited, setWaited] = useState(0);

  useEffect(() => {
    if (tier !== "free") return;
    if (waited > 15) return;
    const t = setTimeout(() => setWaited((w) => w + 1), 1000);
    return () => clearTimeout(t);
  }, [tier, waited]);

  const propagating = !loading && tier === "free" && waited < 15;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="p-8 max-w-md text-center border-primary/40 bg-card/80">
        {propagating ? (
          <>
            <div className="h-14 w-14 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Zahlung wird verbucht …</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Stripe bestätigt die Transaktion. Das dauert in der Regel nur wenige Sekunden.
            </p>
          </>
        ) : (
          <>
            <div className="h-14 w-14 rounded-full bg-bull/15 text-bull flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Zahlung erfolgreich</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {tier === "free"
                ? "Dein Zahlungseingang wird gleich sichtbar. Du kannst die App schon nutzen — das Upgrade erscheint in wenigen Sekunden."
                : `Dein ${tier === "elite" ? "Elite" : "Pro"}-Plan ist aktiv. Viel Erfolg beim Traden.`}
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate({ to: "/" })}>Zur App</Button>
              <Button asChild variant="outline">
                <Link to="/konto">Konto öffnen</Link>
              </Button>
            </div>
          </>
        )}
        {session_id && <p className="text-[10px] text-muted-foreground mt-4 font-mono">Ref: {session_id.slice(0, 20)}…</p>}
      </Card>
    </div>
  );
}
