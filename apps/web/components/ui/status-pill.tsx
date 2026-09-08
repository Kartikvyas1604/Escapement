import type { LeaseStatus } from "escapement-client";

const styles: Record<LeaseStatus, string> = {
  Active: "border-primary/40 text-primary",
  Exhausted: "border-border text-muted-foreground",
  Settling: "border-primary/40 text-primary motion-safe:animate-pulse",
  Settled: "border-success/40 text-success",
  Expired: "border-destructive/40 text-destructive",
};

export function StatusPill({ status }: { status: LeaseStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs tabular-nums ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}
