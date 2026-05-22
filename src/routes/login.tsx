import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ApexLogo } from "@/components/ApexLogo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Anmelden — Apex Trades" },
      { name: "description", content: "Melde dich bei Apex Trades an, um Pro-Features und dein Abo zu verwalten." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/konto" });
  }, [user, loading, navigate]);

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Willkommen zurück");
  };

  const signUp = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/konto" },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      toast.success("Willkommen bei Apex Trades");
      navigate({ to: "/konto" });
    } else {
      toast.success("Account erstellt — du kannst dich jetzt anmelden.");
    }
  };

  const signInGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setBusy(false);
      toast.error("Google Sign-in fehlgeschlagen");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 text-foreground/80 hover:text-foreground">
          <ApexLogo className="h-7 w-7" />
          <span className="font-semibold tracking-tight">Apex Trades</span>
        </Link>
        <Card className="p-6 border-border/60 bg-card/80 backdrop-blur">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Anmelden</TabsTrigger>
              <TabsTrigger value="signup">Registrieren</TabsTrigger>
            </TabsList>

            <Button onClick={signInGoogle} disabled={busy} variant="outline" className="w-full mb-4">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mit Google fortfahren"}
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
              <div className="relative flex justify-center text-[11px] uppercase"><span className="bg-card px-2 text-muted-foreground">oder</span></div>
            </div>

            <TabsContent value="signin" className="space-y-3 mt-0">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pwd">Passwort</Label>
                  <Link to="/passwort-vergessen" className="text-[11px] text-muted-foreground hover:text-foreground">
                    Vergessen?
                  </Link>
                </div>
                <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
              <Button onClick={signIn} disabled={busy || !email || !password} className="w-full mt-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anmelden"}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-3 mt-0">
              <div className="space-y-1.5">
                <Label htmlFor="email2">E-Mail</Label>
                <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd2">Passwort (min. 8 Zeichen)</Label>
                <Input id="pwd2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <Button onClick={signUp} disabled={busy || !email || password.length < 8} className="w-full mt-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Account erstellen"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Du wirst direkt eingeloggt — keine E-Mail-Bestätigung nötig.
              </p>
            </TabsContent>
          </Tabs>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/preise" className="hover:text-foreground">Pläne ansehen</Link>
          <span className="mx-2 opacity-30">·</span>
          <Link to="/" className="hover:text-foreground">Zurück zur Startseite</Link>
        </p>
      </div>
    </div>
  );
}
