import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { reportApi } from "../api.js";

const RANGES = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
];

export default function Report() {
  const [days, setDays] = useState(14);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    reportApi(days)
      .then((data) => {
        if (!cancelled) setSeries(data.series);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const chartData = useMemo(
    () =>
      series.map((d) => ({
        ...d,
        label: shortDay(d.day),
        carbs: round(d.totalCarbsG),
      })),
    [series]
  );

  const loggedDays = series.filter((d) => d.entryCount > 0);
  const totalCarbs = series.reduce((s, d) => s + d.totalCarbsG, 0);
  const avgPerLoggedDay = loggedDays.length ? totalCarbs / loggedDays.length : 0;

  return (
    <div className="report">
      <div className="card">
        <div className="report-header">
          <h2>Carbs by day</h2>
          <div className="range-row" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                className={`range-pill ${days === r.days ? "range-pill-active" : ""}`}
                onClick={() => setDays(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <div className="report-loading" role="status">
            <div className="spinner" aria-hidden />
          </div>
        ) : (
          <>
            <div className="report-stats">
              <div className="stat">
                <span className="stat-value">{round(avgPerLoggedDay)}g</span>
                <span className="stat-label">avg / logged day</span>
              </div>
              <div className="stat">
                <span className="stat-value">{loggedDays.length}</span>
                <span className="stat-label">days tracked</span>
              </div>
              <div className="stat">
                <span className="stat-value">{round(totalCarbs)}g</span>
                <span className="stat-label">total carbs</span>
              </div>
            </div>

            <div className="report-chart">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    unit="g"
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)" }}
                    formatter={(value) => [`${value} g`, "Carbs"]}
                    labelFormatter={(label, payload) =>
                      payload?.[0] ? fullDay(payload[0].payload.day) : label
                    }
                  />
                  <Bar dataKey="carbs" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <table className="report-table" aria-label="Daily carb totals">
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Entries</th>
                  <th scope="col">Carbs</th>
                  <th scope="col">Calories</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map((d) => (
                  <tr key={d.day} className={d.entryCount === 0 ? "report-row-empty" : ""}>
                    <th scope="row">{fullDay(d.day)}</th>
                    <td>{d.entryCount}</td>
                    <td>{round(d.totalCarbsG)}g</td>
                    <td>{round(d.caloriesKcal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function round(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.round(n);
}

function shortDay(dayStr) {
  const [y, m, d] = dayStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
}

function fullDay(dayStr) {
  const [y, m, d] = dayStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
