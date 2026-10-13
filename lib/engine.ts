import type {
  DayRecord,
  Fitness,
  Profile,
  RecoveryResult,
  SleepGoal,
  SleepRecord,
  SleepResult,
  StoreState,
  Workout,
  Zone,
} from "./types";

/* ---------- dates ---------- */

export const ymd = (d: Date): string => {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};
export const parseYmd = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};
export const addDays = (s: string, n: number): string => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const todayStr = (): string => ymd(new Date());
export const dateRange = (end: string, n: number): string[] =>
  Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
export const fmtDay = (s: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) =>
  parseYmd(s).toLocaleDateString(undefined, opts);

/* ---------- stats ---------- */

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
export const sd = (xs: number[]) => {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
export const round1 = (x: number) => Math.round(x * 10) / 10;
export const hm = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 60 ? `${h + 1}h 00m` : `${h}h ${String(m).padStart(2, "0")}m`;
};

export const ageOf = (p: Profile, now = new Date()) => now.getFullYear() - p.birthYear;

/* ---------- heart-rate zones, calories, strain ---------- */

/** Zone floors as a fraction of max heart rate (zone 1..5). */
export const ZONE_FLOORS = [0.5, 0.6, 0.7, 0.8, 0.9];
export const ZONE_NAMES = ["Warm-up", "Light", "Aerobic", "Threshold", "Peak"];
export const ZONE_COLORS = ["#6c8cff", "#3dd6c6", "#4ade80", "#fbbf24", "#f87171"];

export const zoneOf = (hr: number, maxHr: number): number => {
  const f = hr / maxHr;
  let z = 0;
  ZONE_FLOORS.forEach((floor, i) => {
    if (f >= floor) z = i + 1;
  });
  return z; // 0 = below zone 1
};

export const zoneBounds = (maxHr: number) =>
  ZONE_FLOORS.map((f, i) => ({
    zone: i + 1,
    lo: Math.round(f * maxHr),
    hi: i === 4 ? maxHr : Math.round(ZONE_FLOORS[i + 1] * maxHr) - 1,
  }));

/** Edwards-style training impulse: minutes in each zone weighted 1..5. */
export const trimp = (zoneMin: number[]) => zoneMin.reduce((a, m, i) => a + m * (i + 1), 0);

/**
 * Map accumulated load onto a 0–21 logarithmic-feeling scale.
 * Early load moves the score quickly, high scores are progressively harder to earn.
 */
export const loadToStrain = (load: number, fitness: Fitness = "recreational"): number => {
  const scale: Record<Fitness, number> = {
    inactive: 150,
    recreational: 185,
    serious: 215,
    collegiate: 245,
    professional: 275,
    tactical: 260,
  };
  const L = scale[fitness];
  return round1(21 * (1 - Math.exp(-Math.max(0, load) / L)));
};

/** Keytel et al. (2005) heart-rate based energy expenditure, kcal/min. */
export const kcalPerMin = (hr: number, p: Profile, age: number): number => {
  const w = p.weightKg;
  const kj =
    p.sex === "female"
      ? -20.4022 + 0.4472 * hr - 0.1263 * w + 0.074 * age
      : -55.0969 + 0.6309 * hr + 0.1988 * w + 0.2017 * age;
  return Math.max(0, kj / 4.184);
};

export const summarizeSamples = (samples: number[], intervalSec: number, p: Profile) => {
  const age = ageOf(p);
  const zoneMin = [0, 0, 0, 0, 0];
  let kcal = 0;
  let sum = 0;
  let max = 0;
  for (const hr of samples) {
    const z = zoneOf(hr, p.maxHr);
    if (z > 0) zoneMin[z - 1] += intervalSec / 60;
    kcal += (kcalPerMin(hr, p, age) * intervalSec) / 60;
    sum += hr;
    max = Math.max(max, hr);
  }
  const avg = samples.length ? sum / samples.length : 0;
  return {
    zoneMin: zoneMin.map(round1),
    kcal: Math.round(kcal),
    avgHr: Math.round(avg),
    maxHr: Math.round(max),
    durationMin: Math.round((samples.length * intervalSec) / 60),
  };
};

export const workoutStrain = (zoneMin: number[], fitness: Fitness) => loadToStrain(trimp(zoneMin), fitness);

/** Everyday movement adds a small base load so a quiet day is never zero. */
export const stepLoad = (steps = 0) => (steps / 1000) * 6;

export const workoutsOn = (s: StoreState, date: string): Workout[] => s.workouts.filter((w) => w.date === date);

export const dayStrain = (s: StoreState, date: string): number => {
  const ws = workoutsOn(s, date);
  const day = s.days[date];
  const load = ws.reduce((a, w) => a + trimp(w.zoneMin), 0) + stepLoad(day?.steps);
  return loadToStrain(load, s.profile.fitness);
};

export const dayKcal = (s: StoreState, date: string): number => {
  const day = s.days[date];
  const p = s.profile;
  const age = ageOf(p);
  const bmr =
    p.sex === "female"
      ? 447.6 + 9.25 * p.weightKg + 3.1 * p.heightCm - 4.33 * age
      : 88.4 + 13.4 * p.weightKg + 4.8 * p.heightCm - 5.68 * age;
  const move = (day?.steps ?? 0) * 0.04;
  const work = workoutsOn(s, date).reduce((a, w) => a + w.kcal, 0);
  return Math.round(bmr + move + work);
};

/* ---------- sleep ---------- */

export const sleepTotals = (sl: SleepRecord) => {
  const inBedMin = (new Date(sl.end).getTime() - new Date(sl.start).getTime()) / 60000;
  const asleepMin = sl.lightMin + sl.swsMin + sl.remMin;
  return { inBedMin, asleepMin };
};

const GOAL_FRACTION: Record<SleepGoal, number> = { peak: 1, perform: 0.85, getby: 0.7 };
export const GOAL_LABEL: Record<SleepGoal, string> = {
  peak: "Peak (100%)",
  perform: "Perform (85%)",
  getby: "Get by (70%)",
};

const BASE_NEED_H = 7.75;

const daysBefore = (s: StoreState, date: string, n: number): DayRecord[] =>
  Array.from({ length: n }, (_, i) => s.days[addDays(date, -(i + 1))]).filter(Boolean) as DayRecord[];

/** Hours of sleep the body asks for on the night that ends on `date`. */
export const sleepNeed = (s: StoreState, date: string): { base: number; strain: number; debt: number; total: number } => {
  const prev = addDays(date, -1);
  const strain = Math.max(0, dayStrain(s, prev) - 8) * 0.045;
  const prevDay = s.days[prev];
  let debt = 0;
  if (prevDay?.sleep) {
    const { asleepMin } = sleepTotals(prevDay.sleep);
    const prevNeed = BASE_NEED_H; // avoid recursion; debt is a gentle correction
    debt = clamp((prevNeed - asleepMin / 60) * 0.3, 0, 1);
  }
  const nap = (prevDay?.napMin ?? 0) / 60;
  const total = clamp(BASE_NEED_H + strain + debt - nap * 0.5, 6.5, 10.5);
  return { base: BASE_NEED_H, strain, debt, total };
};

const minutesOfDay = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

/** 0–100: how regular bed and wake times were over the last week. */
export const sleepConsistency = (s: StoreState, date: string): number => {
  const recent = [s.days[date], ...daysBefore(s, date, 6)].filter((d) => d?.sleep) as DayRecord[];
  if (recent.length < 3) return 0;
  const circ = (xs: number[]) => {
    // handle midnight wrap by centering on the first value
    const ref = xs[0];
    const adj = xs.map((x) => {
      let d = x - ref;
      if (d > 720) d -= 1440;
      if (d < -720) d += 1440;
      return d;
    });
    return sd(adj);
  };
  const bed = circ(recent.map((d) => minutesOfDay(d.sleep!.start)));
  const wake = circ(recent.map((d) => minutesOfDay(d.sleep!.end)));
  const spread = (bed + wake) / 2; // minutes
  return Math.round(clamp(100 - spread * 0.55, 0, 100));
};

export const sleepResult = (s: StoreState, date: string): SleepResult | null => {
  const sl = s.days[date]?.sleep;
  if (!sl) return null;
  const { inBedMin, asleepMin } = sleepTotals(sl);
  const need = sleepNeed(s, date);
  const performance = clamp(Math.round((asleepMin / 60 / need.total) * 100), 0, 100);
  const efficiency = clamp(Math.round((asleepMin / inBedMin) * 100), 0, 100);
  const stagesTotal = sl.awakeMin + sl.lightMin + sl.swsMin + sl.remMin || 1;
  return {
    hoursAsleep: asleepMin / 60,
    hoursInBed: inBedMin / 60,
    needHours: need.total,
    performance,
    efficiency,
    consistency: sleepConsistency(s, date),
    debtHours: need.debt,
    stages: {
      awake: sl.awakeMin / stagesTotal,
      light: sl.lightMin / stagesTotal,
      sws: sl.swsMin / stagesTotal,
      rem: sl.remMin / stagesTotal,
    },
  };
};

/** Bedtime plan: how long to be in bed and when to start. */
export const sleepPlan = (s: StoreState, wake: string, forDate: string) => {
  const need = sleepNeed(s, forDate).total;
  const goal = GOAL_FRACTION[s.profile.sleepGoal];
  const recentEff = mean(
    daysBefore(s, forDate, 14)
      .filter((d) => d.sleep)
      .map((d) => {
        const t = sleepTotals(d.sleep!);
        return t.asleepMin / t.inBedMin;
      }),
  );
  const eff = clamp(Number.isFinite(recentEff) ? recentEff : 0.9, 0.75, 0.97);
  const tibHours = (need * goal) / eff;
  const [wh, wm] = wake.split(":").map(Number);
  const wakeMin = wh * 60 + wm;
  const bedMin = (((wakeMin - Math.round(tibHours * 60)) % 1440) + 1440) % 1440;
  const f = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return { need, goalFraction: goal, tibHours, bedtime: f(bedMin), wake, efficiency: eff };
};

/* ---------- recovery ---------- */

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const AGE_NORMS = (age: number) => ({
  hrv: clamp(78 - 0.55 * (age - 25), 25, 90),
  rhr: 60,
  resp: 15,
});

export const baselineOf = (
  s: StoreState,
  date: string,
  pick: (d: DayRecord) => number | undefined,
  days = 30,
): { mean: number; sd: number; n: number } => {
  const xs = daysBefore(s, date, days)
    .map(pick)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return { mean: mean(xs), sd: sd(xs), n: xs.length };
};

export const zoneOfScore = (score: number): Zone => (score >= 67 ? "green" : score >= 34 ? "yellow" : "red");

export const recoveryResult = (s: StoreState, date: string): RecoveryResult | null => {
  const d = s.days[date];
  if (!d || d.hrv == null || d.rhr == null) return null;
  const age = ageOf(s.profile);
  const norms = AGE_NORMS(age);

  const lnHrv = baselineOf(s, date, (x) => (x.hrv ? Math.log(x.hrv) : undefined));
  const rhrB = baselineOf(s, date, (x) => x.rhr);
  const respB = baselineOf(s, date, (x) => x.resp);

  const hrvMean = lnHrv.n >= 5 ? lnHrv.mean : Math.log(norms.hrv);
  const hrvSd = lnHrv.n >= 5 ? Math.max(lnHrv.sd, 0.08) : 0.2;
  const rhrMean = rhrB.n >= 5 ? rhrB.mean : norms.rhr;
  const rhrSd = rhrB.n >= 5 ? Math.max(rhrB.sd, 2) : 4;
  const respMean = respB.n >= 5 ? respB.mean : norms.resp;
  const respSd = respB.n >= 5 ? Math.max(respB.sd, 0.5) : 1;

  const zHrv = (Math.log(d.hrv) - hrvMean) / hrvSd;
  const zRhr = -(d.rhr - rhrMean) / rhrSd;
  const zResp = d.resp != null ? -(d.resp - respMean) / respSd : 0;
  const sl = sleepResult(s, date);
  const zSleep = sl ? (sl.performance - 85) / 15 : 0;

  const weighted = 0.5 * clamp(zHrv, -3, 3) + 0.22 * clamp(zRhr, -3, 3) + 0.22 * clamp(zSleep, -3, 3) + 0.06 * clamp(zResp, -3, 3);
  const score = clamp(Math.round(100 * sigmoid(0.35 + 1.15 * weighted)), 1, 99);

  return {
    score,
    zone: zoneOfScore(score),
    drivers: [
      { key: "hrv", label: "Heart rate variability", z: zHrv, value: d.hrv, baseline: Math.exp(hrvMean), unit: "ms" },
      { key: "rhr", label: "Resting heart rate", z: zRhr, value: d.rhr, baseline: rhrMean, unit: "bpm" },
      { key: "sleep", label: "Sleep performance", z: zSleep, value: sl?.performance, baseline: 85, unit: "%" },
      { key: "resp", label: "Respiratory rate", z: zResp, value: d.resp, baseline: respMean, unit: "rpm" },
    ],
  };
};

/* ---------- strain target ---------- */

export const strainTarget = (recovery: number | null) => {
  if (recovery == null) return { label: "Balanced", lo: 10, hi: 14, note: "Log a recovery reading to personalize your target." };
  if (recovery >= 67) return { label: "Push", lo: 14, hi: 18, note: "Your body is primed. Training hard will pay off today." };
  if (recovery >= 34) return { label: "Balanced", lo: 10, hi: 14, note: "A solid day of moderate work keeps you progressing." };
  return { label: "Restore", lo: 4, hi: 10, note: "Keep effort light and prioritize sleep to bounce back." };
};

/* ---------- stress ---------- */

export const stressSeries = (s: StoreState, date: string): { hour: number; stress: number }[] => {
  const d = s.days[date];
  if (!d?.hourlyHr) return [];
  const rhr = d.rhr ?? 60;
  const hrvB = baselineOf(s, date, (x) => x.hrv);
  const hrvRatio = d.hrv && Number.isFinite(hrvB.mean) ? clamp((hrvB.mean - d.hrv) / hrvB.mean, -0.3, 0.5) : 0;
  const workoutHours = new Set(
    workoutsOn(s, date).flatMap((w) => {
      const start = new Date(w.start).getHours();
      return Array.from({ length: Math.max(1, Math.ceil(w.durationMin / 60)) }, (_, i) => start + i);
    }),
  );
  return d.hourlyHr.map((hr, hour) => {
    if (workoutHours.has(hour)) return { hour, stress: 0 };
    const raw = ((hr - rhr) / 18) * (1 + hrvRatio);
    return { hour, stress: round1(clamp(raw, 0, 3)) };
  });
};

export const stressSummary = (series: { hour: number; stress: number }[]) => {
  const waking = series.filter((p) => p.hour >= 7 && p.hour <= 22 && p.stress >= 0);
  if (!waking.length) return null;
  const avg = mean(waking.map((p) => p.stress));
  const peak = waking.reduce((a, b) => (b.stress > a.stress ? b : a));
  const calm = waking.filter((p) => p.stress < 1).length;
  return { avg: round1(avg), peak, calmHours: calm, totalHours: waking.length };
};

export const stressLabel = (v: number) => (v < 1 ? "Low" : v < 2 ? "Moderate" : v < 2.6 ? "High" : "Very high");

/* ---------- fitness & healthspan ---------- */

export const vo2maxEstimate = (p: Profile, rhr?: number) => {
  if (!rhr) return null;
  return round1(clamp(15.3 * (p.maxHr / rhr), 15, 80));
};

const vo2Norm = (p: Profile, age: number) => (p.sex === "female" ? 38 - 0.25 * (age - 25) : 45 - 0.3 * (age - 25));

export interface Contributor {
  key: string;
  label: string;
  score: number; // 0..100, 60 ≈ typical
  detail: string;
}

export const healthspan = (s: StoreState, date: string) => {
  const p = s.profile;
  const age = ageOf(p);
  const window = dateRange(date, 30).map((dt) => s.days[dt]).filter(Boolean) as DayRecord[];
  if (window.length < 7) return null;

  const norms = AGE_NORMS(age);
  const hrv = mean(window.map((d) => d.hrv).filter((v): v is number => v != null));
  const rhr = mean(window.map((d) => d.rhr).filter((v): v is number => v != null));
  const sleepH = mean(window.filter((d) => d.sleep).map((d) => sleepTotals(d.sleep!).asleepMin / 60));
  const steps = mean(window.map((d) => d.steps).filter((v): v is number => v != null));
  const cons = sleepConsistency(s, date);
  const vo2 = vo2maxEstimate(p, rhr) ?? 0;
  const weeklyStrain = mean(dateRange(date, 30).map((dt) => dayStrain(s, dt)));

  const contributors: Contributor[] = [
    {
      key: "sleepDuration",
      label: "Sleep duration",
      score: clamp(100 - Math.abs(sleepH - 8) * 28, 0, 100),
      detail: `${hm(sleepH)} average`,
    },
    { key: "consistency", label: "Sleep consistency", score: cons, detail: `${cons}% consistent` },
    {
      key: "hrv",
      label: "Heart rate variability",
      score: clamp(60 + ((hrv - norms.hrv) / norms.hrv) * 90, 0, 100),
      detail: `${Math.round(hrv)} ms vs ${Math.round(norms.hrv)} typical for your age`,
    },
    {
      key: "rhr",
      label: "Resting heart rate",
      score: clamp(60 + (norms.rhr - rhr) * 3, 0, 100),
      detail: `${Math.round(rhr)} bpm`,
    },
    {
      key: "fitness",
      label: "Cardio fitness",
      score: clamp(60 + ((vo2 - vo2Norm(p, age)) / vo2Norm(p, age)) * 100, 0, 100),
      detail: `VO₂max ≈ ${vo2}`,
    },
    {
      key: "activity",
      label: "Daily activity",
      score: clamp(35 + weeklyStrain * 4 + Math.min(steps, 12000) / 400, 0, 100),
      detail: `${Math.round(steps).toLocaleString()} steps · strain ${round1(weeklyStrain)}`,
    },
  ];
  const overall = mean(contributors.map((c) => c.score));
  const years = clamp(((overall - 60) / 40) * 8, -8, 8);
  const biologicalAge = round1(age - years);
  const pace = round1(clamp(1 - (overall - 60) / 100, 0.6, 1.5) * 10) / 10;
  return { age, biologicalAge, years: round1(years), pace: Math.round(pace * 100) / 100, overall: Math.round(overall), contributors };
};

/* ---------- journal impacts ---------- */

export interface Behavior {
  id: string;
  label: string;
  group: string;
}
export const BEHAVIORS: Behavior[] = [
  { id: "alcohol", label: "Had alcohol", group: "Nutrition" },
  { id: "caffeineLate", label: "Caffeine after 2 pm", group: "Nutrition" },
  { id: "lateMeal", label: "Ate within 3 h of bed", group: "Nutrition" },
  { id: "hydrated", label: "Hydrated well", group: "Nutrition" },
  { id: "screens", label: "Screens in bed", group: "Sleep habits" },
  { id: "dark", label: "Dark, cool bedroom", group: "Sleep habits" },
  { id: "meditation", label: "Meditated or breathwork", group: "Recovery" },
  { id: "stretch", label: "Stretching or mobility", group: "Recovery" },
  { id: "sauna", label: "Sauna or cold exposure", group: "Recovery" },
  { id: "sunlight", label: "Morning sunlight", group: "Lifestyle" },
  { id: "stressful", label: "High-stress day", group: "Lifestyle" },
  { id: "travel", label: "Travel", group: "Lifestyle" },
];

export interface Impact {
  behavior: Behavior;
  withAvg: number;
  withoutAvg: number;
  delta: number;
  nWith: number;
  nWithout: number;
}

/** Behavior logged on day D is compared with recovery on day D+1. */
export const journalImpacts = (s: StoreState): Impact[] => {
  const out: Impact[] = [];
  for (const b of BEHAVIORS) {
    const w: number[] = [];
    const wo: number[] = [];
    for (const [date, entry] of Object.entries(s.journal)) {
      if (!(b.id in entry)) continue;
      const r = recoveryResult(s, addDays(date, 1));
      if (!r) continue;
      (entry[b.id] ? w : wo).push(r.score);
    }
    if (w.length >= 3 && wo.length >= 3) {
      out.push({ behavior: b, withAvg: mean(w), withoutAvg: mean(wo), delta: mean(w) - mean(wo), nWith: w.length, nWithout: wo.length });
    }
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
};

/* ---------- cycle ---------- */

export const cyclePhase = (s: StoreState, date: string) => {
  const starts = [...s.cycleStarts].sort();
  const last = [...starts].reverse().find((d) => d <= date);
  if (!last) return null;
  const day = Math.round((parseYmd(date).getTime() - parseYmd(last).getTime()) / 86400000) + 1;
  const len = starts.length >= 3 ? Math.round(mean(starts.slice(1).map((d, i) => (parseYmd(d).getTime() - parseYmd(starts[i]).getTime()) / 86400000))) : 28;
  const phase = day <= 5 ? "Menstrual" : day <= len / 2 - 1 ? "Follicular" : day <= len / 2 + 2 ? "Ovulatory" : "Luteal";
  return { day, length: len, phase };
};

/* ---------- streaks & achievements ---------- */

export const streakOf = (dates: string[], pred: (d: string) => boolean, end: string): number => {
  void dates;
  let n = 0;
  let cur = end;
  // allow today to be incomplete
  if (!pred(cur)) cur = addDays(cur, -1);
  while (pred(cur)) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
};

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  earned: boolean;
  progress: number; // 0..1
}

export const achievements = (s: StoreState, today: string): Achievement[] => {
  const greenStreak = streakOf([], (d) => (recoveryResult(s, d)?.score ?? 0) >= 67, today);
  const sleepStreak = streakOf([], (d) => (sleepResult(s, d)?.performance ?? 0) >= 85, today);
  const moveStreak = streakOf([], (d) => workoutsOn(s, d).length > 0, today);
  const logStreak = streakOf([], (d) => !!s.journal[d], today);
  const totalWorkouts = s.workouts.length;
  const breaths = s.breath.length;
  const mk = (id: string, title: string, detail: string, value: number, goal: number): Achievement => ({
    id,
    title,
    detail,
    earned: value >= goal,
    progress: clamp(value / goal, 0, 1),
  });
  return [
    mk("green3", "Green streak", `${greenStreak} / 3 days in the green`, greenStreak, 3),
    mk("sleep5", "Sleep streak", `${sleepStreak} / 5 nights ≥ 85% sleep`, sleepStreak, 5),
    mk("move4", "Movement streak", `${moveStreak} / 4 days with a workout`, moveStreak, 4),
    mk("journal7", "Reflective", `${logStreak} / 7 days journaled`, logStreak, 7),
    mk("workouts25", "Workhorse", `${totalWorkouts} / 25 workouts logged`, totalWorkouts, 25),
    mk("breath10", "Calm under pressure", `${breaths} / 10 breathwork sessions`, breaths, 10),
  ];
};

/* ---------- weekly plan ---------- */

export interface GoalProgress {
  goal: { id: string; kind: string; target: number };
  label: string;
  value: number;
  target: number;
  unit: string;
  pct: number;
}

export const goalProgress = (s: StoreState, today: string): GoalProgress[] => {
  const week = dateRange(today, 7);
  return s.goals.map((g) => {
    let value = 0;
    let label = "";
    let unit = "";
    switch (g.kind) {
      case "sleepHours": {
        const hs = week.map((d) => s.days[d]?.sleep).filter(Boolean).map((sl) => sleepTotals(sl!).asleepMin / 60);
        value = round1(mean(hs) || 0);
        label = "Average sleep per night";
        unit = "h";
        break;
      }
      case "greenDays":
        value = week.filter((d) => (recoveryResult(s, d)?.score ?? 0) >= 67).length;
        label = "Green recovery days";
        unit = "days";
        break;
      case "workouts":
        value = week.reduce((a, d) => a + workoutsOn(s, d).length, 0);
        label = "Workouts";
        unit = "sessions";
        break;
      case "avgStrain":
        value = round1(mean(week.map((d) => dayStrain(s, d))));
        label = "Average daily strain";
        unit = "";
        break;
      case "breathSessions":
        value = s.breath.filter((b) => week.includes(b.date)).length;
        label = "Breathwork sessions";
        unit = "sessions";
        break;
      case "consistency":
        value = sleepConsistency(s, today);
        label = "Sleep consistency";
        unit = "%";
        break;
    }
    return { goal: g, label, value, target: g.target, unit, pct: clamp(value / g.target, 0, 1) };
  });
};

/* ---------- health monitor ---------- */

export const healthMonitor = (s: StoreState, date: string) => {
  const rows: { key: string; label: string; unit: string; value: number; lo: number; hi: number; status: "in" | "out" }[] = [];
  const metrics: { key: keyof DayRecord; label: string; unit: string; minSd: number }[] = [
    { key: "rhr", label: "Resting heart rate", unit: "bpm", minSd: 2 },
    { key: "hrv", label: "Heart rate variability", unit: "ms", minSd: 4 },
    { key: "resp", label: "Respiratory rate", unit: "rpm", minSd: 0.4 },
    { key: "spo2", label: "Blood oxygen", unit: "%", minSd: 0.6 },
    { key: "skinTempDelta", label: "Skin temperature Δ", unit: "°C", minSd: 0.25 },
  ];
  const d = s.days[date];
  for (const m of metrics) {
    const v = d?.[m.key] as number | undefined;
    if (v == null) continue;
    const b = baselineOf(s, date, (x) => x[m.key] as number | undefined);
    if (b.n < 7) continue;
    const spread = Math.max(b.sd, m.minSd) * 1.5;
    const lo = b.mean - spread;
    const hi = b.mean + spread;
    rows.push({ key: m.key as string, label: m.label, unit: m.unit, value: v, lo, hi, status: v >= lo && v <= hi ? "in" : "out" });
  }
  return rows;
};

/* ---------- misc ---------- */

export const sportList = [
  "Running",
  "Cycling",
  "Strength training",
  "HIIT",
  "Swimming",
  "Walking",
  "Yoga",
  "Rowing",
  "Hiking",
  "Basketball",
  "Soccer",
  "Other",
];

export const zoneColor = (z: Zone) => (z === "green" ? "#4ade80" : z === "yellow" ? "#fbbf24" : "#f87171");
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
