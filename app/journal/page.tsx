"use client";

import { useMemo, useState } from "react";
import DayNav from "@/components/DayNav";
import { Card, Empty, PageHead, Pill, Title } from "@/components/ui";
import { BEHAVIORS, addDays, journalImpacts, todayStr } from "@/lib/engine";
import { useStore } from "@/lib/store";

export default function JournalPage() {
  const { state, setBehavior } = useStore();
  const [date, setDate] = useState(todayStr());
  const entry = state.journal[date] ?? {};
  const impacts = useMemo(() => journalImpacts(state), [state]);
  const groups = Array.from(new Set(BEHAVIORS.map((b) => b.group)));
  const maxAbs = Math.max(5, ...impacts.map((i) => Math.abs(i.delta)));

  return (
    <div>
      <PageHead title="Journal" sub="Log what you did. Pulsewell compares it with the next day's recovery." right={<DayNav date={date} onChange={setDate} />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g}>
              <Title>{g}</Title>
              <div className="space-y-1">
                {BEHAVIORS.filter((b) => b.group === g).map((b) => {
                  const on = !!entry[b.id];
                  return (
                    <button key={b.id} onClick={() => setBehavior(date, b.id, !on)} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition hover:bg-white/[0.04]">
                      <span>{b.label}</span>
                      <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${on ? "bg-[var(--accent)]" : "bg-white/10"}`}>
                        <span className={`h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
          <p className="px-1 text-xs text-[var(--muted)]">Behaviors on {date} are compared with recovery on {addDays(date, 1)}.</p>
        </div>

        <Card className="h-fit">
          <Title sub="Difference in next-day recovery when you did vs. didn't. Needs 3+ days each.">Your impacts</Title>
          {impacts.length ? (
            <div className="space-y-4">
              {impacts.map((i) => (
                <div key={i.behavior.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span>{i.behavior.label}</span>
                    <Pill color={i.delta >= 0 ? "#4ade80" : "#f87171"}>
                      {i.delta >= 0 ? "+" : ""}
                      {Math.round(i.delta)} pts
                    </Pill>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/[0.06]">
                    <div className="absolute left-1/2 top-[-3px] h-[14px] w-px bg-white/25" />
                    <div
                      className="absolute top-0 h-full rounded-full"
                      style={{
                        background: i.delta >= 0 ? "var(--green)" : "var(--red)",
                        left: i.delta >= 0 ? "50%" : `${50 - (Math.abs(i.delta) / maxAbs) * 50}%`,
                        width: `${(Math.abs(i.delta) / maxAbs) * 50}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--muted)]">
                    {Math.round(i.withAvg)}% with ({i.nWith}) vs {Math.round(i.withoutAvg)}% without ({i.nWithout})
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Keep logging. Impacts appear once a behavior has at least three days with and without it.</Empty>
          )}
        </Card>
      </div>
    </div>
  );
}
