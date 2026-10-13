"use client";

import { useRef, useState } from "react";
import { Btn, Card, Progress, Title } from "./ui";
import { AppleHealthParser } from "@/lib/applehealth";
import { CSV_TEMPLATE, parseCsv } from "@/lib/csvimport";
import { ageOf, kcalPerMin, workoutStrain, zoneOf } from "@/lib/engine";
import { readAppleHealth } from "@/lib/healthfile";
import { useStore } from "@/lib/store";
import type { HealthImport } from "@/lib/types";

const fmtMb = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${Math.round(b / 1e6)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

function Summary({ r }: { r: HealthImport["counts"] }) {
  return (
    <p className="mt-4 text-sm text-[var(--green)]">
      Imported {r.days} days: {r.sleeps} nights of sleep, {r.recoveries} days with HRV and resting heart rate, {r.workouts} workouts.
    </p>
  );
}

export function AppleHealthCard() {
  const { state, importHealth } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [days, setDays] = useState(120);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HealthImport["counts"] | null>(null);
  const [fileInfo, setFileInfo] = useState<string | null>(null);

  const run = async (file: File) => {
    const p = state.profile;
    const age = ageOf(p);
    setBusy(true);
    setError(null);
    setResult(null);
    setPct(0);
    setFileInfo(`${file.name} · ${fmtMb(file.size)}`);
    try {
      const parser = new AppleHealthParser({
        maxHr: p.maxHr,
        days,
        zoneOf: (hr) => zoneOf(hr, p.maxHr),
        kcalPerMin: (hr) => kcalPerMin(hr, p, age),
        strainFor: (zm) => workoutStrain(zm, p.fitness),
      });
      await readAppleHealth(file, parser, setPct);
      const out = parser.finish();
      if (!out.counts.days) throw new Error("No Health data was found in that file for the chosen period. Is it the export from the Health app?");
      importHealth(out);
      setResult(out.counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Title right={<span className="text-xs text-[var(--muted)]">iPhone &amp; Apple Watch</span>}>Apple Health</Title>
      <p className="text-sm text-[var(--muted)]">
        Brings in sleep stages, heart-rate variability, resting heart rate, respiration, blood oxygen, steps, all-day heart rate (for strain and stress) and workouts. With an Apple Watch you get everything; with just an iPhone you get steps and sleep estimates.
      </p>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-[var(--muted)]">
        <li>
          On your iPhone open <b className="text-[var(--fg)]">Health</b> → tap your picture (top right) → <b className="text-[var(--fg)]">Export All Health Data</b>.
        </li>
        <li>Save or AirDrop the resulting <span className="font-mono text-xs text-[var(--fg)]">export.zip</span> to this device. It can be hundreds of MB.</li>
        <li>Choose it below. The file is read inside your browser and is never uploaded.</li>
      </ol>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <select className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm" value={days} disabled={busy} onChange={(e) => setDays(parseInt(e.target.value, 10))}>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={120}>Last 120 days</option>
          <option value={365}>Last year</option>
        </select>
        <Btn onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Reading…" : "Choose export.zip or export.xml"}
        </Btn>
        <input
          ref={input}
          data-testid="apple-file"
          type="file"
          accept=".zip,.xml,application/zip,text/xml"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void run(f);
          }}
        />
      </div>
      {busy || result ? (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-[var(--muted)]">
            <span>{fileInfo}</span>
            <span>{Math.round(pct * 100)}%</span>
          </div>
          <Progress pct={pct} />
        </div>
      ) : null}
      {result ? <Summary r={result} /> : null}
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      <p className="mt-4 text-xs text-[var(--muted)]">
        Apple records HRV as SDNN rather than RMSSD. Pulsewell compares it only with your own baseline, so recovery still works, but the absolute number won&apos;t match other apps. Import again any time to refresh.
      </p>
    </Card>
  );
}

export function CsvCard() {
  const { importHealth } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<HealthImport["counts"] | null>(null);

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    a.download = "pulsewell-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const run = async (file: File) => {
    const { data, errors: errs } = parseCsv(await file.text());
    setErrors(errs);
    if (data.counts.days) {
      importHealth(data);
      setResult(data.counts);
    } else setResult(null);
  };

  return (
    <Card>
      <Title right={<span className="text-xs text-[var(--muted)]">Garmin, Fitbit, Oura, Samsung, spreadsheets…</span>}>CSV file</Title>
      <p className="text-sm text-[var(--muted)]">
        Any device or spreadsheet works if you can get one row per day. Columns: <span className="font-mono text-xs text-[var(--fg)]">date, sleep_start, sleep_end, awake_min, deep_min, rem_min, hrv, rhr, resp, spo2, steps, nap_min</span>. Only <span className="font-mono text-xs text-[var(--fg)]">date</span> is required, and <span className="font-mono text-xs text-[var(--fg)]">date</span> is the morning you woke up.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Btn variant="ghost" onClick={download}>
          Download template
        </Btn>
        <Btn onClick={() => input.current?.click()}>Choose CSV</Btn>
        <input
          ref={input}
          data-testid="csv-file"
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void run(f);
          }}
        />
      </div>
      {result ? <Summary r={result} /> : null}
      {errors.length ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[var(--yellow)]">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
