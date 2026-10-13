"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "./store";
import type { WhoopImport } from "./types";

export interface WhoopStatus {
  configured: boolean;
  connected: boolean;
  redirectUri?: string;
}

export type SyncResult = { ok: true; counts: WhoopImport["counts"] } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  not_configured: "WHOOP isn't set up on this deployment yet.",
  not_connected: "You're not connected to WHOOP.",
  reconnect: "WHOOP asked you to sign in again.",
  rate_limited: "WHOOP is rate limiting requests. Try again in a minute.",
  upstream_error: "WHOOP's servers returned an error. Try again shortly.",
};

export function useWhoop() {
  const { state, importWhoop } = useStore();
  const [status, setStatus] = useState<WhoopStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/whoop/status", { cache: "no-store" });
      const s = (await r.json()) as WhoopStatus;
      setStatus(s);
      return s;
    } catch {
      setStatus({ configured: false, connected: false });
      return null;
    }
  }, []);

  useEffect(() => {
    // Fetching the current status after mount is the point of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const sync = useCallback(
    async (days = 30): Promise<SyncResult> => {
      setSyncing(true);
      try {
        const r = await fetch(`/api/whoop/sync?days=${days}`, { cache: "no-store" });
        const body = await r.json();
        if (!r.ok) {
          void refresh();
          return { ok: false, error: MESSAGES[body?.error as string] ?? "Sync failed." };
        }
        importWhoop(body as WhoopImport);
        void refresh();
        return { ok: true, counts: (body as WhoopImport).counts };
      } catch {
        return { ok: false, error: "Couldn't reach the server. Check your connection." };
      } finally {
        setSyncing(false);
      }
    },
    [importWhoop, refresh],
  );

  const disconnect = useCallback(async () => {
    await fetch("/api/whoop/disconnect", { method: "POST" });
    await refresh();
  }, [refresh]);

  return { status, syncing, sync, disconnect, refresh, lastSync: state.whoopSyncedAt };
}
