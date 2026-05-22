import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, CreditCard, ArrowUpRight, User as UserIcon, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/useSubscription";
import { useServerFn } from "@tanstack/react-start";
import { createPortalSession } from "@/utils/payments.functions";
import { deleteOwnAccount } from "@/lib/account.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/konto")({
  head: () => ({
    meta: [{ title: "Konto — Apex Trades" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const { tier, status, currentPeriodEnd, cancelAtPeriodEnd, priceId, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [portalBusy, setPortalBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const openPortal = useServerFn(createPortalSession);
  const callDelete = useServerFn(deleteOwnAccount);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const onPortal = async () => {
    setPortalBusy(true);
    try {
      const url = await openPortal({
        data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Billing-Portal nicht öffnen");
    } finally {
      setPortalBusy(false);
    }
  };

  const onDelete = async () => {
    setDeleteBusy(true);
    try {
      await callDelete({ data: undefined });
      await supabase.auth.signOut();
      toast.success("Konto und alle Daten gelöscht.");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Konto</h1>
        <p className="text-sm text-muted-foreground">Profil & Abo verwalten.</p>
      </div>

      <Card className="p-5 border-border/60 bg-card/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <UserIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium">{user.email}</div>
            <div className="text-xs text-muted-foreground">Angemeldet seit {new Date(user.created_at).toLocaleDateString("de-DE")}</div>
          </div>
        </div>
        <Button onClick={() => signOut().then(() => navigate({ to: "/" }))} variant="outline" size="sm">
          <LogOut className="h-4 w-4 mr-2" /> Abmelden
        </Button>
      </Card>

      <Card className="p-5 border-border/60 bg-card/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold">Aktueller Plan</h2>
              <Badge variant={tier === "free" ? "outline" : "default"} className={tier === "elite" ? "bg-primary" : ""}>
                {tier === "free" ? "Free" : tier === "pro" ? "Apex Pro" : "Apex Elite"}
              </Badge>
            </div>
            {subLoading ? (
              <p className="text-xs text-muted-foreground">Lade…</p>
            ) : tier === "free" ? (
              <p className="text-sm text-muted-foreground">Schalte alle Premium-Signale und Features frei.</p>
            ) : (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>Status: <span className="text-foreground">{status}</span></div>
                {priceId && <div>Tarif: {priceId.includes("yearly") ? "Jährlich" : "Monatlich"}</div>}
                {currentPeriodEnd && (
                  <div>
                    {cancelAtPeriodEnd ? "Endet am" : "Verlängert am"}: {new Date(currentPeriodEnd).toLocaleDateString("de-DE")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {tier === "free" ? (
            <Button asChild>
              <Link to="/preise">
                Pläne ansehen <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <>
              <Button onClick={onPortal} disabled={portalBusy} variant="outline">
                {portalBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Abo & Rechnungen verwalten
              </Button>
              {tier === "pro" && (
                <Button asChild variant="default">
                  <Link to="/preise">Auf Elite upgraden</Link>
                </Button>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
