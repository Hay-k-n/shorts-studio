import axios, { AxiosError } from "axios";

const BASE = "https://open.tiktokapis.com/v2";

export interface TikTokPostOptions {
  videoUrl: string;          // publicly accessible URL (24hr signed URL is fine)
  caption: string;           // combined caption + hashtags, max 2200 chars
  privacyLevel?: string;     // defaults to PUBLIC_TO_EVERYONE
  disableDuet?: boolean;
  disableComment?: boolean;
  disableStitch?: boolean;
}

export interface TikTokPostResult {
  publish_id: string;
  status: string;
}

type TikTokStatus =
  | "PROCESSING_UPLOAD"
  | "PROCESSING_COMPRESS"
  | "SENDING_TO_USER_INBOX"
  | "PUBLISH_COMPLETE"
  | "FAILED";

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
      await new Promise((r) => setTimeout(r, Math.min(delay, 30_000)));
    }
  }
  throw new Error("unreachable");
}

function tiktokError(e: any): Error {
  const code = e.response?.data?.error?.code ?? e.response?.status;
  const msg  = e.response?.data?.error?.message ?? e.message;
  if (code === "access_token_invalid" || e.response?.status === 401) {
    return new Error("TikTok access token expired — reconnect the integration");
  }
  return new Error(`TikTok error [${code}]: ${msg}`);
}

// ── Init upload with PULL_FROM_URL ────────────────────────────────────────────
async function initUpload(token: string, opts: TikTokPostOptions): Promise<string> {
  const res = await withRetry(() =>
    axios.post(
      `${BASE}/post/publish/video/init/`,
      {
        post_info: {
          title: opts.caption.slice(0, 2200),
          privacy_level: opts.privacyLevel ?? "PUBLIC_TO_EVERYONE",
          disable_duet: opts.disableDuet ?? false,
          disable_comment: opts.disableComment ?? false,
          disable_stitch: opts.disableStitch ?? false,
          // AI-generated content disclosure (required by TikTok policy)
          ai_generated_content: true,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: opts.videoUrl,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )
  );

  const errorCode = res.data?.error?.code;
  if (errorCode && errorCode !== "ok") {
    throw new Error(`TikTok init error [${errorCode}]: ${res.data?.error?.message}`);
  }

  const publishId = res.data?.data?.publish_id as string | undefined;
  if (!publishId) throw new Error(`TikTok init returned no publish_id: ${JSON.stringify(res.data)}`);
  return publishId;
}

// ── Poll until published or failed ────────────────────────────────────────────
async function pollStatus(
  token: string,
  publishId: string,
  onProgress?: (status: TikTokStatus) => void,
  timeoutMs = 5 * 60 * 1000
): Promise<TikTokStatus> {
  const deadline = Date.now() + timeoutMs;
  const INTERVAL = 5_000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, INTERVAL));

    const res = await withRetry(() =>
      axios.post(
        `${BASE}/post/publish/status/fetch/`,
        { publish_id: publishId },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
    );

    const status: TikTokStatus = res.data?.data?.status ?? "PROCESSING_UPLOAD";
    onProgress?.(status);

    if (status === "PUBLISH_COMPLETE") return status;
    if (status === "FAILED") {
      const reason = res.data?.data?.fail_reason ?? "unknown";
      throw new Error(`TikTok publish failed: ${reason}`);
    }
  }

  throw new Error(`TikTok publish timed out after ${timeoutMs / 1000}s`);
}

export async function postToTikTok(
  token: string,
  opts: TikTokPostOptions,
  onProgress?: (pct: number) => void
): Promise<TikTokPostResult> {
  try {
    onProgress?.(10);
    const publishId = await initUpload(token, opts);
    onProgress?.(25);

    const status = await pollStatus(
      token,
      publishId,
      (s) => {
        const pct =
          s === "PROCESSING_UPLOAD"   ? 40 :
          s === "PROCESSING_COMPRESS" ? 65 :
          s === "SENDING_TO_USER_INBOX" ? 85 : 90;
        onProgress?.(pct);
      }
    );

    onProgress?.(100);
    return { publish_id: publishId, status };
  } catch (e: any) {
    throw tiktokError(e);
  }
}
