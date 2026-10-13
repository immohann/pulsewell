"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Btn, Card, Pill, Title } from "./ui";
import { useWhoop } from "@/lib/useWhoop";

const FLAGS: Record<string, { tone: "ok" | "bad"; text: string }> = {
  connected: { tone: "ok", text: "WHOOP connected. Pulling your history…" },
  denied: { tone: "bad", text: "WHOOP sign-in was cancelled." },
  state_mismatch: { tone: "bad", text: "That sign-in couldn't be verified. Please try connecting again." },
  exchange_failed: { tone: "bad", text: "WHOOP didn't accept the sign-in. Check that the redirect URI in your WHOOP app matches exactly." },
  not_configured: { tone: "bad", text: "WHOOP isn't set up on this deployment yet. See the steps below." },
};

export default function WhoopCard() {
  const { status, syncing, sync, disconnect, lastSync } = useWhoop();
  // Read the redirect flag (?whoop=connected|denied|…) once. This card only renders on the client.
  const [flag] = useState(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("whoop")));
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(() => (flag ? (FLAGS[flag] ?? null) : null));
  const handled = useRef(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (handled.current || !flag || !status) return;
    handled.current = true;
    window.history.replaceState(null, "", "/settings");
    if (flag === "connected") {
      void sync(60).then((r) => setMsg(r.ok ? { tone: "ok", text: `Synced ${r.counts.sleeps} nights, ${r.counts.recoveries} recoveries and ${r.counts.workouts} workouts.` } : { tone: "bad", text: r.error }));
    }
  }, [flag, status, sync]);

  const doSync = async (days: number) => {
    setMsg(null);
    const r = await sync(days);
    setMsg(r.ok ? { tone: "ok", text: `Synced ${r.counts.sleeps} nights, ${r.counts.recoveries} recoveries and ${r.counts.workouts} workouts.` } : { tone: "bad", text: r.error });
  };

  const redirect = status?.redirectUri ?? "";

  return (
    <Card>
      <Title right={status ? <Pill color={status.connected ? "#4ade80" : "#9aa3b2"}>{status.connected ? "Connected" : "Not connected"}</Pill> : null}>WHOOP account</Title>

      {status && !status.configured ? (
        <div className="space-y-3 text-sm text-[var(--muted)]">
          <p>
            Connect your WHOOP to import your real recovery, sleep, strain and workouts. WHOOP requires every app to be registered, so there&apos;s a one-time setup (about 5 minutes):
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Sign in at{" "}
              <a className="text-[var(--accent)] underline" href="https://developer-dashboard.whoop.com" target="_blank" rel="noreferrer">
                developer-dashboard.whoop.com
              </a>{" "}
              with your WHOOP account and create an app.
            </li>
            <li>
              Add this redirect URI:{" "}
              <button
                className="break-all rounded bg-white/10 px-1.5 py-0.5 text-left font-mono text-xs text-white"
                onClick={() => {
                  void navigator.clipboard?.writeText(redirect);
                  setCopied(true);
                }}
              >
                {redirect}
              </button>
              {copied ? <span className="ml-2 text-xs text-[var(--green)]">copied</span> : null}
            </li>
            <li>
              Enable the scopes <span className="font-mono text-xs text-white">offline, read:profile, read:body_measurement, read:cycles, read:recovery, read:sleep, read:workout</span>.
            </li>
            <li>
              Give the deployment your client ID and secret (run these in the project folder; each prompts for the value):
              <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-white">{`vercel env add WHOOP_CLIENT_ID production
vercel env add WHOOP_CLIENT_SECRET production
vercel deploy --prod`}</pre>
            </li>
          </ol>
          <p className="text-xs">The secret stays on the server and is never sent to your browser. Your WHOOP data goes straight to this browser; the server stores nothing.</p>
        </div>
      ) : null}

      {status?.configured && !status.connected ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">Sign in with WHOOP to import your sleep, recovery, strain and workouts. Pulsewell is read-only: it can&apos;t change anything in your WHOOP account.</p>
          <a href="/api/whoop/login">
            <Btn>Connect WHOOP</Btn>
          </a>
        </div>
      ) : null}

      {status?.connected ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            {lastSync ? `Last synced ${new Date(lastSync).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.` : "Not synced yet."} Pulsewell refreshes the last week each time you open it.
          </p>
          <div className="flex flex-wrap gap-3">
            <Btn onClick={() => doSync(7)} disabled={syncing}>
              {syncing ? "Syncing…" : "Sync now"}
            </Btn>
            <Btn variant="ghost" onClick={() => doSync(90)} disabled={syncing}>
              Import 90 days
            </Btn>
            <Btn variant="danger" onClick={() => void disconnect()} disabled={syncing}>
              Disconnect
            </Btn>
          </div>
        </div>
      ) : null}

      {msg ? <p className={`mt-4 text-sm ${msg.tone === "ok" ? "text-[var(--green)]" : "text-red-300"}`}>{msg.text}</p> : null}

      <div className="mt-5 border-t border-white/[0.06] pt-4 text-sm text-[var(--muted)]">
        <div className="mb-1 font-medium text-[var(--fg)]">Live heart rate from your strap</div>
        Turn on <b>HR Broadcast</b> in the WHOOP app (Device Settings), then use{" "}
        <Link className="text-[var(--accent)] underline" href="/live">
          Live strap
        </Link>{" "}
        to record workouts. The strap can broadcast to one device at a time.
      </div>
    </Card>
  );
}
