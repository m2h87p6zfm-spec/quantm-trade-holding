import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, CreditCard, ArrowUpRight, User as UserIcon, Trash2, AlertTriangle, Pencil, Check, X, XCircle, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/useSubscription";
import { useServerFn } from "@tanstack/react-start";
import { createPortalSession, cancelSubscription, resumeSubscription } from "@/utils/payments.functions";
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
    meta: [{ title: "Konto — Quantm Trade" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const { tier, status, currentPeriodEnd, cancelAtPeriodEnd, priceId, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [portalBusy, setPortalBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [displayName, setDisplayName] = useState<string>("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const openPortal = useServerFn(createPortalSession);
  const callCancel = useServerFn(cancelSubscription);
  const callResume = useServerFn(resumeSubscription);
  const callDelete = useServerFn(deleteOwnAccount);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setDisplayName((data?.display_name as string) ?? "");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      toast.error("Name darf nicht leer sein");
      return;
    }
    if (trimmed.length > 60) {
      toast.error("Max. 60 Zeichen");
      return;
    }
    setNameBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", user.id);
    setNameBusy(false);
    if (error) {
      toast.error("Speichern fehlgeschlagen");
      return;
    }
    setDisplayName(trimmed);
    setEditingName(false);
    toast.success("Name aktualisiert");
  };


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

  const onCancel = async () => {
    setCancelBusy(true);
    try {
      await callCancel({ data: { environment: getStripeEnvironment() } });
      toast.success("Abo gekündigt. Du behältst deinen Plan bis zum Ende des Abrechnungszeitraums.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kündigung fehlgeschlagen");
    } finally {
      setCancelBusy(false);
    }
  };

  const onResume = async () => {
    setResumeBusy(true);
    try {
      await callResume({ data: { environment: getStripeEnvironment() } });
      toast.success("Abo fortgesetzt.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fortsetzen fehlgeschlagen");
    } finally {
      setResumeBusy(false);
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
          <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={60}
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" disabled={nameBusy} onClick={() => void saveName()}>
                  {nameBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4 text-bull" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingName(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="font-medium truncate">{displayName || user.email}</div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => {
                    setNameDraft(displayName);
                    setEditingName(true);
                  }}
                  aria-label="Namen ändern"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
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
                {tier === "free" ? "Free" : tier === "pro" ? "Quantm Pro" : "Quantm Elite"}
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
              {cancelAtPeriodEnd ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={resumeBusy}>
                      {resumeBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                      Kündigung zurücknehmen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Abo fortsetzen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dein Abo wird nicht beendet und verlängert sich wie gewohnt am{" "}
                        {currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString("de-DE") : "Periodenende"}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={(e) => { e.preventDefault(); void onResume(); }}>
                        Fortsetzen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={cancelBusy} className="text-destructive hover:text-destructive">
                      {cancelBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Abo kündigen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Abo wirklich kündigen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Du behältst alle Premium-Vorteile bis zum Ende des aktuellen Abrechnungszeitraums
                        {currentPeriodEnd ? ` (${new Date(currentPeriodEnd).toLocaleDateString("de-DE")})` : ""}.
                        Danach wirst du automatisch auf den kostenlosen Plan zurückgesetzt. Es wird keine weitere Zahlung
                        eingezogen. Du kannst die Kündigung jederzeit vor Ablauf zurücknehmen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Doch behalten</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => { e.preventDefault(); void onCancel(); }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Zum Periodenende kündigen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </div>
      </Card>

      <Card className="p-5 border-destructive/40 bg-destructive/5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm">Konto löschen</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Löscht dein Konto, dein Profil, deine Watchlist, Alerts, Portfolio und kündigt aktive Abos sofort.
              Dieser Schritt ist <strong>endgültig</strong> und kann nicht rückgängig gemacht werden.
            </p>
            <AlertDialog onOpenChange={(o) => !o && setConfirmText("")}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="mt-3">
                  <Trash2 className="h-4 w-4 mr-1.5" /> Konto endgültig löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Konto wirklich löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Alle deine Daten (Profil, Watchlist, Alerts, Portfolio, Subscription) werden unwiderruflich entfernt.
                    Aktive Stripe-Abos werden gekündigt. Tippe <strong>LÖSCHEN</strong> zur Bestätigung.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="LÖSCHEN"
                  autoFocus
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== "LÖSCHEN" || deleteBusy}
                    onClick={(e) => {
                      e.preventDefault();
                      void onDelete();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Endgültig löschen"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    </div>
  );
}
