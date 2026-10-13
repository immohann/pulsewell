// Generic daily-metrics CSV → Pulsewell. Pure, so it can be tested without a browser.
import type { DayRecord, HealthImport } from "./types";

export const CSV_TEMPLATE = `date,sleep_start,sleep_end,awake_min,deep_min,rem_min,hrv,rhr,resp,spo2,steps,nap_min
2026-10-11,23:05,06:40,32,70,95,64,54,14.6,96.8,8200,0
2026-10-12,22:50,06:30,28,78,102,68,53,14.4,97.1,9100,25
`;

/** Split one CSV line, honouring double quotes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const num = (s: string | undefined) => {
  if (s == null || s === "") return undefined;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
};

const addDay = (d: string, n: number) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

/** "HH:MM" on `date` → local ISO. A full ISO/date-time is passed through. */
const toIso = (date: string, v: string): string | null => {
  if (/^\d{4}-\d{2}-\d{2}[T ]/.test(v)) {
    const t = new Date(v.replace(" ", "T"));
    return Number.isNaN(t.getTime()) ? null : t.toISOString();
  }
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return null;
  return new Date(`${date}T${m[1].padStart(2, "0")}:${m[2]}:00`).toISOString();
};

export function parseCsv(text: string): { data: HealthImport; errors: string[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  const days: Record<string, Partial<DayRecord>> = {};
  if (lines.length < 2) return { data: { days, workouts: [], counts: { days: 0, workouts: 0, sleeps: 0, recoveries: 0 } }, errors: ["The file needs a header row and at least one data row."] };

  const head = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s-]+/g, "_"));
  const col = (name: string) => head.indexOf(name);
  if (col("date") < 0) return { data: { days, workouts: [], counts: { days: 0, workouts: 0, sleeps: 0, recoveries: 0 } }, errors: ["Missing a `date` column (YYYY-MM-DD)."] };

  let sleeps = 0;
  lines.slice(1).forEach((line, i) => {
    const c = splitCsvLine(line);
    const get = (n: string) => (col(n) >= 0 ? c[col(n)] : undefined);
    const date = get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Row ${i + 2}: date "${date ?? ""}" is not YYYY-MM-DD.`);
      return;
    }
    const d: Partial<DayRecord> = { date };
    const hrv = num(get("hrv"));
    const rhr = num(get("rhr"));
    const resp = num(get("resp"));
    const spo2 = num(get("spo2"));
    const steps = num(get("steps"));
    const nap = num(get("nap_min"));
    if (hrv != null) d.hrv = Math.round(hrv);
    if (rhr != null) d.rhr = Math.round(rhr);
    if (resp != null) d.resp = resp;
    if (spo2 != null) d.spo2 = spo2;
    if (steps != null) d.steps = Math.round(steps);
    if (nap != null) d.napMin = Math.round(nap);

    const s = get("sleep_start");
    const e = get("sleep_end");
    if (s && e) {
      const bedDate = /^\d{1,2}:\d{2}$/.test(s) && /^\d{1,2}:\d{2}$/.test(e) && s > e.padStart(5, "0") ? addDay(date, -1) : date;
      const start = toIso(bedDate, s);
      const end = toIso(date, e);
      if (!start || !end || Date.parse(end) <= Date.parse(start)) errors.push(`Row ${i + 2}: sleep times could not be read.`);
      else {
        const span = (Date.parse(end) - Date.parse(start)) / 60000;
        const awake = Math.min(span, num(get("awake_min")) ?? 30);
        const awakeR = Math.round(awake);
        const asleepR = Math.round(span) - awakeR;
        const deep = Math.round(num(get("deep_min")) ?? asleepR * 0.19);
        const rem = Math.round(num(get("rem_min")) ?? asleepR * 0.24);
        d.sleep = {
          start,
          end,
          awakeMin: awakeR,
          swsMin: deep,
          remMin: rem,
          lightMin: Math.max(0, asleepR - deep - rem),
          disturbances: Math.round(awake / 10),
        };
        sleeps++;
      }
    }
    days[date] = { ...days[date], ...d };
  });

  return {
    data: { days, workouts: [], counts: { days: Object.keys(days).length, workouts: 0, sleeps, recoveries: Object.values(days).filter((x) => x.hrv != null && x.rhr != null).length } },
    errors: errors.slice(0, 5),
  };
}
