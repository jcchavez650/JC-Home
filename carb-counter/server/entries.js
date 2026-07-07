import { query } from "./db.js";

const NUMERIC_FIELDS = [
  "serving_weight_g",
  "calories_kcal",
  "total_carbs_g",
  "fiber_g",
  "sugar_g",
  "net_carbs_g",
  "protein_g",
  "fat_g",
];

function serialize(row) {
  const out = { id: row.id, food_name: row.food_name, confidence: row.confidence, notes: row.notes, logged_at: row.logged_at };
  for (const f of NUMERIC_FIELDS) {
    out[f] = row[f] === null ? null : Number(row[f]);
  }
  return out;
}

export async function createEntry(req, res) {
  const b = req.body || {};
  if (!b.food_name) {
    return res.status(400).json({ error: "food_name is required." });
  }
  const result = await query(
    `INSERT INTO entries
      (user_id, food_name, serving_weight_g, calories_kcal, total_carbs_g,
       fiber_g, sugar_g, net_carbs_g, protein_g, fat_g, confidence, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      req.user.id,
      b.food_name,
      num(b.serving_weight_g),
      num(b.calories_kcal),
      num(b.total_carbs_g) ?? 0,
      num(b.fiber_g),
      num(b.sugar_g),
      num(b.net_carbs_g),
      num(b.protein_g),
      num(b.fat_g),
      b.confidence || null,
      b.notes || null,
    ]
  );
  res.status(201).json(serialize(result.rows[0]));
}

export async function listEntries(req, res) {
  // Optional ?date=YYYY-MM-DD returns entries logged on that calendar day (server-local time).
  const date = req.query.date;
  let result;
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    result = await query(
      `SELECT * FROM entries
       WHERE user_id = $1 AND logged_at::date = $2::date
       ORDER BY logged_at DESC`,
      [req.user.id, date]
    );
  } else {
    result = await query(
      `SELECT * FROM entries WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 200`,
      [req.user.id]
    );
  }
  res.json(result.rows.map(serialize));
}

export async function deleteEntry(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid entry id." });
  }
  const result = await query(
    "DELETE FROM entries WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, req.user.id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Entry not found." });
  }
  res.json({ ok: true });
}

export async function report(req, res) {
  // Carbs and calories aggregated per calendar day over the last N days (default 14, max 90).
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 90);
  const result = await query(
    `SELECT logged_at::date AS day,
            COUNT(*)::int          AS entry_count,
            SUM(total_carbs_g)     AS total_carbs_g,
            SUM(net_carbs_g)       AS net_carbs_g,
            SUM(calories_kcal)     AS calories_kcal
     FROM entries
     WHERE user_id = $1 AND logged_at >= (CURRENT_DATE - ($2::int - 1))
     GROUP BY day
     ORDER BY day ASC`,
    [req.user.id, days]
  );
  const byDay = new Map(
    result.rows.map((r) => [
      toDayString(r.day),
      {
        entryCount: r.entry_count,
        totalCarbsG: Number(r.total_carbs_g) || 0,
        netCarbsG: Number(r.net_carbs_g) || 0,
        caloriesKcal: Number(r.calories_kcal) || 0,
      },
    ])
  );

  // Fill every day in the range so the chart has a continuous axis.
  const series = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toDayString(d);
    const found = byDay.get(key);
    series.push({
      day: key,
      totalCarbsG: found?.totalCarbsG || 0,
      netCarbsG: found?.netCarbsG || 0,
      caloriesKcal: found?.caloriesKcal || 0,
      entryCount: found?.entryCount || 0,
    });
  }
  res.json({ days, series });
}

function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDayString(d) {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}
