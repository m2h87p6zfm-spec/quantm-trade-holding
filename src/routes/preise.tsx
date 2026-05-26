import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/useSubscription";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { FeaturePreviewPopover } from "@/components/FeaturePreviewPopover";
import { trackEvent, getPopoverContext } from "@/lib/analytics";

export const Route = createFileRoute("/preise")({
  head: () => ({
    meta: [
      { title: "Preise — Quantm Trade" },
      { name: "description", content: "Free, Pro 9,99 €/Monat und Elite 19,99 €/Monat." },
    ],
  }),
  component: PricingPage,
});

type Cycle = "monthly" | "yearly";

interface Plan {
  id: "free" | "pro" | "elite";
  name: string;
  taglineKey: string;
  icon: React.ComponentType<{ className?: string }>;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
  highlighted?: boolean;
  featureKeys: string[];
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    taglineKey: "plan.free.tagline",
    icon: Sparkles,
    monthlyPrice: 0,
    yearlyPrice: 0,
    featureKeys: ["plan.free.f1","plan.free.f2","plan.free.f3","plan.free.f4","plan.free.f5","plan.free.f6","plan.free.f7","plan.free.f8"],
  },
  {
    id: "pro",
    name: "Pro",
    taglineKey: "plan.pro.tagline",
    icon: Zap,
    // Brutto-Anzeige (inkl. 19 % MwSt). Stripe-Preise sind Netto (8,40 / 80,64 €)
    // → automatic_tax addiert die MwSt → Kunde zahlt exakt diese Beträge.
    monthlyPrice: 9.99,
    yearlyPrice: 95.88,
    monthlyPriceId: "apex_pro_monthly_v2",
    yearlyPriceId: "apex_pro_yearly_v2",
    highlighted: true,
    featureKeys: ["plan.pro.f1","plan.pro.f2","plan.pro.f3","plan.pro.f4","plan.pro.f5","plan.pro.f6","plan.pro.f7","plan.pro.f8","plan.pro.f9","plan.pro.f10"],
  },
  {
    id: "elite",
    name: "Elite",
    taglineKey: "plan.elite.tagline",
    icon: Crown,
    // Brutto-Anzeige (inkl. 19 % MwSt). Netto: 16,80 / 161,28 €.
    monthlyPrice: 19.99,
    yearlyPrice: 191.88,
    monthlyPriceId: "apex_elite_monthly_v2",
    yearlyPriceId: "apex_elite_yearly_v2",
    featureKeys: ["plan.elite.f1","plan.elite.f2","plan.elite.f3","plan.elite.f4","plan.elite.f5","plan.elite.f6","plan.elite.f7","plan.elite.f8","plan.elite.f9","plan.elite.f10"],
  },
];

function PricingPage() {
  const t = useT();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [checkoutPrice, setCheckoutPrice] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const { user } = useAuth();
  const { tier: currentTier } = useSubscription();
  const navigate = useNavigate();
  const openPortal = useServerFn(createPortalSession);

  const yearlySavingsPct = useMemo(() => 20, []);

  const goToPortal = async () => {
    setPortalBusy(true);
    try {
      const url = await openPortal({
        data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("pricing.portalErr"));
    } finally {
      setPortalBusy(false);
    }
  };

  const onChoose = (plan: Plan) => {
    const popoverCtx = getPopoverContext();
    void trackEvent("pricing_upgrade_clicked", {
      plan: plan.id,
      cycle,
      currentTier,
      authed: !!user,
      ...popoverCtx,
    });
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (currentTier !== "free") {
      void goToPortal();
      return;
    }
    if (plan.id === "free") {
      navigate({ to: "/" });
      return;
    }
    const priceId = cycle === "monthly" ? plan.monthlyPriceId! : plan.yearlyPriceId!;
    void trackEvent("pricing_checkout_opened", {
      plan: plan.id,
      cycle,
      priceId,
      ...popoverCtx,
    });
    setCheckoutPrice(priceId);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="outline" className="mb-4 border-primary/40 text-primary">{t("pricing.badge")}</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            {t("pricing.title")}
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            {t("pricing.subtitle")}
          </p>

          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-border/60 bg-card/50 mt-8">
            <button
              onClick={() => setCycle("monthly")}
              className={cn("px-4 py-1.5 text-sm rounded-full transition-colors", cycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {t("pricing.cycle.monthly")}
            </button>
            <button
              onClick={() => setCycle("yearly")}
              className={cn("px-4 py-1.5 text-sm rounded-full transition-colors flex items-center gap-2", cycle === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {t("pricing.cycle.yearly")}
              <span className="text-[10px] bg-bull/20 text-bull rounded-full px-1.5 py-0.5">−{yearlySavingsPct}%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = cycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
            const perMonth = cycle === "yearly" && plan.yearlyPrice ? plan.yearlyPrice / 12 : null;
            const isCurrent = currentTier === plan.id;
            return (
              <Card
                key={plan.id}
                className={cn(
                  "p-6 flex flex-col relative border-border/60 bg-card/60 backdrop-blur transition-all",
                  plan.highlighted && "border-primary/60 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.4)] md:scale-[1.03]",
                )}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">{t("pricing.popular")}</Badge>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("h-5 w-5", plan.highlighted ? "text-primary" : "text-muted-foreground")} />
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-5">{t(plan.taglineKey)}</p>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tabular-nums">
                      {price === 0 ? "0 €" : `${price?.toFixed(2).replace(".", ",")} €`}
                    </span>
                    {price !== 0 && (
                      <span className="text-sm text-muted-foreground">{cycle === "monthly" ? t("pricing.perMonth") : t("pricing.perYear")}</span>
                    )}
                  </div>
                  {perMonth && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("pricing.equivPerMonth", { amount: perMonth.toFixed(2).replace(".", ",") })}
                    </p>
                  )}
                  {price !== 0 && (
                    <p className="text-[11px] text-muted-foreground/80 mt-1">
                      Endpreis inkl. 19 % MwSt. — keine versteckten Kosten.
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => onChoose(plan)}
                  disabled={isCurrent || portalBusy}
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full mb-6"
                >
                  {portalBusy && currentTier !== "free" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    t("pricing.cta.current")
                  ) : currentTier !== "free" ? (
                    t("pricing.cta.portalSwitch")
                  ) : plan.id === "free" ? (
                    t("pricing.cta.freeStart")
                  ) : (
                    t("pricing.cta.choose", { plan: plan.name })
                  )}
                </Button>

                <ul className="space-y-2.5 text-sm">
                  {plan.featureKeys.map((k) => (
                    <li key={k} className="flex items-start gap-2">
                      <Check className={cn("h-4 w-4 mt-0.5 shrink-0", plan.highlighted ? "text-primary" : "text-bull")} />
                      <span className="text-foreground/80 flex-1">{t(k)}</span>
                      <FeaturePreviewPopover featureKey={k} plan={plan.id} />
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          {t("pricing.footnote")}
          <br />
          <Link to="/" className="hover:text-foreground mt-2 inline-block">{t("pricing.backToApp")}</Link>
        </p>
      </div>

      <Dialog open={!!checkoutPrice} onOpenChange={(o) => !o && setCheckoutPrice(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50">
            <DialogTitle>{t("pricing.checkout")}</DialogTitle>
          </DialogHeader>
          {checkoutPrice && (
            <div className="p-2">
              <StripeEmbeddedCheckout
                priceId={checkoutPrice}
                customerEmail={user?.email}
                userId={user?.id}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
