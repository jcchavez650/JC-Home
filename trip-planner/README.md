# 🧳 Trip Planner

Plan trip itineraries, split costs with friends, track who owes what (and who has paid), get activity suggestions by destination and budget, and run spending reports — across as many trips as you like.

Built with **React (Vite)** + **Express** + **SQLite**. All data is saved to a local database file, so everything persists between sessions.

## Features

- **Accounts** — simple email/password sign-up and login (JWT sessions)
- **Multiple trips** — each with destination, dates, budget, and its own members
- **Members** — add friends to a trip by email; everyone on the trip sees the same data
- **Itinerary** — day-by-day schedule with categories, locations, notes, and estimated costs
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

### Environment variables (all optional)

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Server port | `3001` |
| `DB_PATH` | SQLite file location | `server/trip-planner.db` |
| `JWT_SECRET` | Token signing secret — set this in production | dev value |
| `ANTHROPIC_API_KEY` | Enables the ✨ AI suggestions button | off |

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
