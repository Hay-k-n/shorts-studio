import { Router } from "express";
import axios from "axios";
import { authMiddleware } from "../middleware/auth";
import { supabase } from "../lib/supabase";
import { videoQueue } from "../queues/videoQueue";

const router = Router();
router.use(authMiddleware);

// ── In-memory avatar list cache (per workspace) ───────────────────────────────
// Avoids hammering HeyGen on every page load. TTL = 1 hour.

interface AvatarItem {
  id: string;
  name: string;
  version: string;
  preview_url: string | null;
}

const avatarCache = new Map<string, { items: AvatarItem[]; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchHeyGenConn(workspaceId: string) {
  const { data } = await supabase
    .from("workspace_connections")
    .select("encrypted_key")
    .eq("workspace_id", workspaceId)
    .eq("provider", "heygen")
    .single();
  return data;
}

function isV4Plus(avatar: Record<string, unknown>): boolean {
  const v = String(avatar.version ?? avatar.avatar_version ?? "");
  if (!v) return false;
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return n >= 4;
}

// ── GET /api/avatar/list ──────────────────────────────────────────────────────
// Returns v4+ avatars for the workspace's HeyGen account; cached for 1 hour.

router.get("/list", async (req, res) => {
  const workspaceId = req.workspaceId;
  if (!workspaceId) {
    res.status(400).json({ error: "X-Workspace-Id header required" });
    return;
  }

  const cached = avatarCache.get(workspaceId);
  if (cached && Date.now() < cached.expiresAt) {
    res.json({ avatars: cached.items, cached: true });
    return;
  }

  const conn = await fetchHeyGenConn(workspaceId);
  if (!conn?.encrypted_key) {
    res.status(400).json({ error: "HeyGen not connected for this workspace" });
    return;
  }

  try {
    const { data } = await axios.get("https://api.heygen.com/v2/avatars", {
      headers: { "X-Api-Key": conn.encrypted_key },
    });

    const all: Record<string, unknown>[] = data?.data?.avatars ?? [];
    const v4plus = all.filter(isV4Plus);

    const items: AvatarItem[] = (v4plus.length > 0 ? v4plus : all).map((a) => ({
      id: a.avatar_id as string,
      name: (a.avatar_name as string | undefined) ?? (a.avatar_id as string),
      version: (a.version as string | undefined) ?? (a.avatar_version as string | undefined) ?? "v5+",
      preview_url: (a.preview_image_url as string | null | undefined) ?? null,
    }));

    avatarCache.set(workspaceId, { items, expiresAt: Date.now() + CACHE_TTL_MS });
    res.json({ avatars: items, cached: false });
  } catch (e: any) {
    res.status(502).json({ error: e.response?.data?.message ?? e.message });
  }
});

// ── POST /api/avatar/render ───────────────────────────────────────────────────
// Queues a HeyGen avatar render job. Returns job_id; poll GET /api/jobs/:id.
// Result contains: { avatar_storage_path, heygen_video_id }

router.post("/render", async (req, res) => {
  const {
    script,
    avatarId,
    voiceProvider,
    audioUrl,
    language,
    video_id,
    background = "black",
  } = req.body as {
    script: string;
    avatarId: string;
    voiceProvider: "heygen" | "elevenlabs";
    audioUrl?: string;
    language: string;
    video_id: string;
    background?: "black" | "green";
  };

  const workspaceId = req.workspaceId;
  if (!workspaceId) {
    res.status(400).json({ error: "X-Workspace-Id header required" });
    return;
  }
  if (!script?.trim()) {
    res.status(400).json({ error: "script is required" });
    return;
  }
  if (!avatarId) {
    res.status(400).json({ error: "avatarId is required" });
    return;
  }
  if (!video_id) {
    res.status(400).json({ error: "video_id is required" });
    return;
  }
  if (voiceProvider === "elevenlabs" && !audioUrl) {
    res.status(400).json({ error: "audioUrl is required when voiceProvider is elevenlabs" });
    return;
  }

  const conn = await fetchHeyGenConn(workspaceId);
  if (!conn?.encrypted_key) {
    res.status(400).json({ error: "HeyGen not connected for this workspace" });
    return;
  }

  const { data: jobRow, error } = await supabase
    .from("video_jobs")
    .insert({ workspace_id: workspaceId, video_id, step: "generate", status: "pending" })
    .select()
    .single();

  if (error || !jobRow) {
    res.status(500).json({ error: "Failed to create job record" });
    return;
  }

  const bullJob = await videoQueue.add("render", {
    job_id: jobRow.id,
    video_id,
    workspace_id: workspaceId,
    script,
    avatar_id: avatarId,
    voice_provider: voiceProvider,
    audio_url: audioUrl,
    language,
    heygen_api_key: conn.encrypted_key,
    background,
  });

  await supabase
    .from("video_jobs")
    .update({ bull_job_id: String(bullJob.id) })
    .eq("id", jobRow.id);

  res.json({ job_id: jobRow.id });
});

export default router;
