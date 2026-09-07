export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-muted motion-safe:animate-pulse ${className}`} />;
}
