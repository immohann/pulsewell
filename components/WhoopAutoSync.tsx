"use client";

import { useEffect, useRef } from "react";
import { useWhoop } from "@/lib/useWhoop";

/** Quietly refreshes the last week from WHOOP when the app opens, at most once an hour. */
export default function WhoopAutoSync() {
  const { status, sync, lastSync, syncing } = useWhoop();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !status?.connected || syncing) return;
    const stale = !lastSync || Date.now() - Date.parse(lastSync) > 60 * 60 * 1000;
    if (!stale) return;
    ran.current = true;
    void sync(lastSync ? 7 : 30);
  }, [status, lastSync, sync, syncing]);

  return null;
}
