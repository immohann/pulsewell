import { addDays, dateRange, kcalPerMin, todayStr, uid, workoutStrain, zoneOf, round1 } from "./engine";
import type { DayRecord, Goal, Profile, StoreState, Workout } from "./types";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const defaultProfile = (): Profile => ({
  name: "",
  sex: "other",
  birthYear: 1994,
  heightCm: 175,
  weightKg: 72,
  maxHr: 190,
  fitness: "recreational",
  sleepGoal: "perform",
  wakeTime: "06:45",
  cycleTracking: false,
});

export const defaultGoals = (): Goal[] => [
  { id: "g1", kind: "sleepHours", target: 7.5 },
  { id: "g2", kind: "workouts", target: 4 },
  { id: "g3", kind: "greenDays", target: 3 },
];

export const emptyState = (): StoreState => ({
  version: 1,
  onboarded: false,
  profile: defaultProfile(),
  days: {},
  workouts: [],
  journal: {},
  breath: [],
  goals: defaultGoals(),
  cycleStarts: [],
  demo: false,
});

const SPORTS = ["Running", "Cycling", "Strength training", "HIIT", "Swimming", "Walking", "Yoga", "Rowing"];

export function demoState(profile?: Profile, nDays = 75): StoreState {
  const rnd = mulberry32(20261012);
  const gauss = () => {
    const u = Math.max(rnd(), 1e-9);
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const p = { ...(profile ?? defaultProfile()) };
  const today = todayStr();
  const dates = dateRange(today, nDays);
  const days: Record<string, DayRecord> = {};
  const workouts: Workout[] = [];
  const journal: Record<string, Record<string, boolean>> = {};
  const state: StoreState = { ...emptyState(), onboarded: true, profile: p, demo: true };

  let prevStrain = 8;
  let fitnessDrift = 0;
  dates.forEach((date, i) => {
    const prevJ = journal[addDays(date, -1)] ?? {};
    const dow = new Date(date + "T12:00:00").getDay();

    // sleep
    let bedMin = 23 * 60 + 5 + gauss() * 35 + (dow === 5 || dow === 6 ? 50 : 0);
    let sleepMin = 7.35 * 60 + gauss() * 38 + (dow === 5 || dow === 6 ? 25 : 0);
    if (prevJ.caffeineLate) sleepMin -= 22;
    if (prevJ.screens) {
      sleepMin -= 18;
      bedMin += 20;
    }
    if (prevJ.lateMeal) sleepMin -= 14;
    if (prevJ.alcohol) sleepMin -= 28;
    if (prevJ.dark) sleepMin += 14;
    if (prevJ.meditation) sleepMin += 8;
    sleepMin = Math.max(300, Math.min(600, sleepMin));
    const awake = Math.max(12, 34 + gauss() * 10 + (prevJ.alcohol ? 22 : 0));
    const inBed = sleepMin + awake;
    const startMs = new Date(date + "T00:00:00").getTime() - (24 * 60 - bedMin) * 60000;
    const start = new Date(startMs);
    const end = new Date(startMs + inBed * 60000);
    const swsFrac = 0.17 + gauss() * 0.02 - (prevJ.alcohol ? 0.03 : 0);
    const remFrac = 0.22 + gauss() * 0.025 - (prevJ.alcohol ? 0.04 : 0);
    const sws = sleepMin * swsFrac;
    const rem = sleepMin * remFrac;
    const light = sleepMin - sws - rem;

    // physiology
    fitnessDrift += 0.02;
    let hrv = 64 + fitnessDrift * 0.4 + gauss() * 6 - Math.max(0, prevStrain - 13) * 1.3;
    let rhr = 54 - fitnessDrift * 0.05 + gauss() * 1.4 + Math.max(0, prevStrain - 13) * 0.4;
    let resp = 14.5 + gauss() * 0.35;
    if (prevJ.alcohol) {
      hrv -= 14;
      rhr += 4;
      resp += 0.5;
    }
    if (prevJ.stressful) {
      hrv -= 6;
      rhr += 1.8;
    }
    if (prevJ.meditation) hrv += 4;
    if (prevJ.sunlight) hrv += 1.5;
    if (prevJ.hydrated) hrv += 2;
    if (prevJ.travel) {
      hrv -= 5;
      rhr += 1.5;
    }
    if (sleepMin < 6.5 * 60) {
      hrv -= 7;
      rhr += 2;
    }
    hrv = Math.max(22, hrv);

    // workouts (today stays quiet so the user has something to do)
    const trains = i < nDays - 1 && (dow === 1 || dow === 3 || dow === 5 || (dow === 6 && rnd() > 0.4) || rnd() > 0.82);
    let steps = Math.round(7600 + gauss() * 2200 + (dow === 0 ? -1500 : 0));
    const dayWorkouts: Workout[] = [];
    if (trains) {
      const sport = SPORTS[Math.floor(rnd() * SPORTS.length)];
      const dur = Math.round(32 + rnd() * 48);
      const intensity = 0.45 + rnd() * 0.5; // 0.45 easy … 0.95 hard
      const w = [0.1, 0.2, 0.28, 0.28, 0.14].map((x, k) => Math.max(0.01, x + (intensity - 0.7) * (k - 2) * 0.28));
      const tot = w.reduce((a, b) => a + b, 0);
      const zoneMin = w.map((x) => round1((x / tot) * dur * 0.92));
      const avgHr = Math.round(p.maxHr * (0.55 + intensity * 0.26));
      const maxHr = Math.min(p.maxHr, Math.round(avgHr + 16 + rnd() * 10));
      const kcal = Math.round(kcalPerMin(avgHr, p, new Date().getFullYear() - p.birthYear) * dur);
      dayWorkouts.push({
        id: uid(),
        date,
        start: new Date(new Date(date + "T00:00:00").getTime() + (17 * 60 + Math.round(rnd() * 90)) * 60000).toISOString(),
        durationMin: dur,
        sport,
        avgHr,
        maxHr,
        zoneMin,
        kcal,
        strain: workoutStrain(zoneMin, p.fitness),
        source: "demo",
      });
      steps += Math.round(dur * 80);
    }
    workouts.push(...dayWorkouts);

    // hourly heart rate for stress
    const hourlyHr = Array.from({ length: 24 }, (_, h) => {
      if (h < 6) return Math.round(rhr + 1 + rnd() * 3);
      let v = rhr + 10 + Math.sin(((h - 6) / 24) * Math.PI * 2) * 4 + gauss() * 3;
      if (h === 9 || h === 14) v += (prevJ.stressful ? 14 : 5) + rnd() * 8;
      if (prevJ.stressful && h >= 10 && h <= 16) v += 6;
      return Math.round(v);
    });
    dayWorkouts.forEach((w) => {
      hourlyHr[new Date(w.start).getHours()] = w.avgHr;
    });

    days[date] = {
      date,
      sleep: {
        start: start.toISOString(),
        end: end.toISOString(),
        awakeMin: Math.round(awake),
        lightMin: Math.round(light),
        swsMin: Math.round(sws),
        remMin: Math.round(rem),
        disturbances: Math.max(0, Math.round(awake / 8 + gauss())),
      },
      rhr: Math.round(rhr),
      hrv: Math.round(hrv),
      resp: round1(resp),
      spo2: round1(96.8 + gauss() * 0.5),
      skinTempDelta: round1(gauss() * 0.22 + (prevJ.alcohol ? 0.35 : 0)),
      steps,
      hourlyHr,
    };

    // evening journal for this date (not for "today")
    if (i < nDays - 1) {
      journal[date] = {
        alcohol: rnd() < 0.18,
        caffeineLate: rnd() < 0.3,
        lateMeal: rnd() < 0.28,
        hydrated: rnd() < 0.6,
        screens: rnd() < 0.45,
        dark: rnd() < 0.55,
        meditation: rnd() < 0.3,
        stretch: rnd() < 0.4,
        sauna: rnd() < 0.15,
        sunlight: rnd() < 0.5,
        stressful: rnd() < 0.25,
        travel: rnd() < 0.06,
      };
    }
    // carry strain for tomorrow
    const load = dayWorkouts.reduce((a, w) => a + w.strain, 0);
    prevStrain = Math.min(20, 6 + load * 0.8 + steps / 3000);
  });

  state.days = days;
  state.workouts = workouts;
  state.journal = journal;
  state.goals = defaultGoals();
  // a few breathwork sessions
  state.breath = dates
    .filter(() => rnd() > 0.88)
    .map((d) => ({ id: uid(), date: d, start: new Date(d + "T20:00:00").toISOString(), pattern: "Resonant 5.5", minutes: 5 }));
  void zoneOf;
  return state;
}
