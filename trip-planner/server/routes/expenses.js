import { Router } from 'express'
import db from '../db.js'

export const expensesRouter = Router({ mergeParams: true })

// New canonical categories plus legacy slugs (lodging, activity) kept for back-compat.
const CATEGORIES = ['flights', 'hotel', 'transport', 'food', 'activities', 'shopping', 'other', 'lodging', 'activity']

const round2 = (n) => Math.round(n * 100) / 100

function isTripMember(tripId, userId) {
  return !!db
    .prepare('SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?')
    .get(tripId, userId)
}

function listExpenses(tripId) {
  const expenses = db
    .prepare(
      `SELECT e.*, u.name AS paid_by_name, i.title AS itinerary_title
       FROM expenses e
       JOIN users u ON u.id = e.paid_by
       LEFT JOIN itinerary_items i ON i.id = e.itinerary_item_id
       WHERE e.trip_id = ?
       ORDER BY e.date IS NULL, e.date DESC, e.id DESC`
    )
    .all(tripId)
  const splitStmt = db.prepare(
    `SELECT es.user_id, es.share_amount, u.name
     FROM expense_splits es JOIN users u ON u.id = es.user_id
     WHERE es.expense_id = ? ORDER BY es.user_id`
  )
  for (const e of expenses) e.splits = splitStmt.all(e.id)
  return expenses
}

// Splits `amount` equally among userIds, assigning leftover cents to the first users.
function equalShares(amount, userIds) {
  const cents = Math.round(amount * 100)
  const base = Math.floor(cents / userIds.length)
  const remainder = cents - base * userIds.length
  return userIds.map((userId, i) => ({
    user_id: userId,
    share_amount: (base + (i < remainder ? 1 : 0)) / 100,
  }))
}

expensesRouter.get('/', (req, res) => {
  res.json({ expenses: listExpenses(req.trip.id) })
})

expensesRouter.post('/', (req, res) => {
  const { description, category, amount, paid_by, date, split_type, splits, itinerary_item_id } =
    req.body || {}
  if (!description?.trim()) return res.status(400).json({ error: 'description is required' })
  const amt = Number(amount)
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' })
  }
  const payer = Number(paid_by)
  if (!isTripMember(req.trip.id, payer)) {
    return res.status(400).json({ error: 'payer must be a member of this trip' })
  }
  if (itinerary_item_id) {
    const item = db
      .prepare('SELECT 1 FROM itinerary_items WHERE id = ? AND trip_id = ?')
      .get(Number(itinerary_item_id), req.trip.id)
    if (!item) return res.status(400).json({ error: 'linked itinerary item not found on this trip' })
  }

  let shareRows
  const type = split_type === 'custom' ? 'custom' : 'equal'
  if (type === 'custom') {
    if (!Array.isArray(splits) || splits.length === 0) {
      return res.status(400).json({ error: 'custom split requires a splits array' })
    }
    shareRows = splits.map((s) => ({ user_id: Number(s.user_id), share_amount: round2(Number(s.share_amount)) }))
    for (const s of shareRows) {
      if (!isTripMember(req.trip.id, s.user_id)) {
        return res.status(400).json({ error: 'every split participant must be a trip member' })
      }
      if (!Number.isFinite(s.share_amount) || s.share_amount < 0) {
        return res.status(400).json({ error: 'split shares must be non-negative numbers' })
      }
    }
    const uniqueUsers = new Set(shareRows.map((s) => s.user_id))
    if (uniqueUsers.size !== shareRows.length) {
      return res.status(400).json({ error: 'each member can appear only once in splits' })
    }
    const total = round2(shareRows.reduce((sum, s) => sum + s.share_amount, 0))
    if (Math.abs(total - round2(amt)) > 0.01) {
      return res.status(400).json({ error: `split shares ($${total}) must add up to the amount ($${round2(amt)})` })
    }
  } else {
    const participantIds =
      Array.isArray(splits) && splits.length > 0
        ? splits.map((s) => Number(s.user_id ?? s))
        : db
            .prepare('SELECT user_id FROM trip_members WHERE trip_id = ? ORDER BY user_id')
            .all(req.trip.id)
            .map((r) => r.user_id)
    for (const uid of participantIds) {
      if (!isTripMember(req.trip.id, uid)) {
        return res.status(400).json({ error: 'every split participant must be a trip member' })
      }
    }
    if (new Set(participantIds).size !== participantIds.length) {
      return res.status(400).json({ error: 'each member can appear only once in splits' })
    }
    shareRows = equalShares(amt, participantIds)
  }

  const create = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO expenses (trip_id, itinerary_item_id, description, category, amount, paid_by, date, split_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.trip.id,
        itinerary_item_id ? Number(itinerary_item_id) : null,
        description.trim(),
        CATEGORIES.includes(category) ? category : 'other',
        round2(amt),
        payer,
        date || new Date().toISOString().slice(0, 10),
        type
      )
    const insertSplit = db.prepare(
      'INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, ?)'
    )
    for (const s of shareRows) insertSplit.run(info.lastInsertRowid, s.user_id, s.share_amount)
  })
  create()
  res.status(201).json({ expenses: listExpenses(req.trip.id) })
})

expensesRouter.delete('/:expenseId', (req, res) => {
  const info = db
    .prepare('DELETE FROM expenses WHERE id = ? AND trip_id = ?')
    .run(Number(req.params.expenseId), req.trip.id)
  if (!info.changes) return res.status(404).json({ error: 'expense not found' })
  res.json({ expenses: listExpenses(req.trip.id) })
})

// --- Balances ---

export function computeBalances(tripId) {
  const members = db
    .prepare(
      `SELECT u.id, u.name FROM trip_members tm JOIN users u ON u.id = tm.user_id
       WHERE tm.trip_id = ? ORDER BY u.name`
    )
    .all(tripId)
  const paid = db
    .prepare('SELECT paid_by AS user_id, SUM(amount) AS total FROM expenses WHERE trip_id = ? GROUP BY paid_by')
    .all(tripId)
  const owed = db
    .prepare(
      `SELECT es.user_id, SUM(es.share_amount) AS total
       FROM expense_splits es JOIN expenses e ON e.id = es.expense_id
       WHERE e.trip_id = ? GROUP BY es.user_id`
    )
    .all(tripId)
  const sent = db
    .prepare('SELECT from_user AS user_id, SUM(amount) AS total FROM settlements WHERE trip_id = ? GROUP BY from_user')
    .all(tripId)
  const received = db
    .prepare('SELECT to_user AS user_id, SUM(amount) AS total FROM settlements WHERE trip_id = ? GROUP BY to_user')
    .all(tripId)

  const toMap = (rows) => new Map(rows.map((r) => [r.user_id, r.total]))
  const paidMap = toMap(paid)
  const owedMap = toMap(owed)
  const sentMap = toMap(sent)
  const receivedMap = toMap(received)

  const balances = members.map((m) => {
    const p = paidMap.get(m.id) || 0
    const o = owedMap.get(m.id) || 0
    const s = sentMap.get(m.id) || 0
    const r = receivedMap.get(m.id) || 0
    return {
      user_id: m.id,
      name: m.name,
      paid: round2(p),
      share: round2(o),
      settled_out: round2(s),
      settled_in: round2(r),
      // positive = this member is owed money; negative = they owe
      net: round2(p - o + s - r),
    }
  })

  // Greedy debt simplification: largest debtor pays largest creditor.
  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ ...b, remaining: -b.net }))
    .sort((a, b) => b.remaining - a.remaining)
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ ...b, remaining: b.net }))
    .sort((a, b) => b.remaining - a.remaining)
  const suggested = []
  let di = 0
  let ci = 0
  while (di < debtors.length && ci < creditors.length) {
    const pay = round2(Math.min(debtors[di].remaining, creditors[ci].remaining))
    if (pay > 0) {
      suggested.push({
        from_user: debtors[di].user_id,
        from_name: debtors[di].name,
        to_user: creditors[ci].user_id,
        to_name: creditors[ci].name,
        amount: pay,
      })
    }
    debtors[di].remaining = round2(debtors[di].remaining - pay)
    creditors[ci].remaining = round2(creditors[ci].remaining - pay)
    if (debtors[di].remaining <= 0.005) di++
    if (creditors[ci].remaining <= 0.005) ci++
  }

  return { balances, suggested_settlements: suggested }
}

// --- Settlements ---

export function listSettlements(tripId) {
  return db
    .prepare(
      `SELECT s.*, uf.name AS from_name, ut.name AS to_name
       FROM settlements s
       JOIN users uf ON uf.id = s.from_user
       JOIN users ut ON ut.id = s.to_user
       WHERE s.trip_id = ? ORDER BY s.date DESC, s.id DESC`
    )
    .all(tripId)
}

export function createSettlement(req, res) {
  const { from_user, to_user, amount, date, note } = req.body || {}
  const from = Number(from_user)
  const to = Number(to_user)
  const amt = Number(amount)
  if (!isTripMember(req.trip.id, from) || !isTripMember(req.trip.id, to)) {
    return res.status(400).json({ error: 'both people must be members of this trip' })
  }
  if (from === to) return res.status(400).json({ error: 'payer and receiver must be different' })
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' })
  }
  db.prepare(
    'INSERT INTO settlements (trip_id, from_user, to_user, amount, date, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.trip.id, from, to, round2(amt), date || new Date().toISOString().slice(0, 10), note?.trim() || null)
  res.status(201).json({ settlements: listSettlements(req.trip.id), ...computeBalances(req.trip.id) })
}
