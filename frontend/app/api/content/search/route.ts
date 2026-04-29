import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

const SOURCE_LABELS: Record<string, string> = {
  all: "Google News, Twitter/X, TikTok",
  google: "Google News",
  twitter: "Twitter/X",
  tiktok: "TikTok",
};

const SUBMIT_RESULTS_TOOL = {
  name: "submit_results",
  description: "Submit the list of search results you found",
  input_schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            source: { type: "string" },
            hasVideo: { type: "boolean" },
            time: { type: "string" },
            url: { type: "string" },
            contentType: { type: "string" },
          },
          required: ["title", "summary", "source", "time", "url"],
        },
      },
    },
    required: ["results"],
  },
};

const ANTHROPIC_HEADERS = (apiKey: string) => ({
  "Content-Type": "application/json",
  "anthropic-version": "2023-06-01",
  "x-api-key": apiKey,
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query, source, mode, customUrl } = await req.json();

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const contentType = mode === "news" ? "trending news" : "trending content";
  const queryClause = query ? ` about "${query}"` : "";
  const sourceLabel = SOURCE_LABELS[source] ?? source;
  const searchPrompt = `Search for ${contentType}${queryClause} from ${sourceLabel}. Find up to 5 real, recent results with their URLs.`;

  try {
    // Step 1 — web_search to gather real results
    const r1 = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: ANTHROPIC_HEADERS(apiKey),
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: searchPrompt }],
      }),
    });

    const d1 = await r1.json();
    if (!r1.ok) {
      return NextResponse.json(
        { error: d1?.error?.message ?? `Anthropic error ${r1.status}` },
        { status: 502 }
      );
    }

    // Step 2 — force structured extraction via submit_results tool (Haiku: cheap, fast, separate TPM bucket)
    const r2 = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: ANTHROPIC_HEADERS(apiKey),
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        tools: [SUBMIT_RESULTS_TOOL],
        tool_choice: { type: "tool", name: "submit_results" },
        messages: [
          { role: "user", content: searchPrompt },
          { role: "assistant", content: d1.content },
          { role: "user", content: "Call submit_results with all the results you found above." },
        ],
      }),
    });

    const d2 = await r2.json();
    if (!r2.ok) {
      return NextResponse.json(
        { error: d2?.error?.message ?? `Anthropic extraction error ${r2.status}` },
        { status: 502 }
      );
    }

    const toolUse = d2.content?.find(
      (b: { type: string; name?: string }) => b.type === "tool_use" && b.name === "submit_results"
    ) as { input: { results: unknown[] } } | undefined;

    if (toolUse?.input?.results) {
      return NextResponse.json({ results: toolUse.input.results });
    }

    return NextResponse.json({ results: [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
