export type Sex = "female" | "male" | "other";
export type Fitness =
  | "inactive"
  | "recreational"
  | "serious"
  | "collegiate"
  | "professional"
  | "tactical";
export type SleepGoal = "peak" | "perform" | "getby";

export interface Profile {
  name: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  maxHr: number;
  fitness: Fitness;
  sleepGoal: SleepGoal;
  wakeTime: string; // HH:MM usual wake time
  cycleTracking: boolean;
}

export interface SleepRecord {
  start: string; // ISO bedtime
  end: string; // ISO wake time
  awakeMin: number;
  lightMin: number;
  swsMin: number;
  remMin: number;
  disturbances: number;
}

export interface DayRecord {
  date: string; // YYYY-MM-DD, the wake date that starts this cycle
  sleep?: SleepRecord;
  rhr?: number;
  hrv?: number; // RMSSD ms
  resp?: number; // breaths/min
  spo2?: number;
  skinTempDelta?: number; // °C vs baseline
  steps?: number;
  hourlyHr?: number[]; // 24 values, bpm, optional
  napMin?: number;
  whoop?: WhoopDay; // reference scores reported by a connected WHOOP account
}

/** Scores WHOOP itself reported for a day, kept beside Pulsewell's own numbers. */
export interface WhoopDay {
  recovery?: number;
  strain?: number;
  sleepPerformance?: number;
  kilojoule?: number;
  avgHr?: number;
  maxHr?: number;
}

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  start: string; // ISO
  durationMin: number;
  sport: string;
  avgHr: number;
  maxHr: number;
  zoneMin: number[]; // minutes in zones 1..5
  kcal: number;
  strain: number;
  source: "manual" | "live" | "demo" | "whoop";
  samples?: number[];
}

export interface BreathSession {
  id: string;
  date: string;
  start: string;
  pattern: string;
  minutes: number;
}

export interface Goal {
  id: string;
  kind: "sleepHours" | "greenDays" | "workouts" | "avgStrain" | "breathSessions" | "consistency";
  target: number;
}

export interface StoreState {
  version: 1;
  onboarded: boolean;
  profile: Profile;
  days: Record<string, DayRecord>;
  workouts: Workout[];
  journal: Record<string, Record<string, boolean>>;
  breath: BreathSession[];
  goals: Goal[];
  cycleStarts: string[];
  demo: boolean;
  whoopSyncedAt?: string; // ISO time of the last successful WHOOP sync
}

/** Normalized result of a WHOOP sync, produced server-side and merged in the browser. */
export interface WhoopImport {
  days: Record<string, Partial<DayRecord>>;
  workouts: Workout[];
  body?: { heightCm?: number; weightKg?: number; maxHr?: number };
  firstName?: string;
  counts: { days: number; workouts: number; sleeps: number; recoveries: number };
}

export type Zone = "green" | "yellow" | "red";

export interface RecoveryResult {
  score: number;
  zone: Zone;
  drivers: { key: string; label: string; z: number; value?: number; baseline?: number; unit: string }[];
}

export interface SleepResult {
  hoursAsleep: number;
  hoursInBed: number;
  needHours: number;
  performance: number;
  efficiency: number;
  consistency: number;
  debtHours: number;
  stages: { awake: number; light: number; sws: number; rem: number };
}
