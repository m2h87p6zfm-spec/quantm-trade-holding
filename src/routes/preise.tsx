import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/preise")({
  head: () => ({
    meta: [
      { title: "Preise — Apex Trades" },
      { name: "description", content: "Free, Pro 9,99 €/Monat und Elite 19,99 €/Monat. Quant-Signale, Analyse-Agent, AI Learning, Smart Alerts und Realtime-Daten." },
    ],
  }),
  component: PricingPage,
});

type Cycle = "monthly" | "yearly";

interface Plan {
  id: "free" | "pro" | "elite";
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  monthlyPrice: number | null; // EUR
  yearlyPrice: number | null;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
  highlighted?: boolean;
  features: string[];
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Markt-Überblick für Einsteiger",
    icon: Sparkles,
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "7 Analyse-Agent Credits / Monat",
      "Bis zu 5 Watchlist-Werte",
      "1 Preis-Alert",
      "Cockpit mit Live-Preisen (15 Min verzögert)",
      "Heatmap (1 Tag)",
      "News-Feed (ohne AI-Sentiment)",
      "Basis-Charts",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Für Trader, die besser entscheiden wollen",
    icon: Zap,
    monthlyPrice: 9.99,
    yearlyPrice: 95.88,
    monthlyPriceId: "apex_pro_monthly",
    yearlyPriceId: "apex_pro_yearly",
    highlighted: true,
    features: [
      "70 Analyse-Agent Credits / Monat",
      "Unlimitierte Watchlist & Smart Alerts",
      "Analyse-Agent — strukturierte Broker Research Note pro Aktie",
      "Quant-Signale (LONG/SHORT/NEUTRAL) mit Konfidenz",
      "Indikator-Breakdown: RSI, MACD, Bollinger, Z-Score, Sharpe, Beta",
      "AI News-Sentiment (Gemini Flash)",
      "Sektor-Heatmap & alle Timeframes",
      "Economic Calendar",
      "Portfolio-Tracking",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "Für Power-User & Day-Trader",
    icon: Crown,
    monthlyPrice: 19.99,
    yearlyPrice: 191.88,
    monthlyPriceId: "apex_elite_monthly",
    yearlyPriceId: "apex_elite_yearly",
    features: [
      "270 Analyse-Agent Credits / Monat",
      "Alles aus Pro",
      "AI Learning — Transparenz, was die Engine aus Fehlern lernt",
      "Institutional Decision Engine mit Smart-Money- & Regime-Filter",
      "Realtime-Streaming (kein 15-Min-Delay)",
      "Priority AI (Gemini Pro statt Flash)",
      "Custom Alert-Webhooks (Discord/Telegram)",
      "Portfolio Risk-Analytics (VaR, Korrelation)",
      "Priority Support",
    ],
  },
];

function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [checkoutPrice, setCheckoutPrice] = useState<string | null>(null);
  const { user } = useAuth();
  const { tier: currentTier } = useSubscription();
  const navigate = useNavigate();

  const yearlySavingsPct = useMemo(() => 20, []);

  const onChoose = (plan: Plan) => {
    if (plan.id === "free") {
      navigate({ to: "/" });
      return;
    }
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    const priceId = cycle === "monthly" ? plan.monthlyPriceId! : plan.yearlyPriceId!;
    setCheckoutPrice(priceId);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="outline" className="mb-4 border-primary/40 text-primary">Preise</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Schärfe deine Edge.
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Analyse-Agent, Quant-Signale, AI Learning und Smart Alerts — wähle, was zu dir passt.
          </p>

          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-border/60 bg-card/50 mt-8">
            <button
              onClick={() => setCycle("monthly")}
              className={cn("px-4 py-1.5 text-sm rounded-full transition-colors", cycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Monatlich
            </button>
            <button
              onClick={() => setCycle("yearly")}
              className={cn("px-4 py-1.5 text-sm rounded-full transition-colors flex items-center gap-2", cycle === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Jährlich
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
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">Beliebt</Badge>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("h-5 w-5", plan.highlighted ? "text-primary" : "text-muted-foreground")} />
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-5">{plan.tagline}</p>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tabular-nums">
                      {price === 0 ? "0 €" : `${price?.toFixed(2).replace(".", ",")} €`}
                    </span>
                    {price !== 0 && (
                      <span className="text-sm text-muted-foreground">/ {cycle === "monthly" ? "Monat" : "Jahr"}</span>
                    )}
                  </div>
                  {perMonth && (
                    <p className="text-xs text-muted-foreground mt-1">
                      entspricht {perMonth.toFixed(2).replace(".", ",")} € / Monat
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => onChoose(plan)}
                  disabled={isCurrent}
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full mb-6"
                >
                  {isCurrent ? "Aktueller Plan" : plan.id === "free" ? "Kostenlos starten" : `${plan.name} wählen`}
                </Button>

                <ul className="space-y-2.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={cn("h-4 w-4 mt-0.5 shrink-0", plan.highlighted ? "text-primary" : "text-bull")} />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          Steuern werden automatisch berechnet · Jederzeit kündbar · 14 Tage Geld-zurück
          <br />
          <Link to="/" className="hover:text-foreground mt-2 inline-block">← Zurück zur App</Link>
        </p>
      </div>

      <Dialog open={!!checkoutPrice} onOpenChange={(o) => !o && setCheckoutPrice(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50">
            <DialogTitle>Checkout</DialogTitle>
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
