import { describe, expect, it } from "vitest";
import { quoteLeaseLamports, formatLamports } from "../src/pricing.js";
import { formatInterval, formatClock, truncateAddress } from "../src/format.js";

describe("pricing", () => {
  it("quotes base + iterations * per-tick", () => {
    expect(quoteLeaseLamports(20)).toBe(5000 + 20 * 10000);
    expect(quoteLeaseLamports(1)).toBe(15000);
    expect(quoteLeaseLamports(0)).toBe(5000);
  });

  it("formats lamports to SOL", () => {
    expect(formatLamports(205_000)).toBe("0.0002");
    expect(formatLamports(1_000_000_000, 2)).toBe("1.00");
    expect(formatLamports(0)).toBe("0.0000");
  });
});

describe("format", () => {
  it("formats cadence intervals", () => {
    expect(formatInterval(500)).toBe("500ms");
    expect(formatInterval(1000)).toBe("1s");
    expect(formatInterval(1500)).toBe("1.5s");
  });

  it("formats countdown clocks", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(59_000)).toBe("0:59");
    expect(formatClock(61_000)).toBe("1:01");
    expect(formatClock(-5_000)).toBe("0:00");
  });

  it("truncates addresses from both ends", () => {
    const addr = "KKAQbHv1YAHo3wAAVETEQGaPBix5tRHWdXcb4G28V6z";
    expect(truncateAddress(addr)).toBe("KKAQ...8V6z");
    expect(truncateAddress(addr, 8)).toBe("KKAQbHv1...b4G28V6z");
    expect(truncateAddress("short")).toBe("short");
  });
});
