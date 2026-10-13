"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Btn, Field, NumInput, inputCls } from "./ui";
import { defaultProfile } from "@/lib/demo";
import { useStore } from "@/lib/store";
import type { Fitness, Profile, Sex, SleepGoal } from "@/lib/types";

const FITNESS: { v: Fitness; label: string }[] = [
  { v: "inactive", label: "Mostly inactive" },
  { v: "recreational", label: "Recreational" },
  { v: "serious", label: "Serious enthusiast" },
  { v: "collegiate", label: "Collegiate athlete" },
  { v: "professional", label: "Professional athlete" },
  { v: "tactical", label: "Tactical / physical job" },
];

export default function Onboarding() {
  const router = useRouter();
  const { startFresh, startDemo } = useStore();
  const [p, setP] = useState<Profile>(defaultProfile());
  const [step, setStep] = useState(0);
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const age = new Date().getFullYear() - p.birthYear;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" width={44} height={44} className="rounded-xl" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pulsewell</h1>
          <p className="text-sm text-[var(--muted)]">Recovery, strain and sleep, on your terms.</p>
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <p className="text-[15px] leading-relaxed text-[var(--muted)]">
            Pulsewell turns your heart rate, heart-rate variability and sleep into three daily numbers: <b className="text-white">Recovery</b>, <b className="text-white">Strain</b> and <b className="text-white">Sleep</b>. Everything is computed on your device. No account, no server, no tracking.
          </p>
          <ul className="space-y-2 text-sm text-[var(--muted)]">
            <li>• Connect any Bluetooth heart-rate strap for live workouts and morning readings.</li>
            <li>• Or enter your metrics by hand, or explore with demo data.</li>
          </ul>
          <Btn className="w-full" onClick={() => setStep(1)}>
            Get started
          </Btn>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Field label="Your name (optional)">
            <input className={inputCls} value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="Alex" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Birth year" hint={`Age ${age}`}>
              <NumInput value={p.birthYear} min={1930} max={new Date().getFullYear() - 10} onChange={(n) => set({ birthYear: n, maxHr: Math.round(208 - 0.7 * (new Date().getFullYear() - n)) })} />
            </Field>
            <Field label="Sex (for calorie math)">
              <select className={inputCls} value={p.sex} onChange={(e) => set({ sex: e.target.value as Sex })}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Prefer not to say</option>
              </select>
            </Field>
            <Field label="Height (cm)">
              <NumInput value={p.heightCm} min={120} max={230} onChange={(n) => set({ heightCm: n })} />
            </Field>
            <Field label="Weight (kg)">
              <NumInput value={p.weightKg} min={30} max={250} step={0.5} onChange={(n) => set({ weightKg: n })} />
            </Field>
            <Field label="Max heart rate" hint="Tanaka estimate. Edit if you know yours.">
              <NumInput value={p.maxHr} min={120} max={230} onChange={(n) => set({ maxHr: n })} />
            </Field>
            <Field label="Usual wake time">
              <input type="time" className={inputCls} value={p.wakeTime} onChange={(e) => set({ wakeTime: e.target.value })} />
            </Field>
          </div>
          <Field label="Fitness level">
            <select className={inputCls} value={p.fitness} onChange={(e) => set({ fitness: e.target.value as Fitness })}>
              {FITNESS.map((f) => (
                <option key={f.v} value={f.v}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sleep goal">
            <select className={inputCls} value={p.sleepGoal} onChange={(e) => set({ sleepGoal: e.target.value as SleepGoal })}>
              <option value="peak">Peak: fully rested</option>
              <option value="perform">Perform: balanced</option>
              <option value="getby">Get by: minimum</option>
            </select>
          </Field>
          <div className="flex gap-3 pt-1">
            <Btn variant="ghost" onClick={() => setStep(0)}>
              Back
            </Btn>
            <Btn className="flex-1" onClick={() => setStep(2)}>
              Continue
            </Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-[15px] text-[var(--muted)]">How would you like to start?</p>
          <button onClick={() => startDemo(p)} className="w-full rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4 text-left transition hover:bg-[var(--accent)]/15">
            <div className="font-semibold">Explore with demo data</div>
            <div className="mt-1 text-sm text-[var(--muted)]">75 days of realistic synthetic data so every screen is alive. You can clear it anytime in Settings.</div>
          </button>
          <button
            onClick={() => {
              startFresh(p);
              // let the store persist the profile before leaving the page
              setTimeout(() => router.push("/import"), 300);
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
          >
            <div className="font-semibold">Import my data</div>
            <div className="mt-1 text-sm text-[var(--muted)]">Apple Health export, a CSV from another device, or a heart-rate strap.</div>
          </button>
          <button onClick={() => startFresh(p)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]">
            <div className="font-semibold">Start fresh</div>
            <div className="mt-1 text-sm text-[var(--muted)]">Begin with an empty history. Scores calibrate after about a week of readings.</div>
          </button>
          <Btn variant="ghost" onClick={() => setStep(1)}>
            Back
          </Btn>
        </div>
      )}
    </div>
  );
}
