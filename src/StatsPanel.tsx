import { useEffect, useState } from "react";
import { getStats } from "./tauri";
import type { StatsSummary } from "./types";

const CARDS: { key: keyof StatsSummary; label: string; hint: string }[] = [
  { key: "today", label: "Today", hint: "Ayahs shown since midnight" },
  { key: "lastWeek", label: "Last 7 Days", hint: "Rolling one-week total" },
  { key: "lastMonth", label: "Last 30 Days", hint: "Rolling one-month total" },
  { key: "allTime", label: "All Time", hint: "Every ayah ever shown" },
];

export function StatsPanel() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load statistics.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="settings-panel">
      <header className="settings-header">
        <p className="eyebrow">Insights</p>
        <h2>Reading Statistics</h2>
      </header>

      {error && <p className="settings-hint">{error}</p>}

      <div className="stats-grid">
        {CARDS.map((card) => (
          <div key={card.key} className="card stat-card">
            <span className="stat-value">{stats ? stats[card.key] : "—"}</span>
            <span className="stat-label">{card.label}</span>
            <span className="stat-hint">{card.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
