import { Trash } from "@phosphor-icons/react";

export default function DailyLog({ entries, totals, onRemove }) {
  return (
    <div className="card daily-log">
      <div className="daily-log-header">
        <h2>Today</h2>
        <div className="daily-log-totals">
          <span className="daily-log-total-value">{round(totals.totalCarbsG)}g</span>
          <span className="daily-log-total-label">carbs</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="empty-state">No food logged yet today. Add your first item above.</p>
      ) : (
        <ul className="daily-log-list">
          {entries.map((e) => (
            <li key={e.id} className="daily-log-item">
              <div>
                <span className="daily-log-item-name">{e.food_name}</span>
                <span className="daily-log-item-meta">
                  {round(e.total_carbs_g)}g carbs · {round(e.calories_kcal)} kcal
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => onRemove(e.id)}
                aria-label={`Remove ${e.food_name} from log`}
              >
                <Trash size={18} weight="bold" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function round(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.round(n * 10) / 10;
}
