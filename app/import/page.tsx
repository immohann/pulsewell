"use client";

import Link from "next/link";
import { AppleHealthCard, CsvCard } from "@/components/ImportCards";
import { Card, PageHead, Title } from "@/components/ui";
import WhoopCard from "@/components/WhoopCard";

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <PageHead title="Import your data" sub="Bring in what you already have. Files are read in your browser and never uploaded." />

      <AppleHealthCard />
      <CsvCard />

      <Card>
        <Title>Heart-rate strap</Title>
        <p className="text-sm text-[var(--muted)]">
          Any Bluetooth chest strap or armband (about $25–50) records live workouts and a 2-minute morning HRV reading, which is enough to drive Recovery and Strain.{" "}
          <Link href="/live" className="text-[var(--accent)] underline">
            Open Live strap
          </Link>
          .
        </p>
      </Card>

      <Card>
        <Title>Log by hand</Title>
        <p className="text-sm text-[var(--muted)]">
          No device at all? Enter last night&apos;s sleep and a morning HRV/resting heart rate from the{" "}
          <Link href="/" className="text-[var(--accent)] underline">
            Today
          </Link>{" "}
          screen. Strain can come from workouts you add by hand.
        </p>
      </Card>

      <div className="pt-2">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Optional</h2>
        <WhoopCard />
      </div>
    </div>
  );
}
