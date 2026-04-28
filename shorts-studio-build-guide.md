# Shorts Studio — Build Guide

A single-file React app that turns news/content into short-form videos for TikTok, YouTube Shorts, and Instagram Reels using a multi-service AI pipeline.

---

## Pipeline

```
Source (news / URL / search)
  → Claude (web search + script generation)
  → ElevenLabs or HeyGen TTS (voice)
  → HeyGen (avatar video render)
  → FFmpeg (merge footage + avatar, 1080×1920)
  → Platform API (TikTok / YouTube / Instagram)
```

Optional: **Twelve Labs** analyzes source video footage before the avatar render step.

---

## Tech Stack

| Layer | Choice |
|---|---|
| UI | React (single JSX file, inline styles) |
| AI search + script | Anthropic Claude API (`claude-sonnet-4-20250514`) with `web_search` tool |
| Voice (option A) | HeyGen built-in TTS |
| Voice (option B) | ElevenLabs TTS (cloned voice) |
| Avatar render | HeyGen v2 API |
| Video analysis | Twelve Labs API (optional) |
| Video merge | FFmpeg (server-side, not yet wired) |
| Publishing | TikTok v2 API, YouTube Data API, Instagram Graph API |

---

## Running the UI

This is a plain React component with no bundler config included. The fastest way to run it:

### Option A — Vite

```bash
npm create vite@latest shorts-studio-app -- --template react
cd shorts-studio-app
cp ../shorts-studio.jsx src/App.jsx
npm install
npm run dev
```

### Option B — Drop into any existing React project

Copy `shorts-studio.jsx` into your `src/` folder and import it as the default export.

---

## API Keys Required

Configure all keys inside the app via **Workspace Settings → Connections**.

| Key | Where to get it |
|---|---|
| `heygen_api_key` | app.heygen.com → Settings → API |
| `elevenlabs_api_key` | elevenlabs.io → Profile → API key |
| `elevenlabs_voice_id` | ElevenLabs voice library ID |
| `twelvelabs_api_key` | twelvelabs.io → Dashboard |
| `tiktok_access_token` | TikTok for Developers OAuth flow |
| `tiktok_account_name` | Your TikTok username (display only) |
| `youtube_api_key` | Google Cloud Console → YouTube Data API v3 |
| `youtube_channel_name` | Your channel name (display only) |
| `instagram_access_token` | Meta for Developers → Instagram Graph API |
| `instagram_account_name` | Your Instagram handle (display only) |

> Keys are stored in React state only — they are not persisted to disk or sent anywhere except the respective APIs.

---

## User Flow (7 steps)

1. **Mode** — Pick content type (News report / Content remix / Commentary), target platforms, video duration (30s–3min), and voice provider.
2. **Source** — Search via Claude (Google News, Twitter/X, TikTok) or paste a custom URL.
3. **Script** — Claude generates a script with `[PAUSE]` and `[CUT TO SOURCE VIDEO]` markers, plus per-platform captions and hashtags. Editable before proceeding.
4. **Voice & Avatar** — Select a HeyGen v5+ avatar. Voice is rendered via ElevenLabs or HeyGen TTS.
5. **Effects** — Toggle entrance / scene / exit effects (fade, zoom, Ken Burns, etc.).
6. **Render** — HeyGen renders the avatar video. Progress polling every 5 s, timeout at 60 attempts (~5 min).
7. **Post** — Publish to each connected platform individually or all at once.

---

## Auth & Workspace

- **Sign in** — demo mode, no backend; credentials are not validated.
- **Create workspace** — creates an admin account in local state; admin can add/remove members and edit API keys.
- Members without admin role cannot edit connection keys.

---

## What's Stubbed / Not Yet Implemented

| Feature | Status |
|---|---|
| ElevenLabs TTS call | Stub (`setTimeout` placeholder) — needs real API call and audio URL passed to HeyGen |
| FFmpeg merge | Stub — needs a server-side endpoint to stack source footage (top) + avatar (bottom) into 1080×1920 |
| YouTube publish | Stub — needs `googleapis` upload flow |
| Instagram publish | Stub — needs Media Container + Publish two-step Graph API flow |
| Auth / persistence | In-memory only — no backend, no session storage |
| Twelve Labs analysis | Placeholder timing — needs real `indexes` + `search` API calls |

---

## ElevenLabs Integration (next step)

```js
const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
  method: "POST",
  headers: {
    "xi-api-key": elk,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ text: cleanScript, model_id: "eleven_multilingual_v2" }),
});
const audioBlob = await ttsRes.blob();
// Upload blob to a storage URL, then pass that URL to HeyGen as voice.audio_url
```

---

## HeyGen Video Generation

The app calls `POST /v2/video/generate` with:

```json
{
  "video_inputs": [{
    "character": { "type": "avatar", "avatar_id": "<id>", "avatar_style": "normal" },
    "voice": { "type": "text", "input_text": "<script>", "voice_id": "<lang>_female_1" },
    "background": { "type": "color", "value": "#000000" }
  }],
  "dimension": { "width": 1080, "height": 1920 }
}
```

Then polls `GET /v1/video_status.get?video_id=<id>` every 5 s until `status !== "processing"`.

---

## Supported Languages

French, English, Spanish, German, Arabic, Chinese, Portuguese, Russian, Japanese, Korean, Italian, Hindi, Turkish, Armenian.

Default is French (`fr`). Language selection affects the Claude script prompt and HeyGen voice ID prefix.

---

## Video Output Spec

- Resolution: 1080 × 1920 (9:16 vertical)
- Layout: source footage top half, avatar bottom half (FFmpeg merge — not yet live)
- Duration: 30s / 45s / 60s / 90s / 120s / 180s
- Script density: ~2.2 words/second
