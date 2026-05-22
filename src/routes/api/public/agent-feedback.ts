import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  session_id?: string;
  rating: 1 | -1;
  user_prompt?: string;
  assistant_message?: string;
  reason?: string;
};

// Map UI reason strings to canonical failure categories (used as negative signal keys)
const REASON_CATEGORY: Record<string, string> = {
  "Zu unklar": "fail:unclear",
  "Falsche Annahme": "fail:wrong_assumption",
  "Zu wenig Tiefe": "fail:too_shallow",
  "Schlechte Struktur": "fail:bad_structure",
  "Zu lang": "fail:too_long",
  "Nicht relevant": "fail:irrelevant",
  "Zu generisch": "fail:generic",
};

// Extract signal features from an assistant message
function extractFeatures(text: string): string[] {
  const feats: string[] = [];
  const len = text.length;
  const lenBucket = len < 600 ? "short" : len < 1800 ? "medium" : "long";
  feats.push(`length:${lenBucket}`);

  // Structure
  if (/^#{1,3}\s/m.test(text)) feats.push("structure:headings");
  if (/^[-*]\s/m.test(text)) feats.push("structure:bullets");
  if (/\|.+\|/.test(text)) feats.push("structure:tables");
  if (/^\d+\.\s/m.test(text)) feats.push("structure:numbered");
  if (text.split(/\n\n+/).length <= 3 && !/^[-*#]/m.test(text)) feats.push("structure:prose");

  // Depth signals
  const numericDensity = (text.match(/\d+([.,]\d+)?\s*%?/g) ?? []).length / Math.max(1, len / 200);
  if (numericDensity > 2) feats.push("depth:quantitative");
  if (/\b(DCF|P\/E|EBITDA|FCF|ROIC|Multiple|Margin of Safety|Graham)\b/i.test(text)) feats.push("depth:valuation");
  if (/\b(RSI|MACD|EMA|SMA|Support|Resistance|Breakout)\b/i.test(text)) feats.push("depth:technical");
  if (/\b(Fed|EZB|Zinsen|Inflation|Makro|Geopolitik|Liquidität)\b/i.test(text)) feats.push("depth:macro");
  if (/\b(Quelle|Source|laut|gemäß)\b/i.test(text) || /\[\d+\]/.test(text)) feats.push("depth:sourced");

  // Style cues — pulled from user prompt would be better, but assistant tone reflects what worked
  if (/\b(langfristig|Buy.?and.?Hold|Dividende|Value)\b/i.test(text)) feats.push("style:long_term");
  if (/\b(Swing|Momentum|Trend|kurzfristig)\b/i.test(text)) feats.push("style:active");
  if (/\b(spekulat|Hebel|Optionen|aggress)/i.test(text)) feats.push("style:aggressive");

  // Complexity
  const avgSentence = text.split(/[.!?]\s/).reduce((s, x) => s + x.length, 0) / Math.max(1, text.split(/[.!?]\s/).length);
  if (avgSentence > 140) feats.push("complexity:high");
  else if (avgSentence < 70) feats.push("complexity:low");
  else feats.push("complexity:medium");

  return feats;
}


const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function resolveUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(url, key, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/agent-feedback")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Body;
          if (body.rating !== 1 && body.rating !== -1) {
            return new Response(JSON.stringify({ error: "Invalid rating" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          const user_id = await resolveUserId(request);
          const assistant = (body.assistant_message ?? "").slice(0, 8000);
          const prompt = (body.user_prompt ?? "").slice(0, 4000);

          await supabaseAdmin.from("ai_chat_feedback").insert({
            user_id,
            session_id: body.session_id ?? null,
            rating: body.rating,
            user_prompt: prompt,
            assistant_message: assistant,
            reason: body.reason?.slice(0, 500) ?? null,
            response_length: assistant.length,
          });

          // Update preference profile for signed-in users
          if (user_id) {
            const { data: prof } = await supabaseAdmin
              .from("ai_user_preferences")
              .select("*")
              .eq("user_id", user_id)
              .maybeSingle();

            const pos = (prof?.positive_signals as Record<string, number>) ?? {};
            const neg = (prof?.negative_signals as Record<string, number>) ?? {};
            const target = body.rating === 1 ? pos : neg;

            // crude pattern signals
            const lenBucket =
              assistant.length < 600 ? "short" : assistant.length < 1800 ? "medium" : "long";
            const hasTables = /\|.+\|/.test(assistant);
            const hasNumbers = /\d+([.,]\d+)?\s*%/.test(assistant);
            const hasBullets = /^[-*]\s/m.test(assistant);

            target[`length:${lenBucket}`] = (target[`length:${lenBucket}`] ?? 0) + 1;
            if (hasTables) target["format:tables"] = (target["format:tables"] ?? 0) + 1;
            if (hasNumbers) target["format:quantitative"] = (target["format:quantitative"] ?? 0) + 1;
            if (hasBullets) target["format:bullets"] = (target["format:bullets"] ?? 0) + 1;

            await supabaseAdmin
              .from("ai_user_preferences")
              .upsert({
                user_id,
                positive_signals: pos,
                negative_signals: neg,
                feedback_count: (prof?.feedback_count ?? 0) + 1,
                preferences: prof?.preferences ?? {},
              });
          }

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        } catch (e) {
          console.error("agent-feedback error", e);
          return new Response(JSON.stringify({ error: "Internal error" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
