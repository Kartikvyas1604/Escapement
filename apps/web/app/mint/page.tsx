import type { Metadata } from "next";
import { MintForm } from "@/components/mint-form";

export const metadata: Metadata = {
  title: "Buy an Escapement lease — Escapement",
  description:
    "Mint a lease: pick tick cadence, iteration cap, and see the prepaid fee before you sign.",
};

export default function MintPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
      <header className="mb-10 max-w-prose">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Step 1 · Mint
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">
          Buy an Escapement lease
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          A lease is a time-bounded right to scheduled execution on the
          ephemeral rollup. You set the cadence and the cap; the crank does the
          rest.
        </p>
      </header>
      <MintForm />
    </div>
  );
}
