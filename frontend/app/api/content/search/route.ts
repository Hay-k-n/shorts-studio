import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

const SOURCE_LABELS: Record<string, string> = {
  all: "Google News, Twitter/X, TikTok",
  google: "Google News",
  twitter: "Twitter/X",
  tiktok: "TikTok",
};

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query, source, mode, customUrl } = await req.json();

  const contentType = mode === "news" ? "trending news" : "trending content";
  const queryClause = query ? ` about "${query}"` : "";
  const sourceLabel = SOURCE_LABELS[source] ?? source;

  const prompt =
    source === "url"
      ? `Analyze this URL: "${customUrl}".`
      : `Search for ${contentType}${queryClause} from ${sourceLabel}.`;

  const userContent =
    `${prompt}\n\nFind up to 5 results. Return JSON only — no markdown fences:\n` +
    `[{"title":"...","summary":"...","source":"...","hasVideo":true,"time":"2h ago","url":"...","contentType":"..."}]`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? `Anthropic error ${res.status}` },
        { status: 502 }
      );
    }

    const text: string =
      data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";

    try {
      const results = JSON.parse(text.replace(/```json|```/g, "").trim());
      return NextResponse.json({ results: Array.isArray(results) ? results : [results] });
    } catch {
      return NextResponse.json({
        results: [{ title: "Results", summary: text.substring(0, 250), source: "System", time: "Now" }],
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
