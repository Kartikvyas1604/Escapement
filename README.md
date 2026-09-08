# Escapement — Live Keeper Exchange

**Escapement is an onchain market for MagicBlock crank slots.** You buy an **Escapement lease**: a time-bounded right to scheduled execution on a MagicBlock Ephemeral Rollup — pick a tick cadence and an iteration cap, watch real crank transactions fire live, then settle the prepaid fee to Solana. Lease PDA, escrowed fees, and settlement receipts are all real devnet accounts you can verify on Solana Explorer.

## Live deployment (devnet)

| Object | Address |
|---|---|
| Escapement program | `KKAQbHv1YAHo3wAAVETEQGaPBix5tRHWdXcb4G28V6z` |
| Counter template program | `E52t2PvfqcE71MGafrLPJBgXN74WdRmkzUk9aBLLLHfi` |
| Market PDA | `DFJtf3GFutZJwCQYyEmSBy8XmDegSu94YErJJo9jbvvk` |
| Fee vault PDA | `DoskBGdxQRW57zhv5oF19BXtY2b7NzeBGsAjK9HEaLqf` |

Full lease lifecycle proven end-to-end on devnet: mint → 4 real ticks → settle (`scripts/e2e-devnet.mjs`).

## ≠ bare ScheduleTask

MagicBlock's ScheduleTask docs teach *you* to schedule *your own* task. Escapement **sells the right** to that execution as a mintable, expiring, fee-settled lease (interval, iterations, prepaid fee, settle). Same rails underneath; a different product object on top. ScheduleTask is how a lease *executes* — Escapement is the *market* that mints, meters, and settles the right to that execution.

## Soft usefulness (honesty)

> Useful today for MagicBlock builders who already need scheduled ER ticks and would rather buy an Escapement lease than wire ScheduleTask ops themselves. Early infra beachhead — not a claim of mass consumer demand.

## MagicBlock disappear test

> Without MagicBlock Ephemeral Rollups and cranks, Escapement has no scarce execution resource to lease. The product does not degrade to L1 keepers; it ceases to exist as designed.

## Portal status

- Submit portal: https://build.magicblock.app/?stage=blitz
- Status log: [`docs/PORTAL.md`](docs/PORTAL.md) (re-check Fri 11 Sep 2026 18:00 SGT)
- If the portal shows "No open events to submit to right now", this build follows the Forge path (Blitz → Forge → Hacker House).

## ≠ siblings

- **WATT** — usage-event metering/invoicing. Escapement trades execution *rights*, not metered invoices.
- **Apron** — epoch AMM fill capacity on ETHOnline. Escapement is crank bandwidth on MagicBlock ERs; no AMM tickets.
- **SKIFF / KILN** — game ticks. Escapement is infrastructure leasing, not a game.
- **Cadence** — ETHOnline-only sibling. Escapement is Blitz × MagicBlock.

## Architecture

```
Buyer UI (apps/web, Next.js)
  mint_lease → lease PDA + fee escrowed in vault PDA
        |
        v
Protocol crank (Next route handler /api/crank)
  real crank_tick txs on the purchased cadence
  CPI into the counter template program
        |
  on-chain tick counter + TickFired events
        |
  settle_fees (permissionless, buyer-signed)
        v
Solana L1: vault payout + explorer proof
```

### What is real today

- **Wallet**: injected Solana wallets (Phantom, Solflare, Backpack) via their providers.
- **Mint**: `mint_lease` creates the lease PDA through the Escapement program and escrows the prepaid fee (`base + iterations × per_tick`, read from the on-chain market account).
- **Ticks**: `crank_tick` transactions submitted by the protocol crank backend (Next route handler, market-authority keypair) with a buyer-signed fallback. Every tick CPIs into the counter template program and bumps the lease counter on-chain.
- **Settle**: `settle_fees` pays the proportional share of escrow to the market authority; the receipt is a real devnet transaction.
- **Expiry**: `expire_lease` sweeps unused escrow per the MVP no-refund policy. A lease is not an unlimited cron.

## Repo layout

```
apps/web/                  # Next.js 16 app: UI + /api/crank backend
packages/escapement-client # PDA helpers, ix builders, account codecs, pricing
programs/escapement/       # Anchor market program (8 instructions, events)
programs/template/         # Anchor counter template program
scripts/                   # deploy, on-chain setup, e2e proof
docs/                      # DEMO.md (≤3 min script), PORTAL.md (submit log)
```

## Development

```bash
npm install                 # workspaces: apps/web + packages/escapement-client
cp .env.example apps/web/.env.local
npm run dev                 # http://localhost:3000
npm run typecheck && npm run lint && npm test

anchor build                # build both programs
anchor test                 # LiteSVM lifecycle suite
bash scripts/deploy-devnet.sh   # deploy + initialize market (funded wallet)
node scripts/e2e-devnet.mjs     # on-chain end-to-end proof
```

Program integration notes: the crank interval itself is enforced by the scheduler (MagicBlock ScheduleTask on the ER in production; the protocol crank here) — the chain enforces the iteration cap, expiry window, and fee accounting. `crank_tick` is gated to the buyer (wallet or session key) or the protocol crank so strangers cannot burn purchased iterations.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 + React 19 + Tailwind v4 (monorepo) |
| Backend | Next route handlers (`/api/crank`) |
| Programs | Anchor 1.1 (Escapement market + counter template), LiteSVM tests |
| Client | `escapement-client` (PDAs, ix builders, borsh codecs) + `@solana/web3.js` |
| Fonts | Instrument Serif (display) · Geist Sans (UI) · Geist Mono (numbers) |
| Palette | Near-black `#0A0A0A`, single cyan accent `#22D3EE` (see `brand.md`) |
| Host | Vercel |

## Non-goals (frozen)

PER, VRF, secondary CLOB, games, Apron/SEAT language, WATT-style metering invoices, SKIFF/KILN, fake APY, multi-program marketplace routing.
