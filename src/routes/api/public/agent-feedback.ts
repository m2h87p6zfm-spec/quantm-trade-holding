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
