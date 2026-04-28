export const WORKSPACE_COOKIE = "ss_workspace";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Set active workspace cookie (client-side). */
export function setWorkspaceId(id: string) {
  document.cookie = `${WORKSPACE_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

/** Clear active workspace cookie (client-side). */
export function clearWorkspaceId() {
  document.cookie = `${WORKSPACE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

// ── Connections shape adapter ─────────────────────────────────────────────────
// The DB stores one row per provider (normalized). The UI expects a flat object.
// ElevenLabs voice_id is stored in account_name.

export type FlatConnections = {
  heygen_api_key?: string;
  elevenlabs_api_key?: string;
  elevenlabs_voice_id?: string;
  twelvelabs_api_key?: string;
  tiktok_access_token?: string;
  tiktok_account_name?: string;
  youtube_api_key?: string;
  youtube_channel_name?: string;
  instagram_access_token?: string;
  instagram_account_name?: string;
};

type ConnectionRow = {
  provider: string;
  encrypted_key: string;
  account_name: string | null;
};

export function flattenConnections(rows: ConnectionRow[]): FlatConnections {
  const c: FlatConnections = {};
  for (const row of rows) {
    switch (row.provider) {
      case "heygen":
        c.heygen_api_key = row.encrypted_key;
        break;
      case "elevenlabs":
        c.elevenlabs_api_key = row.encrypted_key;
        c.elevenlabs_voice_id = row.account_name ?? undefined;
        break;
      case "twelvelabs":
        c.twelvelabs_api_key = row.encrypted_key;
        break;
      case "tiktok":
        c.tiktok_access_token = row.encrypted_key;
        c.tiktok_account_name = row.account_name ?? undefined;
        break;
      case "youtube":
        c.youtube_api_key = row.encrypted_key;
        c.youtube_channel_name = row.account_name ?? undefined;
        break;
      case "instagram":
        c.instagram_access_token = row.encrypted_key;
        c.instagram_account_name = row.account_name ?? undefined;
        break;
    }
  }
  return c;
}
