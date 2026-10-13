"use client";

import { useEffect, useRef, useState } from "react";
import { Btn } from "./ui";

export interface Pattern {
  name: string;
  blurb: string;
  phases: { label: string; secs: number; scale: number }[];
}

export const PATTERNS: Pattern[] = [
  { name: "Resonant 5.5", blurb: "Slow, even breathing around 5.5 breaths per minute. A reliable way to downshift.", phases: [{ label: "Breathe in", secs: 5.5, scale: 1 }, { label: "Breathe out", secs: 5.5, scale: 0.55 }] },
  { name: "Box 4-4-4-4", blurb: "Equal inhale, hold, exhale, hold. Steadies attention under pressure.", phases: [{ label: "Breathe in", secs: 4, scale: 1 }, { label: "Hold", secs: 4, scale: 1 }, { label: "Breathe out", secs: 4, scale: 0.55 }, { label: "Hold", secs: 4, scale: 0.55 }] },
  { name: "Relax 4-7-8", blurb: "A long exhale to wind down before sleep.", phases: [{ label: "Breathe in", secs: 4, scale: 1 }, { label: "Hold", secs: 7, scale: 1 }, { label: "Breathe out", secs: 8, scale: 0.55 }] },
];

export default function Breath({ pattern, minutes, onDone, onCancel }: { pattern: Pattern; minutes: number; onDone: (secondsCompleted: number) => void; onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const start = useRef<number>(0);
  const total = minutes * 60;
  const cycle = pattern.phases.reduce((a, p) => a + p.secs, 0);

  useEffect(() => {
    start.current = performance.now();
    const id = setInterval(() => setElapsed((performance.now() - start.current) / 1000), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (elapsed >= total) onDone(total);
  }, [elapsed, total, onDone]);

  let t = elapsed % cycle;
  let idx = 0;
  while (idx < pattern.phases.length - 1 && t >= pattern.phases[idx].secs) {
    t -= pattern.phases[idx].secs;
    idx++;
  }
  const phase = pattern.phases[idx];
  const remaining = Math.max(0, Math.ceil(total - elapsed));

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05070a] px-6">
      <div className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">{pattern.name}</div>
      <div className="relative my-10 flex h-72 w-72 items-center justify-center">
        <div
          className="absolute h-full w-full rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(61,214,198,0.55), rgba(61,214,198,0.08) 70%)",
            transform: `scale(${phase.scale})`,
            transition: `transform ${phase.secs}s ease-in-out`,
            boxShadow: "0 0 80px rgba(61,214,198,0.25)",
          }}
        />
        <div className="relative text-2xl font-medium">{phase.label}</div>
      </div>
      <div className="text-5xl font-semibold tabular-nums">
        {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
      </div>
      <div className="mt-10 flex gap-3">
        <Btn variant="ghost" onClick={onCancel}>
          End early
        </Btn>
      </div>
    </div>
  );
}
