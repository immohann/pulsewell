"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { demoState, emptyState } from "./demo";
import { uid } from "./engine";
import type { BreathSession, DayRecord, Goal, Profile, StoreState, Workout } from "./types";

const KEY = "pulsewell:v1";

interface Ctx {
  state: StoreState;
  ready: boolean;
  setProfile: (p: Partial<Profile>) => void;
  patchDay: (date: string, patch: Partial<DayRecord>) => void;
  addWorkout: (w: Omit<Workout, "id">) => void;
  removeWorkout: (id: string) => void;
  setBehavior: (date: string, id: string, v: boolean) => void;
  addBreath: (b: Omit<BreathSession, "id">) => void;
  setGoals: (g: Goal[]) => void;
  addCycleStart: (d: string) => void;
  removeCycleStart: (d: string) => void;
  startFresh: (p: Profile) => void;
  startDemo: (p: Profile) => void;
  reset: () => void;
  exportJson: () => string;
  importJson: (s: string) => string | null;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(emptyState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoreState;
        // Hydrating from localStorage must happen after mount to stay SSR-safe.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (parsed?.version === 1) setState({ ...emptyState(), ...parsed });
      }
    } catch {
      /* corrupt or blocked storage: start fresh */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota or private mode */
    }
  }, [state, ready]);

  const setProfile = useCallback((p: Partial<Profile>) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })), []);
  const patchDay = useCallback(
    (date: string, patch: Partial<DayRecord>) =>
      setState((s) => ({ ...s, days: { ...s.days, [date]: { ...(s.days[date] ?? { date }), ...patch, date } } })),
    [],
  );
  const addWorkout = useCallback((w: Omit<Workout, "id">) => setState((s) => ({ ...s, workouts: [...s.workouts, { ...w, id: uid() }] })), []);
  const removeWorkout = useCallback((id: string) => setState((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) })), []);
  const setBehavior = useCallback(
    (date: string, id: string, v: boolean) =>
      setState((s) => ({ ...s, journal: { ...s.journal, [date]: { ...(s.journal[date] ?? {}), [id]: v } } })),
    [],
  );
  const addBreath = useCallback((b: Omit<BreathSession, "id">) => setState((s) => ({ ...s, breath: [...s.breath, { ...b, id: uid() }] })), []);
  const setGoals = useCallback((goals: Goal[]) => setState((s) => ({ ...s, goals })), []);
  const addCycleStart = useCallback(
    (d: string) => setState((s) => ({ ...s, cycleStarts: Array.from(new Set([...s.cycleStarts, d])).sort() })),
    [],
  );
  const removeCycleStart = useCallback((d: string) => setState((s) => ({ ...s, cycleStarts: s.cycleStarts.filter((x) => x !== d) })), []);
  const startFresh = useCallback((p: Profile) => setState({ ...emptyState(), onboarded: true, profile: p }), []);
  const startDemo = useCallback((p: Profile) => setState(demoState(p)), []);
  const reset = useCallback(() => setState(emptyState()), []);
  const exportJson = useCallback(() => JSON.stringify(state, null, 2), [state]);
  const importJson = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text) as StoreState;
      if (parsed?.version !== 1 || typeof parsed.days !== "object") return "That file is not a Pulsewell export.";
      setState({ ...emptyState(), ...parsed, onboarded: true });
      return null;
    } catch {
      return "Could not read that file.";
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({ state, ready, setProfile, patchDay, addWorkout, removeWorkout, setBehavior, addBreath, setGoals, addCycleStart, removeCycleStart, startFresh, startDemo, reset, exportJson, importJson }),
    [state, ready, setProfile, patchDay, addWorkout, removeWorkout, setBehavior, addBreath, setGoals, addCycleStart, removeCycleStart, startFresh, startDemo, reset, exportJson, importJson],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
