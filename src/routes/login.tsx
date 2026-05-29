import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ApexLogo } from "@/components/ApexLogo";
import { useT } from "@/lib/i18n";
import { getRememberMe, setRememberMe } from "@/lib/remember-me";

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function waitForOAuthSession(): Promise<Session | null> {
  // Nur für OAuth-Rückkehr: warte, bis die Session vom Provider eingetroffen ist.
  // Safari-kompatibel: kein redundantes setSession/refreshSession.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data } = await withTimeout(
      supabase.auth.getSession(),
      5000,
      "Sitzungsprüfung dauert zu lange",
    );
    if (data.session?.access_token) return data.session;
    await new Promise((resolve) => window.setTimeout(resolve, 200 * (attempt + 1)));
  }
  return null;
}

function toAuthMessage(message: string, mode: "signin" | "signup") {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "E-Mail oder Passwort ist falsch. Falls du dich gerade registriert hast, bestätige zuerst deine E-Mail-Adresse.";
  }
  if (lower.includes("email not confirmed") || lower.includes("not confirmed") || lower.includes("confirm")) {
    return "Bitte bestätige zuerst deine E-Mail-Adresse. Schau auch im Spam-Ordner nach.";
  }
  if (lower.includes("user already registered") || lower.includes("already registered")) {
    return "Für diese E-Mail-Adresse gibt es bereits ein Konto. Bitte melde dich an oder nutze Passwort vergessen.";
  }
  if (lower.includes("signup is disabled")) {
    return "Registrierung ist aktuell deaktiviert. Ich habe sie gerade wieder aktiviert – bitte versuche es erneut.";
  }
  if (lower.includes("timeout") || lower.includes("dauert zu lange") || lower.includes("load failed") || lower.includes("failed to fetch")) {
    return `${mode === "signin" ? "Anmeldung" : "Registrierung"} konnte wegen eines Netzwerk-/Preview-Problems nicht abgeschlossen werden. Bitte versuche es erneut oder teste kurz die veröffentlichte Seite.`;
  }
  return `${mode === "signin" ? "Anmeldung" : "Registrierung"} fehlgeschlagen: ${message}`;
}

function getAuthRedirectTo(path = "/auth/confirm") {
  return `${window.location.origin}${path}`;
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Anmelden — Quantm Trade" },
      { name: "description", content: "Sign in to Quantm Trade." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const t = useT();
  const { user, loading, acceptSession, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [remember, setRemember] = useState<boolean>(() => getRememberMe());

  useEffect(() => {
    if (!loading && user) navigate({ to: "/", replace: true });
  }, [user, loading, navigate]);

  const signIn = async () => {
    setBusy(true);
    setRememberMe(remember);
    const normalizedEmail = email.trim();
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: normalizedEmail, password }),
        15000,
        "Die Anmeldung dauert zu lange",
      );
      if (error) {
        if (
          error.message.toLowerCase().includes("confirm") ||
          error.message.toLowerCase().includes("not confirmed")
        ) {
          setPendingEmail(normalizedEmail);
          toast.error(
            "Bitte bestätige zuerst deine E-Mail-Adresse. Schau in dein Postfach (auch Spam-Ordner).",
            { duration: 8000 },
          );
          return;
        }
        toast.error(toAuthMessage(error.message, "signin"));
        return;
      }
      if (data.session) {
        // signInWithPassword hat die Session bereits persistiert. Kein
        // redundantes setSession/refreshSession – das schlägt auf Safari fehl.
        acceptSession(data.session);
        navigate({ to: "/", replace: true });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(toAuthMessage(msg, "signin"));
    } finally {
      setBusy(false);
    }
  };

  const signUp = async () => {
    setBusy(true);
    setRememberMe(remember);
    try {
      const normalizedEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { emailRedirectTo: getAuthRedirectTo() },
      });
      if (error) {
        toast.error(toAuthMessage(error.message, "signup"));
        return;
      }
      if (data.session) {
        acceptSession(data.session);
        navigate({ to: "/", replace: true });
      } else {
        setPendingEmail(normalizedEmail);
        toast.success(
          "Account erstellt! Bitte bestätige jetzt deine E-Mail-Adresse, um dich anmelden zu können.",
          { duration: 10000 },
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(toAuthMessage(msg, "signup"));
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    if (!pendingEmail) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: { emailRedirectTo: getAuthRedirectTo() },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Bestätigungs-E-Mail erneut gesendet.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Versand fehlgeschlagen: ${msg}.`);
    } finally {
      setBusy(false);
    }
  };

  const signInOAuth = async (provider: "google" | "apple") => {
    setBusy(true);
    setRememberMe(remember);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
        extraParams: provider === "google" ? { prompt: "select_account" } : undefined,
      });
      if (result.redirected) return;
      if (result.error) {
        toast.error(t(provider === "google" ? "login.googleErr" : "login.appleErr"));
        return;
      }
      const verified = await waitForOAuthSession();
      if (!verified?.access_token) {
        toast.error(
          "Anmeldung erfolgreich, aber die Sitzung konnte nicht gespeichert werden. Bitte lade die Seite neu.",
        );
        return;
      }
      acceptSession(verified);
      navigate({ to: "/", replace: true });
    } catch {
      toast.error(t(provider === "google" ? "login.googleErr" : "login.appleErr"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-7 flex items-center justify-center gap-2.5 sm:gap-3 text-foreground/85 hover:text-foreground"
        >
          <ApexLogo className="h-8 w-8 sm:h-10 sm:w-10" />
          <span className="text-base sm:text-lg font-semibold tracking-tight leading-none">
            Quantm Trade
          </span>
        </Link>

        {/* Focused value-prop */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
            {t("login.hero.title1")}
            <br />
            <span className="text-primary">{t("login.hero.title2")}</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("login.hero.subtitle")}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{t("login.hero.badge1")}</span>
            <span>{t("login.hero.badge2")}</span>
          </div>
        </div>

        {/* Why us vs TradingView/Bloomberg — instant clarity, no scroll */}
        <div className="mb-6 rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur">
          <p className="text-center text-[12px] font-semibold tracking-tight text-foreground">
            {t("login.vs.title")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] leading-snug">
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {t("login.vs.themLabel")}
              </div>
              <p className="text-muted-foreground">✗ {t("login.vs.them1")}</p>
              <p className="text-muted-foreground">✗ {t("login.vs.them2")}</p>
              <p className="text-muted-foreground">✗ {t("login.vs.them3")}</p>
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-primary/90">
                {t("login.vs.usLabel")}
              </div>
              <p className="text-foreground">✓ {t("login.vs.us1")}</p>
              <p className="text-foreground">✓ {t("login.vs.us2")}</p>
              <p className="text-foreground">✓ {t("login.vs.us3")}</p>
            </div>
          </div>
        </div>

        {pendingEmail && (
          <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
            <p className="font-semibold text-foreground">Bitte bestätige deine E-Mail-Adresse</p>
            <p className="mt-1 text-muted-foreground">
              Wir haben eine Bestätigungs-E-Mail an{" "}
              <span className="font-medium text-foreground">{pendingEmail}</span> gesendet. Klicke
              auf den Link in der E-Mail, um dein Konto zu aktivieren. Schau auch im Spam-Ordner
              nach.
            </p>
            <Button
              onClick={resendConfirmation}
              disabled={busy}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "E-Mail erneut senden"}
            </Button>
          </div>
        )}

        <Card className="p-6 border-border/60 bg-card/80 backdrop-blur">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">{t("login.tab.signin")}</TabsTrigger>
              <TabsTrigger value="signup">{t("login.tab.signup")}</TabsTrigger>
            </TabsList>

            <Button
              onClick={() => void signInOAuth("google")}
              disabled={busy}
              variant="outline"
              className="w-full mb-3"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login.google")}
            </Button>
            <Button
              onClick={() => void signInOAuth("apple")}
              disabled={busy}
              variant="outline"
              className="w-full mb-4"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login.apple")}
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("login.or")}</span>
              </div>
            </div>

            <TabsContent value="signin" className="space-y-3 mt-0">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("login.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pwd">{t("login.password")}</Label>
                  <Link
                    to="/passwort-vergessen"
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {t("login.forgot")}
                  </Link>
                </div>
                <Input
                  id="pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none pt-1">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  id="remember"
                />
                <span>{t("login.rememberMe")}</span>
              </label>
              <Button
                onClick={signIn}
                disabled={busy || !email || !password}
                className="w-full mt-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login.signin")}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-3 mt-0">
              <div className="space-y-1.5">
                <Label htmlFor="email2">{t("login.email")}</Label>
                <Input
                  id="email2"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd2">{t("login.passwordMin")}</Label>
                <Input
                  id="pwd2"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button
                onClick={signUp}
                disabled={busy || !email || password.length < 8}
                className="w-full mt-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login.signup")}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Nach der Registrierung erhältst du eine E-Mail zur Bestätigung. Erst danach kannst
                du dich anmelden.
              </p>
            </TabsContent>
          </Tabs>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/preise" className="hover:text-foreground">
            {t("login.viewPlans")}
          </Link>
          <span className="mx-2 opacity-30">·</span>
          <Link to="/" className="hover:text-foreground">
            {t("login.backHome")}
          </Link>
        </p>
        <p className="text-center text-[10px] text-muted-foreground/70 mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1">
          <Link to="/impressum" className="hover:text-foreground">
            Impressum
          </Link>
          <Link to="/agb" className="hover:text-foreground">
            AGB
          </Link>
          <Link to="/datenschutz" className="hover:text-foreground">
            Datenschutz
          </Link>
        </p>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-3 px-4 leading-relaxed">
          Keine Anlageberatung. Handel mit Wertpapieren birgt das Risiko des Totalverlusts.
        </p>
      </div>
    </div>
  );
}
