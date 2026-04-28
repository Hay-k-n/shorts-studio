import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);
const TMP = "/tmp/shorts-studio";
const YTDLP = process.env.YTDLP_PATH ?? "yt-dlp";

// Max buffer for yt-dlp stdout (JSON metadata can be large for playlists)
const JSON_BUFFER = 10 * 1024 * 1024;  // 10 MB
const DL_BUFFER  = 10 * 1024 * 1024;  // stdout during download is minimal

export interface VideoMetadata {
  duration: number;   // seconds (integer)
  width: number;
  height: number;
  title: string;
  ext: string;
}

/**
 * Download a video with yt-dlp and return its local path + metadata.
 * Output is always coerced to mp4. Filename: {jobId}_source.mp4
 */
export async function downloadVideo(
  url: string,
  jobId: string
): Promise<{ filePath: string; metadata: VideoMetadata }> {
  // ── Step 1: fetch metadata without downloading ────────────────────────────
  const { stdout: rawJson } = await execFileAsync(
    YTDLP,
    ["--dump-json", "--no-playlist", "--no-warnings", url],
    { maxBuffer: JSON_BUFFER }
  );

  let meta: VideoMetadata;
  try {
    const info = JSON.parse(rawJson.trim());
    meta = {
      duration: Math.round(info.duration ?? 0),
      width: info.width ?? 0,
      height: info.height ?? 0,
      title: info.title ?? "",
      ext: info.ext ?? "mp4",
    };
  } catch {
    throw new Error("yt-dlp returned invalid JSON for metadata");
  }

  // ── Step 2: download ──────────────────────────────────────────────────────
  // %(ext)s in the template lets yt-dlp choose the extension, but
  // --merge-output-format mp4 ensures the final container is mp4.
  const outTemplate = path.join(TMP, `${jobId}_source.%(ext)s`);

  await execFileAsync(
    YTDLP,
    [
      url,
      "--output", outTemplate,
      "--format",
        "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]" +
        "/best[height<=1080][ext=mp4]/best[height<=1080]/best",
      "--merge-output-format", "mp4",
      "--no-playlist",
      "--no-warnings",
      "--quiet",
    ],
    { maxBuffer: DL_BUFFER }
  );

  // ── Step 3: locate the output file ───────────────────────────────────────
  const prefix = `${jobId}_source.`;
  const found = fs.readdirSync(TMP).find(
    (f) => f.startsWith(prefix) && !f.endsWith(".part") && !f.endsWith(".ytdl")
  );
  if (!found) throw new Error(`yt-dlp produced no output file for job ${jobId}`);

  return { filePath: path.join(TMP, found), metadata: meta };
}
