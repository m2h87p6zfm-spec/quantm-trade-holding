import { supabase } from "@/integrations/supabase/client";
import { getCurrentAccessToken } from "@/lib/auth-token";

export type NewsSentimentItem = {
  uuid: string;
  title: string;
  publisher: string;
  source: string;
  link: string;
  publishedAt: number;
  symbol: string;
  tickers: string[];
  sentiment?: "bullish" | "bearish" | "neutral";
  score?: number;
  breaking?: boolean;
  aiSummary?: string;
};

export type NewsSentimentResult = {
  items: NewsSentimentItem[];
  /** true when caller is unauthenticated or lacks Pro/Elite tier */
  gated: boolean;
};

export type NewsSentimentBody = {
  symbols: string[];
  sources?: string[];
  tier1Only?: boolean;
  withSummary?: boolean;
  portfolio?: string[];
};

/**
 * Calls /api/public/news-sentiment with bearer auth attached.
 * Treats 401 (no auth) and 402 (no Pro/Elite tier) as a soft "gated" state
 * so callers can fall back gracefully instead of throwing.
 */
export async function fetchNewsSentiment(
  body: NewsSentimentBody,
): Promise<NewsSentimentResult> {
  if (!body.symbols || body.symbols.length === 0) {
    return { items: [], gated: false };
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { data } = await supabase.auth.getSession();
    const token = await getCurrentAccessToken(data.session?.access_token);
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // ignore — proceed without auth header
  }

  const res = await fetch("/api/public/news-sentiment", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 401 || res.status === 402) {
    return { items: [], gated: true };
  }
  if (!res.ok) {
    return { items: [], gated: false };
  }
  const json = (await res.json().catch(() => ({}))) as { items?: NewsSentimentItem[] };
  return { items: json.items ?? [], gated: false };
}
