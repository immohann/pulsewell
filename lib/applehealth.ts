// Streaming parser for Apple Health's export.xml. Pure and dependency-free so it can be unit-tested in Node.
// It never builds a DOM: it scans opening tags in chunks, so multi-gigabyte exports stay within memory.
import type { DayRecord, HealthImport, Workout } from "./types";

export interface ParserOptions {
  maxHr: number;
  /** How many days back from `today` to keep. */
  days?: number;
  today?: string; // YYYY-MM-DD, defaults to now
  zoneOf: (hr: number) => number; // 0 = below zone 1, otherwise 1..5
  kcalPerMin: (hr: number) => number;
  strainFor?: (zoneMin: number[]) => number;
}

interface Bin {
  d: string;
  h: number;
  s: number;
  n: number;
  m: number;
}
interface SleepSeg {
  src: string;
  start: number;
  end: number;
  kind: "core" | "deep" | "rem" | "awake" | "unspec" | "inbed";
  endDate: string;
}

const MIN = 60000;
const r1 = (x: number) => Math.round(x * 10) / 10;

/** "2026-10-12 07:03:12 -0500" → epoch ms. */
export const appleEpoch = (s: string): number => Date.parse(`${s.slice(0, 10)}T${s.slice(11, 19)}${s.slice(20, 23)}:${s.slice(23, 25)}`);

const attr = (tag: string, name: string): string | undefined => {
  const key = ` ${name}="`;
  const i = tag.indexOf(key);
  if (i < 0) return undefined;
  const a = i + key.length;
  return tag.slice(a, tag.indexOf('"', a));
};

const shiftDate = (d: string, n: number) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

export function prettyWorkout(raw: string): string {
  const s = raw.replace(/^HKWorkoutActivityType/, "");
  if (s === "HighIntensityIntervalTraining") return "HIIT";
  if (s === "TraditionalStrengthTraining" || s === "FunctionalStrengthTraining") return "Strength training";
  const spaced = s.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export class AppleHealthParser {
  private buf = "";
  private cutoff: string;
  private o: ParserOptions;

  private rhr = new Map<string, { t: string; v: number }>();
  private hrv = new Map<string, { sum: number; n: number; nightSum: number; nightN: number }>();
  private resp = new Map<string, { sum: number; n: number }>();
  private spo2 = new Map<string, { sum: number; n: number }>();
  private steps = new Map<string, Map<string, number>>();
  private bins = new Map<number, Bin>();
  private sleepSegs: SleepSeg[] = [];
  private workoutTags: { type: string; start: number; end: number; date: string; kcal?: number }[] = [];
  private lastWorkout: { kcal?: number } | null = null;

  /** Rough progress counters for the UI. */
  records = 0;

  constructor(o: ParserOptions) {
    this.o = o;
    const today = o.today ?? new Date().toISOString().slice(0, 10);
    // two extra days so a night that started before the cutoff still resolves
    this.cutoff = shiftDate(today, -((o.days ?? 120) + 2));
  }

  feed(chunk: string) {
    this.buf += chunk;
    this.scan();
  }

  private scan() {
    const b = this.buf;
    let pos = 0;
    for (;;) {
      const i = b.indexOf("<", pos);
      if (i < 0) {
        pos = b.length;
        break;
      }
      const j = b.indexOf(">", i);
      if (j < 0) {
        pos = i;
        break;
      }
      pos = j + 1;
      if (b.startsWith("<Record ", i)) this.record(b.slice(i, j + 1));
      else if (b.startsWith("<Workout ", i)) this.workout(b.slice(i, j + 1));
      else if (b.startsWith("<WorkoutStatistics ", i) && this.lastWorkout) this.workoutStat(b.slice(i, j + 1));
    }
    this.buf = b.slice(pos);
  }

  private workout(tag: string) {
    const start = attr(tag, "startDate");
    const end = attr(tag, "endDate");
    const type = attr(tag, "workoutActivityType");
    if (!start || !end || !type || start.slice(0, 10) < this.cutoff) {
      this.lastWorkout = null;
      return;
    }
    let kcal: number | undefined;
    const e = attr(tag, "totalEnergyBurned");
    if (e) kcal = (attr(tag, "totalEnergyBurnedUnit") === "kJ" ? parseFloat(e) / 4.184 : parseFloat(e)) || undefined;
    const w = { type, start: appleEpoch(start), end: appleEpoch(end), date: start.slice(0, 10), kcal };
    this.workoutTags.push(w);
    this.lastWorkout = w;
  }

  private workoutStat(tag: string) {
    if (attr(tag, "type") !== "HKQuantityTypeIdentifierActiveEnergyBurned" || !this.lastWorkout || this.lastWorkout.kcal) return;
    const sum = parseFloat(attr(tag, "sum") ?? "");
    if (Number.isFinite(sum)) this.lastWorkout.kcal = attr(tag, "unit") === "kJ" ? sum / 4.184 : sum;
  }

  private record(tag: string) {
    const type = attr(tag, "type");
    if (!type) return;
    const sd = attr(tag, "startDate");
    if (!sd || sd.slice(0, 10) < this.cutoff) return;
    const date = sd.slice(0, 10);

    switch (type) {
      case "HKQuantityTypeIdentifierHeartRate": {
        const v = parseFloat(attr(tag, "value") ?? "");
        if (!(v > 25 && v < 240)) return;
        const key = Math.floor(appleEpoch(sd) / MIN);
        const bin = this.bins.get(key);
        if (bin) {
          bin.s += v;
          bin.n++;
          if (v > bin.m) bin.m = v;
        } else this.bins.set(key, { d: date, h: parseInt(sd.slice(11, 13), 10), s: v, n: 1, m: v });
        this.records++;
        return;
      }
      case "HKQuantityTypeIdentifierRestingHeartRate": {
        const v = parseFloat(attr(tag, "value") ?? "");
        const prev = this.rhr.get(date);
        if (v > 25 && v < 150 && (!prev || sd > prev.t)) this.rhr.set(date, { t: sd, v });
        return;
      }
      case "HKQuantityTypeIdentifierHeartRateVariabilitySDNN": {
        const v = parseFloat(attr(tag, "value") ?? "");
        if (!(v > 0 && v < 400)) return;
        const a = this.hrv.get(date) ?? { sum: 0, n: 0, nightSum: 0, nightN: 0 };
        a.sum += v;
        a.n++;
        if (parseInt(sd.slice(11, 13), 10) < 10) {
          a.nightSum += v;
          a.nightN++;
        }
        this.hrv.set(date, a);
        return;
      }
      case "HKQuantityTypeIdentifierRespiratoryRate":
      case "HKQuantityTypeIdentifierOxygenSaturation": {
        let v = parseFloat(attr(tag, "value") ?? "");
        const map = type.endsWith("RespiratoryRate") ? this.resp : this.spo2;
        if (type.endsWith("OxygenSaturation") && v <= 1) v *= 100;
        if (!Number.isFinite(v)) return;
        const a = map.get(date) ?? { sum: 0, n: 0 };
        a.sum += v;
        a.n++;
        map.set(date, a);
        return;
      }
      case "HKQuantityTypeIdentifierStepCount": {
        const v = parseFloat(attr(tag, "value") ?? "");
        if (!Number.isFinite(v)) return;
        const src = attr(tag, "sourceName") ?? "?";
        const perSrc = this.steps.get(date) ?? new Map<string, number>();
        perSrc.set(src, (perSrc.get(src) ?? 0) + v);
        this.steps.set(date, perSrc);
        return;
      }
      case "HKCategoryTypeIdentifierSleepAnalysis": {
        const ed = attr(tag, "endDate");
        const val = attr(tag, "value") ?? "";
        if (!ed) return;
        const kind: SleepSeg["kind"] | null = val.endsWith("InBed")
          ? "inbed"
          : val.endsWith("AsleepCore")
            ? "core"
            : val.endsWith("AsleepDeep")
              ? "deep"
              : val.endsWith("AsleepREM")
                ? "rem"
                : val.endsWith("Awake")
                  ? "awake"
                  : val.endsWith("AsleepUnspecified") || val.endsWith("Asleep")
                    ? "unspec"
                    : null;
        if (!kind) return;
        this.sleepSegs.push({ src: attr(tag, "sourceName") ?? "?", start: appleEpoch(sd), end: appleEpoch(ed), kind, endDate: ed });
        return;
      }
    }
  }

  finish(): HealthImport {
    this.scan();
    const days: Record<string, Partial<DayRecord>> = {};
    const day = (d: string) => (days[d] ??= { date: d });

    for (const [d, r] of this.rhr) day(d).rhr = Math.round(r.v);
    for (const [d, a] of this.hrv) day(d).hrv = Math.round(a.nightN ? a.nightSum / a.nightN : a.sum / a.n);
    for (const [d, a] of this.resp) day(d).resp = r1(a.sum / a.n);
    for (const [d, a] of this.spo2) day(d).spo2 = r1(a.sum / a.n);
    for (const [d, perSrc] of this.steps) day(d).steps = Math.round(Math.max(...perSrc.values()));

    // heart rate → hourly means and all-day time in zones
    const byDate = new Map<string, number[]>();
    for (const [k, bin] of this.bins) (byDate.get(bin.d) ?? byDate.set(bin.d, []).get(bin.d)!).push(k);
    for (const [d, keys] of byDate) {
      keys.sort((a, b) => a - b);
      const zoneMin = [0, 0, 0, 0, 0];
      const hourSum = new Array<number>(24).fill(0);
      const hourN = new Array<number>(24).fill(0);
      let covered = 0;
      keys.forEach((k, idx) => {
        const bin = this.bins.get(k)!;
        const hr = bin.s / bin.n;
        const gap = idx + 1 < keys.length ? Math.min(keys[idx + 1] - k, 5) : 1;
        covered += gap;
        const z = this.o.zoneOf(hr);
        if (z > 0) zoneMin[z - 1] += gap;
        hourSum[bin.h] += hr;
        hourN[bin.h]++;
      });
      if (covered < 30) continue; // too little data to say anything about the day
      const rec = day(d);
      rec.hrZoneMin = zoneMin.map(r1);
      const rhr = rec.rhr ?? 60;
      rec.hourlyHr = hourSum.map((s, h) => (hourN[h] ? Math.round(s / hourN[h]) : rhr));
    }

    // sleep
    const sleeps = this.resolveSleep(day);

    // workouts, scored from the heart-rate samples inside each one
    const workouts: Workout[] = [];
    for (const w of this.workoutTags) {
      const lo = Math.floor(w.start / MIN);
      const hi = Math.floor(w.end / MIN);
      const zoneMin = [0, 0, 0, 0, 0];
      let sum = 0;
      let n = 0;
      let max = 0;
      let kcal = 0;
      for (let k = lo; k <= hi; k++) {
        const bin = this.bins.get(k);
        if (!bin) continue;
        const hr = bin.s / bin.n;
        const z = this.o.zoneOf(hr);
        if (z > 0) zoneMin[z - 1] += 1;
        sum += hr;
        n++;
        max = Math.max(max, bin.m);
        kcal += this.o.kcalPerMin(hr);
      }
      const durationMin = Math.max(1, Math.round((w.end - w.start) / MIN));
      if (n < Math.min(5, durationMin / 2)) continue; // no usable heart rate: can't score it honestly
      const scale = durationMin / Math.max(1, hi - lo + 1);
      const z = zoneMin.map((m) => r1(m * scale));
      workouts.push({
        id: `ah-${w.start}`,
        date: w.date,
        start: new Date(w.start).toISOString(),
        durationMin,
        sport: prettyWorkout(w.type),
        avgHr: Math.round(sum / n),
        maxHr: Math.round(max),
        zoneMin: z,
        kcal: Math.round(w.kcal ?? kcal * scale),
        strain: this.o.strainFor ? this.o.strainFor(z) : 0,
        source: "import",
      });
    }

    return {
      days,
      workouts,
      counts: { days: Object.keys(days).length, workouts: workouts.length, sleeps, recoveries: Object.values(days).filter((d) => d.hrv != null && d.rhr != null).length },
    };
  }

  private resolveSleep(day: (d: string) => Partial<DayRecord>): number {
    type Night = { src: string; start: number; end: number; light: number; sws: number; rem: number; awakeSegs: number; hasStages: boolean; inbed: number; endDate: string };
    const bySrc = new Map<string, SleepSeg[]>();
    for (const s of this.sleepSegs) (bySrc.get(s.src) ?? bySrc.set(s.src, []).get(s.src)!).push(s);

    const nights: Night[] = [];
    for (const [src, segs] of bySrc) {
      segs.sort((a, b) => a.start - b.start);
      let cur: Night | null = null;
      for (const s of segs) {
        if (!cur || s.start - cur.end > 120 * MIN) {
          if (cur) nights.push(cur);
          cur = { src, start: s.start, end: s.end, light: 0, sws: 0, rem: 0, awakeSegs: 0, hasStages: false, inbed: 0, endDate: s.endDate };
        }
        const mins = (s.end - s.start) / MIN;
        if (s.end > cur.end) {
          cur.end = s.end;
          cur.endDate = s.endDate;
        }
        cur.start = Math.min(cur.start, s.start);
        if (s.kind === "core") {
          cur.light += mins;
          cur.hasStages = true;
        } else if (s.kind === "deep") {
          cur.sws += mins;
          cur.hasStages = true;
        } else if (s.kind === "rem") {
          cur.rem += mins;
          cur.hasStages = true;
        } else if (s.kind === "unspec") cur.light += mins;
        else if (s.kind === "awake") cur.awakeSegs++;
        else cur.inbed += mins;
      }
      if (cur) nights.push(cur);
    }

    const best = new Map<string, Night>();
    const naps = new Map<string, number>();
    for (const n of nights) {
      let asleep = n.light + n.sws + n.rem;
      const span = (n.end - n.start) / MIN;
      if (asleep === 0 && n.inbed >= 240) {
        // phone-only "in bed" estimate: assume a typical efficiency
        n.light = span * 0.9;
        asleep = n.light;
      }
      const date = n.endDate.slice(0, 10);
      if (asleep < 180) {
        if (asleep >= 20) naps.set(date, (naps.get(date) ?? 0) + Math.round(asleep));
        continue;
      }
      const prev = best.get(date);
      const score = (x: Night) => (x.hasStages ? 1e6 : 0) + x.light + x.sws + x.rem;
      if (!prev || score(n) > score(prev)) best.set(date, n);
    }

    for (const [date, n] of best) {
      const asleep = n.light + n.sws + n.rem;
      const span = (n.end - n.start) / MIN;
      day(date).sleep = {
        start: new Date(n.start).toISOString(),
        end: new Date(n.end).toISOString(),
        awakeMin: Math.max(0, Math.round(span - asleep)),
        lightMin: Math.round(n.light),
        swsMin: Math.round(n.sws),
        remMin: Math.round(n.rem),
        disturbances: n.awakeSegs,
      };
    }
    for (const [date, m] of naps) day(date).napMin = m;
    return best.size;
  }
}
