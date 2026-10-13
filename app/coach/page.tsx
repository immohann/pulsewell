"use client";

import { useEffect, useRef, useState } from "react";
import { Btn, PageHead, inputCls } from "@/components/ui";
import { SUGGESTIONS, coachAnswer } from "@/lib/coach";
import { todayStr } from "@/lib/engine";
import { useStore } from "@/lib/store";

interface Msg {
  role: "user" | "coach";
  text: string[];
}

export default function CoachPage() {
  const { state } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "coach", text: ["Hi. I read your recovery, sleep, strain and journal on this device and answer from them. What would you like to know?"] }]);
  const [q, setQ] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMsgs((m) => [...m, { role: "user", text: [t] }, { role: "coach", text: coachAnswer(t, state, todayStr()) }]);
    setQ("");
  };

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <PageHead title="Coach" sub="Answers computed on your device from your own data. Nothing is sent anywhere." />
      <div className="flex-1 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : ""}`}>
            <div className={`max-w-[88%] space-y-2 rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-[var(--accent)] text-black" : "border border-white/[0.07] bg-[var(--card)]"}`}>
              {m.text.map((t, j) => (
                <p key={j}>{t}</p>
              ))}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="sticky bottom-20 mt-4 space-y-3 md:bottom-4">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-white">
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
          className="flex gap-2"
        >
          <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about recovery, strain, sleep, stress…" />
          <Btn type="submit">Ask</Btn>
        </form>
      </div>
    </div>
  );
}
