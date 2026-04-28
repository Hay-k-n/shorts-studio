import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { supabase } from "../lib/supabase";
import { videoQueue } from "../queues/videoQueue";

const router = Router();
router.use(authMiddleware);

// ── Shared helpers ─────────────────────────────────────────────────────────────

async function getConn(workspaceId: string, provider: string) {
  const { data } = await supabase
    .from("workspace_connections")
    .select("encrypted_key, account_name")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .single();
  return data;
}

async function createPostJob(workspaceId: string, videoId: string) {
  const { data, error } = await supabase
    .from("video_jobs")
    .insert({ workspace_id: workspaceId, video_id: videoId, step: "post", status: "pending" })
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to create post job: ${error?.message}`);
  return data;
}

async function linkBullJob(jobId: string, bullJobId: string | number) {
  await supabase
    .from("video_jobs")
    .update({ bull_job_id: String(bullJobId) })
    .eq("id", jobId);
}

// ── POST /api/post/tiktok ──────────────────────────────────────────────────────
// Input: { video_id, storagePath, caption, hashtags, privacyLevel?,
//          disableDuet?, disableComment?, disableStitch? }
// Returns: { job_id } — poll GET /api/jobs/:id
// Result: { publish_id, status }

router.post("/tiktok", async (req, res) => {
  const {
    video_id,
    storagePath,
    caption,
    hashtags,
    privacyLevel = "PUBLIC_TO_EVERYONE",
    disableDuet = false,
    disableComment = false,
    disableStitch = false,
  } = req.body as {
    video_id: string;
    storagePath: string;
    caption: string;
    hashtags?: string;
    privacyLevel?: string;
    disableDuet?: boolean;
    disableComment?: boolean;
    disableStitch?: boolean;
  };

  const workspaceId = req.workspaceId;
  if (!workspaceId) { res.status(400).json({ error: "X-Workspace-Id header required" }); return; }
  if (!storagePath) { res.status(400).json({ error: "storagePath is required" }); return; }
  if (!video_id)    { res.status(400).json({ error: "video_id is required" }); return; }

  const conn = await getConn(workspaceId, "tiktok");
  if (!conn?.encrypted_key) { res.status(400).json({ error: "TikTok not connected" }); return; }

  const fullCaption = hashtags ? `${caption}\n\n${hashtags}` : caption;

  const job = await createPostJob(workspaceId, video_id);
  const bullJob = await videoQueue.add("post_tiktok", {
    job_id: job.id,
    video_id,
    workspace_id: workspaceId,
    storage_path: storagePath,
    caption: fullCaption,
    privacy_level: privacyLevel,
    disable_duet: disableDuet,
    disable_comment: disableComment,
    disable_stitch: disableStitch,
    access_token: conn.encrypted_key,
  });

  await linkBullJob(job.id, bullJob.id);
  res.json({ job_id: job.id });
});

// ── POST /api/post/youtube ─────────────────────────────────────────────────────
// Input: { video_id, storagePath, title, caption, hashtags,
//          categoryId?, privacyStatus?, madeForKids? }
// Returns: { job_id }
// Result: { youtube_video_id, url, shorts_url }

router.post("/youtube", async (req, res) => {
  const {
    video_id,
    storagePath,
    title,
    caption,
    hashtags,
    categoryId = 22,
    privacyStatus = "public",
    madeForKids = false,
  } = req.body as {
    video_id: string;
    storagePath: string;
    title: string;
    caption: string;
    hashtags?: string;
    categoryId?: number;
    privacyStatus?: string;
    madeForKids?: boolean;
  };

  const workspaceId = req.workspaceId;
  if (!workspaceId) { res.status(400).json({ error: "X-Workspace-Id header required" }); return; }
  if (!storagePath) { res.status(400).json({ error: "storagePath is required" }); return; }
  if (!video_id)    { res.status(400).json({ error: "video_id is required" }); return; }
  if (!title)       { res.status(400).json({ error: "title is required" }); return; }

  const conn = await getConn(workspaceId, "youtube");
  if (!conn?.encrypted_key) { res.status(400).json({ error: "YouTube not connected" }); return; }

  const description = [caption, hashtags].filter(Boolean).join("\n\n");

  const job = await createPostJob(workspaceId, video_id);
  const bullJob = await videoQueue.add("post_youtube", {
    job_id: job.id,
    video_id,
    workspace_id: workspaceId,
    storage_path: storagePath,
    title,
    description,
    tags: [],
    category_id: categoryId,
    privacy_status: privacyStatus,
    made_for_kids: madeForKids,
    access_token: conn.encrypted_key,
  });

  await linkBullJob(job.id, bullJob.id);
  res.json({ job_id: job.id });
});

// ── POST /api/post/instagram ───────────────────────────────────────────────────
// Input: { video_id, storagePath, caption, hashtags, shareToFeed? }
// Returns: { job_id }
// Result: { media_id, permalink }

router.post("/instagram", async (req, res) => {
  const {
    video_id,
    storagePath,
    caption,
    hashtags,
    shareToFeed = true,
  } = req.body as {
    video_id: string;
    storagePath: string;
    caption: string;
    hashtags?: string;
    shareToFeed?: boolean;
  };

  const workspaceId = req.workspaceId;
  if (!workspaceId) { res.status(400).json({ error: "X-Workspace-Id header required" }); return; }
  if (!storagePath) { res.status(400).json({ error: "storagePath is required" }); return; }
  if (!video_id)    { res.status(400).json({ error: "video_id is required" }); return; }

  const conn = await getConn(workspaceId, "instagram");
  if (!conn?.encrypted_key) { res.status(400).json({ error: "Instagram not connected" }); return; }
  if (!conn.account_name) { res.status(400).json({ error: "Instagram Business Account ID not configured" }); return; }

  const fullCaption = hashtags ? `${caption}\n\n${hashtags}` : caption;

  const job = await createPostJob(workspaceId, video_id);
  const bullJob = await videoQueue.add("post_instagram", {
    job_id: job.id,
    video_id,
    workspace_id: workspaceId,
    storage_path: storagePath,
    caption: fullCaption,
    ig_user_id: conn.account_name,
    share_to_feed: shareToFeed,
    access_token: conn.encrypted_key,
  });

  await linkBullJob(job.id, bullJob.id);
  res.json({ job_id: job.id });
});

export default router;
