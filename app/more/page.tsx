"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { Card, PageHead } from "@/components/ui";
import { MORE } from "@/components/Shell";

const BLURB: Record<string, string> = {
  "/import": "Apple Health, CSV files, or a WHOOP account.",
  "/journal": "Log habits and see what moves your recovery.",
  "/plan": "Weekly goals, streaks and milestones.",
  "/health": "Healthspan, cardio fitness and a printable vitals report.",
  "/coach": "Ask questions about your own data.",
  "/live": "Connect a heart-rate strap for workouts and morning readings.",
  "/settings": "Profile, cycle tracking, export and import.",
};

export default function MorePage() {
  return (
    <div>
      <PageHead title="More" />
      <div className="grid gap-3 sm:grid-cols-2">
        {MORE.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card onClick={() => {}} className="flex items-start gap-4">
              <div className="rounded-xl bg-white/[0.06] p-2.5 text-[var(--accent)]">
                <Icon name={m.icon} size={22} />
              </div>
              <div>
                <div className="font-medium">{m.label}</div>
                <div className="mt-0.5 text-sm text-[var(--muted)]">{BLURB[m.href]}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
