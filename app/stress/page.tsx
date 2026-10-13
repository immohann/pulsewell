"use client";

import { useCallback, useMemo, useState } from "react";
import Breath, { PATTERNS } from "@/components/Breath";
import DayNav from "@/components/DayNav";
import { Bars, Btn, Card, Empty, PageHead, Pill, Stat, Title } from "@/components/ui";
import { fmtDay, stressLabel, stressSeries, stressSummary, todayStr } from "@/lib/engine";
import { useStore } from "@/lib/store";

const color = (v: number) => (v < 1 ? "#3dd6c6" : v < 2 ? "#fbbf24" : v < 2.6 ? "#fb923c" : "#f87171");

export default function StressPage() {
  const { state, addBreath } = useStore();
  const [date, setDate] = useState(todayStr());
  const [pi, setPi] = useState(0);
  const [mins, setMins] = useState(5);
  const [running, setRunning] = useState(false);
  const series = useMemo(() => stressSeries(state, date), [state, date]);
  const sum = stressSummary(series);
  const sessions = state.breath.filter((b) => b.date === date);
  const pat = PATTERNS[pi];

  const done = useCallback(
    (secs: number) => {
      setRunning(false);
      addBreath({ date: todayStr(), start: new Date().toISOString(), pattern: pat.name, minutes: Math.max(1, Math.round(secs / 60)) });
    },
    [addBreath, pat.name],
  );

  return (
    <div>
      <PageHead title="Stress" sub="Heart rate and HRV against your calm baseline, scaled 0–3." right={<DayNav date={date} onChange={setDate} />} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Title sub="One bar per hour; workouts are excluded.">Throughout the day</Title>
          {series.length ? (
            <>
              <Bars data={series.map((p) => p.stress)} max={3} height={150} colorFor={(v) => color(v)} labels={series.map((p) => (p.hour % 3 === 0 ? String(p.hour) : ""))} target={[0, 1]} />
              <div className="mt-2 flex gap-4 text-xs text-[var(--muted)]">
                {[["Low", "#3dd6c6"], ["Moderate", "#fbbf24"], ["High", "#fb923c"], ["Very high", "#f87171"]].map(([l, c]) => (
                  <span key={l} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                    {l}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <Empty>No daytime heart-rate data for {fmtDay(date)}.</Empty>
          )}
        </Card>
        <Card>
          <Title>Summary</Title>
          {sum ? (
            <div className="space-y-5">
              <Stat label="Average" value={sum.avg} unit="/ 3" sub={<Pill color={color(sum.avg)}>{stressLabel(sum.avg)}</Pill>} />
              <Stat label="Peak" value={sum.peak.stress} sub={`around ${sum.peak.hour}:00`} />
              <Stat label="Calm hours" value={`${sum.calmHours} / ${sum.totalHours}`} />
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">Not enough data.</p>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <Title sub="Guided breathing to bring your nervous system down.">Breathwork</Title>
        <div className="grid gap-3 sm:grid-cols-3">
          {PATTERNS.map((p, i) => (
            <button key={p.name} onClick={() => setPi(i)} className={`rounded-xl border p-4 text-left transition ${pi === i ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-white/10 hover:bg-white/[0.04]"}`}>
              <div className="font-medium">{p.name}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">{p.blurb}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-white/10 p-1">
            {[3, 5, 10].map((m) => (
              <button key={m} onClick={() => setMins(m)} className={`rounded-lg px-4 py-1.5 text-sm ${mins === m ? "bg-white/10 font-semibold" : "text-[var(--muted)]"}`}>
                {m} min
              </button>
            ))}
          </div>
          <Btn onClick={() => setRunning(true)}>Start session</Btn>
          {sessions.length ? <Pill color="#3dd6c6">{sessions.length} session{sessions.length > 1 ? "s" : ""} on this day</Pill> : null}
        </div>
      </Card>

      {running ? <Breath pattern={pat} minutes={mins} onDone={done} onCancel={() => setRunning(false)} /> : null}
    </div>
  );
}
