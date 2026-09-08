"use client";

import { useEffect } from "react";
import { fireTick, useEscapement } from "@/lib/escapement/engine";

export function CrankRunner() {
  const lease = useEscapement().lease;
  const isActive = lease?.status === "Active";
  const intervalMs = lease?.intervalMs ?? 0;
  const leaseId = lease?.id;

  useEffect(() => {
    if (!isActive || intervalMs <= 0) return;
    const id = window.setInterval(fireTick, intervalMs);
    return () => window.clearInterval(id);
  }, [isActive, intervalMs, leaseId]);

  return null;
}
