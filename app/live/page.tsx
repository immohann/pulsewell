"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Btn, Card, Empty, PageHead, Pill, Ring, Stat, Title, ZoneBars, inputCls } from "@/components/ui";
import { bleSupported, connectHrMonitor, rmssd, type HrConnection } from "@/lib/ble";
import { ZONE_COLORS, ZONE_NAMES, mean, sportList, summarizeSamples, todayStr, workoutStrain, zoneOf } from "@/lib/engine";
import { useStore } from "@/lib/store";

type Mode = "workout" | "reading";
const READING_SECS = 120;

export default function LivePage() {
  const { state, addWorkout, patchDay } = useStore();
  const p = state.profile;
  const [mode, setMode] = useState<Mode>("workout");
  const [conn, setConn] = useState<{ name: string; sim: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hr, setHr] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [sport, setSport] = useState("Running");
  const [live, setLive] = useState<{ avg: number; max: number; kcal: number; strain: number; zoneMin: number[] } | null>(null);
  const [reading, setReading] = useState<{ hrv: number | null; rhr: number } | null>(null);

  const connRef = useRef<HrConnection | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hrRef = useRef<number | null>(null);
  const rrRef = useRef<number[]>([]);
  const samples = useRef<number[]>([]);
  const startedAt = useRef(0);

  const stopSources = useCallback(() => {
    connRef.current?.disconnect();
    connRef.current = null;
    if (simRef.current) clearInterval(simRef.current);
    simRef.current = null;
  }, []);

  useEffect(() => stopSources, [stopSources]);

  const onPacket = useCallback((pk: { hr: number; rr: number[] }) => {
    hrRef.current = pk.hr;
    setHr(pk.hr);
    if (pk.rr.length) rrRef.current.push(...pk.rr);
  }, []);

  const connect = async () => {
    setError(null);
    try {
      const c = await connectHrMonitor(onPacket, () => {
        setConn(null);
        setError("Heart-rate monitor disconnected.");
      });
      connRef.current = c;
      setConn({ name: c.name, sim: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect.");
    }
  };

  const simulate = () => {
    setError(null);
    stopSources();
    let t = 0;
    setConn({ name: "Simulated strap", sim: true });
    simRef.current = setInterval(() => {
      t++;
      const base = mode === "reading" ? 56 + Math.sin(t / 7) * 2 : 118 + Math.sin(t / 25) * 22 + Math.sin(t / 6) * 4;
      const hrNow = Math.round(base + (Math.random() - 0.5) * 3);
      const rr = (60000 / hrNow) * (1 + (Math.random() - 0.5) * (mode === "reading" ? 0.12 : 0.04));
      onPacket({ hr: hrNow, rr: [rr] });
    }, 1000);
  };

  const disconnect = () => {
    stopSources();
    setConn(null);
    setHr(null);
    hrRef.current = null;
  };

  // one-second ticker while recording
  useEffect(() => {
    if (!running) return;
    startedAt.current = performance.now();
    samples.current = [];
    rrRef.current = [];
    const id = setInterval(() => {
      const secs = Math.floor((performance.now() - startedAt.current) / 1000);
      setElapsed(secs);
      if (hrRef.current != null) samples.current.push(hrRef.current);
      if (mode === "workout") {
        const s = summarizeSamples(samples.current, 1, p);
        setLive({ avg: s.avgHr, max: s.maxHr, kcal: s.kcal, zoneMin: s.zoneMin, strain: workoutStrain(s.zoneMin, p.fitness) });
      }
      if (mode === "reading" && secs >= READING_SECS) {
        // resting HR = lowest 30 s rolling mean; HRV = RMSSD of the RR intervals
        const xs = samples.current;
        let best = Infinity;
        for (let i = 0; i + 30 <= xs.length; i += 5) best = Math.min(best, mean(xs.slice(i, i + 30)));
        setReading({ hrv: rmssd(rrRef.current), rhr: Math.round(Number.isFinite(best) ? best : mean(xs)) });
        setRunning(false);
        setDone(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running, mode, p]);

  const begin = () => {
    setDone(false);
    setLive(null);
    setReading(null);
    setElapsed(0);
    setRunning(true);
  };
  const finish = () => {
    setRunning(false);
    setDone(true);
  };

  const saveWorkout = () => {
    const s = summarizeSamples(samples.current, 1, p);
    addWorkout({
      date: todayStr(),
      start: new Date(Date.now() - samples.current.length * 1000).toISOString(),
      sport,
      durationMin: Math.max(1, s.durationMin),
      avgHr: s.avgHr,
      maxHr: s.maxHr,
      zoneMin: s.zoneMin,
      kcal: s.kcal,
      strain: workoutStrain(s.zoneMin, p.fitness),
      source: "live",
      samples: samples.current.filter((_, i) => i % 10 === 0),
    });
    setDone(false);
    setLive(null);
  };

  const saveReading = () => {
    if (!reading) return;
    patchDay(todayStr(), { rhr: reading.rhr, ...(reading.hrv ? { hrv: Math.round(reading.hrv) } : {}) });
    setReading(null);
    setDone(false);
  };

  const zone = hr ? zoneOf(hr, p.maxHr) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div>
      <PageHead title="Live strap" sub="Connect any Bluetooth heart-rate monitor (chest strap, armband, many watches in broadcast mode)." />

      {!conn ? (
        <Card>
          <Title>Connect a heart-rate monitor</Title>
          <p className="text-sm text-[var(--muted)]">
            Pulsewell uses the standard Bluetooth Heart Rate Service through your browser&apos;s Web Bluetooth. It works in Chrome, Edge and Opera on desktop and Android. iPhone Safari does not support Web Bluetooth. Pulsewell can&apos;t read proprietary bands that don&apos;t broadcast the standard service.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Btn onClick={connect} disabled={!bleSupported()}>
              Connect strap
            </Btn>
            <Btn variant="ghost" onClick={simulate}>
              Try with a simulated strap
            </Btn>
          </div>
          {!bleSupported() ? <p className="mt-3 text-xs text-[var(--yellow)]">Web Bluetooth isn&apos;t available in this browser. You can still try the simulator.</p> : null}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--green)]" />
              {conn.name}
              {conn.sim ? <Pill color="#fbbf24">simulated</Pill> : null}
            </div>
            <div className="flex gap-2">
              <div className="inline-flex rounded-xl border border-white/10 p-1">
                {(["workout", "reading"] as Mode[]).map((m) => (
                  <button key={m} disabled={running} onClick={() => { setMode(m); setDone(false); }} className={`rounded-lg px-3.5 py-1.5 text-sm disabled:opacity-50 ${mode === m ? "bg-white/10 font-semibold" : "text-[var(--muted)]"}`}>
                    {m === "workout" ? "Workout" : "Morning reading"}
                  </button>
                ))}
              </div>
              <Btn variant="ghost" onClick={disconnect}>
                Disconnect
              </Btn>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center py-8 text-center">
              <Ring size={190} stroke={14} value={hr ?? 0} max={p.maxHr} color={zone ? ZONE_COLORS[zone - 1] : "#555"}>
                <div className="text-5xl font-semibold tabular-nums">{hr ?? "–"}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-[var(--muted)]">bpm</div>
              </Ring>
              <div className="mt-4 text-sm" style={{ color: zone ? ZONE_COLORS[zone - 1] : undefined }}>
                {zone ? `Zone ${zone} · ${ZONE_NAMES[zone - 1]}` : "Below zone 1"}
              </div>
              {running ? <div className="mt-2 text-2xl font-semibold tabular-nums">{mm}:{ss}</div> : null}
            </Card>

            <Card className="lg:col-span-2">
              {mode === "workout" ? (
                <>
                  <Title>Workout recording</Title>
                  {live ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Stat label="Strain" value={live.strain.toFixed(1)} color="var(--strain)" />
                        <Stat label="Avg HR" value={live.avg} unit="bpm" />
                        <Stat label="Max HR" value={live.max} unit="bpm" />
                        <Stat label="Energy" value={live.kcal} unit="kcal" />
                      </div>
                      <ZoneBars zoneMin={live.zoneMin} />
                    </div>
                  ) : (
                    <Empty>Press start when you begin. Strain, zones and calories update every second.</Empty>
                  )}
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {!running && !done ? <Btn onClick={begin}>Start recording</Btn> : null}
                    {running ? <Btn variant="danger" onClick={finish}>Stop</Btn> : null}
                    {done ? (
                      <>
                        <select className={`${inputCls} max-w-44`} value={sport} onChange={(e) => setSport(e.target.value)}>
                          {sportList.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                        <Btn onClick={saveWorkout}>Save workout</Btn>
                        <Btn variant="ghost" onClick={() => { setDone(false); setLive(null); }}>
                          Discard
                        </Btn>
                      </>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <Title sub="Sit still and breathe normally for two minutes. Pulsewell measures resting heart rate and HRV (RMSSD) from beat-to-beat intervals.">Morning reading</Title>
                  {running ? (
                    <div className="py-4">
                      <div className="mb-2 text-sm text-[var(--muted)]">Measuring… {Math.max(0, READING_SECS - elapsed)}s left</div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-[var(--accent)] transition-[width]" style={{ width: `${(elapsed / READING_SECS) * 100}%` }} />
                      </div>
                    </div>
                  ) : reading ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Stat label="Resting HR" value={reading.rhr} unit="bpm" />
                        <Stat label="HRV (RMSSD)" value={reading.hrv ? Math.round(reading.hrv) : "–"} unit="ms" sub={reading.hrv ? undefined : "Your strap didn't send beat-to-beat intervals"} />
                      </div>
                      <div className="flex gap-3">
                        <Btn onClick={saveReading}>Save to today</Btn>
                        <Btn variant="ghost" onClick={() => { setReading(null); setDone(false); }}>
                          Discard
                        </Btn>
                      </div>
                    </div>
                  ) : (
                    <Btn onClick={begin}>Start 2-minute reading</Btn>
                  )}
                </>
              )}
              {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
