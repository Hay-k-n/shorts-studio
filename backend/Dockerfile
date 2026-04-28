FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Runtime ────────────────────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# ffmpeg: needed by both fluent-ffmpeg (merge) and yt-dlp (mux downloaded streams)
# yt-dlp: single-binary release, no Python required
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      curl \
    && curl -L \
         https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
         -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /tmp/shorts-studio

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
