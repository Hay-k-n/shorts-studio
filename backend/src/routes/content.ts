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

const SOURCE_LABELS: Record<string, string> = {
  all: "Google News, Twitter/X, TikTok",
  google: "Google News",
  twitter: "Twitter/X",
  tiktok: "TikTok",
};

// POST /api/content/search
// Accepts { query, source, mode, customUrl }
// Calls Anthropic with the web_search tool server-side and returns parsed results.
router.post("/search", async (req, res) => {
  const { query, source, mode, customUrl } = req.body as {
    query?: string;
    source: string;
    mode: string;
    customUrl?: string;
  };

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

  try {
    const { data } = await axios.post(
      ANTHROPIC_API,
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: userContent }],
      },
      { headers: { ...ANTHROPIC_HEADERS, "x-api-key": process.env.ANTHROPIC_API_KEY } }
    );

    const text: string =
      data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";

    try {
      const results = JSON.parse(text.replace(/```json|```/g, "").trim());
      res.json({ results: Array.isArray(results) ? results : [results] });
    } catch {
      res.json({
        results: [{ title: "Results", summary: text.substring(0, 250), source: "System", time: "Now" }],
      });
    }
  } catch (e: any) {
    const message = e.response?.data?.error?.message ?? e.message;
    res.status(502).json({ error: message });
  }
});

export default router;
