import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

function isV4Plus(avatar: Record<string, unknown>): boolean {
  const v = String(avatar.version ?? avatar.avatar_version ?? "");
  if (!v) return false;
  return parseFloat(v.replace(/[^0-9.]/g, "")) >= 4;
}

export async function GET(_req: NextRequest) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = cookies().get(WORKSPACE_COOKIE)?.value;
  if (!workspaceId) return NextResponse.json({ error: "No workspace selected" }, { status: 400 });

  const { data: conn } = await supabase
    .from("workspace_connections")
    .select("encrypted_key")
    .eq("workspace_id", workspaceId)
    .eq("provider", "heygen")
    .single();

  if (!conn?.encrypted_key) {
    return NextResponse.json({ error: "HeyGen not connected for this workspace" }, { status: 400 });
  }

  const apiKey = conn.encrypted_key.trim();

  try {
    const res = await fetch("https://api.heygen.com/v2/avatars", {
      headers: { "X-Api-Key": apiKey },
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.message ?? data?.error ?? data?.detail ?? JSON.stringify(data);
      return NextResponse.json({ error: `HeyGen ${res.status}: ${msg}` }, { status: 502 });
    }
    const all: Record<string, unknown>[] = data?.data?.avatars ?? [];
    const filtered = all.filter(isV4Plus);
    const source = filtered.length > 0 ? filtered : all;
    const avatars = source.map((a) => ({
      id: a.avatar_id,
      name: a.avatar_name ?? a.avatar_id,
      version: a.version ?? a.avatar_version ?? "v5+",
      preview_url: a.preview_image_url ?? null,
    }));
    return NextResponse.json({ avatars, cached: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
