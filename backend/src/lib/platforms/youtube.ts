import axios, { AxiosError } from "axios";
import fs from "fs";

const UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3/videos";
const DATA_API   = "https://www.googleapis.com/youtube/v3";
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB

export interface YouTubePostOptions {
  localPath: string;      // path to local MP4 file
  title: string;          // max 100 chars; #Shorts appended if not present
  description: string;    // caption + hashtags
  tags?: string[];
  categoryId?: number;    // 25 = News & Politics, 22 = People & Blogs
  privacyStatus?: "public" | "private" | "unlisted";
  madeForKids?: boolean;
}

export interface YouTubePostResult {
  youtube_video_id: string;
  url: string;
  shorts_url: string;
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const status = (e as AxiosError).response?.status ?? 0;
      if ((status !== 429 && status < 500) || attempt === maxAttempts) throw e;
      const retryAfter = (e as AxiosError).response?.headers?.["retry-after"];
      const delay = retryAfter
        ? parseInt(retryAfter) * 1000
        : 2000 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, Math.min(delay, 60_000)));
    }
  }
  throw new Error("unreachable");
}

function youtubeError(e: any): Error {
  const status = e.response?.status;
  const reason = e.response?.data?.error?.errors?.[0]?.reason ?? e.message;
  if (status === 401) {
    return new Error("YouTube access token expired — reconnect the integration");
  }
  if (status === 403 && reason === "quotaExceeded") {
    return new Error("YouTube API quota exceeded — try again tomorrow");
  }
  return new Error(`YouTube error [${status ?? "network"}]: ${reason}`);
}

// ── Initiate a resumable upload session ───────────────────────────────────────
async function initResumableUpload(
  token: string,
  fileSize: number,
  snippet: object,
  status: object
): Promise<string> {
  const res = await axios.post(
    `${UPLOAD_API}?uploadType=resumable&part=snippet,status`,
    { snippet, status },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": String(fileSize),
      },
      // axios follows redirects; we need the Location header from the 200 response
      maxRedirects: 0,
      validateStatus: (s) => s === 200,
    }
  );

  const location = res.headers["location"] as string | undefined;
  if (!location) throw new Error("YouTube did not return an upload Location header");
  return location;
}

// ── Upload in 10 MB chunks with resume support ────────────────────────────────
async function uploadChunks(
  uploadUrl: string,
  localPath: string,
  fileSize: number,
  onProgress?: (pct: number) => void
): Promise<string> {
  let offset = 0;

  while (offset < fileSize) {
    const end = Math.min(offset + CHUNK_SIZE, fileSize);
    const chunkSize = end - offset;

    const chunk = fs.createReadStream(localPath, { start: offset, end: end - 1 });

    const res = await withRetry(() =>
      axios.put(uploadUrl, chunk, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Range": `bytes ${offset}-${end - 1}/${fileSize}`,
          "Content-Length": String(chunkSize),
        },
        maxBodyLength: CHUNK_SIZE + 1024,
        validateStatus: (s) => s === 200 || s === 201 || s === 308,
      })
    );

    if (res.status === 200 || res.status === 201) {
      // Upload complete; YouTube returns the video resource
      const videoId = res.data?.id as string | undefined;
      if (!videoId) throw new Error("YouTube upload completed but returned no video ID");
      return videoId;
    }

    // HTTP 308: Resume Incomplete — advance to server-acknowledged offset
    const range = res.headers["range"] as string | undefined;
    if (range) {
      // range = "bytes=0-{lastByte}"
      offset = parseInt(range.split("-")[1], 10) + 1;
    } else {
      offset = end; // fall forward if no Range header
    }

    onProgress?.(Math.round((offset / fileSize) * 100));
  }

  throw new Error("Upload loop ended without a 200/201 response");
}

export async function postToYouTube(
  token: string,
  opts: YouTubePostOptions,
  onProgress?: (pct: number) => void
): Promise<YouTubePostResult> {
  try {
    // Ensure title is within limits and includes #Shorts marker
    const rawTitle = opts.title.slice(0, 97);
    const title = rawTitle.includes("#Shorts") ? rawTitle : `${rawTitle} #Shorts`;

    // Merge hashtags into description and ensure #Shorts is present
    const description = opts.description.includes("#Shorts")
      ? opts.description
      : `${opts.description}\n\n#Shorts`;

    // Parse hashtag strings like "#tag1 #tag2" into a clean tag array
    const hashtagTags = (opts.description.match(/#\w+/g) ?? [])
      .map((t) => t.replace("#", ""));

    const snippet = {
      title,
      description: description.slice(0, 5000),
      tags: ["Shorts", ...hashtagTags, ...(opts.tags ?? [])].slice(0, 500),
      categoryId: String(opts.categoryId ?? 22), // 22 = People & Blogs
      defaultLanguage: "en",
    };

    const videoStatus = {
      privacyStatus: opts.privacyStatus ?? "public",
      selfDeclaredMadeForKids: opts.madeForKids ?? false,
    };

    const fileSize = fs.statSync(opts.localPath).size;
    onProgress?.(5);

    const uploadUrl = await initResumableUpload(token, fileSize, snippet, videoStatus);
    onProgress?.(10);

    const youtube_video_id = await uploadChunks(
      uploadUrl,
      opts.localPath,
      fileSize,
      (chunkPct) => onProgress?.(10 + Math.round(chunkPct * 0.85))
    );

    onProgress?.(100);

    return {
      youtube_video_id,
      url: `https://www.youtube.com/watch?v=${youtube_video_id}`,
      shorts_url: `https://www.youtube.com/shorts/${youtube_video_id}`,
    };
  } catch (e: any) {
    throw youtubeError(e);
  }
}
