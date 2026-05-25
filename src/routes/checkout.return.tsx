import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Confirmation — Quantm Trade" }] }),
  component: ReturnPage,
});

function ReturnPage() {
  const t = useT();
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const { tier, loading } = useSubscription();
  // useSubscription runs with Realtime; as soon as the webhook writes the DB row,
  // tier switches from "free" to "pro"/"elite" — we wait up to 15s for it.
  const [waited, setWaited] = useState(0);

  useEffect(() => {
    if (tier !== "free") return;
    if (waited > 15) return;
    const tm = setTimeout(() => setWaited((w) => w + 1), 1000);
    return () => clearTimeout(tm);
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
            <h1 className="text-2xl font-semibold mb-2">{t("checkoutReturn.processing")}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t("checkoutReturn.processingBody")}
            </p>
          </>
        ) : (
          <>
            <div className="h-14 w-14 rounded-full bg-bull/15 text-bull flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">{t("checkoutReturn.success")}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {tier === "free"
                ? t("checkoutReturn.pending")
                : t("checkoutReturn.active", { plan: tier === "elite" ? "Elite" : "Pro" })}
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate({ to: "/" })}>{t("checkoutReturn.toApp")}</Button>
              <Button asChild variant="outline">
                <Link to="/konto">{t("checkoutReturn.openAccount")}</Link>
              </Button>
            </div>
          </>
        )}
        {session_id && <p className="text-[10px] text-muted-foreground mt-4 font-mono">Ref: {session_id.slice(0, 20)}…</p>}
      </Card>
    </div>
  );
}
