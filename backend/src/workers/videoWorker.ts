import "dotenv/config";
import { Worker, Job } from "bullmq";
import axios from "axios";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { redisConnection } from "../lib/redis";
import { supabase } from "../lib/supabase";
import { uploadFile, getSignedUrl } from "../lib/storage";
import { downloadToTemp, mergeLocalVideos, compositeVideo, extractFootageSegments, getVideoDuration } from "../lib/ffmpeg";
import { downloadVideo } from "../lib/ytdlp";
import {
  getOrCreateIndex,
  indexVideoUrl,
  pollIndexTask,
  findFootageSegments,
} from "../lib/twelvelabs";
import { postToTikTok }    from "../lib/platforms/tiktok";
import { postToYouTube }   from "../lib/platforms/youtube";
import { postToInstagram } from "../lib/platforms/instagram";
import type {
  VideoGenerateJobData,
  VideoMergeJobData,
  VideoDownloadJobData,
  VideoAnalyzeJobData,
  VideoExtractJobData,
  AvatarRenderJobData,
  PostTikTokJobData,
  PostYouTubeJobData,
  PostInstagramJobData,
} from "../types";

const writeFile = promisify(fs.writeFile);
const TMP = "/tmp/shorts-studio";
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function setProgress(jobId: string, progress: number) {
  await supabase
    .from("video_jobs")
    .update({ progress, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

async function setStatus(
  jobId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now, ...extra };
  if (status === "processing") patch.started_at = now;
  if (status === "completed" || status === "failed") patch.completed_at = now;
  await supabase.from("video_jobs").update(patch).eq("id", jobId);
}

// ─── Download: yt-dlp → Supabase Storage ─────────────────────────────────────

async function handleDownload(job: Job<VideoDownloadJobData>) {
  const { job_id, workspace_id, url, video_id } = job.data;

  await setStatus(job_id, "processing");
  await setProgress(job_id, 5);

  // Download with yt-dlp
  const { filePath, metadata } = await downloadVideo(url, job_id);
  await setProgress(job_id, 60);

  // Upload to Supabase storage
  const storagePath = `${workspace_id}/downloads/${job_id}.mp4`;
  await uploadFile(filePath, storagePath, "video/mp4");
  await setProgress(job_id, 90);

  // Optionally tag the videos record with source metadata
  if (video_id) {
    await supabase
      .from("videos")
      .update({
        source_url: url,
        source_title: metadata.title,
        duration_seconds: metadata.duration,
      })
      .eq("id", video_id);
  }

  await setStatus(job_id, "completed", {
    progress: 100,
    result: {
      storage_path: storagePath,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      title: metadata.title,
    },
  });
}

// ─── Analyze: Twelve Labs scene detection (falls back to full video) ──────────

async function handleAnalyze(job: Job<VideoAnalyzeJobData>) {
  const {
    job_id,
    workspace_id,
    storage_path,
    duration,
    twelvelabs_api_key,
    twelvelabs_index_id,
    video_id,
  } = job.data;

  await setStatus(job_id, "processing");
  await setProgress(job_id, 5);

  // ── Fallback: no Twelve Labs ──────────────────────────────────────────────
  if (!twelvelabs_api_key) {
    const signedUrl = await getSignedUrl(storage_path, 3600);
    const localPath = await downloadToTemp(signedUrl, `${job_id}_src_probe.mp4`);
    const dur = duration ?? (await getVideoDuration(localPath));
    try { fs.unlinkSync(localPath); } catch { /* non-fatal */ }

    await setStatus(job_id, "completed", {
      progress: 100,
      result: {
        segments: [{ start: 0, end: Math.round(dur), score: 1 }],
        fallback: true,
      },
    });
    return;
  }

  // ── Step 1: get/create Twelve Labs index ──────────────────────────────────
  await setProgress(job_id, 10);

  const indexId = await getOrCreateIndex(
    twelvelabs_api_key,
    workspace_id,
    twelvelabs_index_id || undefined
  );

  // Persist index_id in workspace_connections so future calls skip creation
  if (!twelvelabs_index_id) {
    await supabase
      .from("workspace_connections")
      .update({ account_name: indexId })
      .eq("workspace_id", workspace_id)
      .eq("provider", "twelvelabs");
  }

  await setProgress(job_id, 15);

  // ── Step 2: submit video URL for indexing ─────────────────────────────────
  // Generate a 2-hour signed URL so Twelve Labs can fetch the file
  const signedUrl = await getSignedUrl(storage_path, 7200);
  const taskId = await indexVideoUrl(twelvelabs_api_key, indexId, signedUrl);

  await setProgress(job_id, 20);

  // ── Step 3: poll until indexed ────────────────────────────────────────────
  const tlVideoId = await pollIndexTask(
    twelvelabs_api_key,
    taskId,
    (pct) => setProgress(job_id, 20 + Math.round(pct * 0.6)) // 20→80
  );

  await setProgress(job_id, 82);

  // ── Step 4: search for event footage segments ─────────────────────────────
  const segments = await findFootageSegments(
    twelvelabs_api_key,
    indexId,
    tlVideoId
  );

  await setProgress(job_id, 95);

  // Fallback to full video if search returned nothing
  const finalSegments =
    segments.length > 0
      ? segments
      : [{ start: 0, end: duration ?? 0, score: 1 }];

  if (video_id) {
    await supabase
      .from("videos")
      .update({ status: "processing" })
      .eq("id", video_id);
  }

  await setStatus(job_id, "completed", {
    progress: 100,
    result: {
      segments: finalSegments,
      twelve_labs_video_id: tlVideoId,
      index_id: indexId,
    },
  });
}

// ─── Extract: FFmpeg segment cut + concat ────────────────────────────────────

async function handleExtract(job: Job<VideoExtractJobData>) {
  const { job_id, workspace_id, storage_path, segments, video_id } = job.data;

  await setStatus(job_id, "processing");
  await setProgress(job_id, 5);

  // Download source video from storage
  const signedUrl = await getSignedUrl(storage_path, 3600);
  const localSourcePath = await downloadToTemp(signedUrl, `${job_id}_src.mp4`);
  await setProgress(job_id, 25);

  // Extract + concatenate segments
  const footageLocalPath = path.join(TMP, `${job_id}_footage.mp4`);
  await extractFootageSegments(localSourcePath, segments, footageLocalPath);
  await setProgress(job_id, 75);

  // Clean up source download
  try { fs.unlinkSync(localSourcePath); } catch { /* non-fatal */ }

  // Upload extracted footage to storage
  const footageStoragePath = `${workspace_id}/footage/${job_id}.mp4`;
  await uploadFile(footageLocalPath, footageStoragePath, "video/mp4");
  await setProgress(job_id, 95);

  if (video_id) {
    await supabase
      .from("videos")
      .update({ source_url: footageStoragePath })
      .eq("id", video_id);
  }

  await setStatus(job_id, "completed", {
    progress: 100,
    result: { footage_storage_path: footageStoragePath },
  });
}

// ─── Generate: ElevenLabs TTS → HeyGen avatar → store ────────────────────────

async function handleGenerate(job: Job<VideoGenerateJobData>) {
  const {
    job_id,
    video_id,
    workspace_id,
    script,
    avatar_id,
    voice_provider,
    lang,
    heygen_api_key,
    elevenlabs_api_key,
    elevenlabs_voice_id,
  } = job.data;

  await setStatus(job_id, "processing");
  await setProgress(job_id, 5);

  const clean = script
    .replace(/\[PAUSE\]/g, "...")
    .replace(/\[CUT TO [A-Z ]+\]/g, "");

  // ── Step 1: ElevenLabs TTS ────────────────────────────────────────────────
  let voiceConfig: Record<string, string>;

  if (voice_provider === "elevenlabs" && elevenlabs_api_key && elevenlabs_voice_id) {
    await setProgress(job_id, 15);

    const ttsRes = await axios.post<ArrayBuffer>(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenlabs_voice_id}`,
      { text: clean, model_id: "eleven_multilingual_v2" },
      { headers: { "xi-api-key": elevenlabs_api_key }, responseType: "arraybuffer" }
    );

    const audioLocalPath = path.join(TMP, `${job_id}_audio.mp3`);
    await writeFile(audioLocalPath, Buffer.from(ttsRes.data));

    const audioStoragePath = `${workspace_id}/${video_id}/audio.mp3`;
    await uploadFile(audioLocalPath, audioStoragePath, "audio/mpeg");

    const audioSignedUrl = await getSignedUrl(audioStoragePath, 3600);
    voiceConfig = { type: "audio", audio_url: audioSignedUrl };

    await setProgress(job_id, 30);
  } else {
    voiceConfig = { type: "text", input_text: clean, voice_id: `${lang}_female_1` };
  }

  // ── Step 2: HeyGen avatar video generation ────────────────────────────────
  await setProgress(job_id, 35);

  const heygenRes = await axios.post(
    "https://api.heygen.com/v2/video/generate",
    {
      video_inputs: [
        {
          character: { type: "avatar", avatar_id, avatar_style: "normal" },
          voice: voiceConfig,
          background: { type: "color", value: "#000000" },
        },
      ],
      dimension: { width: 1080, height: 1920 },
    },
    { headers: { "X-Api-Key": heygen_api_key, "Content-Type": "application/json" } }
  );

  const heygenVideoId = heygenRes.data?.data?.video_id as string | undefined;
  if (!heygenVideoId) throw new Error(`HeyGen error: ${JSON.stringify(heygenRes.data)}`);

  // ── Step 3: Poll HeyGen ───────────────────────────────────────────────────
  let heygenStatus = "processing";
  let attempts = 0;
  let heygenVideoUrl: string | null = null;

  while (heygenStatus === "processing" && attempts < 60) {
    await new Promise((r) => setTimeout(r, 5000));

    const poll = await axios.get(
      `https://api.heygen.com/v1/video_status.get?video_id=${heygenVideoId}`,
      { headers: { "X-Api-Key": heygen_api_key } }
    );

    heygenStatus = poll.data?.data?.status || "processing";
    heygenVideoUrl = poll.data?.data?.video_url ?? null;
    await setProgress(job_id, 35 + Math.min(45, Math.round((attempts / 60) * 45)));
    attempts++;
  }

  if (heygenStatus !== "completed" || !heygenVideoUrl) {
    throw new Error(`HeyGen did not complete. Status: ${heygenStatus}`);
  }

  await setProgress(job_id, 82);

  // ── Step 4: Download + store avatar video ─────────────────────────────────
  const avatarLocalPath = await downloadToTemp(heygenVideoUrl, `${job_id}_avatar.mp4`);
  const avatarStoragePath = `${workspace_id}/${video_id}/avatar.mp4`;
  await uploadFile(avatarLocalPath, avatarStoragePath, "video/mp4");
  await setProgress(job_id, 95);

  await supabase.from("videos")
    .update({ status: "ready", video_url: avatarStoragePath })
    .eq("id", video_id);

  await setStatus(job_id, "completed", {
    progress: 100,
    result: { avatar_storage_path: avatarStoragePath, heygen_video_id: heygenVideoId },
  });
}

// ─── Merge: composite footage + avatar → 1080×1920 MP4 → store ────────────────

function resolveStoragePath(pathOrUrl: string): Promise<string> {
  // If already a public URL, return as-is. Otherwise generate a signed URL.
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return Promise.resolve(pathOrUrl);
  }
  return getSignedUrl(pathOrUrl, 7200);
}

async function handleMerge(job: Job<VideoMergeJobData>) {
  const {
    job_id,
    video_id,
    workspace_id,
    footage_path,
    avatar_path,
    scene_markers,
    effects,
    duration,
  } = job.data;

  await setStatus(job_id, "processing");
  await setProgress(job_id, 5);

  // ── Download footage ───────────────────────────────────────────────────────
  const footageUrl = await resolveStoragePath(footage_path);
  const footageLocalPath = await downloadToTemp(footageUrl, `${job_id}_footage.mp4`);
  await setProgress(job_id, 20);

  // ── Download avatar ────────────────────────────────────────────────────────
  const avatarUrl = await resolveStoragePath(avatar_path);
  const avatarLocalPath = await downloadToTemp(avatarUrl, `${job_id}_avatar.mp4`);
  await setProgress(job_id, 35);

  // ── Composite ─────────────────────────────────────────────────────────────
  const compositeLocalPath = path.join(TMP, `${job_id}_final.mp4`);

  await compositeVideo(footageLocalPath, avatarLocalPath, compositeLocalPath, {
    sceneMarkers: scene_markers,
    effects,
    duration,
  });

  try {
    fs.unlinkSync(footageLocalPath);
    fs.unlinkSync(avatarLocalPath);
  } catch { /* non-fatal */ }

  await setProgress(job_id, 88);

  // ── Upload final video ─────────────────────────────────────────────────────
  const finalStoragePath = `${workspace_id}/${video_id}/final.mp4`;
  await uploadFile(compositeLocalPath, finalStoragePath, "video/mp4");
  await setProgress(job_id, 97);

  // Generate a 1-hour signed URL so the caller can play it immediately
  const downloadUrl = await getSignedUrl(finalStoragePath, 3600);

  await supabase
    .from("videos")
    .update({ status: "ready", video_url: finalStoragePath })
    .eq("id", video_id);

  await setStatus(job_id, "completed", {
    progress: 100,
    result: { final_storage_path: finalStoragePath, download_url: downloadUrl },
  });
}

// ─── Render: HeyGen avatar video (uses pre-generated audio or HeyGen TTS) ────

const HEYGEN_POLL_INTERVAL_MS = 5_000;
const HEYGEN_TIMEOUT_ATTEMPTS = 120; // 120 × 5s = 10 minutes

function cleanScript(script: string): string {
  return script
    .replace(/\[SHOW[^\]]*\]/g, "")
    .replace(/\[PAUSE\]/g, "...")
    .replace(/\[CUT TO [A-Z ]+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function handleRender(job: Job<AvatarRenderJobData>) {
  const {
    job_id,
    video_id,
    workspace_id,
    script,
    avatar_id,
    voice_provider,
    audio_url,
    language,
    heygen_api_key,
    background,
  } = job.data;

  await setStatus(job_id, "processing");
  await setProgress(job_id, 5);

  const clean = cleanScript(script);

  const voiceConfig =
    voice_provider === "elevenlabs" && audio_url
      ? { type: "audio", audio_url }
      : { type: "text", input_text: clean, voice_id: `${language}_female_1` };

  const bgConfig =
    background === "green"
      ? { type: "color", value: "#00FF00" }
      : { type: "color", value: "#000000" };

  // ── Step 1: Submit to HeyGen ──────────────────────────────────────────────

  const heygenRes = await axios.post(
    "https://api.heygen.com/v2/video/generate",
    {
      video_inputs: [
        {
          character: { type: "avatar", avatar_id, avatar_style: "normal" },
          voice: voiceConfig,
          background: bgConfig,
        },
      ],
      dimension: { width: 1080, height: 1920 },
    },
    { headers: { "X-Api-Key": heygen_api_key, "Content-Type": "application/json" } }
  );

  const heygenVideoId = heygenRes.data?.data?.video_id as string | undefined;
  if (!heygenVideoId) {
    throw new Error(`HeyGen rejected the request: ${JSON.stringify(heygenRes.data)}`);
  }

  await setProgress(job_id, 12);

  // ── Step 2: Poll until completed ─────────────────────────────────────────
  // Progress marches from 12 → 85 across the poll window.

  let heygenStatus = "processing";
  let attempts = 0;
  let heygenVideoUrl: string | null = null;

  while (heygenStatus === "processing" && attempts < HEYGEN_TIMEOUT_ATTEMPTS) {
    await new Promise((r) => setTimeout(r, HEYGEN_POLL_INTERVAL_MS));

    const poll = await axios.get(
      `https://api.heygen.com/v1/video_status.get?video_id=${heygenVideoId}`,
      { headers: { "X-Api-Key": heygen_api_key } }
    );

    heygenStatus = poll.data?.data?.status ?? "processing";
    heygenVideoUrl = poll.data?.data?.video_url ?? null;

    await setProgress(
      job_id,
      12 + Math.min(73, Math.round((attempts / HEYGEN_TIMEOUT_ATTEMPTS) * 73))
    );
    attempts++;
  }

  if (heygenStatus !== "completed" || !heygenVideoUrl) {
    throw new Error(
      `HeyGen render timed out or failed after ${attempts} polls. Final status: ${heygenStatus}`
    );
  }

  await setProgress(job_id, 87);

  // ── Step 3: Download + store avatar video ─────────────────────────────────

  const avatarLocalPath = await downloadToTemp(heygenVideoUrl, `${job_id}_avatar.mp4`);
  const avatarStoragePath = `${workspace_id}/${video_id}/avatar.mp4`;
  await uploadFile(avatarLocalPath, avatarStoragePath, "video/mp4");

  await setProgress(job_id, 97);

  if (video_id) {
    await supabase
      .from("videos")
      .update({ status: "ready", video_url: avatarStoragePath })
      .eq("id", video_id);
  }

  await setStatus(job_id, "completed", {
    progress: 100,
    result: {
      avatar_storage_path: avatarStoragePath,
      heygen_video_id: heygenVideoId,
    },
  });
}

// ─── Post helpers ─────────────────────────────────────────────────────────────

async function mergePostResult(
  videoId: string,
  platform: string,
  result: unknown
) {
  // Read current platform_captions, merge in post result, write back.
  const { data: video } = await supabase
    .from("videos")
    .select("platform_captions")
    .eq("id", videoId)
    .single();

  const current: Record<string, unknown> = (video?.platform_captions as Record<string, unknown>) ?? {};
  const existing = (current[platform] as Record<string, unknown>) ?? {};
  const r = result as Record<string, unknown>;

  await supabase
    .from("videos")
    .update({
      status: "posted",
      platform_captions: {
        ...current,
        [platform]: { ...existing, post_result: { ...r, posted_at: new Date().toISOString() } },
      },
    })
    .eq("id", videoId);
}

// ─── Post: TikTok ─────────────────────────────────────────────────────────────

async function handlePostTikTok(job: Job<PostTikTokJobData>) {
  const {
    job_id, video_id, storage_path, caption,
    privacy_level, disable_duet, disable_comment, disable_stitch, access_token,
  } = job.data;

  await setStatus(job_id, "processing");
  await setProgress(job_id, 5);

  // Generate a 24-hour signed URL — TikTok must be able to pull this video
  const videoUrl = await getSignedUrl(storage_path, 86400);
  await setProgress(job_id, 10);

  const result = await postToTikTok(
    access_token,
    {
      videoUrl,
      caption,
      privacyLevel: privacy_level,
      disableDuet: disable_duet,
      disableComment: disable_comment,
      disableStitch: disable_stitch,
    },
    (pct) => setProgress(job_id, 10 + Math.round(pct * 0.88))
  );

  await mergePostResult(video_id, "tiktok", result);

  await setStatus(job_id, "completed", {
    progress: 100,
    result,
  });
}

// ─── Post: YouTube ────────────────────────────────────────────────────────────

async function handlePostYouTube(job: Job<PostYouTubeJobData>) {
  const {
    job_id, video_id, workspace_id, storage_path,
    title, description, tags, category_id, privacy_status, made_for_kids, access_token,
  } = job.data;

  await setStatus(job_id, "processing");
  await setProgress(job_id, 5);

  // YouTube requires uploading the file bytes — download to temp first
  const signedUrl = await getSignedUrl(storage_path, 3600);
  const localPath = await downloadToTemp(signedUrl, `${job_id}_yt.mp4`);
  await setProgress(job_id, 15);

  const result = await postToYouTube(
    access_token,
    { localPath, title, description, tags, categoryId: category_id, privacyStatus: privacy_status, madeForKids: made_for_kids },
    (pct) => setProgress(job_id, 15 + Math.round(pct * 0.82))
  );

  try { fs.unlinkSync(localPath); } catch { /* non-fatal */ }

  await mergePostResult(video_id, "youtube", result);

  await setStatus(job_id, "completed", {
    progress: 100,
    result,
  });
}

// ─── Post: Instagram ──────────────────────────────────────────────────────────

async function handlePostInstagram(job: Job<PostInstagramJobData>) {
  const {
    job_id, video_id, storage_path,
    caption, ig_user_id, share_to_feed, access_token,
  } = job.data;

  await setStatus(job_id, "processing");
  await setProgress(job_id, 5);

  // Generate a 24-hour signed URL — Instagram must be able to pull this video
  const videoUrl = await getSignedUrl(storage_path, 86400);
  await setProgress(job_id, 10);

  const result = await postToInstagram(
    access_token,
    { videoUrl, caption, igUserId: ig_user_id, shareToFeed: share_to_feed },
    (pct) => setProgress(job_id, 10 + Math.round(pct * 0.88))
  );

  await mergePostResult(video_id, "instagram", result);

  await setStatus(job_id, "completed", {
    progress: 100,
    result,
  });
}

// ─── Worker ───────────────────────────────────────────────────────────────────

const worker = new Worker(
  "video",
  async (job: Job) => {
    switch (job.name) {
      case "download": return handleDownload(job as Job<VideoDownloadJobData>);
      case "analyze":  return handleAnalyze(job  as Job<VideoAnalyzeJobData>);
      case "extract":  return handleExtract(job  as Job<VideoExtractJobData>);
      case "generate": return handleGenerate(job as Job<VideoGenerateJobData>);
      case "render":       return handleRender(job        as Job<AvatarRenderJobData>);
      case "merge":        return handleMerge(job         as Job<VideoMergeJobData>);
      case "post_tiktok":  return handlePostTikTok(job    as Job<PostTikTokJobData>);
      case "post_youtube": return handlePostYouTube(job   as Job<PostYouTubeJobData>);
      case "post_instagram": return handlePostInstagram(job as Job<PostInstagramJobData>);
      default:             throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  { connection: redisConnection, concurrency: 2 }
);

worker.on("failed", async (job, err) => {
  console.error(`Job ${job?.id} (${job?.name}) failed:`, err.message);
  if (job?.data?.job_id) {
    await setStatus(job.data.job_id, "failed", { error: err.message });
  }
});

worker.on("completed", (job) => {
  console.log(`Job ${job.id} (${job.name}) completed`);
});

console.log("Video worker running…");
