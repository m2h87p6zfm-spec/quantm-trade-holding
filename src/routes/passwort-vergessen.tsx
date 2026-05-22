import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { ApexLogo } from "@/components/ApexLogo";

export const Route = createFileRoute("/passwort-vergessen")({
  head: () => ({
    meta: [
      { title: "Passwort vergessen — Apex Trades" },
      { name: "description", content: "Setze dein Apex-Trades-Passwort per E-Mail-Link zurück." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/passwort-zuruecksetzen`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 text-foreground/80 hover:text-foreground">
          <ApexLogo className="h-7 w-7" />
          <span className="font-semibold tracking-tight">Apex Trades</span>
        </Link>
        <Card className="p-6 border-border/60 bg-card/80 backdrop-blur">
          {sent ? (
            <div className="text-center py-6">
              <div className="h-12 w-12 rounded-full bg-bull/15 text-bull flex items-center justify-center mx-auto mb-3">
                <MailCheck className="h-6 w-6" />
              </div>
              <h1 className="text-lg font-semibold">E-Mail unterwegs</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Falls ein Konto zu <span className="font-medium text-foreground">{email}</span> existiert,
                ist ein Reset-Link auf dem Weg. Prüfe auch den Spam-Ordner.
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/login">Zurück zum Login</Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold mb-1">Passwort zurücksetzen</h1>
              <p className="text-sm text-muted-foreground mb-5">
                Gib deine E-Mail ein — wir schicken dir einen sicheren Link.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <Button onClick={submit} disabled={busy || !email} className="w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset-Link senden"}
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-6">
                <Link to="/login" className="hover:text-foreground">Zurück zum Login</Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
