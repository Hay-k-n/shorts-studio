import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middleware/auth";
import { supabase } from "../lib/supabase";

const router = Router();
router.use(authMiddleware);

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

function dbQuery<T>(p: PromiseLike<T>): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase DB query timed out (10s) — is the project paused or SUPABASE_URL wrong?")), 10000)
    ),
  ]);
}

// GET /api/jobs/:id — universal job status polling
// Returns the full video_jobs row. Frontend polls this until status === 'completed' | 'failed'.
router.get("/:id", wrap(async (req, res) => {
  const { data: job, error } = await dbQuery(
    supabase
      .from("video_jobs")
      .select("*")
      .eq("id", req.params.id)
      .single()
  );

  if (error || !job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  // Verify the requesting user belongs to the job's workspace
  const { data: member } = await dbQuery(
    supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", job.workspace_id)
      .eq("user_id", req.user!.id)
      .single()
  );

  if (!member) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(job);
}));

export default router;
