import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

const LANG_LABELS: Record<string, string> = {
  fr: "Français", en: "English",  es: "Español",  de: "Deutsch",
  ar: "العربية",  zh: "中文",     pt: "Português", ru: "Русский",
  ja: "日本語",   ko: "한국어",   it: "Italiano",  hi: "हिन्दी",
  tr: "Türkçe",  hy: "Հայերեն",
};

const MODE_CONFIG: Record<string, { tone: string; verb: string }> = {
  news:     { tone: "factual, authoritative, neutral",         verb: "Write a factual news report" },
  remix:    { tone: "creative, energetic, entertaining",       verb: "Write a creative remix commentary" },
  reaction: { tone: "opinionated, conversational, personal",   verb: "Write a reaction/commentary" },
};

const PLATFORM_LABELS: Record<string, string> = {
  tiktok:    "TikTok",
  youtube:   "YouTube Shorts",
  instagram: "Instagram Reels",
};

interface SceneMarker { start: number; end: number; description: string }

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function parseMarkersFromScript(script: string): SceneMarker[] {
  const markers: SceneMarker[] = [];
  const re = /\[SHOW\s+(\d+):(\d+)[–\-](\d+):(\d+)[^]*?\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(script)) !== null) {
    const start = parseInt(m[1]) * 60 + parseInt(m[2]);
    const end   = parseInt(m[3]) * 60 + parseInt(m[4]);
    const inner = m[0].replace(/^\[SHOW\s+[\d:–\-]+\s*[—-]?\s*/, "").replace(/\]$/, "").trim();
    markers.push({ start, end, description: inner });
  }
  return markers;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { newsItem, videoAnalysis, mode, language, duration, platforms } = await req.json();

  // Normalize platforms to ID array
  const platformIds: string[] = Array.isArray(platforms)
    ? platforms
    : String(platforms ?? "tiktok").split(",").map((p: string) => {
        const t = p.trim().toLowerCase();
        const byLabel = Object.entries(PLATFORM_LABELS).find(([, v]) => v.toLowerCase() === t);
        return byLabel ? byLabel[0] : t;
      });

  // Normalize videoAnalysis
  let scenes: { start: number; end: number; description: string }[] = [];
  let transcript: string | undefined;
  if (typeof videoAnalysis === "string") {
    transcript = videoAnalysis || undefined;
  } else if (videoAnalysis) {
    scenes = videoAnalysis.scenes ?? [];
    transcript = videoAnalysis.transcript;
  }

  const modeConf = MODE_CONFIG[mode] ?? MODE_CONFIG.news;
  const langLabel = LANG_LABELS[language] ?? "English";
  const wordCount = Math.round((duration ?? 30) * 2.2);

  const footageBlock = scenes.length > 0
    ? `\n\nAVAILABLE FOOTAGE TIMELINE:\n${scenes.map((s) => `  ${formatTime(s.start)}–${formatTime(s.end)} | ${s.description}`).join("\n")}\n`
    : "";

  const transcriptBlock = transcript
    ? `\n\nSOURCE TRANSCRIPT (excerpt):\n${transcript.slice(0, 2000)}\n`
    : "";

  const systemPrompt =
    `You are an expert short-form video scriptwriter specializing in ${langLabel} social media content. ` +
    `Your scripts are punchy, hook-first, and optimized for vertical video. ` +
    `Tone: ${modeConf.tone}. ` +
    `Always write in ${langLabel}. ` +
    `You must return valid JSON only — no markdown fences, no prose outside JSON.`;

  const userPrompt =
    `TOPIC: ${newsItem.title}\nSUMMARY: ${newsItem.summary}` +
    (newsItem.url ? `\nSOURCE URL: ${newsItem.url}` : "") +
    footageBlock + transcriptBlock +
    `\n\n${modeConf.verb} script IN ${langLabel.toUpperCase()} for a ${duration}-second short video (~${wordCount} words).` +
    `\n\nSCRIPT REQUIREMENTS:\n- Hook in first 3 seconds\n- Use [PAUSE] for natural speech pauses` +
    (scenes.length > 0
      ? `\n- Insert [SHOW MM:SS–MM:SS — brief description] markers at relevant moments to cue B-roll from the footage timeline above.`
      : `\n- Insert [CUT TO SOURCE VIDEO] at moments where B-roll would appear`) +
    `\n- Write for spoken delivery, not reading` +
    `\n\nOUTPUT FORMAT (JSON only, no markdown):` +
    `\n{"script":"<full script with markers>","sceneMarkers":[{"start":<seconds>,"end":<seconds>,"description":"<what to show>"}],"platforms":{` +
    platformIds.map((id) => `"${id}":{"caption":"<${PLATFORM_LABELS[id] ?? id}-optimized caption in ${langLabel}>","hashtags":"<10-15 relevant hashtags>"}`).join(",") +
    `}}\n\nThe sceneMarkers array must exactly match the [SHOW] markers in the script. Each start/end is in seconds (integer).`;

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
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
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
      const parsed = JSON.parse(text.replace(/```json\s*|```/g, "").trim());
      const script: string = parsed.script ?? "";
      const sceneMarkers: SceneMarker[] =
        Array.isArray(parsed.sceneMarkers) && parsed.sceneMarkers.length > 0
          ? parsed.sceneMarkers
          : parseMarkersFromScript(script);
      return NextResponse.json({ script, sceneMarkers, platforms: parsed.platforms ?? {} });
    } catch {
      const sceneMarkers = parseMarkersFromScript(text);
      return NextResponse.json({ script: text, sceneMarkers, platforms: {} });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
