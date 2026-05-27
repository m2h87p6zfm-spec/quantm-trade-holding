import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash } from "crypto";

/**
 * Runtime translation service.
 *
 * Accepts a batch of source strings and returns them translated into the
 * requested target language. Results are cached in `translations_cache`
 * so each unique string is only ever sent to the AI gateway once across
 * the entire user base.
 *
 * Designed to be called by the client-side AutoTranslate engine which
 * walks the rendered DOM and translates text nodes / attributes.
 */

export type TranslateResult = {
  /** Map from source text -> translated text. Missing keys mean "leave as-is". */
  map: Record<string, string>;
  error: string | null;
};

const SUPPORTED_LANGS = new Set([
  "en", "de", "zh", "hi", "es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "ja", "tr", "ko",
]);

const LANG_LABEL: Record<string, string> = {
  en: "English",
  de: "German (Deutsch)",
  zh: "Simplified Chinese (简体中文)",
  hi: "Hindi (हिन्दी)",
  es: "Spanish (Español)",
  fr: "French (Français)",
  ar: "Arabic (العربية)",
  bn: "Bengali (বাংলা)",
  pt: "Portuguese (Português)",
  ru: "Russian (Русский)",
  ur: "Urdu (اردو)",
  id: "Indonesian (Bahasa Indonesia)",
  ja: "Japanese (日本語)",
  tr: "Turkish (Türkçe)",
  ko: "Korean (한국어)",
};

function hashOf(text: string, sourceLang: string): string {
  return createHash("sha1").update(`${sourceLang}::${text}`).digest("hex");
}

export const translateTexts = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { texts: string[]; targetLang: string; sourceLang?: string }) => {
      if (!input || !Array.isArray(input.texts)) {
        throw new Error("texts[] required");
      }
      const targetLang = String(input.targetLang || "").toLowerCase();
      const sourceLang = String(input.sourceLang || "de").toLowerCase();
      if (!SUPPORTED_LANGS.has(targetLang)) throw new Error("invalid targetLang");
      if (!SUPPORTED_LANGS.has(sourceLang)) throw new Error("invalid sourceLang");
      // Defensive caps: max 80 strings per call, max 800 chars per string.
      const texts = input.texts
        .filter((t) => typeof t === "string")
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length <= 800)
        .slice(0, 80);
      return { texts, targetLang, sourceLang };
    },
  )
  .handler(async ({ data }): Promise<TranslateResult> => {
    const { texts, targetLang, sourceLang } = data;
    if (targetLang === sourceLang || texts.length === 0) {
      return { map: {}, error: null };
    }

    // Dedup
    const unique = Array.from(new Set(texts));
    const map: Record<string, string> = {};

    // 1. Cache lookup
    try {
      const hashes = unique.map((t) => hashOf(t, sourceLang));
      const { data: rows } = await supabaseAdmin
        .from("translations_cache")
        .select("source_hash, source_text, translated_text")
        .eq("target_lang", targetLang)
        .in("source_hash", hashes);
      if (rows) {
        for (const r of rows) {
          map[(r as any).source_text] = (r as any).translated_text;
        }
      }
    } catch (e) {
      console.warn("translations_cache lookup failed", e);
    }

    const missing = unique.filter((t) => !(t in map));
    if (missing.length === 0) return { map, error: null };

    const aiKey = process.env.LOVABLE_API_KEY;
    if (!aiKey) {
      return { map, error: "AI gateway not configured." };
    }

    // 2. Batch translate missing strings
    const numbered = missing.map((t, i) => `${i + 1}\t${t.replace(/\n/g, " \\n ")}`).join("\n");
    const system = `You are a professional UI/UX translator for a quantitative stock analysis app. Translate every input line from ${LANG_LABEL[sourceLang]} into ${LANG_LABEL[targetLang]}.

Rules:
- Preserve the meaning, register and tone (professional, concise, trader-grade).
- Keep numbers, percentages, currency symbols, tickers (AAPL, SAP, etc.), brand names (Quantm, Quantm Picks, Yahoo Finance), URLs, file paths and JSX placeholders ({0}, {name}) EXACTLY as-is.
- Do not translate proper nouns, ticker symbols, or product names.
- Do not add quotes, prefixes, explanations or commentary.
- If a line is already in the target language, return it unchanged.
- Output STRICT JSON: { "t": { "1": "...", "2": "...", ... } } using the original line numbers as keys.`;

    const user = `Translate these ${missing.length} UI strings into ${LANG_LABEL[targetLang]}:\n\n${numbered}`;

    let translated: Record<string, string> = {};
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) {
        if (r.status === 429) return { map, error: "Rate limited" };
        if (r.status === 402) return { map, error: "AI credits exhausted" };
        const t = await r.text().catch(() => "");
        console.error("translate AI error", r.status, t.slice(0, 200));
        return { map, error: `AI error ${r.status}` };
      }
      const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = j.choices?.[0]?.message?.content ?? "{}";
      let parsed: { t?: Record<string, string> } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
        }
      }
      translated = parsed.t ?? {};
    } catch (err) {
      console.error("translate fetch failed", err);
      return { map, error: "Translation service unavailable" };
    }

    // 3. Apply + persist
    const toInsert: Array<{
      source_hash: string;
      target_lang: string;
      source_lang: string;
      source_text: string;
      translated_text: string;
    }> = [];

    for (let i = 0; i < missing.length; i++) {
      const src = missing[i];
      const tr = translated[String(i + 1)];
      if (typeof tr === "string" && tr.trim().length > 0) {
        const clean = tr.replace(/ \\n /g, "\n").trim();
        map[src] = clean;
        toInsert.push({
          source_hash: hashOf(src, sourceLang),
          target_lang: targetLang,
          source_lang: sourceLang,
          source_text: src,
          translated_text: clean,
        });
      }
    }

    if (toInsert.length > 0) {
      try {
        await supabaseAdmin
          .from("translations_cache")
          .upsert(toInsert as any, { onConflict: "source_hash,target_lang", ignoreDuplicates: true });
      } catch (e) {
        console.warn("translations_cache upsert failed", e);
      }
    }

    return { map, error: null };
  });
