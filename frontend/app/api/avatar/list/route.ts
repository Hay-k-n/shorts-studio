import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = cookies().get(WORKSPACE_COOKIE)?.value;
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

  const upstream = await fetch(`${backendUrl}/api/avatar/list`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
    },
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
