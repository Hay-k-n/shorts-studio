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

  // For custom URLs skip AI entirely — just surface the URL as a selectable card
  if (source === "url" && customUrl) {
    let title = customUrl;
    try { title = new URL(customUrl).hostname.replace(/^www\./, ""); } catch {}
    return NextResponse.json({
      results: [{
        title: `Custom URL: ${title}`,
        summary: "Content will be fetched and analysed during script generation.",
        source: "Custom URL",
        hasVideo: true,
        time: "Now",
        url: customUrl,
        contentType: "video",
      }],
    });
  }

  const userContent =
    `Search for ${contentType}${queryClause} from ${sourceLabel}.\n\n` +
    `Find up to 5 real, recent results. Return a raw JSON array only — absolutely no markdown fences, no preamble:\n` +
    `[{"title":"...","summary":"...","source":"...","hasVideo":true,"time":"2h ago","url":"https://...","contentType":"..."}]`;

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
        max_tokens: 2000,
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

    // Claude with web_search emits multiple content blocks; the last text block
    // contains the synthesised answer (earlier ones are preamble).
    const textBlocks: { type: string; text: string }[] =
      (data.content ?? []).filter((b: { type: string }) => b.type === "text");
    const text = textBlocks[textBlocks.length - 1]?.text ?? "";

    // Extract the first JSON array found in the response
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const results = JSON.parse(arrayMatch[0]);
        return NextResponse.json({ results: Array.isArray(results) ? results : [results] });
      } catch { /* fall through */ }
    }

    // Last resort: surface raw text as a single card
    return NextResponse.json({
      results: [{ title: "Results", summary: text.substring(0, 400), source: "System", time: "Now", url: null }],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
