import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public — no session required.
// Uses the service role key server-side to bypass email verification and
// create the workspace + member rows atomically.
export async function POST(req: NextRequest) {
  const { email, password, workspaceName, fullName } = await req.json();

  if (!email || !password || !workspaceName || !fullName) {
    return NextResponse.json(
      { error: "email, password, workspaceName, and fullName are required" },
      { status: 400 }
    );
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Create auth user — email_confirm:true skips verification email
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: fullName },
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Failed to create user" },
      { status: 400 }
    );
  }

  const userId = authData.user.id;

  // 2. Create workspace
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({ name: workspaceName, created_by: userId })
    .select()
    .single();

  if (wsError || !workspace) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: wsError?.message ?? "Failed to create workspace" },
      { status: 500 }
    );
  }

  // 3. Add user as admin member
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: userId, role: "admin" });

  if (memberError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ workspace_id: workspace.id });
}
