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
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const authResult = await Promise.race([
      supabase.auth.getUser(token),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Supabase auth timed out after 8s — check SUPABASE_URL on Railway")), 8000)
      ),
    ]);
    const { data: { user }, error } = authResult;

    if (error || !user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = { id: user.id, email: user.email };

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
  } catch (err: any) {
    console.error("[authMiddleware error]", err?.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Auth error: " + (err?.message ?? "unknown") });
    }
  }
}
