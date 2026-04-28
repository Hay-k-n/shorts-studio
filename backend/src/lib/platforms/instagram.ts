import axios, { AxiosError } from "axios";

const GRAPH = "https://graph.facebook.com/v18.0";

export interface InstagramPostOptions {
  videoUrl: string;     // publicly accessible URL (24hr signed URL is fine)
  caption: string;      // caption with hashtags inline
  igUserId: string;     // Instagram Business Account ID (from workspace_connections.account_name)
  shareToFeed?: boolean;
}

export interface InstagramPostResult {
  media_id: string;
  permalink: string | null;
}

type ContainerStatus = "IN_PROGRESS" | "FINISHED" | "ERROR" | "EXPIRED";

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

function igError(e: any): Error {
  const code = e.response?.data?.error?.code ?? e.response?.status;
  const msg  = e.response?.data?.error?.message ?? e.message;
  if (code === 190 || code === 104 || e.response?.status === 401) {
    return new Error("Instagram access token expired — reconnect the integration");
  }
  if (code === 4 || code === 32 || code === 613) {
    return new Error("Instagram API rate limit reached — try again later");
  }
  return new Error(`Instagram error [${code}]: ${msg}`);
}

// ── Step 1: Create a Reels container ─────────────────────────────────────────
async function createContainer(
  token: string,
  opts: InstagramPostOptions
): Promise<string> {
  const res = await withRetry(() =>
    axios.post(`${GRAPH}/${opts.igUserId}/media`, null, {
      params: {
        media_type: "REELS",
        video_url: opts.videoUrl,
        caption: opts.caption.slice(0, 2200),
        share_to_feed: opts.shareToFeed ?? true,
        access_token: token,
      },
    })
  );

  const containerId = res.data?.id as string | undefined;
  if (!containerId) throw new Error(`Instagram did not return a container ID: ${JSON.stringify(res.data)}`);
  return containerId;
}

// ── Step 2: Poll until container is FINISHED ──────────────────────────────────
async function waitForContainer(
  token: string,
  containerId: string,
  onProgress?: (status: ContainerStatus) => void,
  timeoutMs = 10 * 60 * 1000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const INTERVAL = 5_000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, INTERVAL));

    const res = await withRetry(() =>
      axios.get(`${GRAPH}/${containerId}`, {
        params: { fields: "status_code,status", access_token: token },
      })
    );

    const status: ContainerStatus = res.data?.status_code ?? "IN_PROGRESS";
    onProgress?.(status);

    if (status === "FINISHED") return;
    if (status === "ERROR") {
      const detail = res.data?.status ?? "unknown error";
      throw new Error(`Instagram container processing failed: ${detail}`);
    }
    if (status === "EXPIRED") {
      throw new Error("Instagram container expired before publishing — retry the post");
    }
  }

  throw new Error(`Instagram container timed out after ${timeoutMs / 1000}s`);
}

// ── Step 3: Publish the container ─────────────────────────────────────────────
async function publishContainer(
  token: string,
  igUserId: string,
  containerId: string
): Promise<string> {
  const res = await withRetry(() =>
    axios.post(`${GRAPH}/${igUserId}/media_publish`, null, {
      params: { creation_id: containerId, access_token: token },
    })
  );

  const mediaId = res.data?.id as string | undefined;
  if (!mediaId) throw new Error(`Instagram did not return a media ID: ${JSON.stringify(res.data)}`);
  return mediaId;
}

// ── Step 4: Fetch permalink ───────────────────────────────────────────────────
async function fetchPermalink(token: string, mediaId: string): Promise<string | null> {
  try {
    const res = await axios.get(`${GRAPH}/${mediaId}`, {
      params: { fields: "permalink", access_token: token },
    });
    return (res.data?.permalink as string | undefined) ?? null;
  } catch {
    return null; // non-fatal; permalink can be constructed manually
  }
}

export async function postToInstagram(
  token: string,
  opts: InstagramPostOptions,
  onProgress?: (pct: number) => void
): Promise<InstagramPostResult> {
  try {
    onProgress?.(10);

    const containerId = await createContainer(token, opts);
    onProgress?.(20);

    await waitForContainer(token, containerId, (status) => {
      onProgress?.(status === "IN_PROGRESS" ? 50 : 75);
    });

    onProgress?.(80);

    const mediaId = await publishContainer(token, opts.igUserId, containerId);
    onProgress?.(92);

    const permalink = await fetchPermalink(token, mediaId);
    onProgress?.(100);

    return { media_id: mediaId, permalink };
  } catch (e: any) {
    throw igError(e);
  }
}
