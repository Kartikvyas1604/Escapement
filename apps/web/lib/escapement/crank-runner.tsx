"use client";

import { useEffect } from "react";
import { crankTick, syncLease, useEscapement } from "@/lib/escapement/engine";

/**
 * Drives the real crank: submits crank_tick transactions on the lease's
 * cadence while an active lease is on screen, and re-syncs lease state
 * from the chain. Background tabs don't crank — the schedule resumes
 * when the tab is visible again.
 */
export function CrankRunner() {
  const lease = useEscapement().lease;
  const isActive = lease?.status === "Active";
  const intervalMs = lease?.intervalMs ?? 0;
  const leasePda = lease?.leasePda;

  useEffect(() => {
    // Recover lease state from the chain on load, even when settled/expired.
    void syncLease();
  }, [leasePda]);

  useEffect(() => {
    if (!isActive || intervalMs <= 0) return;

    let crankId: number | undefined;
    const startCrank = () => {
      if (crankId !== undefined) return;
      crankId = window.setInterval(() => void crankTick(), intervalMs);
    };
    const stopCrank = () => {
      if (crankId !== undefined) {
        window.clearInterval(crankId);
        crankId = undefined;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") startCrank();
      else stopCrank();
    };

    if (document.visibilityState === "visible") startCrank();
    document.addEventListener("visibilitychange", onVisibility);

    const poll = window.setInterval(() => void syncLease(), 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopCrank();
      window.clearInterval(poll);
    };
  }, [isActive, intervalMs, leasePda]);

  return null;
}
