import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LiveStats } from "@/components/live-stats";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8">
      <section className="flex flex-col items-start gap-6 py-20 md:py-28 lg:py-36">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Live keeper exchange · MagicBlock Ephemeral Rollups
        </p>
        <h1 className="max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight text-balance md:text-6xl lg:text-7xl">
          Lease crank bandwidth for your program.
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-muted-foreground md:text-lg">
          Buy an Escapement lease — a time-bounded right to scheduled execution
          on a MagicBlock ephemeral rollup. Pick an interval and iteration cap,
          watch ticks fire live, settle the prepaid fee on Solana.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/mint"
            className="inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-[background-color] duration-100 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:active:translate-y-px"
          >
            Buy an Escapement lease
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex min-h-12 items-center rounded-md border border-border bg-secondary px-6 text-sm font-medium text-secondary-foreground transition-colors duration-100 hover:bg-popover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            How it works
          </Link>
        </div>
        <LiveStats />
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-it-works-heading"
        className="scroll-mt-24 border-t border-border py-20 md:py-24"
      >
        <h2
          id="how-it-works-heading"
          className="font-serif text-3xl tracking-tight md:text-4xl"
        >
          Lease. Ticks. Settle.
        </h2>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3 bg-card p-6">
              <span className="font-mono text-xs tabular-nums text-primary">
                0{i + 1}
              </span>
              <h3 className="text-sm font-medium">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="not-tutorial-heading"
        className="border-t border-border py-16"
      >
        <div className="max-w-prose">
          <h2
            id="not-tutorial-heading"
            className="font-serif text-2xl tracking-tight md:text-3xl"
          >
            Not a crank tutorial.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            MagicBlock&apos;s ScheduleTask docs teach you to schedule{" "}
            <em>your own</em> task. Escapement sells the right to that execution
            as a mintable, expiring lease — interval, iteration cap, prepaid
            fee, settle. Same rails underneath; a different object on top.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            Useful today if you already need scheduled ER ticks and would
            rather buy a lease than wire keeper ops yourself. Early
            infrastructure — not a claim of mass demand.
          </p>
        </div>
      </section>
    </div>
  );
}

const steps = [
  {
    title: "Buy an Escapement lease",
    body: "Choose an interval, an iteration cap, and a program target. The prepaid fee is quoted before you sign.",
  },
  {
    title: "Watch ticks fire live",
    body: "A MagicBlock crank executes your template on the ephemeral rollup, gasless, on your cadence — no wallet signatures per tick.",
  },
  {
    title: "Settle fees on Solana",
    body: "A Magic Action commits the fee accounting to Solana L1 with an explorer transaction you can verify.",
  },
];
