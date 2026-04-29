import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import videoRoutes from "./routes/video";
import postRoutes from "./routes/post";
import contentRoutes from "./routes/content";
import scriptRoutes from "./routes/script";
import voiceRoutes from "./routes/voice";
import avatarRoutes from "./routes/avatar";
import jobsRoutes from "./routes/jobs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// FRONTEND_URL accepts a comma-separated list of allowed origins, e.g.:
//   https://yourdomain.com,https://shorts-studio.vercel.app
// Set VERCEL_PREVIEW_ALLOWED=true to also allow any *.vercel.app preview URL.
const allowedOrigins = new Set<string>(
  (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
);
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:3000");
  allowedOrigins.add("http://localhost:3001");
}
const allowVercelPreview = process.env.VERCEL_PREVIEW_ALLOWED === "true";

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) { callback(null, true); return; }
      if (allowedOrigins.has(origin)) { callback(null, true); return; }
      if (allowVercelPreview && origin.endsWith(".vercel.app")) { callback(null, true); return; }
      callback(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

app.use("/auth", authRoutes);        // public signup + authed invite
app.use("/api/video", videoRoutes);
app.use("/api/post", postRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/script", scriptRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/avatar", avatarRoutes);
app.use("/api/jobs", jobsRoutes);    // universal job status polling

app.get("/health", (_, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Catch async errors thrown inside route handlers (Express 4 doesn't do this automatically)
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[unhandled route error]", err);
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on :${PORT}`);
});
