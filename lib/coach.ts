import {
  dayStrain,
  fmtDay,
  hm,
  healthspan,
  journalImpacts,
  mean,
  recoveryResult,
  round1,
  sleepPlan,
  sleepResult,
  stressSeries,
  stressSummary,
  strainTarget,
  addDays,
  dateRange,
  workoutsOn,
} from "./engine";
import type { StoreState } from "./types";

export const SUGGESTIONS = [
  "Why is my recovery what it is today?",
  "What should my strain be today?",
  "When should I go to bed tonight?",
  "How has my week looked?",
  "What habits help or hurt me?",
  "How is my stress today?",
  "What is my healthspan?",
];

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

/** Local, rule-based coach. It reads your data on-device and never calls an external model. */
export function coachAnswer(question: string, s: StoreState, today: string): string[] {
  const q = question.toLowerCase();
  const rec = recoveryResult(s, today);
  const slp = sleepResult(s, today);

  if (has(q, "recover", "ready", "readiness")) {
    if (!rec) return ["I don't have a heart-rate variability and resting heart-rate reading for today yet. Add one on the Today screen (or take a morning reading with a heart-rate strap) and ask again."];
    const worst = [...rec.drivers].filter((d) => d.value != null).sort((a, b) => a.z - b.z)[0];
    const best = [...rec.drivers].filter((d) => d.value != null).sort((a, b) => b.z - a.z)[0];
    const out = [`Your recovery is ${rec.score}% (${rec.zone}).`];
    if (worst && worst.z < -0.4) out.push(`The biggest drag is ${worst.label.toLowerCase()}: ${round1(worst.value!)} ${worst.unit} against a baseline of ${round1(worst.baseline!)} ${worst.unit}.`);
    if (best && best.z > 0.4) out.push(`In your favor: ${best.label.toLowerCase()} is ${round1(best.value!)} ${best.unit}, better than your usual ${round1(best.baseline!)}.`);
    const t = strainTarget(rec.score);
    out.push(`That points to a "${t.label}" day: aim for strain ${t.lo}–${t.hi}.`);
    return out;
  }

  if (has(q, "strain", "workout", "train", "push", "exercise")) {
    const t = strainTarget(rec?.score ?? null);
    const cur = dayStrain(s, today);
    const out = [`Your target today is ${t.lo}–${t.hi} (${t.label}). ${t.note}`, `You're at strain ${cur} so far.`];
    if (cur < t.lo) out.push(`There is room for about ${round1(t.lo - cur)}–${round1(t.hi - cur)} more strain: a ${t.label === "Restore" ? "walk or mobility session" : t.label === "Push" ? "hard interval or strength session" : "steady 40–50 minute aerobic session"} would fit.`);
    else if (cur > t.hi) out.push("You've already passed your target. Prioritize food, hydration and an early night.");
    else out.push("You're in the target range. Anything more is optional.");
    return out;
  }

  if (has(q, "bed", "sleep", "tonight", "wake")) {
    const tomorrow = addDays(today, 1);
    const plan = sleepPlan(s, s.profile.wakeTime, tomorrow);
    const out = [
      `To wake at ${plan.wake} and cover your ${s.profile.sleepGoal} goal, plan on about ${hm(plan.tibHours)} in bed. That means getting into bed around ${plan.bedtime}.`,
      `Your sleep need tonight is about ${hm(plan.need)} of actual sleep.`,
    ];
    if (slp) out.push(`Last night you slept ${hm(slp.hoursAsleep)} (${slp.performance}% of need) with ${slp.efficiency}% efficiency.`);
    return out;
  }

  if (has(q, "stress", "calm", "anxious", "breath")) {
    const ss = stressSummary(stressSeries(s, today));
    if (!ss) return ["I don't have daytime heart-rate data for today yet, so I can't estimate stress. A guided breathing session on the Stress tab can still help right now."];
    return [
      `Your average stress today is ${ss.avg} on a 0–3 scale, peaking at ${ss.peak.hour}:00 (${ss.peak.stress}).`,
      `${ss.calmHours} of ${ss.totalHours} waking hours were in the low range.`,
      ss.avg >= 1.5 ? "A 5-minute resonant breathing session usually brings heart rate down within a few minutes. Try one from the Stress tab." : "You're staying calm. Keep it up.",
    ];
  }

  if (has(q, "habit", "journal", "alcohol", "caffeine", "impact", "behavior", "behaviour", "help")) {
    const imp = journalImpacts(s).slice(0, 4);
    if (!imp.length) return ["I need at least three days with and without a behavior before I can measure its effect. Keep logging the Journal each evening."];
    return [
      "Here is how your logged habits relate to next-day recovery:",
      ...imp.map((i) => `${i.behavior.label}: ${i.delta > 0 ? "+" : ""}${Math.round(i.delta)} points (${i.nWith} days with, ${i.nWithout} without).`),
      "Correlation isn't proof, but a consistent gap is worth experimenting with.",
    ];
  }

  if (has(q, "week", "trend", "lately", "history", "summary")) {
    const week = dateRange(today, 7);
    const recs = week.map((d) => recoveryResult(s, d)?.score).filter((v): v is number => v != null);
    const sl = week.map((d) => sleepResult(s, d)?.hoursAsleep).filter((v): v is number => v != null);
    const st = week.map((d) => dayStrain(s, d));
    const wk = week.reduce((a, d) => a + workoutsOn(s, d).length, 0);
    if (!recs.length) return ["There isn't enough data this week yet."];
    return [
      `Over the last 7 days (${fmtDay(week[0])} – ${fmtDay(week[6])}):`,
      `Recovery averaged ${Math.round(mean(recs))}%, sleep ${hm(mean(sl) || 0)}, strain ${round1(mean(st))}, with ${wk} workouts.`,
    ];
  }

  if (has(q, "healthspan", "age", "aging", "pace")) {
    const h = healthspan(s, today);
    if (!h) return ["I need about a week of data to estimate healthspan."];
    const weakest = [...h.contributors].sort((a, b) => a.score - b.score)[0];
    return [
      `Your estimated biological age is ${h.biologicalAge} (chronological ${h.age}), a pace of ${h.pace}× aging. This is a wellness estimate, not a medical result.`,
      `Your weakest contributor is ${weakest.label.toLowerCase()} (${weakest.detail}). That's the best place to gain.`,
    ];
  }

  if (has(q, "hrv", "variab")) {
    return ["Heart rate variability (HRV) is the beat-to-beat variation in your heart rhythm. Higher than your own baseline generally means your nervous system is well recovered; a drop often follows hard training, alcohol, poor sleep or stress. Compare it only against your own trend."];
  }

  return [
    "I can help with recovery, strain targets, bedtime planning, stress, habit impacts, weekly trends and healthspan.",
    "Try one of the suggested questions below, or ask in your own words.",
  ];
}
