"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DayNav from "@/components/DayNav";
import { Bars, Btn, Card, Empty, Field, NumInput, PageHead, Pill, Ring, Stat, Title, ZoneBars, inputCls } from "@/components/ui";
import {
  ZONE_COLORS,
  ZONE_NAMES,
  dateRange,
  dayKcal,
  dayStrain,
  fmtDay,
  recoveryResult,
  sportList,
  strainTarget,
  summarizeSamples,
  todayStr,
  workoutStrain,
  workoutsOn,
  zoneBounds,
  clamp,
} from "@/lib/engine";
import { useStore } from "@/lib/store";

/** Spread `dur` one-minute samples around an average using a normal curve capped at max HR. */
function approximateSamples(avg: number, max: number, dur: number): number[] {
  const sd = Math.max(3, (max - avg) / 2.2);
  const probit = (p: number) => {
    // Winitzki approximation of the inverse error function
    const a = 0.147;
    const x = 2 * p - 1;
    const ln = Math.log(1 - x * x);
    const t = 2 / (Math.PI * a) + ln / 2;
    return Math.sign(x) * Math.sqrt(Math.sqrt(t * t - ln / a) - t) * Math.SQRT2;
  };
  return Array.from({ length: dur }, (_, i) => clamp(avg + sd * probit((i + 0.5) / dur), 40, max));
}

export default function StrainPage() {
  const { state, addWorkout, removeWorkout } = useStore();
  const [date, setDate] = useState(todayStr());
  const [adding, setAdding] = useState(false);
  const p = state.profile;

  const strain = dayStrain(state, date);
  const rec = recoveryResult(state, date);
  const target = strainTarget(rec?.score ?? null);
  const ws = workoutsOn(state, date);
  const days = dateRange(date, 14);
  const bars = days.map((d) => dayStrain(state, d));
  const bounds = useMemo(() => zoneBounds(p.maxHr), [p.maxHr]);

  const [sport, setSport] = useState("Running");
  const [time, setTime] = useState("17:30");
  const [dur, setDur] = useState(45);
  const [avg, setAvg] = useState(Math.round(p.maxHr * 0.72));
  const [max, setMax] = useState(Math.round(p.maxHr * 0.88));

  const save = () => {
    const samples = approximateSamples(avg, Math.max(max, avg + 1), dur);
    const sum = summarizeSamples(samples, 60, p);
    addWorkout({
      date,
      start: new Date(`${date}T${time}:00`).toISOString(),
      sport,
      durationMin: dur,
      avgHr: avg,
      maxHr: max,
      zoneMin: sum.zoneMin,
      kcal: sum.kcal,
      strain: workoutStrain(sum.zoneMin, p.fitness),
      source: "manual",
    });
    setAdding(false);
  };

  return (
    <div>
      <PageHead title="Strain" sub="Cardiovascular load on a 0–21 scale." right={<DayNav date={date} onChange={setDate} />} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center text-center">
          <Ring size={170} stroke={13} value={strain} max={21} color="var(--strain)" label={strain.toFixed(1)} sub="Day strain" />
          <div className="mt-4">
            <Pill color="#6c8cff">
              Target {target.lo}–{target.hi} · {target.label}
            </Pill>
          </div>
          <div className="mt-5 grid w-full grid-cols-2 gap-4 border-t border-white/[0.06] pt-4">
            <Stat label="Calories" value={dayKcal(state, date).toLocaleString()} unit="kcal" />
            <Stat label="Steps" value={(state.days[date]?.steps ?? 0).toLocaleString()} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <Title right={<Pill color="#6c8cff">14 days</Pill>}>Daily strain</Title>
          <Bars data={bars} max={21} height={160} colorFor={(v) => (v >= 14 ? "#6c8cff" : v >= 10 ? "#5b7be0" : "#3a4a82")} labels={days.map((d) => fmtDay(d, { weekday: "narrow" }))} />
        </Card>
      </div>

      <Card className="mt-4">
        <Title
          right={
            <div className="flex gap-2">
              <Link href="/live"><Btn variant="ghost">Record live</Btn></Link>
              <Btn onClick={() => setAdding((a) => !a)}>{adding ? "Close" : "Add workout"}</Btn>
            </div>
          }
        >
          Workouts · {fmtDay(date)}
        </Title>

        {adding ? (
          <div className="mb-5 rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Field label="Activity">
                <select className={inputCls} value={sport} onChange={(e) => setSport(e.target.value)}>
                  {sportList.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Start">
                <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
              <Field label="Minutes">
                <NumInput value={dur} min={5} max={600} onChange={setDur} />
              </Field>
              <Field label="Avg HR">
                <NumInput value={avg} min={50} max={p.maxHr} onChange={setAvg} />
              </Field>
              <Field label="Max HR">
                <NumInput value={max} min={60} max={p.maxHr} onChange={setMax} />
              </Field>
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">Time in each zone is estimated from your average and max heart rate. Use Live recording with a strap for exact numbers.</p>
            <Btn className="mt-3" onClick={save}>
              Save workout
            </Btn>
          </div>
        ) : null}

        {ws.length ? (
          <div className="space-y-5">
            {ws.map((w) => (
              <div key={w.id} className="rounded-xl border border-white/[0.06] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{w.sport}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {new Date(w.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · {w.durationMin} min · {w.avgHr} avg / {w.maxHr} max bpm · {w.kcal} kcal
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Pill color="#6c8cff">Strain {w.strain}</Pill>
                    <button onClick={() => removeWorkout(w.id)} className="text-xs text-[var(--muted)] hover:text-red-300">
                      Delete
                    </button>
                  </div>
                </div>
                <ZoneBars zoneMin={w.zoneMin} />
              </div>
            ))}
          </div>
        ) : (
          <Empty>No workouts logged for this day.</Empty>
        )}
      </Card>

      <Card className="mt-4">
        <Title sub={`Based on a max heart rate of ${p.maxHr} bpm. Change it in Settings.`}>Heart-rate zones</Title>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {bounds.map((b, i) => (
            <div key={b.zone} className="rounded-xl p-3" style={{ background: ZONE_COLORS[i] + "18" }}>
              <div className="text-xs font-semibold" style={{ color: ZONE_COLORS[i] }}>
                Zone {b.zone} · {ZONE_NAMES[i]}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {b.lo}–{b.hi}
              </div>
              <div className="text-xs text-[var(--muted)]">bpm</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
