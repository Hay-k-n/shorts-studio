import { Router, Request, Response, NextFunction } from "express";
import axios from "axios";
import { authMiddleware } from "../middleware/auth";
import { supabase } from "../lib/supabase";
import { videoQueue } from "../queues/videoQueue";
import { getSignedUrl } from "../lib/storage";

const router = Router();
router.use(authMiddleware);

// ── helpers ───────────────────────────────────────────────────────────────────

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

/** Adds a job to the queue with a hard timeout so requests never hang when Redis is slow. */
function queueAdd(name: string, data: Record<string, unknown>, timeoutMs = 8000): Promise<unknown> {
  return Promise.race([
    queueAdd(name, data),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Redis queue timeout — is REDIS_URL reachable from Railway? (waited ${timeoutMs}ms)`)), timeoutMs)
    ),
  ]);
}

async function getConnection(workspace_id: string, provider: string) {
  const { data } = await supabase
    .from("workspace_connections")
    .select("encrypted_key, account_name")
    .eq("workspace_id", workspace_id)
    .eq("provider", provider)
    .single();
  return data;
}

async function getConnections(workspace_id: string, providers: string[]) {
  const { data } = await supabase
    .from("workspace_connections")
    .select("provider, encrypted_key, account_name")
    .eq("workspace_id", workspace_id)
    .in("provider", providers);
  return Object.fromEntries((data ?? []).map((c) => [c.provider, c]));
}

async function createJob(
  step: string,
  workspace_id: string,
  extra: Record<string, unknown> = {}
) {
  const { data: job } = await supabase
    .from("video_jobs")
    .insert({ workspace_id, step, status: "pending", ...extra })
    .select()
    .single();
  return job!;
}

async function linkBullJob(jobId: string, bullJobId: string | number | undefined) {
  if (bullJobId === undefined) return;
  await supabase
    .from("video_jobs")
    .update({ bull_job_id: String(bullJobId) })
    .eq("id", jobId);
}

// ── GET /api/video/avatars?workspace_id= ──────────────────────────────────────

router.get("/avatars", wrap(async (req, res) => {
  const { workspace_id } = req.query as { workspace_id: string };

  const conn = await getConnection(workspace_id, "heygen");
  if (!conn?.encrypted_key) {
    res.status(400).json({ error: "HeyGen not connected" });
    return;
  }

  const { data } = await axios.get("https://api.heygen.com/v2/avatars", {
    headers: { "X-Api-Key": conn.encrypted_key },
  });
  res.json(data);
}));

// ── POST /api/video/download ──────────────────────────────────────────────────
// Downloads a source video URL (YouTube, TikTok, etc.) via yt-dlp.
// Returns job_id; poll GET /api/jobs/:id for progress.
// Result contains: { storage_path, duration, width, height, title }

router.post("/download", wrap(async (req, res) => {
  const { workspace_id, url, video_id } = req.body as {
    workspace_id: string;
    url: string;
    video_id?: string;
  };

  if (!url) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  const job = await createJob("download", workspace_id, {
    ...(video_id ? { video_id } : {}),
  });

  const bullJob = await queueAdd("download", {
    job_id: job.id,
    workspace_id,
    url,
    video_id,
  });

  await linkBullJob(job.id, bullJob.id);
  res.json({ job_id: job.id });
}));

// ── POST /api/video/analyze ───────────────────────────────────────────────────
// Analyzes a source video with Twelve Labs to find event footage segments.
// Falls back to returning the full video as one segment if TL not connected.
// Input: { workspace_id, storage_path, duration?, video_id? }
// Result contains: { segments: [{start, end, score}], twelve_labs_video_id? }

router.post("/analyze", wrap(async (req, res) => {
  const { workspace_id, storage_path, duration, video_id } = req.body as {
    workspace_id: string;
    storage_path: string;
    duration?: number;
    video_id?: string;
  };

  if (!storage_path) {
    res.status(400).json({ error: "storage_path is required" });
    return;
  }

  const tlConn = await getConnection(workspace_id, "twelvelabs");

  const job = await createJob("analyze", workspace_id, {
    ...(video_id ? { video_id } : {}),
  });

  const bullJob = await queueAdd("analyze", {
    job_id: job.id,
    workspace_id,
    storage_path,
    duration,
    video_id,
    twelvelabs_api_key: tlConn?.encrypted_key ?? undefined,
    twelvelabs_index_id: tlConn?.account_name ?? undefined,
  });

  await linkBullJob(job.id, bullJob.id);
  res.json({ job_id: job.id });
}));

// ── POST /api/video/extract-footage ──────────────────────────────────────────
// Extracts and concatenates specific time segments from a source video.
// Input: { workspace_id, storage_path, segments: [{start, end}], video_id? }
// Result contains: { footage_storage_path }

router.post("/extract-footage", wrap(async (req, res) => {
  const { workspace_id, storage_path, segments, video_id } = req.body as {
    workspace_id: string;
    storage_path: string;
    segments: { start: number; end: number }[];
    video_id?: string;
  };

  if (!storage_path || !Array.isArray(segments) || segments.length === 0) {
    res.status(400).json({ error: "storage_path and segments[] are required" });
    return;
  }

  const job = await createJob("extract", workspace_id, {
    ...(video_id ? { video_id } : {}),
  });

  const bullJob = await queueAdd("extract", {
    job_id: job.id,
    workspace_id,
    storage_path,
    segments,
    video_id,
  });

  await linkBullJob(job.id, bullJob.id);
  res.json({ job_id: job.id });
}));

// ── POST /api/video/generate — Queue avatar video generation ──────────────────

router.post("/generate", wrap(async (req, res) => {
  const { workspace_id, video_id, script, avatar_id, voice_provider, lang } =
    req.body as {
      workspace_id: string;
      video_id: string;
      script: string;
      avatar_id: string;
      voice_provider: "heygen" | "elevenlabs";
      lang: string;
    };

  const conns = await getConnections(workspace_id, ["heygen", "elevenlabs"]);
  if (!conns.heygen?.encrypted_key) {
    res.status(400).json({ error: "HeyGen not connected" });
    return;
  }

  const job = await createJob("generate", workspace_id, { video_id });

  const bullJob = await queueAdd("generate", {
    job_id: job.id,
    video_id,
    workspace_id,
    script,
    avatar_id,
    voice_provider,
    lang,
    heygen_api_key: conns.heygen.encrypted_key,
    elevenlabs_api_key: conns.elevenlabs?.encrypted_key,
    elevenlabs_voice_id: conns.elevenlabs?.account_name ?? undefined,
  });

  await linkBullJob(job.id, bullJob.id);
  res.json({ job_id: job.id, bull_job_id: bullJob.id });
}));

// ── POST /api/video/merge ─────────────────────────────────────────────────────
// Composites footage (top) and avatar (bottom) into a 1080×1920 vertical video.
// Input: { video_id, footagePath, avatarPath, sceneMarkers, effects, duration }
// Returns job_id; poll GET /api/jobs/:id for progress.
// Result contains: { final_storage_path, download_url }

router.post("/merge", wrap(async (req, res) => {
  const { video_id, footagePath, avatarPath, sceneMarkers, effects, duration } =
    req.body as {
      video_id: string;
      footagePath: string;
      avatarPath: string;
      sceneMarkers?: { start: number; end: number; description: string }[];
      effects?: { entrance?: string[]; scene?: string[]; exit?: string[] };
      duration: number;
    };

  const workspace_id = req.workspaceId;
  if (!workspace_id) {
    res.status(400).json({ error: "X-Workspace-Id header required" });
    return;
  }
  if (!footagePath || !avatarPath) {
    res.status(400).json({ error: "footagePath and avatarPath are required" });
    return;
  }
  if (!duration || duration <= 0) {
    res.status(400).json({ error: "duration (seconds) is required" });
    return;
  }

  const job = await createJob("merge", workspace_id, { video_id });

  const bullJob = await queueAdd("merge", {
    job_id: job.id,
    video_id,
    workspace_id,
    footage_path: footagePath,
    avatar_path: avatarPath,
    scene_markers: sceneMarkers ?? [],
    effects: {
      entrance: effects?.entrance ?? [],
      scene:    effects?.scene    ?? [],
      exit:     effects?.exit     ?? [],
    },
    duration,
  });

  await linkBullJob(job.id, bullJob.id);
  res.json({ job_id: job.id });
}));

// ── GET /api/video/job/:id — Poll job status (legacy; prefer GET /api/jobs/:id)

router.get("/job/:id", wrap(async (req, res) => {
  const { data: job, error } = await supabase
    .from("video_jobs")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(job);
}));

// ── GET /api/video/:id/url?expires_in=3600 ────────────────────────────────────

router.get("/:id/url", wrap(async (req, res) => {
  const expiresIn = Number(req.query.expires_in) || 3600;

  const { data: video, error } = await supabase
    .from("videos")
    .select("video_url, workspace_id")
    .eq("id", req.params.id)
    .single();

  if (error || !video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  if (!video.video_url) {
    res.status(409).json({ error: "Video has no output file yet" });
    return;
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", video.workspace_id)
    .eq("user_id", req.user!.id)
    .single();

  if (!membership) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const signedUrl = await getSignedUrl(video.video_url, expiresIn);
  res.json({ url: signedUrl, expires_in: expiresIn });
}));

export default router;
