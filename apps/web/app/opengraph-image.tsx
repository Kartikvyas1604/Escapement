import { ImageResponse } from "next/og";

export const alt = "Escapement — the live keeper exchange";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0A0A",
          padding: 72,
          color: "#EDEDED",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: "#22D3EE",
            }}
          />
          <div style={{ fontSize: 28, letterSpacing: 8, color: "#A1A1AA" }}>
            ESCAPEMENT
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 88, lineHeight: 1.05 }}>
            The onchain market for crank slots.
          </div>
          <div style={{ fontSize: 36, color: "#A1A1AA", marginTop: 24 }}>
            Buy a lease · watch ticks fire live · settle fees on Solana
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 24,
            fontSize: 26,
            color: "#22D3EE",
          }}
        >
          <div>Time-bounded leases</div>
          <div>Gasless scheduled execution</div>
        </div>
      </div>
    ),
    size
  );
}
