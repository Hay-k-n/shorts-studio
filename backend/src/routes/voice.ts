import { Router } from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { authMiddleware } from "../middleware/auth";
import { supabase } from "../lib/supabase";
import { uploadFile, getSignedUrl } from "../lib/storage";
import { getVideoDuration } from "../lib/ffmpeg";

const writeFile = promisify(fs.writeFile);
const TMP = "/tmp/shorts-studio";

const router = Router();
router.use(authMiddleware);

// eleven_turbo_v2_5 is faster and English-optimised; multilingual_v2 covers all other languages.
const EL_MODEL: Record<string, string> = { en: "eleven_turbo_v2_5" };
const DEFAULT_EL_MODEL = "eleven_multilingual_v2";

// POST /api/voice/generate
// Returns { provider, audio_path, audio_url?, duration }
// audio_path is a Supabase Storage path; audio_url is a short-lived signed URL for immediate playback.
router.post("/generate", async (req, res) => {
  const { script, provider, language, voiceId, video_id } = req.body as {
    script: string;
    provider: "heygen" | "elevenlabs";
    language: string;
    voiceId?: string;
    video_id?: string;
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

  // HeyGen manages its own TTS — no separate audio file needed.
  if (provider === "heygen") {
    res.json({ provider: "heygen", audio_path: null, duration: null });
    return;
  }

  // ── ElevenLabs TTS ──────────────────────────────────────────────────────────

  const { data: conn } = await supabase
    .from("workspace_connections")
    .select("encrypted_key, account_name")
    .eq("workspace_id", workspaceId)
    .eq("provider", "elevenlabs")
    .single();

  if (!conn?.encrypted_key) {
    res.status(400).json({ error: "ElevenLabs not connected for this workspace" });
    return;
  }

  const resolvedVoiceId = voiceId || conn.account_name;
  if (!resolvedVoiceId) {
    res.status(400).json({ error: "No ElevenLabs voice_id configured — set one in workspace connections" });
    return;
  }

  const model = EL_MODEL[language] ?? DEFAULT_EL_MODEL;

  try {
    const ttsRes = await axios.post<ArrayBuffer>(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
      {
        text: script,
        model_id: model,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      {
        headers: {
          "xi-api-key": conn.encrypted_key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        responseType: "arraybuffer",
      }
    );

    const fileId = randomUUID();
    const localPath = path.join(TMP, `${fileId}_voice.mp3`);
    await writeFile(localPath, Buffer.from(ttsRes.data));

    const duration = await getVideoDuration(localPath);

    // Store under video folder when video_id is known, otherwise a shared audio folder.
    const folder = video_id ? `${workspaceId}/${video_id}` : `${workspaceId}/audio`;
    const storagePath = `${folder}/${fileId}.mp3`;

    await uploadFile(localPath, storagePath, "audio/mpeg");
    const audioUrl = await getSignedUrl(storagePath, 3600);

    res.json({
      provider: "elevenlabs",
      audio_path: storagePath,
      audio_url: audioUrl,
      duration: Math.round(duration),
    });
  } catch (e: any) {
    // ElevenLabs errors come back as binary when responseType=arraybuffer
    let message: string = e.message;
    if (e.response?.data) {
      const raw = e.response.data;
      try {
        message = Buffer.isBuffer(raw)
          ? JSON.parse(raw.toString())?.detail?.message ?? raw.toString()
          : JSON.stringify(raw);
      } catch {
        message = Buffer.isBuffer(raw) ? raw.toString() : String(raw);
      }
    }
    res.status(502).json({ error: message });
  }
});

export default router;
