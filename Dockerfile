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

# python3 + pip: required to install yt-dlp
# ffmpeg is NOT installed here — the ffmpeg-static npm package provides the
# binary and lib/ffmpeg.ts sets the path via ffmpeg.setFfmpegPath(ffmpegStatic)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
 && pip3 install --no-cache-dir --break-system-packages yt-dlp \
 && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /tmp/shorts-studio

COPY backend/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4000

# API server (default). Worker service overrides this via railway.toml startCommand.
CMD ["node", "dist/index.js"]
