import type { Metadata } from "next";
import { LeaseView } from "@/components/lease-view";

export const metadata: Metadata = {
  title: "Live lease",
  alternates: { canonical: "/lease" },
  description:
    "Watch your Escapement lease fire ticks live on the MagicBlock ephemeral rollup, then settle fees to Solana.",
};

export default function LeasePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
      <header className="mb-10 max-w-prose">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Step 2 · Live execution
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">
          Your lease, running
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          The crank executes your template on the ephemeral rollup at the
          cadence you bought. When you have enough ticks, settle the fee on
          Solana.
        </p>
      </header>
      <LeaseView />
    </div>
  );
}
