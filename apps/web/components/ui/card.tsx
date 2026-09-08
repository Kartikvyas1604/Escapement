import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-border bg-card ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ children }: { children: ReactNode }) {
  return <div className="space-y-1 border-b border-border p-4 md:p-6">{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-medium">{children}</h2>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

export function CardContent({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 md:p-6 ${className}`} {...props} />;
}
