"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-4 px-4 py-24 md:px-6 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Escapement fault
      </p>
      <h1 className="font-serif text-4xl tracking-tight md:text-5xl">
        The escapement slipped.
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
        Something went wrong while rendering. Your lease state lives on-chain
        and in local storage — retrying is safe.
      </p>
      {error.digest && (
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          digest {error.digest}
        </p>
      )}
      <Button className="min-h-12" onClick={retry}>
        Retry
      </Button>
    </div>
  );
}
