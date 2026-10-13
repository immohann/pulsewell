"use client";

import { useState } from "react";
import { Bars, Card, Line, PageHead, Pill } from "@/components/ui";
import { dateRange, dayStrain, fmtDay, hm, mean, recoveryResult, round1, sleepResult, todayStr, zoneColor } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { StoreState } from "@/lib/types";

interface M {
  key: string;
  label: string;
  unit: string;
  get: (s: StoreState, d: string) => number | null;
  fmt?: (v: number) => string;
  kind: "bars" | "line";
  color: string;
  higherBetter?: boolean;
  max?: number;
}

const METRICS: M[] = [
  { key: "rec", label: "Recovery", unit: "%", get: (s, d) => recoveryResult(s, d)?.score ?? null, kind: "bars", color: "#4ade80", higherBetter: true, max: 100 },
  { key: "hrv", label: "Heart rate variability", unit: "ms", get: (s, d) => s.days[d]?.hrv ?? null, kind: "line", color: "#3dd6c6", higherBetter: true },
  { key: "rhr", label: "Resting heart rate", unit: "bpm", get: (s, d) => s.days[d]?.rhr ?? null, kind: "line", color: "#f87171", higherBetter: false },
  { key: "sleep", label: "Sleep", unit: "", get: (s, d) => sleepResult(s, d)?.hoursAsleep ?? null, fmt: (v) => hm(v), kind: "bars", color: "#a78bfa", higherBetter: true, max: 10 },
  { key: "strain", label: "Strain", unit: "", get: (s, d) => (s.days[d] || s.workouts.some((w) => w.date === d) ? dayStrain(s, d) : null), kind: "bars", color: "#6c8cff", max: 21 },
  { key: "resp", label: "Respiratory rate", unit: "rpm", get: (s, d) => s.days[d]?.resp ?? null, kind: "line", color: "#fbbf24" },
  { key: "steps", label: "Steps", unit: "", get: (s, d) => s.days[d]?.steps ?? null, fmt: (v) => Math.round(v).toLocaleString(), kind: "bars", color: "#38bdf8", higherBetter: true },
];

export default function TrendsPage() {
  const { state } = useStore();
  const [range, setRange] = useState(30);
  const today = todayStr();
  const days = dateRange(today, range);
  const prev = dateRange(days[0], range).slice(0, range - 1);

  return (
    <div>
      <PageHead
        title="Trends"
        sub="Your metrics over time, compared with the previous period."
        right={
          <div className="inline-flex rounded-xl border border-white/10 p-1">
            {[7, 30, 90].map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`rounded-lg px-3.5 py-1.5 text-sm ${range === r ? "bg-white/10 font-semibold" : "text-[var(--muted)]"}`}>
                {r}d
              </button>
            ))}
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {METRICS.map((m) => {
          const vals = days.map((d) => m.get(state, d));
          const ok = vals.filter((v): v is number => v != null);
          const avg = ok.length ? mean(ok) : null;
          const pvals = prev.map((d) => m.get(state, d)).filter((v): v is number => v != null);
          const pavg = pvals.length ? mean(pvals) : null;
          const delta = avg != null && pavg != null ? avg - pavg : null;
          const good = delta == null || m.higherBetter == null ? null : m.higherBetter ? delta > 0 : delta < 0;
          const fmt = (v: number) => (m.fmt ? m.fmt(v) : String(round1(v)));
          return (
            <Card key={m.key}>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{m.label}</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {avg != null ? fmt(avg) : "–"}
                    {m.unit ? <span className="ml-1 text-sm font-normal text-[var(--muted)]">{m.unit}</span> : null}
                    <span className="ml-2 text-xs font-normal text-[var(--muted)]">avg</span>
                  </div>
                </div>
                {delta != null ? (
                  <Pill color={good == null ? "#9aa3b2" : good ? "#4ade80" : "#f87171"}>
                    {delta > 0 ? "▲" : "▼"} {m.fmt ? m.fmt(Math.abs(delta)) : round1(Math.abs(delta))}
                  </Pill>
                ) : null}
              </div>
              {m.kind === "bars" ? (
                <Bars data={vals} max={m.max} height={110} colorFor={(v) => (m.key === "rec" ? zoneColor(v >= 67 ? "green" : v >= 34 ? "yellow" : "red") : m.color)} />
              ) : (
                <Line data={vals} color={m.color} height={110} />
              )}
              <div className="mt-1 flex justify-between text-[11px] text-[var(--muted)]">
                <span>{fmtDay(days[0], { month: "short", day: "numeric" })}</span>
                <span>{fmtDay(today, { month: "short", day: "numeric" })}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
