import { Router } from "express";
import { supabase } from "../lib/supabase";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// ── POST /auth/signup — public ────────────────────────────────────────────────
// Creates auth user + workspace + admin member atomically via service role.
// email_confirm: true skips verification — credentials are given directly.
router.post("/signup", async (req, res) => {
  const { email, password, workspaceName, fullName } = req.body as {
    email: string;
    password: string;
    workspaceName: string;
    fullName: string;
  };

  if (!email || !password || !workspaceName || !fullName) {
    res.status(400).json({ error: "email, password, workspaceName, and fullName are required" });
    return;
  }

  // 1. Create auth user — bypasses email verification
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: fullName },
  });

  if (authError || !authData.user) {
    res.status(400).json({ error: authError?.message ?? "Failed to create user" });
    return;
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
    res.status(500).json({ error: wsError?.message ?? "Failed to create workspace" });
    return;
  }

  // 3. Add as admin member
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: userId, role: "admin" });

  if (memberError) {
    await supabase.auth.admin.deleteUser(userId);
    res.status(500).json({ error: memberError.message });
    return;
  }

  res.json({ workspace_id: workspace.id });
});

// ── POST /auth/invite — admin only ───────────────────────────────────────────
// Creates a new auth user with provided credentials (no email sent).
// Admin shares credentials out-of-band.
router.post("/invite", authMiddleware, async (req, res) => {
  const { email, password, fullName, workspace_id, role = "member" } = req.body as {
    email: string;
    password: string;
    fullName?: string;
    workspace_id: string;
    role?: string;
  };

  if (!email || !password || !workspace_id) {
    res.status(400).json({ error: "email, password, and workspace_id are required" });
    return;
  }

  // Verify the requester is an admin of this workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace_id)
    .eq("user_id", req.user!.id)
    .single();

  if (!membership || membership.role !== "admin") {
    res.status(403).json({ error: "Only workspace admins can invite members" });
    return;
  }

  // Create the invited user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: fullName ?? email },
  });

  if (authError || !authData.user) {
    res.status(400).json({ error: authError?.message ?? "Failed to create user" });
    return;
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id,
      user_id: authData.user.id,
      role,
      invited_by: req.user!.id,
    });

  if (memberError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    res.status(500).json({ error: memberError.message });
    return;
  }

  res.json({ user_id: authData.user.id });
});

export default router;
