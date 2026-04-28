import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = cookies().get(WORKSPACE_COOKIE)?.value;
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl}/api/jobs/${params.id}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
    },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Backend unreachable: " + err.message }, { status: 502 });
  }

  const text = await upstream.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch {
    return NextResponse.json({ error: "Backend returned non-JSON (status " + upstream.status + ")" }, { status: 502 });
  }
  return NextResponse.json(data, { status: upstream.status });
}
