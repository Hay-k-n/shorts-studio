import { Router } from "express";
import axios from "axios";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_HEADERS = {
  "Content-Type": "application/json",
  "anthropic-version": "2023-06-01",
};

const LANG_LABELS: Record<string, string> = {
  fr: "Français", en: "English",  es: "Español",  de: "Deutsch",
  ar: "العربية",  zh: "中文",     pt: "Português", ru: "Русский",
  ja: "日本語",   ko: "한국어",   it: "Italiano",  hi: "हिन्दी",
  tr: "Türkçe",  hy: "Հայերեն",
};

const MODE_CONFIG: Record<string, { tone: string; verb: string }> = {
  news:     { tone: "factual, authoritative, neutral",  verb: "Write a factual news report" },
  remix:    { tone: "creative, energetic, entertaining", verb: "Write a creative remix commentary" },
  reaction: { tone: "opinionated, conversational, personal", verb: "Write a reaction/commentary" },
};

const PLATFORM_LABELS: Record<string, string> = {
  tiktok:    "TikTok",
  youtube:   "YouTube Shorts",
  instagram: "Instagram Reels",
};

interface SceneMarker { start: number; end: number; description: string }

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
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

// POST /api/script/generate
router.post("/generate", async (req, res) => {
  const { newsItem, videoAnalysis, mode, language, duration, platforms } = req.body as {
    newsItem: { title: string; summary: string; url?: string };
    videoAnalysis?: { scenes?: { start: number; end: number; description: string }[]; transcript?: string } | string;
    mode: string;
    language: string;
    duration: number;
    platforms: string[] | string;
  };

  // Normalize platforms to ID array
  const platformIds: string[] = Array.isArray(platforms)
    ? platforms
    : String(platforms).split(",").map((p) => {
        const trimmed = p.trim().toLowerCase();
        // Accept either IDs ("tiktok") or labels ("TikTok", "YouTube Shorts")
        const byLabel = Object.entries(PLATFORM_LABELS).find(([, v]) => v.toLowerCase() === trimmed);
        return byLabel ? byLabel[0] : trimmed;
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
  const wordCount = Math.round(duration * 2.2);

  // Build footage timeline block
  let footageBlock = "";
  if (scenes.length > 0) {
    const lines = scenes.map((s) => `  ${formatTime(s.start)}–${formatTime(s.end)} | ${s.description}`);
    footageBlock = `\n\nAVAILABLE FOOTAGE TIMELINE:\n${lines.join("\n")}\n`;
  }

  const transcriptBlock = transcript
    ? `\n\nSOURCE TRANSCRIPT (excerpt):\n${transcript.slice(0, 2000)}\n`
    : "";

  const platformList = platformIds.map((id) => PLATFORM_LABELS[id] ?? id).join(", ");

  const systemPrompt =
    `You are an expert short-form video scriptwriter specializing in ${langLabel} social media content. ` +
    `Your scripts are punchy, hook-first, and optimized for vertical video. ` +
    `Tone: ${modeConf.tone}. ` +
    `Always write in ${langLabel}. ` +
    `You must return valid JSON only — no markdown fences, no prose outside JSON.`;

  const userPrompt =
    `TOPIC: ${newsItem.title}\nSUMMARY: ${newsItem.summary}` +
    (newsItem.url ? `\nSOURCE URL: ${newsItem.url}` : "") +
    footageBlock +
    transcriptBlock +
    `\n\n${modeConf.verb} script IN ${langLabel.toUpperCase()} for a ${duration}-second short video (~${wordCount} words).` +
    `\n\nSCRIPT REQUIREMENTS:` +
    `\n- Hook in first 3 seconds` +
    `\n- Use [PAUSE] for natural speech pauses` +
    (scenes.length > 0
      ? `\n- Insert [SHOW MM:SS–MM:SS — brief description] markers at relevant moments to cue B-roll from the footage timeline above. Use only timestamps that appear in the timeline.`
      : `\n- Insert [CUT TO SOURCE VIDEO] at moments where B-roll would appear`) +
    `\n- Write for spoken delivery, not reading` +
    `\n\nOUTPUT FORMAT (JSON only, no markdown):` +
    `\n{"script":"<full script with markers>","sceneMarkers":[{"start":<seconds>,"end":<seconds>,"description":"<what to show>"}],"platforms":{` +
    platformIds.map((id) => `"${id}":{"caption":"<${PLATFORM_LABELS[id] ?? id}-optimized caption in ${langLabel}>","hashtags":"<10-15 relevant hashtags>"}`).join(",") +
    `}}\n\nThe sceneMarkers array must exactly match the [SHOW] markers you placed in the script. Each start/end is in seconds (integer).`;

  try {
    const { data } = await axios.post(
      ANTHROPIC_API,
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: userPrompt }],
      },
      { headers: { ...ANTHROPIC_HEADERS, "x-api-key": process.env.ANTHROPIC_API_KEY } }
    );

    const text: string =
      data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";

    try {
      const parsed = JSON.parse(text.replace(/```json\s*|```/g, "").trim());

      const script: string = parsed.script ?? "";
      const sceneMarkers: SceneMarker[] =
        Array.isArray(parsed.sceneMarkers) && parsed.sceneMarkers.length > 0
          ? parsed.sceneMarkers
          : parseMarkersFromScript(script);

      res.json({
        script,
        sceneMarkers,
        platforms: parsed.platforms ?? {},
      });
    } catch {
      // Claude returned prose — extract what we can
      const sceneMarkers = parseMarkersFromScript(text);
      res.json({ script: text, sceneMarkers, platforms: {} });
    }
  } catch (e: any) {
    const message = e.response?.data?.error?.message ?? e.message;
    res.status(502).json({ error: message });
  }
});

export default router;
