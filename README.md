# Escapement — Live Keeper Exchange

**Escapement is an onchain market for MagicBlock crank slots.** You buy an **Escapement lease**: a time-bounded right to scheduled execution on a MagicBlock Ephemeral Rollup — pick a tick cadence and an iteration cap, watch ticks fire live and gaslessly, then settle the prepaid fee to Solana with a Magic Action.

## ≠ bare ScheduleTask

MagicBlock's ScheduleTask docs teach *you* to schedule *your own* task. Escapement **sells the right** to that execution as a mintable, expiring, fee-settled lease (interval, iterations, prepaid fee, settle). Same rails underneath; a different product object on top. ScheduleTask is how a lease *executes* — Escapement is the *market* that mints, meters, and settles the right to that execution.

## Soft usefulness (honesty)

> Useful today for MagickBlock builders who already need scheduled ER ticks and would rather buy an Escapement lease than wire ScheduleTask ops themselves. Early infra beachhead — not a claim of mass consumer demand.

## MagickBlock disappear test

> Without MagickBlock Ephemeral Rollups and cranks, Escapement has no scarce execution resource to lease. The product does not degrade to L1 keepers; it ceases to exist as designed.

## Portal status

- Submit portal: https://build.magicblock.app/?stage=blitz
- Last re-check: **2026-09-07 18:00 SGT**
- If the portal shows "No open events to submit to right now", this build follows the Forge path (Blitz → Forge → Hacker House). Cash prizes are small; the upside is the Forge funnel.

## ≠ siblings

- **WATT** — usage-event metering/invoicing. Escapement trades execution *rights*, not metered invoices.
- **Apron** — epoch AMM fill capacity on ETHOnline. Escapement is crank bandwidth on MagicBlock ERs; no AMM tickets.
- **SKIFF / KILN** — game ticks. Escapement is infrastructure leasing, not a game.
- **Cadence** — ETHOnline-only sibling. Escapement is Blitz × MagicBlock.

## Demo (≤3 min)

1. Connect wallet (30s)
2. Mint lease: 500ms × 20 iterations, fee previewed before signing (30s)
3. Watch ≥10 ticks fire live (60–90s)
4. Settle fees via Magic Action; open the devnet explorer proof (30s)
5. *"You bought execution rights — not a tutorial."* (10s)

## Architecture

```
Buyer UI (this app, Next.js)
  mint Escapement lease (interval, iterations, fee)
        |
        v
MagicBlock Ephemeral Rollup
  lease account + counter-template crank
        |
  live tick counter (>=10) + TickReceipts
        |
  Magic Action / commit
        v
Solana L1 fee settle + explorer proof
```

### Current status

Wallet connection and all signed transactions are real: the app connects to injected Solana wallets (Phantom, Solflare, Backpack), and both `mintLease` and `settleFees` broadcast memo transactions to Solana devnet through the connected wallet (`lib/escapement/engine.ts`). The lease id and settle receipt signature are real devnet transaction signatures — verifiable on Solana Explorer. The tick loop still runs client-side (`lib/escapement/crank-runner.tsx`); swapping in the real MagicBlock ER crank means replacing `fireTick` — the UI, states, and flows stay unchanged.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 + React 19 + Tailwind v4 |
| Fonts | Instrument Serif (display) · Geist Sans (UI) · Geist Mono (numbers) |
| Palette | Near-black `#0A0A0A`, single cyan accent `#22D3EE` (see `brand.md`) |
| MagicBlock | ER + cranks + Magic Actions (engine seam ready) |
| Host | Vercel |

## Non-goals (frozen)

PER, VRF, secondary CLOB, games, Apron/SEAT language, WATT-style metering invoices, SKIFF/KILN, fake APY, multi-program marketplace routing.
