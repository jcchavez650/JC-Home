import { useCallback, useEffect, useState } from "react";

function todayKey() {
  const d = new Date();
  return `carb-counter:log:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function useDailyLog() {
  const [key] = useState(todayKey);
  const [entries, setEntries] = useState(() => load(key));

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(entries));
  }, [key, entries]);

  const addEntry = useCallback((estimate) => {
    setEntries((prev) => [
      { id: crypto.randomUUID(), addedAt: Date.now(), ...estimate },
      ...prev,
    ]);
  }, []);

  const removeEntry = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearToday = useCallback(() => setEntries([]), []);

  const totals = entries.reduce(
    (acc, e) => ({
      totalCarbsG: acc.totalCarbsG + (e.total_carbs_g || 0),
      netCarbsG: acc.netCarbsG + (e.net_carbs_g || 0),
      caloriesKcal: acc.caloriesKcal + (e.calories_kcal || 0),
    }),
    { totalCarbsG: 0, netCarbsG: 0, caloriesKcal: 0 }
  );

  return { entries, addEntry, removeEntry, clearToday, totals };
}
