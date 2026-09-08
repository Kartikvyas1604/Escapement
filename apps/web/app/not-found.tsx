import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-4 px-4 py-24 md:px-6 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        404 · No tick at this address
      </p>
      <h1 className="font-serif text-4xl tracking-tight md:text-5xl">
        Nothing scheduled here.
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
        The page you asked for does not exist. Buy an Escapement lease instead —
        that one comes with guaranteed ticks.
      </p>
      <Link
        href="/mint"
        className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-[background-color] duration-100 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Buy an Escapement lease
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
