"use client";

import { useState } from "react";
import { Btn, Field, NumInput, inputCls } from "./ui";
import { addDays, fmtDay } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { SleepRecord } from "@/lib/types";

const toLocalIso = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00`).toISOString();
const hhmmOf = (iso?: string, fallback = "23:00") => {
  if (!iso) return fallback;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Manual entry for the night that ends on `date` plus morning readings. */
export default function LogDay({ date, onClose }: { date: string; onClose: () => void }) {
  const { state, patchDay } = useStore();
  const d = state.days[date];
  const [bed, setBed] = useState(hhmmOf(d?.sleep?.start, "23:00"));
  const [wake, setWake] = useState(hhmmOf(d?.sleep?.end, state.profile.wakeTime));
  const [awake, setAwake] = useState(d?.sleep?.awakeMin ?? 35);
  const [hrv, setHrv] = useState<number | undefined>(d?.hrv);
  const [rhr, setRhr] = useState<number | undefined>(d?.rhr);
  const [resp, setResp] = useState<number | undefined>(d?.resp);
  const [spo2, setSpo2] = useState<number | undefined>(d?.spo2);
  const [steps, setSteps] = useState<number | undefined>(d?.steps);
  const [nap, setNap] = useState<number | undefined>(d?.napMin);

  const save = () => {
    // bedtime before midnight belongs to the previous calendar day
    const bedDate = bed > wake ? addDays(date, -1) : date;
    const startIso = toLocalIso(bedDate, bed);
    const endIso = toLocalIso(date, wake);
    const inBed = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
    const asleep = Math.max(0, inBed - awake);
    const prev = d?.sleep;
    const sleep: SleepRecord = {
      start: startIso,
      end: endIso,
      awakeMin: Math.round(awake),
      lightMin: Math.round(asleep * 0.57),
      swsMin: Math.round(asleep * 0.19),
      remMin: Math.round(asleep * 0.24),
      disturbances: prev?.disturbances ?? Math.round(awake / 10),
    };
    patchDay(date, { sleep, hrv, rhr, resp, spo2, steps, napMin: nap });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0c1016] p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">Log {fmtDay(date)}</h3>
        <p className="mb-4 mt-1 text-sm text-[var(--muted)]">Sleep from the night before, plus your morning readings. Fill what you have; skip the rest.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bedtime">
            <input type="time" className={inputCls} value={bed} onChange={(e) => setBed(e.target.value)} />
          </Field>
          <Field label="Wake time">
            <input type="time" className={inputCls} value={wake} onChange={(e) => setWake(e.target.value)} />
          </Field>
          <Field label="Awake during night (min)">
            <NumInput value={awake} min={0} max={240} onChange={setAwake} />
          </Field>
          <Field label="Nap yesterday (min)">
            <NumInput value={nap} min={0} max={240} onChange={setNap} />
          </Field>
          <Field label="HRV (RMSSD, ms)" hint="Morning, seated, 2 min">
            <NumInput value={hrv} min={5} max={250} onChange={setHrv} />
          </Field>
          <Field label="Resting HR (bpm)">
            <NumInput value={rhr} min={30} max={120} onChange={setRhr} />
          </Field>
          <Field label="Respiratory rate (rpm)">
            <NumInput value={resp} min={6} max={30} step={0.1} onChange={setResp} />
          </Field>
          <Field label="Blood oxygen (%)">
            <NumInput value={spo2} min={80} max={100} step={0.1} onChange={setSpo2} />
          </Field>
          <Field label="Steps">
            <NumInput value={steps} min={0} max={80000} step={100} onChange={setSteps} />
          </Field>
        </div>
        <div className="mt-5 flex gap-3">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn className="flex-1" onClick={save}>
            Save
          </Btn>
        </div>
      </div>
    </div>
  );
}
