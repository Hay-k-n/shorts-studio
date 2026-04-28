import fs from "fs";
import { supabase } from "./supabase";

const BUCKET = "videos";

/**
 * Upload a local file to Supabase Storage.
 * storagePath format: {workspace_id}/{video_id}/{filename}
 * Returns the storage path (not a URL). Use getSignedUrl() to make it accessible.
 */
export async function uploadFile(
  localPath: string,
  storagePath: string,
  contentType: string,
  { cleanup = true }: { cleanup?: boolean } = {}
): Promise<string> {
  const fileBuffer = fs.readFileSync(localPath);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed (${storagePath}): ${error.message}`);

  if (cleanup) {
    try {
      fs.unlinkSync(localPath);
    } catch {
      // Non-fatal: temp file may already be gone
    }
  }

  return storagePath;
}

/**
 * Generate a short-lived signed URL for a storage path.
 * Default expiry is 1 hour; use longer values for playback links.
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data) {
    throw new Error(`Signed URL failed (${storagePath}): ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a file from storage. Non-throwing — logs on failure.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) console.warn(`Storage delete failed (${storagePath}):`, error.message);
}
