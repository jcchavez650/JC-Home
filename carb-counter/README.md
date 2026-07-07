# Carb Counter

AI-powered carb counter. Take a photo of your food (or enter a description and
weight), answer up to 5 quick clarifying questions the AI asks to nail down
the details, and get a full carb/macro breakdown — logged to a running daily
total.

## How it works

1. **Input** — photo upload (auto-downscaled client-side before upload) or
   manual description + weight in grams.
2. **Identify** — `POST /api/identify` sends the input to Claude, which
   identifies the food and returns up to 5 targeted clarifying questions
   (e.g. cooking method, added sauce, portion size) tailored to that specific
   item.
3. **Clarify** — the app walks through those questions one at a time
   (skippable).
4. **Estimate** — `POST /api/estimate` sends everything back to Claude, which
   returns a structured nutrition estimate (calories, total/net carbs, fiber,
   sugar, protein, fat, confidence).
5. **Log** — save the result to today's log (stored in `localStorage`), which
   tracks a running carb total for the day.

## Stack

- **Frontend**: React + Vite, Recharts (macro donut chart), Phosphor icons
- **Backend**: Express, `@anthropic-ai/sdk` (Claude API, tool-use for
  structured JSON output)
- Single Node service: Express serves both the `/api/*` routes and the built
  static frontend — one deployable unit.

## Local development

```bash
# 1. Install root (server) deps
npm install

# 2. Install client deps
npm install --prefix client

# 3. Set your API key
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY

# 4. Run the backend (terminal 1)
node server/index.js

# 5. Run the frontend dev server (terminal 2) — proxies /api to :3001
npm run dev --prefix client
```

Open the Vite dev URL (usually http://localhost:5173).

## Production build

```bash
npm run build   # builds client/dist
npm start        # Express serves client/dist + /api/*
```

## Deploying to Railway

1. Push this repo (or the `carb-counter/` subfolder as its own Railway
   service) to GitHub and create a new Railway project from it.
2. Railway auto-detects Node via `railway.json` / Nixpacks: it runs
   `npm run build` then `npm start`.
3. Set the `ANTHROPIC_API_KEY` environment variable in the Railway service
   settings (Variables tab). Optionally set `CLAUDE_MODEL`.
4. Railway provides `PORT` automatically — the server already reads
   `process.env.PORT`.

No separate frontend deployment is needed — Express serves the built client.
