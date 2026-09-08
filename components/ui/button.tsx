import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const base =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-safe:transition-[background-color,color,transform,box-shadow] motion-safe:duration-100 motion-safe:ease-out active:motion-safe:translate-y-px";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "border border-border bg-secondary text-secondary-foreground hover:bg-popover",
  ghost: "text-foreground hover:bg-muted",
  destructive:
    "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 motion-safe:animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            className="stroke-current opacity-25"
            strokeWidth="2.5"
            cx="12"
            cy="12"
            r="9"
          />
          <path
            className="stroke-current"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M21 12a9 9 0 0 0-9-9"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
