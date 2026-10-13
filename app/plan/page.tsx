"use client";

import { useMemo, useState } from "react";
import { Btn, Card, Field, NumInput, PageHead, Pill, Progress, Title, inputCls } from "@/components/ui";
import { achievements, goalProgress, recoveryResult, dateRange, dayStrain, mean, sleepResult, hm, round1, todayStr, uid, workoutsOn } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";

const KINDS: { kind: Goal["kind"]; label: string; def: number; step: number }[] = [
  { kind: "sleepHours", label: "Average sleep (hours)", def: 7.5, step: 0.25 },
  { kind: "workouts", label: "Workouts per week", def: 4, step: 1 },
  { kind: "greenDays", label: "Green recovery days", def: 3, step: 1 },
  { kind: "avgStrain", label: "Average daily strain", def: 10, step: 0.5 },
  { kind: "breathSessions", label: "Breathwork sessions", def: 3, step: 1 },
  { kind: "consistency", label: "Sleep consistency (%)", def: 80, step: 5 },
];

export default function PlanPage() {
  const { state, setGoals } = useStore();
  const today = todayStr();
  const progress = useMemo(() => goalProgress(state, today), [state, today]);
  const ach = useMemo(() => achievements(state, today), [state, today]);
  const [kind, setKind] = useState<Goal["kind"]>("breathSessions");
  const [target, setTarget] = useState(3);
  const week = dateRange(today, 7);
  const recs = week.map((d) => recoveryResult(state, d)?.score).filter((v): v is number => v != null);
  const sl = week.map((d) => sleepResult(state, d)?.hoursAsleep).filter((v): v is number => v != null);

  const add = () => setGoals([...state.goals.filter((g) => g.kind !== kind), { id: uid(), kind, target }]);

  return (
    <div>
      <PageHead title="Weekly plan" sub="Set targets for the next seven days and watch them fill." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Title>This week&apos;s goals</Title>
          <div className="space-y-5">
            {progress.length ? (
              progress.map((g) => (
                <div key={g.goal.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{g.label}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums text-[var(--muted)]">
                        {g.value}
                        {g.unit === "%" ? "%" : ""} / {g.target}
                        {g.unit === "%" ? "%" : g.unit ? ` ${g.unit}` : ""}
                      </span>
                      <button className="text-xs text-[var(--muted)] hover:text-red-300" onClick={() => setGoals(state.goals.filter((x) => x.id !== g.goal.id))}>
                        Remove
                      </button>
                    </span>
                  </div>
                  <Progress pct={g.pct} color={g.pct >= 1 ? "var(--green)" : "var(--accent)"} />
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">No goals yet. Add one below.</p>
            )}
          </div>
          <div className="mt-6 grid grid-cols-[1fr_110px_auto] items-end gap-3 border-t border-white/[0.06] pt-5">
            <Field label="Add or replace a goal">
              <select
                className={inputCls}
                value={kind}
                onChange={(e) => {
                  const k = KINDS.find((x) => x.kind === e.target.value)!;
                  setKind(k.kind);
                  setTarget(k.def);
                }}
              >
                {KINDS.map((k) => (
                  <option key={k.kind} value={k.kind}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target">
              <NumInput value={target} step={KINDS.find((k) => k.kind === kind)!.step} onChange={setTarget} />
            </Field>
            <Btn onClick={add}>Set</Btn>
          </div>
        </Card>

        <Card>
          <Title>Week in review</Title>
          <div className="space-y-3 text-sm">
            <Line2 label="Avg recovery" v={recs.length ? `${Math.round(mean(recs))}%` : "–"} />
            <Line2 label="Avg sleep" v={sl.length ? hm(mean(sl)) : "–"} />
            <Line2 label="Avg strain" v={String(round1(mean(week.map((d) => dayStrain(state, d)))))} />
            <Line2 label="Workouts" v={String(week.reduce((a, d) => a + workoutsOn(state, d).length, 0))} />
            <Line2 label="Green days" v={String(recs.filter((r) => r >= 67).length)} />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <Title>Streaks &amp; milestones</Title>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ach.map((a) => (
            <div key={a.id} className={`rounded-xl border p-4 ${a.earned ? "border-[var(--accent)]/50 bg-[var(--accent)]/10" : "border-white/[0.07]"}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{a.title}</span>
                {a.earned ? <Pill color="#3dd6c6">Earned</Pill> : null}
              </div>
              <div className="mt-1 text-xs text-[var(--muted)]">{a.detail}</div>
              <div className="mt-3">
                <Progress pct={a.progress} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Line2({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-semibold tabular-nums">{v}</span>
    </div>
  );
}
