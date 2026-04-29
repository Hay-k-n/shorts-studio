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

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms — check SUPABASE_URL on Railway`)), ms)
    ),
  ]);
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

    // Note: getUser(jwt) validates the JWT signature locally — no network call.
    // We still race it in case the Supabase client does make a network request.
    const authResult = await withTimeout(
      supabase.auth.getUser(token),
      8000,
      "Supabase auth"
    );
    const { data: { user }, error } = authResult;

    if (error || !user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = { id: user.id, email: user.email };

    const workspaceId = req.headers["x-workspace-id"] as string | undefined;
    if (workspaceId) {
      const memberResult = await withTimeout(
        supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", workspaceId)
          .eq("user_id", user.id)
          .single(),
        10000,
        "Supabase workspace_members query"
      );
      const { data: member } = memberResult;

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
