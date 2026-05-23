import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { ApexLogo } from "@/components/ApexLogo";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/passwort-zuruecksetzen")({
  head: () => ({
    meta: [{ title: "Neues Passwort — Quantm Trade" }],
  }),
  component: ResetPage,
});

function ResetPage() {
  const t = useT();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (password !== confirm) return toast.error(t("reset.mismatch"));
    if (password.length < 8) return toast.error(t("reset.tooShort"));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("reset.updated"));
    navigate({ to: "/konto" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 text-foreground/80 hover:text-foreground">
          <ApexLogo className="h-7 w-7" />
          <span className="font-semibold tracking-tight">Quantm Trade</span>
        </Link>
        <Card className="p-6 border-border/60 bg-card/80 backdrop-blur">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">{t("reset.title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            {t("reset.subtitle")}
          </p>
          {!ready ? (
            <div className="py-6 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("reset.checking")}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pwd">{t("reset.new")}</Label>
                <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd2">{t("reset.confirm")}</Label>
                <Input id="pwd2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              </div>
              <Button onClick={submit} disabled={busy || password.length < 8 || password !== confirm} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("reset.save")}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
