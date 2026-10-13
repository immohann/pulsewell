"use client";

import { addDays, fmtDay, todayStr } from "@/lib/engine";

export function useDayLabel(date: string) {
  const t = todayStr();
  if (date === t) return "Today";
  if (date === addDays(t, -1)) return "Yesterday";
  return fmtDay(date);
}

export default function DayNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const t = todayStr();
  const label = useDayLabel(date);
  return (
    <div className="no-print inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
      <button aria-label="Previous day" className="rounded-lg p-2 text-[var(--muted)] hover:bg-white/10 hover:text-white" onClick={() => onChange(addDays(date, -1))}>
        <span className="block text-lg leading-none">‹</span>
      </button>
      <div className="min-w-24 px-2 text-center text-sm font-medium">{label}</div>
      <button aria-label="Next day" disabled={date >= t} className="rounded-lg p-2 text-[var(--muted)] hover:bg-white/10 hover:text-white disabled:opacity-30" onClick={() => onChange(addDays(date, 1))}>
        <span className="block text-lg leading-none">›</span>
      </button>
    </div>
  );
}
