"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DayNav from "@/components/DayNav";
import LogDay from "@/components/LogDay";
import { Btn, Card, Empty, Pill, Ring, Stat, Title, ZoneBars } from "@/components/ui";
import {
  addDays,
  dayKcal,
  dayStrain,
  fmtDay,
  hm,
  recoveryResult,
  round1,
  sleepResult,
  stressSeries,
  stressSummary,
  stressLabel,
  strainTarget,
  todayStr,
  workoutsOn,
  zoneColor,
  BEHAVIORS,
  journalImpacts,
} from "@/lib/engine";
import { useStore } from "@/lib/store";

export default function TodayPage() {
  const { state } = useStore();
  const [date, setDate] = useState(todayStr());
  const [logging, setLogging] = useState(false);

  const rec = useMemo(() => recoveryResult(state, date), [state, date]);
  const slp = useMemo(() => sleepResult(state, date), [state, date]);
  const strain = useMemo(() => dayStrain(state, date), [state, date]);
  const target = strainTarget(rec?.score ?? null);
  const ws = workoutsOn(state, date);
  const kcal = dayKcal(state, date);
  const ss = stressSummary(stressSeries(state, date));
  const impacts = useMemo(() => journalImpacts(state).slice(0, 2), [state]);
  const journaled = state.journal[addDays(date, -1)];
  const hello = state.profile.name ? `, ${state.profile.name}` : "";
  const day = state.days[date];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{date === todayStr() ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}${hello}` : fmtDay(date, { weekday: "long", month: "long", day: "numeric" })}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{fmtDay(date, { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <DayNav date={date} onChange={setDate} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-2 sm:gap-6">
            <Link href="/trends" className="flex flex-col items-center">
              <Ring size={132} stroke={11} value={rec?.score ?? 0} color={rec ? zoneColor(rec.zone) : "#333"} label={rec ? `${rec.score}%` : "–"} sub="Recovery" />
              <div className="mt-3 text-center text-xs text-[var(--muted)]">{rec ? (rec.zone === "green" ? "Primed" : rec.zone === "yellow" ? "Steady" : "Needs rest") : "No reading yet"}</div>
            </Link>
            <Link href="/strain" className="flex flex-col items-center">
              <Ring size={132} stroke={11} value={strain} max={21} color="var(--strain)" label={strain.toFixed(1)} sub="Strain" />
              <div className="mt-3 text-center text-xs text-[var(--muted)]">
                Target {target.lo}–{target.hi}
              </div>
            </Link>
            <Link href="/sleep" className="flex flex-col items-center">
              <Ring size={132} stroke={11} value={slp?.performance ?? 0} color="var(--sleep)" label={slp ? `${slp.performance}%` : "–"} sub="Sleep" />
              <div className="mt-3 text-center text-xs text-[var(--muted)]">{slp ? `${hm(slp.hoursAsleep)} of ${hm(slp.needHours)}` : "No sleep logged"}</div>
            </Link>
          </div>
          {!rec || !slp ? (
            <div className="mt-5">
              <Empty
                action={
                  <Btn onClick={() => setLogging(true)}>
                    Log {fmtDay(date, { weekday: "short" })}&apos;s sleep &amp; readings
                  </Btn>
                }
              >
                Add last night&apos;s sleep and your morning HRV and resting heart rate to unlock Recovery. Or{" "}
                <Link href="/live" className="text-[var(--accent)] underline">
                  take a reading with a heart-rate strap
                </Link>
                .
              </Empty>
            </div>
          ) : (
            <div className="mt-5 flex justify-end">
              <Btn variant="ghost" onClick={() => setLogging(true)}>
                Edit readings
              </Btn>
            </div>
          )}
        </Card>

        <Card>
          <Title>Strain target</Title>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold">
              {target.lo}–{target.hi}
            </span>
            <Pill color={rec ? zoneColor(rec.zone) : "#9aa3b2"}>{target.label}</Pill>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">{target.note}</p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="relative h-full">
              <div className="absolute h-full rounded-full bg-white/15" style={{ left: `${(target.lo / 21) * 100}%`, width: `${((target.hi - target.lo) / 21) * 100}%` }} />
              <div className="absolute h-full rounded-full bg-[var(--strain)]" style={{ width: `${Math.min(1, strain / 21) * 100}%` }} />
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-[var(--muted)]">
            <span>0</span>
            <span>Current {strain.toFixed(1)}</span>
            <span>21</span>
          </div>
        </Card>
      </div>

      {rec ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <Title sub="How each signal compares with your 30-day baseline">What shaped your recovery</Title>
            <div className="space-y-3">
              {rec.drivers
                .filter((x) => x.value != null)
                .map((x) => {
                  const good = x.z >= 0.3;
                  const bad = x.z <= -0.3;
                  const c = good ? "var(--green)" : bad ? "var(--red)" : "var(--muted)";
                  return (
                    <div key={x.key} className="flex items-center gap-3">
                      <div className="w-28 shrink-0 text-sm sm:w-40">{x.label}</div>
                      <div className="relative h-2 flex-1 rounded-full bg-white/[0.06]">
                        <div className="absolute left-1/2 top-[-3px] h-[14px] w-px bg-white/25" />
                        <div
                          className="absolute top-0 h-full rounded-full"
                          style={{
                            background: c,
                            left: x.z >= 0 ? "50%" : `${50 + Math.max(-3, x.z) * 16.6}%`,
                            width: `${Math.min(3, Math.abs(x.z)) * 16.6}%`,
                          }}
                        />
                      </div>
                      <div className="w-20 shrink-0 text-right text-sm tabular-nums sm:w-28">
                        {round1(x.value!)} <span className="text-[var(--muted)]">{x.unit}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
          <Card>
            <Title>Vitals</Title>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="HRV" value={day?.hrv ?? "–"} unit="ms" />
              <Stat label="Resting HR" value={day?.rhr ?? "–"} unit="bpm" />
              <Stat label="Respiratory" value={day?.resp ?? "–"} unit="rpm" />
              <Stat label="Blood oxygen" value={day?.spo2 ?? "–"} unit="%" />
            </div>
          </Card>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <Title right={<Link href="/strain" className="text-xs text-[var(--accent)]">Open</Link>}>Activity</Title>
          {ws.length ? (
            <div className="space-y-4">
              {ws.map((w) => (
                <div key={w.id}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{w.sport}</span>
                    <span className="text-[var(--muted)]">
                      {w.durationMin} min · strain {w.strain}
                    </span>
                  </div>
                  <ZoneBars zoneMin={w.zoneMin} />
                </div>
              ))}
            </div>
          ) : (
            <Empty action={<Link href="/strain"><Btn variant="ghost">Add a workout</Btn></Link>}>No workouts yet.</Empty>
          )}
          <div className="mt-4 flex gap-6 border-t border-white/[0.06] pt-4">
            <Stat label="Calories" value={kcal.toLocaleString()} unit="kcal" />
            <Stat label="Steps" value={(day?.steps ?? 0).toLocaleString()} />
          </div>
        </Card>

        <Card>
          <Title right={<Link href="/stress" className="text-xs text-[var(--accent)]">Open</Link>}>Stress</Title>
          {ss ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">{ss.avg}</span>
                <span className="text-sm text-[var(--muted)]">/ 3 · {stressLabel(ss.avg)}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {ss.calmHours} of {ss.totalHours} waking hours in the low range. Peak around {ss.peak.hour}:00.
              </p>
              <Link href="/stress"><Btn variant="ghost" className="mt-4">Start a breathing session</Btn></Link>
            </>
          ) : (
            <Empty>No daytime heart-rate data for this day.</Empty>
          )}
        </Card>

        <Card>
          <Title right={<Link href="/journal" className="text-xs text-[var(--accent)]">Open</Link>}>Journal</Title>
          {journaled ? (
            <p className="text-sm text-[var(--muted)]">
              You logged {Object.values(journaled).filter(Boolean).length} of {BEHAVIORS.length} behaviors the day before.
            </p>
          ) : (
            <p className="text-sm text-[var(--muted)]">Log your habits each evening and Pulsewell learns what moves your recovery.</p>
          )}
          {impacts.length ? (
            <div className="mt-3 space-y-2">
              {impacts.map((i) => (
                <div key={i.behavior.id} className="flex items-center justify-between text-sm">
                  <span>{i.behavior.label}</span>
                  <Pill color={i.delta >= 0 ? "#4ade80" : "#f87171"}>
                    {i.delta >= 0 ? "+" : ""}
                    {Math.round(i.delta)}% recovery
                  </Pill>
                </div>
              ))}
            </div>
          ) : null}
          <Link href="/journal"><Btn variant="ghost" className="mt-4">Open journal</Btn></Link>
        </Card>
      </div>

      {logging ? <LogDay date={date} onClose={() => setLogging(false)} /> : null}
    </div>
  );
}
