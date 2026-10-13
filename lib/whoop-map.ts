// Pure mapping from WHOOP developer API v2 records to Pulsewell's data model.
// No runtime imports on purpose: this file is unit-tested with plain Node.
import type { DayRecord, Workout, WhoopImport } from "./types";

/* ----- raw API shapes (only the fields we read) ----- */

interface Scored<S> {
  score_state?: string;
  score?: S;
}
export interface RawCycle extends Scored<{ strain?: number; kilojoule?: number; average_heart_rate?: number; max_heart_rate?: number }> {
  id: number | string;
  start: string;
  end?: string | null;
  timezone_offset?: string;
}
export interface RawRecovery
  extends Scored<{
    recovery_score?: number;
    resting_heart_rate?: number;
    hrv_rmssd_milli?: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  }> {
  cycle_id?: number | string;
  sleep_id?: string;
}
export interface RawSleep
  extends Scored<{
    stage_summary?: {
      total_in_bed_time_milli?: number;
      total_awake_time_milli?: number;
      total_light_sleep_time_milli?: number;
      total_slow_wave_sleep_time_milli?: number;
      total_rem_sleep_time_milli?: number;
      disturbance_count?: number;
    };
    respiratory_rate?: number;
    sleep_performance_percentage?: number;
  }> {
  id: string;
  start: string;
  end: string;
  timezone_offset?: string;
  nap?: boolean;
}
export interface RawWorkout
  extends Scored<{
    strain?: number;
    average_heart_rate?: number;
    max_heart_rate?: number;
    kilojoule?: number;
    zone_durations?: {
      zone_zero_milli?: number;
      zone_one_milli?: number;
      zone_two_milli?: number;
      zone_three_milli?: number;
      zone_four_milli?: number;
      zone_five_milli?: number;
    };
  }> {
  id: string;
  start: string;
  end: string;
  timezone_offset?: string;
  sport_name?: string;
}
export interface RawBody {
  height_meter?: number;
  weight_kilogram?: number;
  max_heart_rate?: number;
}
export interface WhoopRaw {
  cycles: RawCycle[];
  recoveries: RawRecovery[];
  sleeps: RawSleep[];
  workouts: RawWorkout[];
  body?: RawBody | null;
  profile?: { first_name?: string } | null;
}

/* ----- helpers ----- */

const MIN = 60000;
const r1 = (x: number) => Math.round(x * 10) / 10;
const scored = (x: Scored<unknown>) => x.score_state === undefined || x.score_state === "SCORED";

/** "2026-10-12T11:02:00Z" + "-05:00" → "2026-10-12" (the local calendar date). */
export function dateInOffset(iso: string, offset = "+00:00"): string {
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(offset);
  const mins = m ? (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10)) : 0;
  return new Date(Date.parse(iso) + mins * MIN).toISOString().slice(0, 10);
}

export function prettySport(name?: string): string {
  if (!name) return "Workout";
  const s = name.replace(/[-_]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ----- main ----- */

export function normalizeWhoop(raw: WhoopRaw): WhoopImport {
  const days: Record<string, Partial<DayRecord>> = {};
  const day = (d: string) => (days[d] ??= { date: d });

  // sleeps: keep the longest main sleep per wake date; naps accumulate on their own date
  const mainByDate = new Map<string, RawSleep>();
  const sleepById = new Map<string, string>(); // sleep id → wake date
  let sleeps = 0;
  for (const s of raw.sleeps) {
    if (!scored(s) || !s.score?.stage_summary) continue;
    if (s.nap) {
      const d = dateInOffset(s.start, s.timezone_offset);
      const ss = s.score.stage_summary;
      const asleep = ((ss.total_light_sleep_time_milli ?? 0) + (ss.total_slow_wave_sleep_time_milli ?? 0) + (ss.total_rem_sleep_time_milli ?? 0)) / MIN;
      day(d).napMin = Math.round((day(d).napMin ?? 0) + asleep);
      continue;
    }
    const d = dateInOffset(s.end, s.timezone_offset);
    sleepById.set(s.id, d);
    const prev = mainByDate.get(d);
    const dur = (x: RawSleep) => Date.parse(x.end) - Date.parse(x.start);
    if (!prev || dur(s) > dur(prev)) mainByDate.set(d, s);
  }
  for (const [d, s] of mainByDate) {
    const ss = s.score!.stage_summary!;
    const rec = day(d);
    rec.sleep = {
      start: new Date(Date.parse(s.start)).toISOString(),
      end: new Date(Date.parse(s.end)).toISOString(),
      awakeMin: Math.round((ss.total_awake_time_milli ?? 0) / MIN),
      lightMin: Math.round((ss.total_light_sleep_time_milli ?? 0) / MIN),
      swsMin: Math.round((ss.total_slow_wave_sleep_time_milli ?? 0) / MIN),
      remMin: Math.round((ss.total_rem_sleep_time_milli ?? 0) / MIN),
      disturbances: ss.disturbance_count ?? 0,
    };
    if (s.score?.respiratory_rate != null) rec.resp = r1(s.score.respiratory_rate);
    if (s.score?.sleep_performance_percentage != null) rec.whoop = { ...rec.whoop, sleepPerformance: Math.round(s.score.sleep_performance_percentage) };
    sleeps++;
  }

  // recoveries are attached to the day of the sleep they follow
  const temps: { date: string; c: number }[] = [];
  let recoveries = 0;
  for (const r of raw.recoveries) {
    if (!scored(r) || !r.score || !r.sleep_id) continue;
    const d = sleepById.get(r.sleep_id);
    if (!d) continue;
    const rec = day(d);
    if (r.score.hrv_rmssd_milli != null) rec.hrv = Math.round(r.score.hrv_rmssd_milli);
    if (r.score.resting_heart_rate != null) rec.rhr = Math.round(r.score.resting_heart_rate);
    if (r.score.spo2_percentage != null) rec.spo2 = r1(r.score.spo2_percentage);
    if (r.score.recovery_score != null) rec.whoop = { ...rec.whoop, recovery: Math.round(r.score.recovery_score) };
    if (r.score.skin_temp_celsius != null) temps.push({ date: d, c: r.score.skin_temp_celsius });
    recoveries++;
  }
  if (temps.length >= 3) {
    const mean = temps.reduce((a, t) => a + t.c, 0) / temps.length;
    for (const t of temps) day(t.date).skinTempDelta = r1(t.c - mean);
  }

  // cycles: WHOOP's own day strain
  for (const c of raw.cycles) {
    if (!scored(c) || !c.score) continue;
    const d = dateInOffset(c.start, c.timezone_offset);
    const rec = day(d);
    rec.whoop = {
      ...rec.whoop,
      ...(c.score.strain != null ? { strain: r1(c.score.strain) } : {}),
      ...(c.score.kilojoule != null ? { kilojoule: Math.round(c.score.kilojoule) } : {}),
      ...(c.score.average_heart_rate != null ? { avgHr: Math.round(c.score.average_heart_rate) } : {}),
      ...(c.score.max_heart_rate != null ? { maxHr: Math.round(c.score.max_heart_rate) } : {}),
    };
  }

  const workouts: Workout[] = [];
  for (const w of raw.workouts) {
    if (!scored(w) || !w.score) continue;
    const z = w.score.zone_durations ?? {};
    const zoneMin = [z.zone_one_milli, z.zone_two_milli, z.zone_three_milli, z.zone_four_milli, z.zone_five_milli].map((v) => r1((v ?? 0) / MIN));
    const durationMin = Math.max(1, Math.round((Date.parse(w.end) - Date.parse(w.start)) / MIN));
    workouts.push({
      id: `whoop-${w.id}`,
      date: dateInOffset(w.start, w.timezone_offset),
      start: new Date(Date.parse(w.start)).toISOString(),
      durationMin,
      sport: prettySport(w.sport_name),
      avgHr: Math.round(w.score.average_heart_rate ?? 0),
      maxHr: Math.round(w.score.max_heart_rate ?? 0),
      zoneMin,
      kcal: Math.round((w.score.kilojoule ?? 0) / 4.184),
      strain: r1(w.score.strain ?? 0),
      source: "whoop",
    });
  }

  const b = raw.body;
  return {
    days,
    workouts,
    body: b
      ? {
          ...(b.height_meter ? { heightCm: Math.round(b.height_meter * 100) } : {}),
          ...(b.weight_kilogram ? { weightKg: r1(b.weight_kilogram) } : {}),
          ...(b.max_heart_rate ? { maxHr: Math.round(b.max_heart_rate) } : {}),
        }
      : undefined,
    firstName: raw.profile?.first_name,
    counts: { days: Object.keys(days).length, workouts: workouts.length, sleeps, recoveries },
  };
}
