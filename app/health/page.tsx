"use client";

import { useMemo } from "react";
import { Btn, Card, Empty, PageHead, Pill, Progress, Stat, Title } from "@/components/ui";
import { fmtDay, healthMonitor, healthspan, round1, todayStr, vo2maxEstimate } from "@/lib/engine";
import { useStore } from "@/lib/store";

export default function HealthPage() {
  const { state } = useStore();
  const today = todayStr();
  const hs = useMemo(() => healthspan(state, today), [state, today]);
  const mon = useMemo(() => healthMonitor(state, today), [state, today]);
  const vo2 = vo2maxEstimate(state.profile, state.days[today]?.rhr);
  const out = mon.filter((m) => m.status === "out");

  return (
    <div>
      <PageHead
        title="Health"
        sub="Long-term healthspan and a shareable monitor of key vitals."
        right={
          <Btn variant="ghost" onClick={() => window.print()}>
            Print or save as PDF
          </Btn>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Title sub="Wellness estimate from your last 30 days. Not a medical result.">Healthspan</Title>
          {hs ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Stat label="Biological age" value={hs.biologicalAge} color={hs.years >= 0 ? "var(--green)" : "var(--red)"} sub={`${Math.abs(hs.years)} years ${hs.years >= 0 ? "younger" : "older"} than ${hs.age}`} />
                <Stat label="Pace of aging" value={`${hs.pace}×`} sub={hs.pace < 1 ? "Aging slower than average" : hs.pace > 1 ? "Aging faster than average" : "Average pace"} />
                <Stat label="Score" value={hs.overall} unit="/ 100" />
              </div>
              <div className="mt-6 space-y-4">
                {hs.contributors.map((c) => (
                  <div key={c.key}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span>{c.label}</span>
                      <span className="text-xs text-[var(--muted)]">{c.detail}</span>
                    </div>
                    <Progress pct={c.score / 100} color={c.score >= 65 ? "var(--green)" : c.score >= 45 ? "var(--yellow)" : "var(--red)"} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty>Healthspan needs about a week of data.</Empty>
          )}
        </Card>

        <Card>
          <Title>Cardio fitness</Title>
          {vo2 ? (
            <>
              <Stat label="Estimated VO₂ max" value={vo2} unit="ml/kg/min" />
              <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">Estimated from max and resting heart rate (Uth–Sørensen–Overgaard–Pedersen). Treat it as a trend, not a lab test.</p>
            </>
          ) : (
            <Empty>Needs a resting heart-rate reading today.</Empty>
          )}
        </Card>
      </div>

      <Card className="print-card mt-4">
        <Title sub={`Vitals for ${fmtDay(today, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} compared with your own 30-day range.`} right={out.length ? <Pill color="#fbbf24">{out.length} outside range</Pill> : <Pill color="#4ade80">All in range</Pill>}>
          Health monitor
        </Title>
        {mon.length ? (
          <div className="divide-y divide-white/[0.06]">
            {mon.map((m) => (
              <div key={m.key} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{m.label}</div>
                  <div className="text-xs text-[var(--muted)]">
                    Your range {round1(m.lo)}–{round1(m.hi)} {m.unit}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">
                    {round1(m.value)} {m.unit}
                  </span>
                  <Pill color={m.status === "in" ? "#4ade80" : "#fbbf24"}>{m.status === "in" ? "In range" : "Outside"}</Pill>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Log today&apos;s vitals and keep a week of history to see the monitor.</Empty>
        )}
        <p className="mt-4 text-xs text-[var(--muted)]">Pulsewell is a wellness tool and does not diagnose or treat any condition. Share trends with a clinician and see a professional if something feels wrong.</p>
      </Card>
    </div>
  );
}
