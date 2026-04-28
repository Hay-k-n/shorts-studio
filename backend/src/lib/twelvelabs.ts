import axios, { AxiosError } from "axios";

const BASE = "https://api.twelvelabs.io/v1.2";

function headers(apiKey: string) {
  return { "x-api-key": apiKey, "Content-Type": "application/json" };
}

export interface TLSegment {
  start: number;
  end: number;
  score: number;
}

// ── Index management ──────────────────────────────────────────────────────────

/**
 * Return the Twelve Labs index id for this workspace, creating it if needed.
 * Stores the index id back into workspace_connections.account_name so future
 * calls skip the creation step.
 */
export async function getOrCreateIndex(
  apiKey: string,
  workspaceId: string,
  cachedIndexId: string | undefined
): Promise<string> {
  if (cachedIndexId) return cachedIndexId;

  const name = `shorts-studio-${workspaceId}`;

  // Search for an existing index with this name
  const { data: list } = await axios.get(`${BASE}/indexes`, {
    params: { page_limit: 50 },
    headers: headers(apiKey),
  });

  const existing = (list.data ?? []).find((idx: any) => idx.name === name);
  if (existing) return existing._id as string;

  // Create a new index with Marengo visual + audio models
  const { data: created } = await axios.post(
    `${BASE}/indexes`,
    {
      name,
      engines: [
        {
          engine_name: "marengo2.6",
          engine_options: ["visual", "conversation"],
        },
      ],
      addons: [],
    },
    { headers: headers(apiKey) }
  );

  return created._id as string;
}

// ── Video indexing ────────────────────────────────────────────────────────────

/**
 * Submit a video URL to Twelve Labs for indexing.
 * Returns the task id used to poll status.
 */
export async function indexVideoUrl(
  apiKey: string,
  indexId: string,
  videoUrl: string
): Promise<string> {
  const { data } = await axios.post(
    `${BASE}/tasks/external-provider`,
    { index_id: indexId, url: videoUrl },
    { headers: headers(apiKey) }
  );
  return data._id as string;
}

/**
 * Poll a Twelve Labs indexing task until it is ready or fails.
 * Returns the indexed video_id.
 */
export async function pollIndexTask(
  apiKey: string,
  taskId: string,
  onProgress?: (pct: number) => void,
  timeoutMs = 25 * 60 * 1000  // 25 min
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 10_000)); // 10-second poll interval

    const { data } = await axios.get(`${BASE}/tasks/${taskId}`, {
      headers: headers(apiKey),
    });

    const status: string = data.status;
    if (status === "ready") return data.video_id as string;
    if (status === "failed") {
      throw new Error(`Twelve Labs indexing failed: ${data.process?.fail_reason ?? "unknown"}`);
    }

    // "pending" | "indexing" | "validating" — keep waiting
    onProgress?.(Math.min(90, 10 + attempt * 4));
    attempt++;
  }

  throw new Error("Twelve Labs indexing timed out");
}

// ── Scene search ──────────────────────────────────────────────────────────────

const FOOTAGE_QUERY =
  "event footage news clip action scene — exclude journalist presenter talking head interview";

/**
 * Search the indexed video for event footage segments (excluding talking heads).
 * Returns clips sorted by score descending, deduplicated and merged where gaps < 1s.
 */
export async function findFootageSegments(
  apiKey: string,
  indexId: string,
  videoId: string
): Promise<TLSegment[]> {
  let allClips: TLSegment[] = [];
  let pageToken: string | undefined;

  do {
    const { data } = await axios.post(
      `${BASE}/search`,
      {
        index_id: indexId,
        query_text: FOOTAGE_QUERY,
        options: ["visual"],
        threshold: "medium",
        page_limit: 50,
        ...(pageToken ? { page_token: pageToken } : {}),
      },
      { headers: headers(apiKey) }
    );

    const clips: TLSegment[] = (data.data ?? [])
      .filter((c: any) => !videoId || c.video_id === videoId)
      .map((c: any) => ({ start: c.start, end: c.end, score: c.score ?? 0 }));

    allClips = allClips.concat(clips);
    pageToken = data.page_info?.next_page_token;
  } while (pageToken);

  if (allClips.length === 0) return allClips;

  // Sort by start time, then merge overlapping / near-adjacent segments
  allClips.sort((a, b) => a.start - b.start);
  const merged: TLSegment[] = [allClips[0]];

  for (let i = 1; i < allClips.length; i++) {
    const last = merged[merged.length - 1];
    const cur = allClips[i];
    if (cur.start <= last.end + 1) {
      last.end = Math.max(last.end, cur.end);
      last.score = Math.max(last.score, cur.score);
    } else {
      merged.push({ ...cur });
    }
  }

  return merged;
}
