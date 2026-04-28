# Railway deployment — build context is the repo root.
# backend/Dockerfile is kept for local docker-compose (context = backend/).
# Both services (API + Worker) use this image; railway.toml sets startCommand.

FROM node:20-slim AS builder

WORKDIR /app

# Install backend deps (workspace has no per-package lock file)
COPY backend/package.json ./
RUN npm install

COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# ─── Runtime ────────────────────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# ffmpeg: fluent-ffmpeg merge + yt-dlp stream muxing
# yt-dlp: single Go binary — no Python required
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      curl \
    && curl -fsSL \
         https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
         -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /tmp/shorts-studio

COPY backend/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4000

# API server (default). Worker service overrides this via railway.toml startCommand.
CMD ["node", "dist/index.js"]
