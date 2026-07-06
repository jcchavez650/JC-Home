import { Router } from 'express'
import db from '../db.js'
import { requireTripMember } from '../auth.js'
import { computeBalances } from './expenses.js'

export const reportsRouter = Router()

const round2 = (n) => Math.round(n * 100) / 100

// Cross-trip summary for the logged-in user.
reportsRouter.get('/summary', (req, res) => {
  const trips = db
    .prepare(
      `SELECT t.id, t.name, t.destination, t.start_date, t.end_date, t.budget, t.currency,
         (SELECT COUNT(*) FROM trip_members m WHERE m.trip_id = t.id) AS member_count,
         (SELECT COALESCE(SUM(amount), 0) FROM expenses e WHERE e.trip_id = t.id) AS total_spent,
         (SELECT COALESCE(SUM(es.share_amount), 0) FROM expense_splits es
            JOIN expenses e ON e.id = es.expense_id
            WHERE e.trip_id = t.id AND es.user_id = ?) AS my_share,
         (SELECT COALESCE(SUM(amount), 0) FROM expenses e
            WHERE e.trip_id = t.id AND e.paid_by = ?) AS i_paid
       FROM trips t
       JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = ?
       ORDER BY t.start_date DESC, t.id DESC`
    )
    .all(req.user.id, req.user.id, req.user.id)

  const byCategory = db
    .prepare(
      `SELECT e.category, SUM(e.amount) AS total, COUNT(*) AS count
       FROM expenses e
       JOIN trip_members tm ON tm.trip_id = e.trip_id AND tm.user_id = ?
       GROUP BY e.category ORDER BY total DESC`
    )
    .all(req.user.id)

  // My outstanding position across trips (positive = owed to me)
  let net = 0
  for (const t of trips) {
    const { balances } = computeBalances(t.id)
    const mine = balances.find((b) => b.user_id === req.user.id)
    if (mine) net += mine.net
    t.my_net = mine ? mine.net : 0
  }

  res.json({
    trips,
    by_category: byCategory.map((c) => ({ ...c, total: round2(c.total) })),
    totals: {
      trip_count: trips.length,
      total_spent_all_trips: round2(trips.reduce((s, t) => s + t.total_spent, 0)),
      my_share_all_trips: round2(trips.reduce((s, t) => s + t.my_share, 0)),
      i_paid_all_trips: round2(trips.reduce((s, t) => s + t.i_paid, 0)),
      my_net_position: round2(net),
    },
  })
})

// Per-trip report.
reportsRouter.get('/trip/:id', requireTripMember, (req, res) => {
  const tripId = req.trip.id
  const byCategory = db
    .prepare(
      'SELECT category, SUM(amount) AS total, COUNT(*) AS count FROM expenses WHERE trip_id = ? GROUP BY category ORDER BY total DESC'
    )
    .all(tripId)
  const byPerson = db
    .prepare(
      `SELECT u.id AS user_id, u.name, COALESCE(SUM(e.amount), 0) AS paid
       FROM trip_members tm
       JOIN users u ON u.id = tm.user_id
       LEFT JOIN expenses e ON e.trip_id = tm.trip_id AND e.paid_by = u.id
       WHERE tm.trip_id = ? GROUP BY u.id ORDER BY paid DESC`
    )
    .all(tripId)
  const byDay = db
    .prepare(
      "SELECT COALESCE(date, 'undated') AS date, SUM(amount) AS total FROM expenses WHERE trip_id = ? GROUP BY date ORDER BY date"
    )
    .all(tripId)
  const totalSpent = round2(byCategory.reduce((s, c) => s + c.total, 0))
  const estCost = db
    .prepare('SELECT COALESCE(SUM(est_cost), 0) AS total FROM itinerary_items WHERE trip_id = ?')
    .get(tripId).total

  res.json({
    trip: req.trip,
    total_spent: totalSpent,
    budget: req.trip.budget,
    budget_remaining: req.trip.budget != null ? round2(req.trip.budget - totalSpent) : null,
    itinerary_estimated_cost: round2(estCost),
    by_category: byCategory.map((c) => ({ ...c, total: round2(c.total) })),
    by_person: byPerson.map((p) => ({ ...p, paid: round2(p.paid) })),
    by_day: byDay.map((d) => ({ ...d, total: round2(d.total) })),
    ...computeBalances(tripId),
  })
})

// CSV export of a trip's expenses.
reportsRouter.get('/trip/:id/export.csv', requireTripMember, (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.date, e.description, e.category, e.amount, u.name AS paid_by, e.split_type,
         (SELECT GROUP_CONCAT(u2.name || ': ' || es.share_amount, '; ')
          FROM expense_splits es JOIN users u2 ON u2.id = es.user_id
          WHERE es.expense_id = e.id) AS splits
       FROM expenses e JOIN users u ON u.id = e.paid_by
       WHERE e.trip_id = ? ORDER BY e.date, e.id`
    )
    .all(req.trip.id)
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  const header = 'date,description,category,amount,paid_by,split_type,splits'
  const csv = [header, ...rows.map((r) => [r.date, r.description, r.category, r.amount, r.paid_by, r.split_type, r.splits].map(esc).join(','))].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${req.trip.name.replace(/[^a-z0-9-_ ]/gi, '')}-expenses.csv"`
  )
  res.send(csv)
})
