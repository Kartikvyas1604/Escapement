"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          backgroundColor: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "ui-monospace, monospace",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", display: "grid", gap: 12 }}>
          <p style={{ fontSize: 12, letterSpacing: "0.2em", opacity: 0.6 }}>
            ESCAPEMENT — CRITICAL FAULT
          </p>
          <button
            onClick={retry}
            style={{
              minHeight: 48,
              padding: "0 24px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
