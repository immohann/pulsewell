"use client";

import { useMemo, useState } from "react";
import DayNav from "@/components/DayNav";
import LogDay from "@/components/LogDay";
import { Bars, Btn, Card, Empty, Field, PageHead, Pill, Ring, Stat, Title, inputCls } from "@/components/ui";
import {
  GOAL_LABEL,
  addDays,
  cyclePhase,
  dateRange,
  fmtDay,
  hm,
  sleepNeed,
  sleepPlan,
  sleepResult,
  sleepTotals,
  todayStr,
} from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { SleepGoal } from "@/lib/types";

const STAGE = [
  { k: "awake", label: "Awake", color: "#f87171" },
  { k: "light", label: "Light", color: "#6c8cff" },
  { k: "sws", label: "Deep (SWS)", color: "#a78bfa" },
  { k: "rem", label: "REM", color: "#3dd6c6" },
] as const;

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export default function SleepPage() {
  const { state, setProfile } = useStore();
  const [date, setDate] = useState(todayStr());
  const [logging, setLogging] = useState(false);
  const r = useMemo(() => sleepResult(state, date), [state, date]);
  const need = sleepNeed(state, date);
  const sl = state.days[date]?.sleep;
  const tomorrow = addDays(todayStr(), 1);
  const plan = useMemo(() => sleepPlan(state, state.profile.wakeTime, tomorrow), [state, tomorrow]);
  const week = dateRange(date, 14);
  const hours = week.map((d) => {
    const s = state.days[d]?.sleep;
    return s ? sleepTotals(s).asleepMin / 60 : null;
  });
  const phase = state.profile.cycleTracking ? cyclePhase(state, date) : null;

  return (
    <div>
      <PageHead title="Sleep" sub="Performance against what your body needs." right={<DayNav date={date} onChange={setDate} />} />

      {!r || !sl ? (
        <Empty action={<Btn onClick={() => setLogging(true)}>Log sleep</Btn>}>No sleep recorded for {fmtDay(date)}.</Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="flex flex-col items-center justify-center text-center">
            <Ring size={170} stroke={13} value={r.performance} color="var(--sleep)" label={`${r.performance}%`} sub="Sleep performance" />
            <p className="mt-4 text-sm text-[var(--muted)]">
              {hm(r.hoursAsleep)} asleep of {hm(r.needHours)} needed
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {timeOf(sl.start)} → {timeOf(sl.end)}
            </p>
          </Card>

          <Card className="lg:col-span-2">
            <Title>Sleep stages</Title>
            <div className="flex h-5 overflow-hidden rounded-full bg-white/5">
              {STAGE.map((s) => (
                <div key={s.k} style={{ width: `${r.stages[s.k] * 100}%`, background: s.color }} title={s.label} />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STAGE.map((s) => (
                <div key={s.k}>
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{hm(sl[s.k === "awake" ? "awakeMin" : s.k === "light" ? "lightMin" : s.k === "sws" ? "swsMin" : "remMin"] / 60)}</div>
                  <div className="text-xs text-[var(--muted)]">{Math.round(r.stages[s.k] * 100)}%</div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4 sm:grid-cols-4">
              <Stat label="Efficiency" value={r.efficiency} unit="%" />
              <Stat label="Consistency" value={r.consistency || "–"} unit={r.consistency ? "%" : ""} />
              <Stat label="Disturbances" value={sl.disturbances} />
              <Stat label="Time in bed" value={hm(r.hoursInBed)} />
            </div>
          </Card>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <Title sub="Your need is built from a baseline plus what the last day demanded.">Sleep need</Title>
          <div className="space-y-3 text-sm">
            <Row label="Baseline" v={need.base} />
            <Row label="From yesterday's strain" v={need.strain} plus />
            <Row label="Sleep debt (30% repaid)" v={need.debt} plus />
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-base font-semibold">
              <span>Tonight&apos;s need</span>
              <span className="tabular-nums">{hm(need.total)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <Title sub="Pick a goal and wake time; Pulsewell works out when to be in bed.">Sleep planner</Title>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Wake time">
              <input type="time" className={inputCls} value={state.profile.wakeTime} onChange={(e) => setProfile({ wakeTime: e.target.value })} />
            </Field>
            <Field label="Goal">
              <select className={inputCls} value={state.profile.sleepGoal} onChange={(e) => setProfile({ sleepGoal: e.target.value as SleepGoal })}>
                {(Object.keys(GOAL_LABEL) as SleepGoal[]).map((g) => (
                  <option key={g} value={g}>
                    {GOAL_LABEL[g]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 rounded-xl bg-[var(--sleep)]/10 p-4">
            <div className="text-xs uppercase tracking-wider text-[var(--muted)]">Get in bed by</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{plan.bedtime}</div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              for {hm(plan.tibHours)} in bed · assumes {Math.round(plan.efficiency * 100)}% efficiency
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <Title right={<Pill color="#a78bfa">14 nights</Pill>}>Hours asleep</Title>
        <Bars data={hours} max={10} height={130} colorFor={(v) => (v >= 7.5 ? "#a78bfa" : v >= 6.5 ? "#6c8cff" : "#f87171")} labels={week.map((d) => fmtDay(d, { weekday: "narrow" }))} target={[7.5, 9]} />
      </Card>

      {phase ? (
        <Card className="mt-4">
          <Title>Cycle</Title>
          <p className="text-sm text-[var(--muted)]">
            Day {phase.day} · {phase.phase} phase. Recovery and sleep can shift across phases; compare across a few cycles.
          </p>
        </Card>
      ) : null}

      <div className="mt-5">
        <Btn variant="ghost" onClick={() => setLogging(true)}>
          Edit this night
        </Btn>
      </div>
      {logging ? <LogDay date={date} onClose={() => setLogging(false)} /> : null}
    </div>
  );
}

function Row({ label, v, plus }: { label: string; v: number; plus?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[var(--muted)]">
      <span>{label}</span>
      <span className="tabular-nums text-[var(--fg)]">
        {plus ? "+ " : ""}
        {hm(v)}
      </span>
    </div>
  );
}
