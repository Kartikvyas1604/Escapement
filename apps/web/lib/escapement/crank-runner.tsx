"use client";

import { useEffect } from "react";
import { crankTick, syncLease, useEscapement } from "@/lib/escapement/engine";

/**
 * Drives the real crank: submits crank_tick transactions on the lease's
 * cadence while an active lease is on screen, and re-syncs lease state
 * from the chain every second.
 */
export function CrankRunner() {
  const lease = useEscapement().lease;
  const isActive = lease?.status === "Active";
  const intervalMs = lease?.intervalMs ?? 0;
  const leasePda = lease?.leasePda;

  useEffect(() => {
    if (!isActive || intervalMs <= 0) return;
    void syncLease();
    const crank = window.setInterval(() => void crankTick(), intervalMs);
    const poll = window.setInterval(() => void syncLease(), 1000);
    return () => {
      window.clearInterval(crank);
      window.clearInterval(poll);
    };
  }, [isActive, intervalMs, leasePda]);

  return null;
}
