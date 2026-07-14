import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CheckCircle, ArrowCounterClockwise } from "@phosphor-icons/react";

const MACRO_COLORS = {
  Carbs: "#059669",
  Protein: "#ea580c",
  Fat: "#64748b",
};

export default function ResultCard({ result, onLog, onReset, logged }) {
  const macros = [
    { name: "Carbs", grams: round(result.total_carbs_g) },
    { name: "Protein", grams: round(result.protein_g) },
    { name: "Fat", grams: round(result.fat_g) },
  ].filter((m) => m.grams > 0);

  return (
    <div className="card result-card">
      <div className="result-header">
        <h2>{result.food_name}</h2>
        <span className={`confidence-badge confidence-${result.confidence}`}>
          {result.confidence} confidence
        </span>
      </div>
      <p className="result-meta">
        {result.serving_weight_g ? `${round(result.serving_weight_g)} g serving` : "Serving"} ·{" "}
        {round(result.calories_kcal)} kcal
      </p>

      <div className="carb-hero">
        <div>
          <span className="carb-hero-value">{round(result.total_carbs_g)}g</span>
          <span className="carb-hero-label">Total Carbs</span>
        </div>
        <div>
          <span className="carb-hero-value carb-hero-value-secondary">{round(result.net_carbs_g)}g</span>
          <span className="carb-hero-label">Net Carbs</span>
        </div>
      </div>

      {macros.length > 0 && (
        <div className="macro-chart">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={macros}
                dataKey="grams"
                nameKey="name"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
              >
                {macros.map((m) => (
                  <Cell key={m.name} fill={MACRO_COLORS[m.name]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} g`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <table className="detail-table" aria-label="Detailed nutrition breakdown">
        <tbody>
          <tr>
            <th scope="row">Fiber</th>
            <td>{round(result.fiber_g)} g</td>
          </tr>
          <tr>
            <th scope="row">Sugar</th>
            <td>{round(result.sugar_g)} g</td>
          </tr>
          <tr>
            <th scope="row">Protein</th>
            <td>{round(result.protein_g)} g</td>
          </tr>
          <tr>
            <th scope="row">Fat</th>
            <td>{round(result.fat_g)} g</td>
          </tr>
        </tbody>
      </table>

      {result.notes && <p className="result-notes">{result.notes}</p>}

      <div className="result-actions">
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          <ArrowCounterClockwise size={18} weight="bold" aria-hidden />
          Start Over
        </button>
        <button type="button" className="btn btn-primary btn-block" onClick={onLog} disabled={logged}>
          <CheckCircle size={18} weight="bold" aria-hidden />
          {logged ? "Logged" : "Log This Food"}
        </button>
      </div>
    </div>
  );
}

function round(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.round(n * 10) / 10;
}
