import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  symbol: z.string().min(1).max(16),
  errorMessage: z.string().min(1).max(500),
  context: z.string().max(200).optional(),
});

const SYSTEM = `Du bist ein nüchterner Trading-Infrastruktur-Diagnose-Assistent.
Aufgabe: Wenn der Marktdaten-Feed (Twelve Data, 70+ Börsen) für ein Symbol fehlschlägt,
nenne plausible Ursachen und konkrete nächste Schritte für den Nutzer.

HARTE REGELN — NIEMALS BRECHEN:
1. Erfinde NIEMALS Kurse, Preise, Prozentwerte, Volumen oder andere Zahlen.
2. Erfinde NIEMALS Marktdaten oder Analysen ("Apple steht bei …").
3. Gib NUR Diagnose-Hypothesen und Handlungsvorschläge.
4. Wenn du das Symbol nicht eindeutig kennst, sag das.
5. Antworte auf Deutsch, max. 6 kurze Bullet-Points, jeweils max. 1 Satz.

Typische Fehlerursachen die du prüfen darfst:
- 429 Rate-Limit → kurz warten, später erneut
- 401/404 → falsches Symbol / falsches Börsen-Suffix (z. B. SAP.DE statt SAP, 7203.T für Toyota)
- Twelve-Data-Outage / temporäre Störung
- Symbol nicht im Plan abgedeckt → Free-Tier ohne globale Börsen
- Delisted / Ticker geändert
- Vor-/Nachbörse: noch keine Kerzen

Format: reine Markdown-Liste, keine Einleitung, kein Disclaimer am Ende.`;

export const diagnoseFeedError = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI-Diagnose nicht konfiguriert (LOVABLE_API_KEY fehlt)." };
    }

    const userMsg = `Symbol: ${data.symbol}
Fehlermeldung vom Marktdaten-Feed: ${data.errorMessage}
${data.context ? `Kontext: ${data.context}` : ""}

Warum schlägt das vermutlich fehl und was kann der Nutzer jetzt konkret tun?`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userMsg },
          ],
        }),
      });

      if (res.status === 429) {
        return { ok: false as const, error: "AI-Limit erreicht — kurz warten und erneut versuchen." };
      }
      if (res.status === 402) {
        return { ok: false as const, error: "AI-Guthaben aufgebraucht. Bitte in Settings → Workspace → Usage aufladen." };
      }
      if (!res.ok) {
        return { ok: false as const, error: `AI-Gateway Fehler ${res.status}` };
      }

      const j: any = await res.json();
      const text: string = j?.choices?.[0]?.message?.content?.trim() || "Keine Antwort vom Modell.";
      return { ok: true as const, text };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Netzwerkfehler bei AI-Diagnose." };
    }
  });
