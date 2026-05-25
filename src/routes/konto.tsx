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
import { useT, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/konto")({
  head: () => ({
    meta: [{ title: "Konto — Quantm Trade" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const t = useT();
  const lang = useLang();
  const locale = lang === "de" ? "de-DE" : "en-US";
  const fmtDate = (d: string | number | Date) => new Date(d).toLocaleDateString(locale);

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

  const deleteKeyword = t("account.deleteKeyword");

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      toast.error(t("account.nameEmpty"));
      return;
    }
    if (trimmed.length > 60) {
      toast.error(t("account.nameTooLong"));
      return;
    }
    setNameBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", user.id);
    setNameBusy(false);
    if (error) {
      toast.error(t("account.nameSaveFailed"));
      return;
    }
    setDisplayName(trimmed);
    setEditingName(false);
    toast.success(t("account.nameUpdated"));
  };


  const onPortal = async () => {
    setPortalBusy(true);
    try {
      const url = await openPortal({
        data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("account.portalFailed"));
    } finally {
      setPortalBusy(false);
    }
  };

  const onCancel = async () => {
    setCancelBusy(true);
    try {
      await callCancel({ data: { environment: getStripeEnvironment() } });
      toast.success(t("account.cancelSuccess"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("account.cancelFailed"));
    } finally {
      setCancelBusy(false);
    }
  };

  const onResume = async () => {
    setResumeBusy(true);
    try {
      await callResume({ data: { environment: getStripeEnvironment() } });
      toast.success(t("account.resumeSuccess"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("account.resumeFailed"));
    } finally {
      setResumeBusy(false);
    }
  };

  const onDelete = async () => {
    setDeleteBusy(true);
    try {
      await callDelete({ data: undefined });
      await supabase.auth.signOut();
      toast.success(t("account.deleteSuccess"));
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("account.deleteFailed"));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("account.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("account.subtitle")}</p>
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
                  aria-label={t("account.editName")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            <div className="text-xs text-muted-foreground">{t("account.signedInSince", { date: fmtDate(user.created_at) })}</div>
          </div>
        </div>
        <Button onClick={() => signOut().then(() => navigate({ to: "/" }))} variant="outline" size="sm">
          <LogOut className="h-4 w-4 mr-2" /> {t("account.signOut")}
        </Button>
      </Card>

      <Card className="p-5 border-border/60 bg-card/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold">{t("account.currentPlan")}</h2>
              <Badge variant={tier === "free" ? "outline" : "default"} className={tier === "elite" ? "bg-primary" : ""}>
                {tier === "free" ? "Free" : tier === "pro" ? "Quantm Pro" : "Quantm Elite"}
              </Badge>
            </div>
            {subLoading ? (
              <p className="text-xs text-muted-foreground">{t("account.planLoading")}</p>
            ) : tier === "free" ? (
              <p className="text-sm text-muted-foreground">{t("account.freeCta")}</p>
            ) : (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>{t("account.status")}: <span className="text-foreground">{status}</span></div>
                {priceId && <div>{t("account.cycle")}: {priceId.includes("yearly") ? t("account.cycle.yearly") : t("account.cycle.monthly")}</div>}
                {currentPeriodEnd && (
                  <div>
                    {cancelAtPeriodEnd ? t("account.endsOn") : t("account.renewsOn")}: {fmtDate(currentPeriodEnd)}
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
                {t("account.viewPlans")} <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <>
              <Button onClick={onPortal} disabled={portalBusy} variant="outline">
                {portalBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                {t("account.managePortal")}
              </Button>
              {tier === "pro" && (
                <Button asChild variant="default">
                  <Link to="/preise">{t("account.upgradeElite")}</Link>
                </Button>
              )}
              {cancelAtPeriodEnd ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={resumeBusy}>
                      {resumeBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                      {t("account.resumeBtn")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("account.resumeTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("account.resumeBody", { date: currentPeriodEnd ? fmtDate(currentPeriodEnd) : t("account.periodEnd") })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={(e) => { e.preventDefault(); void onResume(); }}>
                        {t("account.resumeConfirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={cancelBusy} className="text-destructive hover:text-destructive">
                      {cancelBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                      {t("account.cancelBtn")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("account.cancelTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("account.cancelBody", { suffix: currentPeriodEnd ? ` (${fmtDate(currentPeriodEnd)})` : "" })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("account.cancelKeep")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => { e.preventDefault(); void onCancel(); }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t("account.cancelConfirm")}
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
            <h2 className="font-semibold text-sm">{t("account.delete")}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {t("account.deleteDesc")}
            </p>
            <AlertDialog onOpenChange={(o) => !o && setConfirmText("")}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="mt-3">
                  <Trash2 className="h-4 w-4 mr-1.5" /> {t("account.deleteBtn")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("account.deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("account.deleteBody", { keyword: deleteKeyword })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={deleteKeyword}
                  autoFocus
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== deleteKeyword || deleteBusy}
                    onClick={(e) => {
                      e.preventDefault();
                      void onDelete();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("account.deleteConfirm")}
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
