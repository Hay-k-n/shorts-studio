# Shorts Studio

Multi-tenant SaaS for automated short-form video creation. Turns news or content into TikTok, YouTube Shorts, and Instagram Reels using an AI pipeline.

## Pipeline

```
Source (news / URL / search)
  → Claude API  (web search + script generation)
  → ElevenLabs  (cloned voice TTS)  ─┐
  → HeyGen TTS  (built-in voice)    ─┴─→ HeyGen (avatar render)
  → Twelve Labs (source video analysis, optional)
  → FFmpeg      (merge: source top / avatar bottom, 1080×1920)
  → Platform APIs (TikTok / YouTube / Instagram)
```

## Monorepo structure

```
shorts-studio/
├── frontend/        Next.js 14 App Router + Tailwind + Supabase Auth
├── backend/         Express + TypeScript + BullMQ + FFmpeg worker
└── supabase/        Database migrations + RLS policies
```

## Quick start

### Prerequisites

- Node.js 20+
- Redis (or run via Docker)
- Supabase project ([supabase.com](https://supabase.com))

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example frontend/.env.local
cp .env.example backend/.env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, REDIS_URL
```

### 3. Apply database migrations

```bash
# Via Supabase CLI
npx supabase db push --db-url postgresql://postgres:<password>@<host>:5432/postgres

# Or paste supabase/migrations/20240101000000_init.sql into the Supabase SQL editor
```

### 4. Run locally

```bash
# Terminal 1 — frontend
npm run dev:frontend

# Terminal 2 — backend API
npm run dev:backend

# Terminal 3 — video worker
npm run dev:worker
```

### 5. Docker (backend only)

```bash
docker-compose up
```

---

## Environment variables

| Variable | Where | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Supabase service role key (server-only) |
| `NEXT_PUBLIC_API_URL` | frontend | Backend URL (`http://localhost:4000`) |
| `REDIS_URL` | backend | Redis connection string |
| `PORT` | backend | Server port (default 4000) |
| `FRONTEND_URL` | backend | CORS origin |

Workspace-level API keys (HeyGen, ElevenLabs, Twelve Labs, TikTok, YouTube, Instagram) are stored encrypted in the `workspace_connections` table — not in env vars in production.

---

## Database tables

| Table | Purpose |
|---|---|
| `workspaces` | Tenant workspaces |
| `users` | User profiles (extends `auth.users`) |
| `workspace_members` | Workspace ↔ user membership + role |
| `workspace_connections` | Per-workspace API keys |
| `videos` | Video records with metadata |
| `video_jobs` | Async job tracking (BullMQ) |

---

## Backend API routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/video/avatars` | List HeyGen avatars for workspace |
| POST | `/api/video/analyze` | Twelve Labs source video analysis |
| POST | `/api/video/generate` | Queue avatar video generation job |
| POST | `/api/video/merge` | Queue FFmpeg merge job |
| GET | `/api/video/job/:id` | Poll job status |
| POST | `/api/post` | Publish video to platform |
| GET | `/health` | Health check |

All routes require `Authorization: Bearer <supabase-jwt>` except `/health`.

---

## Deployment (Railway)

1. Create a Railway project with three services: **backend**, **worker**, **Redis**
2. Set env vars in Railway dashboard (Railway auto-injects `REDIS_URL` for linked Redis)
3. Build command: `npm run build` — Start command: `node dist/index.js`
4. For the worker service, start command: `node dist/workers/videoWorker.js`
5. Deploy frontend to Vercel, set `NEXT_PUBLIC_API_URL` to the Railway backend URL
