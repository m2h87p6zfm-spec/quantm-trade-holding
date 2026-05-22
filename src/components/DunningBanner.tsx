import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useSubscription } from "@/hooks/useSubscription";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Wird angezeigt, wenn Stripe die Zahlung nicht einziehen konnte.
 * Zugriff bleibt während der Stripe-Retry-Periode (typisch 7 Tage) erhalten.
 */
export function DunningBanner() {
  const { status, tier, loading } = useSubscription();
  const [busy, setBusy] = useState(false);
  const openPortal = useServerFn(createPortalSession);

  if (loading || tier === "free" || status !== "past_due") return null;

  const onFix = async () => {
    setBusy(true);
    try {
      const url = await openPortal({
        data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Portal konnte nicht geöffnet werden");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-sm text-amber-200 flex flex-wrap items-center justify-center gap-3">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        <strong>Zahlung fehlgeschlagen.</strong> Wir versuchen es automatisch erneut — bitte aktualisiere deine Zahlungsmethode,
        damit dein Zugriff aktiv bleibt.
      </span>
      <Button size="sm" variant="outline" onClick={onFix} disabled={busy} className="h-7 border-amber-500/40 hover:bg-amber-500/15">
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Karte aktualisieren"}
      </Button>
    </div>
  );
}
