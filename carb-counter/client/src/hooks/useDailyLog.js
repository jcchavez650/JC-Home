import { useCallback, useEffect, useState } from "react";
import { listEntriesApi, createEntryApi, deleteEntryApi } from "../api.js";

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function useDailyLog(enabled) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const rows = await listEntriesApi(todayString());
      setEntries(rows);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addEntry = useCallback(async (estimate) => {
    const saved = await createEntryApi(estimate);
    setEntries((prev) => [saved, ...prev]);
    return saved;
  }, []);

  const removeEntry = useCallback(async (id) => {
    await deleteEntryApi(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const totals = entries.reduce(
    (acc, e) => ({
      totalCarbsG: acc.totalCarbsG + (e.total_carbs_g || 0),
      netCarbsG: acc.netCarbsG + (e.net_carbs_g || 0),
      caloriesKcal: acc.caloriesKcal + (e.calories_kcal || 0),
    }),
    { totalCarbsG: 0, netCarbsG: 0, caloriesKcal: 0 }
  );

  return { entries, loading, addEntry, removeEntry, refresh, totals };
}
