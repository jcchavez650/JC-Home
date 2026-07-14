# Carb Counter

AI-powered carb counter. Sign in, take a photo of your food (or enter a
description and weight), answer up to 5 quick clarifying questions the AI asks
to nail down the details, and get a full carb/macro breakdown. Every entry is
saved to your account in Postgres, and a **Report** tab charts your carbs by
day.

## How it works

1. **Sign in / sign up** — email + password accounts. Each user's data is
   private to their account.
2. **Input** — photo upload (auto-downscaled client-side before upload) or
   manual description + weight in grams.
3. **Identify** — `POST /api/identify` sends the input to Claude, which
   identifies the food and returns up to 5 targeted clarifying questions
   (e.g. cooking method, added sauce, portion size) tailored to that specific
   item.
4. **Clarify** — the app walks through those questions one at a time
   (skippable).
5. **Estimate** — `POST /api/estimate` sends everything back to Claude, which
   returns a structured nutrition estimate (calories, total/net carbs, fiber,
   sugar, protein, fat, confidence).
6. **Log** — save the result; it's persisted to your account and added to
   today's running carb total.
7. **Report** — the Report tab shows a per-day carb bar chart plus a table
   (7 / 14 / 30-day ranges) with averages and totals.

## Stack

- **Frontend**: React + Vite, Recharts (macro donut + daily bar chart),
  Phosphor icons
- **Backend**: Express, `@anthropic-ai/sdk` (Claude API, tool-use for
  structured JSON output), PostgreSQL (`pg`), JWT auth (`jsonwebtoken` +
  `bcryptjs`)
- Single Node service: Express serves both the `/api/*` routes and the built
  static frontend — one deployable unit.

## API

| Method | Route                | Auth | Purpose                                  |
| ------ | -------------------- | ---- | ---------------------------------------- |
| POST   | `/api/auth/signup`   | —    | Create account, returns JWT              |
| POST   | `/api/auth/login`    | —    | Sign in, returns JWT                     |
| GET    | `/api/auth/me`       | ✓    | Current user                             |
| POST   | `/api/identify`      | —    | Identify food + clarifying questions     |
| POST   | `/api/estimate`      | —    | Structured nutrition estimate            |
| POST   | `/api/entries`       | ✓    | Save a logged food entry                 |
| GET    | `/api/entries?date=` | ✓    | List entries (optionally for one day)    |
| DELETE | `/api/entries/:id`   | ✓    | Delete an entry                          |
| GET    | `/api/report?days=`  | ✓    | Carbs/calories aggregated per day        |

The database schema (`users`, `entries`) is created automatically on server
startup — no separate migration step.

## Local development

You need a running PostgreSQL database.

```bash
# 1. Install deps
npm install
npm install --prefix client

# 2. Configure env
cp .env.example .env
# edit .env: set ANTHROPIC_API_KEY, DATABASE_URL, and JWT_SECRET

# 3. Run the backend (terminal 1) — creates tables on first start
node server/index.js

# 4. Run the frontend dev server (terminal 2) — proxies /api to :3001
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
2. **Add the PostgreSQL plugin** to the project. Railway injects a
   `DATABASE_URL` variable that the app reads automatically (SSL is enabled
   for connection strings containing `sslmode=require`, or set `PGSSL=true`).
3. Railway auto-detects Node via `railway.json` / Nixpacks: it runs
   `npm run build` then `npm start`. Tables are created on first boot.
4. Set these variables in the service's **Variables** tab:
   - `ANTHROPIC_API_KEY` — your Anthropic key
   - `JWT_SECRET` — a long random string for signing auth tokens
   - (optional) `CLAUDE_MODEL`
5. Railway provides `PORT` automatically — the server already reads
   `process.env.PORT`.

No separate frontend deployment is needed — Express serves the built client.
