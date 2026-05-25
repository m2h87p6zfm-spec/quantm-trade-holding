import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/confirm")({
  head: () => ({
    meta: [
      { title: "E-Mail bestätigen — Quantm Trade" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthConfirmPage,
});

type Status = "verifying" | "success" | "error";

function AuthConfirmPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const href = window.location.href;
        const url = new URL(href);
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.substring(1)
          : "";
        const hashParams = new URLSearchParams(hash);

        // 1) Explicit error in URL (e.g. expired link)
        const errParam =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error") ||
          hashParams.get("error_description") ||
          hashParams.get("error");
        if (errParam) {
          if (cancelled) return;
          setStatus("error");
          setMessage(decodeURIComponent(errParam));
          return;
        }

        // 2) PKCE flow (?code=...) — exchange code for a session.
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(href);
          if (error) throw error;
        }

        // 3) Token-hash flow (?token_hash=...&type=...) — verify OTP server-side.
        const tokenHash = url.searchParams.get("token_hash");
        const typeParam = url.searchParams.get("type");
        if (tokenHash && typeParam) {
          const { error } = await supabase.auth.verifyOtp({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: typeParam as any,
            token_hash: tokenHash,
          });
          if (error) throw error;
        }

        // 4) Implicit flow (#access_token=...&refresh_token=...) is auto-detected
        //    by supabase-js (detectSessionInUrl=true). Just wait for the session.

        // Poll briefly until a session is available.
        let session = null;
        for (let i = 0; i < 30; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            session = data.session;
            break;
          }
          await new Promise((r) => setTimeout(r, 150));
        }

        if (cancelled) return;

        if (session) {
          // Clean the URL so tokens don't linger in history.
          window.history.replaceState(null, "", "/auth/confirm");
          setStatus("success");
          setTimeout(() => {
            if (!cancelled) navigate({ to: "/" });
          }, 600);
        } else {
          setStatus("error");
          setMessage(
            "Bestätigung war erfolgreich, aber es konnte keine Sitzung erstellt werden. Bitte melde dich erneut an.",
          );
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Unbekannter Fehler bei der Bestätigung.";
        setStatus("error");
        setMessage(msg);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl shadow-primary/5">
        {status === "verifying" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-background">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
            <h1 className="mt-4 text-lg font-semibold">E-Mail wird bestätigt …</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Einen Moment, wir aktivieren dein Konto.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-bull/40 bg-bull/10">
              <CheckCircle2 className="h-6 w-6 text-bull" />
            </div>
            <h1 className="mt-4 text-lg font-semibold">E-Mail bestätigt</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Wir leiten dich jetzt in dein Dashboard weiter …
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="mt-4 text-lg font-semibold">Bestätigung fehlgeschlagen</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {message ||
                "Der Bestätigungslink ist ungültig oder abgelaufen. Bitte fordere eine neue E-Mail an."}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={() => navigate({ to: "/login" })} className="w-full">
                Zur Anmeldung
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
