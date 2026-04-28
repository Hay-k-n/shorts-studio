import { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email?: string };
      workspaceId?: string;
      workspaceRole?: "admin" | "member";
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.user = { id: user.id, email: user.email };

  // Inject workspace from X-Workspace-Id header (set by Next.js proxy from cookie).
  // Routes requiring workspace access validate via req.workspaceId / req.workspaceRole.
  const workspaceId = req.headers["x-workspace-id"] as string | undefined;
  if (workspaceId) {
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      res.status(403).json({ error: "Not a member of this workspace" });
      return;
    }

    req.workspaceId = workspaceId;
    req.workspaceRole = member.role as "admin" | "member";
  }

  next();
}
