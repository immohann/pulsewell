"use client";

import { useRef, useState } from "react";
import { Btn, Card, Field, NumInput, PageHead, Title, inputCls } from "@/components/ui";
import { fmtDay, todayStr } from "@/lib/engine";
import WhoopCard from "@/components/WhoopCard";
import { useStore } from "@/lib/store";
import type { Fitness, Sex, SleepGoal } from "@/lib/types";

export default function SettingsPage() {
  const { state, setProfile, exportJson, importJson, startDemo, reset, addCycleStart, removeCycleStart } = useStore();
  const p = state.profile;
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [cycleDate, setCycleDate] = useState(todayStr());

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pulsewell-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    const err = importJson(await f.text());
    setMsg(err ?? "Imported.");
  };

  return (
    <div>
      <PageHead title="Settings" sub="Everything is stored in this browser. Export a backup any time." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Title>Profile</Title>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input className={inputCls} value={p.name} onChange={(e) => setProfile({ name: e.target.value })} />
            </Field>
            <Field label="Birth year">
              <NumInput value={p.birthYear} min={1930} max={2015} onChange={(n) => setProfile({ birthYear: n })} />
            </Field>
            <Field label="Sex">
              <select className={inputCls} value={p.sex} onChange={(e) => setProfile({ sex: e.target.value as Sex })}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Prefer not to say</option>
              </select>
            </Field>
            <Field label="Fitness level">
              <select className={inputCls} value={p.fitness} onChange={(e) => setProfile({ fitness: e.target.value as Fitness })}>
                <option value="inactive">Mostly inactive</option>
                <option value="recreational">Recreational</option>
                <option value="serious">Serious enthusiast</option>
                <option value="collegiate">Collegiate athlete</option>
                <option value="professional">Professional athlete</option>
                <option value="tactical">Tactical / physical job</option>
              </select>
            </Field>
            <Field label="Height (cm)">
              <NumInput value={p.heightCm} min={120} max={230} onChange={(n) => setProfile({ heightCm: n })} />
            </Field>
            <Field label="Weight (kg)">
              <NumInput value={p.weightKg} min={30} max={250} step={0.5} onChange={(n) => setProfile({ weightKg: n })} />
            </Field>
            <Field label="Max heart rate (bpm)">
              <NumInput value={p.maxHr} min={120} max={230} onChange={(n) => setProfile({ maxHr: n })} />
            </Field>
            <Field label="Usual wake time">
              <input type="time" className={inputCls} value={p.wakeTime} onChange={(e) => setProfile({ wakeTime: e.target.value })} />
            </Field>
            <Field label="Sleep goal">
              <select className={inputCls} value={p.sleepGoal} onChange={(e) => setProfile({ sleepGoal: e.target.value as SleepGoal })}>
                <option value="peak">Peak</option>
                <option value="perform">Perform</option>
                <option value="getby">Get by</option>
              </select>
            </Field>
          </div>
        </Card>

        <div className="space-y-4">
          <WhoopCard />
          <Card>
            <Title>Cycle insights</Title>
            <label className="flex items-center justify-between text-sm">
              <span>Track menstrual cycle phase</span>
              <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={p.cycleTracking} onChange={(e) => setProfile({ cycleTracking: e.target.checked })} />
            </label>
            {p.cycleTracking ? (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <input type="date" className={inputCls} value={cycleDate} onChange={(e) => setCycleDate(e.target.value)} />
                  <Btn onClick={() => addCycleStart(cycleDate)}>Log period start</Btn>
                </div>
                <div className="flex flex-wrap gap-2">
                  {state.cycleStarts.map((d) => (
                    <button key={d} onClick={() => removeCycleStart(d)} className="rounded-full bg-white/[0.07] px-3 py-1 text-xs hover:bg-red-500/20">
                      {fmtDay(d, { month: "short", day: "numeric" })} ✕
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <Card>
            <Title>Your data</Title>
            <div className="flex flex-wrap gap-3">
              <Btn variant="ghost" onClick={download}>
                Export JSON
              </Btn>
              <Btn variant="ghost" onClick={() => file.current?.click()}>
                Import JSON
              </Btn>
              <input ref={file} type="file" accept="application/json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            </div>
            {msg ? <p className="mt-3 text-sm text-[var(--muted)]">{msg}</p> : null}
            <div className="mt-5 flex flex-wrap gap-3 border-t border-white/[0.06] pt-5">
              <Btn variant="ghost" onClick={() => startDemo(p)}>
                Load demo data
              </Btn>
              {confirm ? (
                <>
                  <Btn variant="danger" onClick={() => { reset(); setConfirm(false); }}>
                    Yes, erase everything
                  </Btn>
                  <Btn variant="ghost" onClick={() => setConfirm(false)}>
                    Cancel
                  </Btn>
                </>
              ) : (
                <Btn variant="danger" onClick={() => setConfirm(true)}>
                  Erase all data
                </Btn>
              )}
            </div>
            {state.demo ? <p className="mt-3 text-xs text-[var(--yellow)]">You&apos;re viewing synthetic demo data.</p> : null}
          </Card>

          <Card>
            <Title>About</Title>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Pulsewell is an independent, open-source project. It is not affiliated with or endorsed by any wearable company. Scores are wellness estimates from published sports-science methods and are not medical advice.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
