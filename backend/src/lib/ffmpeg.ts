import ffmpegStatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import axios from "axios";
import fs from "fs";
import path from "path";
import { promisify } from "util";

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

const writeFile = promisify(fs.writeFile);
const TMP = "/tmp/shorts-studio";
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

/** Download a URL to /tmp and return the local path. */
export async function downloadToTemp(url: string, filename: string): Promise<string> {
  const filePath = path.join(TMP, filename);
  const res = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
  await writeFile(filePath, Buffer.from(res.data));
  return filePath;
}

/** Probe a local file and return its duration in seconds. */
export function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) reject(err);
      else resolve(meta.format.duration ?? 0);
    });
  });
}

export interface SceneMarker {
  start: number;
  end: number;
  description: string;
}

export interface CompositeEffects {
  entrance?: string[];  // e.g. ['fade_in', 'zoom_in', 'slide_up']
  scene?: string[];     // e.g. ['zoom_out', 'ken_burns', 'pulse']
  exit?: string[];      // e.g. ['fade_out', 'scale_down', 'blur_out']
}

export interface CompositeOptions {
  sceneMarkers?: SceneMarker[];
  effects?: CompositeEffects;
  duration: number;     // seconds — drives fade-out timing
  fps?: number;
}

/**
 * Build the zoompan filter string for the footage top-panel.
 * Returns undefined if no scene effect is active.
 */
function footageZoompan(
  scene: Set<string>,
  markers: SceneMarker[],
  duration: number,
  fps: number
): string | undefined {
  const totalFrames = Math.ceil(duration * fps);
  const common = `d=1:s=1080x960:fps=${fps}`;
  const center = `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;

  if (scene.has("zoom_out")) {
    // 1.3x → 1.0x linearly over the full duration
    const rate = (0.3 / totalFrames).toFixed(8);
    return `zoompan=z='max(1.001,1.3-on*${rate})':${center}:${common}`;
  }

  if (scene.has("ken_burns")) {
    // Slow zoom-in (1.0→1.2x) with a gentle rightward pan
    const zRate = (0.2 / totalFrames).toFixed(8);
    return (
      `zoompan=z='min(1.2,1.0+on*${zRate})':` +
      `x='max(0,min(iw-iw/zoom,(iw-iw/zoom)*on/${totalFrames}))':` +
      `y='ih/2-(ih/zoom/2)':${common}`
    );
  }

  if (scene.has("pulse")) {
    // Brief zoom pulse (0.08×) at each scene marker boundary.
    // Falls back to a 4-second sine pulse if no markers are provided.
    const bumps =
      markers.length > 0
        ? markers
            .slice(0, 12) // cap expression length at 12 markers
            .map((m) => `0.08*exp(-20*pow(on/${fps}-${m.start},2))`)
            .join("+")
        : `0.08*sin(2*3.14159*on/${fps * 4})`;
    return `zoompan=z='max(1.001,1.0+${bumps})':${center}:${common}`;
  }

  return undefined;
}

/**
 * Composite two video files into a 1080×1920 vertical layout:
 *   - Top 1080×960: footage, scaled and cropped to fill (no black bars)
 *   - Bottom 1080×960: avatar video, scaled and cropped to fill
 *
 * Applies optional scene effects to the footage panel and entrance/exit
 * effects (fades) to the final composited output.
 * Audio comes exclusively from the avatar track.
 *
 * Effects implemented:
 *   scene    → zoom_out, ken_burns, pulse  (zoompan on footage panel)
 *   entrance → fade_in, zoom_in, slide_up  (fade on composited output)
 *   exit     → fade_out, scale_down, blur_out (fade on composited output)
 *
 * Note: zoompan scene effects are CPU-intensive (~1–2× real-time for
 * 1080×960). Consider this when sizing worker concurrency.
 */
export function compositeVideo(
  footagePath: string,
  avatarPath: string,
  outputPath: string,
  options: CompositeOptions
): Promise<void> {
  const { sceneMarkers = [], effects = {}, duration, fps = 30 } = options;
  const entrance = new Set(effects.entrance ?? []);
  const scene    = new Set(effects.scene    ?? []);
  const exit     = new Set(effects.exit     ?? []);

  // ── Footage (top) filter chain ──────────────────────────────────────────────
  // scale-to-fill: upscale to cover 1080×960 then center-crop; no black bars.
  const footageParts: string[] = [
    "scale=1080:960:force_original_aspect_ratio=increase",
    "crop=1080:960",
    "setsar=1",
  ];

  const zoompanFilter = footageZoompan(scene, sceneMarkers, duration, fps);
  if (zoompanFilter) footageParts.push(zoompanFilter);

  // ── Global (post-stack) filter chain ───────────────────────────────────────
  const globalParts: string[] = [];

  // All entrance variants map to a fade-in (slide_up & zoom_in are approximated
  // as fade-in to avoid a second zoompan pass on the full 1080×1920 output).
  if (entrance.has("fade_in") || entrance.has("zoom_in") || entrance.has("slide_up")) {
    globalParts.push("fade=t=in:st=0:d=0.8");
  }

  // All exit variants map to a fade-to-black (blur_out and scale_down would
  // require additional filter passes that double encode time).
  if (exit.has("fade_out") || exit.has("scale_down") || exit.has("blur_out")) {
    const fadeStart = Math.max(0, duration - 0.9).toFixed(2);
    globalParts.push(`fade=t=out:st=${fadeStart}:d=0.8`);
  }

  // ── Assemble filter graph ───────────────────────────────────────────────────
  const filterGraph: string[] = [
    `[0:v]${footageParts.join(",")}[top]`,
    "[1:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[bot]",
  ];

  if (globalParts.length > 0) {
    filterGraph.push("[top][bot]vstack=inputs=2[stacked]");
    filterGraph.push(`[stacked]${globalParts.join(",")}[v]`);
  } else {
    filterGraph.push("[top][bot]vstack=inputs=2[v]");
  }

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(footagePath)
      .input(avatarPath)
      .complexFilter(filterGraph)
      .outputOptions([
        "-map [v]",
        "-map 1:a",        // audio from avatar only
        "-c:v libx264",
        "-preset fast",
        "-crf 20",         // quality-based; ~4 Mbps for 1080p at crf 20
        "-c:a aac",
        "-b:a 192k",
        "-r 30",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
      ])
      .output(outputPath)
      .on("start", (cmd) => console.log("[ffmpeg] compositing:", cmd.slice(0, 120)))
      .on("end", () => resolve())
      .on("error", (err, stdout, stderr) =>
        reject(new Error(`compositeVideo failed: ${err.message}\n${stderr}`))
      )
      .run();
  });
}

/**
 * Stack two local video files vertically (source top 960px, avatar bottom 960px).
 * Legacy helper — use compositeVideo for new pipelines.
 */
export function mergeLocalVideos(
  sourcePath: string,
  avatarPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(sourcePath)
      .input(avatarPath)
      .complexFilter([
        "[0:v]scale=1080:960,setsar=1[top]",
        "[1:v]scale=1080:960,setsar=1[bot]",
        "[top][bot]vstack=inputs=2[v]",
      ])
      .outputOptions([
        "-map [v]",
        "-map 1:a",
        "-c:v libx264",
        "-c:a aac",
        "-r 30",
        "-preset fast",
        "-movflags +faststart",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

/**
 * Extract specific time segments from a video and concatenate them into one file.
 * Uses stream copy for speed (no re-encode). Seeks to keyframe before each segment
 * by placing -ss before -i, so cuts are near-frame-accurate without re-encoding.
 *
 * If only one segment, the output is that segment directly.
 */
export async function extractFootageSegments(
  inputPath: string,
  segments: { start: number; end: number }[],
  outputPath: string
): Promise<void> {
  if (segments.length === 0) throw new Error("extractFootageSegments: no segments");

  const segPaths: string[] = [];

  // Extract each segment
  for (let i = 0; i < segments.length; i++) {
    const { start, end } = segments[i];
    const duration = end - start;
    const segPath = outputPath.replace(/\.mp4$/, `_seg${i}.mp4`);
    segPaths.push(segPath);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .inputOptions([`-ss ${start}`])  // fast seek (keyframe) before input
        .input(inputPath)
        .inputOptions([])
        .outputOptions([
          `-t ${duration}`,
          "-c copy",
          "-avoid_negative_ts make_zero",
        ])
        .output(segPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
  }

  if (segPaths.length === 1) {
    fs.renameSync(segPaths[0], outputPath);
    return;
  }

  // Write concat list and merge
  const listPath = outputPath.replace(/\.mp4$/, "_list.txt");
  fs.writeFileSync(
    listPath,
    segPaths.map((p) => `file '${p}'`).join("\n"),
    "utf-8"
  );

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .inputOptions(["-f concat", "-safe 0"])
      .input(listPath)
      .outputOptions(["-c copy", "-movflags +faststart"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });

  // Cleanup temp segments and list
  for (const p of segPaths) {
    try { fs.unlinkSync(p); } catch { /* non-fatal */ }
  }
  try { fs.unlinkSync(listPath); } catch { /* non-fatal */ }
}
