# 🧳 Trip Planner

Plan trip itineraries, split costs with friends, track who owes what (and who has paid), get activity suggestions by destination and budget, and run spending reports — across as many trips as you like.

Built with **React (Vite)** + **Express** + **SQLite**. All data is saved to a local database file, so everything persists between sessions.

## Features

- **Accounts** — simple email/password sign-up and login (JWT sessions)
- **Multiple trips** — each with destination, dates, budget, and its own members
- **Members & invite links** — add friends by email, or share an invite link so they can sign up and join a trip in one tap
- **Itinerary** — day-by-day timeline or list, with categories, locations, notes, per-person estimated costs, and activity photos
- **Packing list** — a shared, checkable checklist per trip with progress tracking
- **Installable app (PWA)** — "Add to Home Screen" on your phone for a full-screen, offline-capable app
- **Expenses** — log who paid, split equally among any subset of members or with custom amounts
- **Balances & settle up** — live "who owes whom" with simplified payment suggestions; record payments and see full payment history
- **Suggestions** — curated ideas for 10 popular destinations filtered by your budget tier, generic ideas for anywhere else, and optional AI suggestions via the Claude API
- **Reports** — cross-trip totals, spending by category/person/day, budget vs. actual, your net position, and CSV export of any trip's expenses

## Getting started

```bash
cd trip-planner
npm install            # root tooling (concurrently)
npm run install:all    # server + client dependencies
npm run dev            # API on :3001, app on :5173
```

Open http://localhost:5173, create an account, and make your first trip.

### Production

```bash
npm run build   # builds the client into client/dist
npm start       # Express serves API + built app on :3001
```

## 📱 Deploy it so any phone can use it (Railway)

GitHub stores this code but can't run it — the app needs a live server and database. Railway
runs it straight from your GitHub repo and gives you a public HTTPS URL that works in any
phone browser. The Hobby plan (~$5/month) includes the persistent storage that keeps your
trip data safe forever. Setup is about 5 minutes:

1. Go to [railway.app](https://railway.app) → **Login with GitHub** (use the account that owns this repo)
2. **New Project → Deploy from GitHub repo** → choose `jcchavez650/JC-Home`
3. Click the new service → **Settings → Root Directory** → set it to `trip-planner`
   (Railway will find the `Dockerfile` there and build automatically)
4. Right-click the service (or Settings → Volumes) → **Attach Volume** → mount path `/data`
   — this is what makes your data survive restarts and redeploys
5. **Variables** tab → add:
   - `DB_PATH` = `/data/trip-planner.db`
   - `JWT_SECRET` = a long random string — generate one by running this on any computer:
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - *(optional)* `ANTHROPIC_API_KEY` = your Anthropic API key to enable ✨ AI suggestions
6. **Settings → Networking → Generate Domain** — you'll get a URL like
   `trip-planner-production-xxxx.up.railway.app`

Open that URL on any phone, sign up, and share the link with your travel friends — they
create their own accounts and you add them to trips by email. On iPhone/Android, use the
browser's **"Add to Home Screen"** so it opens like a regular app.

Every push to `main` on GitHub redeploys automatically, and the volume keeps all data intact.

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Server port | `3001` |
| `DB_PATH` | SQLite file location | `server/trip-planner.db` |
| `JWT_SECRET` | Token signing secret. **Required in production** — the server refuses to start without a strong value (≥16 chars). In development an ephemeral one is generated. | — |
| `ANTHROPIC_API_KEY` | Enables the ✨ AI suggestions button | off |

Generate a secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### Security notes

- Auth endpoints (`/auth/login`, `/auth/register`) are rate-limited to 30 requests per IP per 15 minutes.
- Security headers are set via `helmet`; JSON bodies are capped at 100 KB.
- CSV exports neutralize spreadsheet formula injection.
- A `GET /api/health` endpoint is available for uptime checks.

## How splitting works

Every expense records who paid and each participant's share. A member's net balance is
`paid − their share + payments sent − payments received`. Positive means the group owes
them; negative means they owe. The Balances tab reduces all debts to the minimum set of
"A pays B $X" transfers, and recording a payment moves it into the payment history.

## API overview

All routes live under `/api` and require a `Bearer` token except register/login.

- `POST /auth/register` · `POST /auth/login` · `GET /auth/me`
- `GET|POST /trips` · `GET|PUT|DELETE /trips/:id`
- `GET|POST /trips/:id/members` · `DELETE /trips/:id/members/:userId`
- `GET|POST /trips/:id/itinerary` · `PUT|DELETE /trips/:id/itinerary/:itemId`
- `GET|POST /trips/:id/expenses` · `DELETE /trips/:id/expenses/:expenseId`
- `GET /trips/:id/balances` · `GET|POST /trips/:id/settlements`
- `GET /trips/:id/suggestions` (`?ai=1` for Claude-powered ideas)
- `GET /reports/summary` · `GET /reports/trip/:id` · `GET /reports/trip/:id/export.csv`
