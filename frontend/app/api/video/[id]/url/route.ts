import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = cookies().get(WORKSPACE_COOKIE)?.value;
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

  const expiresIn = req.nextUrl.searchParams.get("expires_in") ?? "3600";
  const upstream = await fetch(
    `${backendUrl}/api/video/${params.id}/url?expires_in=${expiresIn}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
      },
    }
  );

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
