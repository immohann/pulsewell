"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Icon from "./Icon";
import Onboarding from "./Onboarding";
import { useStore } from "@/lib/store";

const MAIN = [
  { href: "/", label: "Today", icon: "home" },
  { href: "/sleep", label: "Sleep", icon: "moon" },
  { href: "/strain", label: "Strain", icon: "bolt" },
  { href: "/stress", label: "Stress", icon: "wind" },
  { href: "/trends", label: "Trends", icon: "chart" },
];
const MORE = [
  { href: "/journal", label: "Journal", icon: "book" },
  { href: "/plan", label: "Weekly plan", icon: "cal" },
  { href: "/health", label: "Health", icon: "heart" },
  { href: "/coach", label: "Coach", icon: "chat" },
  { href: "/live", label: "Live strap", icon: "radio" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={30} height={30} className="rounded-lg" />
      <span className="text-lg font-semibold tracking-tight">Pulsewell</span>
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { ready, state } = useStore();

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--accent)]/30" />
      </div>
    );
  }
  if (!state.onboarded) return <Onboarding />;

  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const inMore = MORE.some((m) => active(m.href)) || active("/more");

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-white/[0.06] p-5 md:flex">
        <div className="mb-6">
          <Logo />
        </div>
        {[...MAIN, ...MORE].map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active(n.href) ? "bg-white/[0.07] text-white" : "text-[var(--muted)] hover:bg-white/[0.04] hover:text-white"}`}
          >
            <Icon name={n.icon} size={19} />
            {n.label}
          </Link>
        ))}
        <p className="mt-auto text-[11px] leading-relaxed text-[var(--muted)]">
          Local-first. Your data stays in this browser. Wellness estimates, not medical advice.
        </p>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 md:pb-10">
        <div className="mb-5 md:hidden no-print">
          <Logo />
        </div>
        {children}
      </main>

      <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-[#07090d]/90 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {MAIN.map((n) => (
            <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${active(n.href) ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
              <Icon name={n.icon} size={21} />
              {n.label}
            </Link>
          ))}
          <Link href="/more" className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${inMore ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
            <Icon name="grid" size={21} />
            More
          </Link>
        </div>
      </nav>
    </div>
  );
}

export { MORE };
