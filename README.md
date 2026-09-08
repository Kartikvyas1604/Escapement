<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/logo-lockup.svg" />
  <img src="apps/web/public/logo-lockup-light.svg" alt="Escapement — Live Keeper Exchange" width="420" />
</picture>

### The onchain market for MagicBlock crank slots

**Buy a lease. Watch real ticks fire. Settle fees on Solana.**

[![CI](../actions/workflows/ci.yml/badge.svg?branch=main)](../../actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-22D3EE.svg)](LICENSE)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF.svg)](#live-on-devnet)
[![Anchor](https://img.shields.io/badge/Anchor-1.1-E4470B.svg)](#the-escapement-program)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000.svg)](#the-platform)
[![Tests](https://img.shields.io/badge/tests-14%20passing-22C55E.svg)](#quality)

</div>

---

## What is Escapement?

Every automated MagicBlock application needs cranks — scheduled execution on
Ephemeral Rollups. Today, every team wires its own. Sub-second cadence on
Solana L1 means racing gas with a private keeper fleet.

**Escapement turns that execution capacity into a market.**

An **Escapement lease** is a time-bounded right to scheduled execution: you pick
a tick cadence and an iteration cap, the prepaid fee is escrowed on-chain, and
you watch real crank transactions fire on your schedule — no wallet signature
per tick. When the lease ends, fees settle to Solana with a transaction anyone
can verify on an explorer.

The lease itself is a **real program-derived account on devnet**. The escrow is
**real lamports in a vault**. The settlement receipt is a **real transaction
signature**. Nothing in this repository is a simulation.

> **You bought execution rights — not a tutorial.**

---

## How a lease works

| Step | What happens | Where it lives |
|:---:|---|---|
| **1 · Mint** | You choose a cadence (e.g. 500 ms) and an iteration cap (e.g. 20). The fee is quoted from the on-chain market config, then escrowed in the market vault. A lease PDA is created. | Escapement program |
| **2 · Tick** | The protocol crank fires `crank_tick` on your cadence — gasless for you, no prompts, no signatures. Each tick CPIs into the registered program template and bumps your counter on-chain. | Next.js crank backend + template program |
| **3 · Settle** | The executed share of the prepaid fee is derived on-chain — never more than you prepaid — and paid out with an explorer-verifiable transaction. | Escapement program |
| **4 · Expire** | Unused iterations expire. A lease is not an unlimited cron; that honesty is the product. | Escapement program |

```
                    ┌─────────────────────────────┐
                    │         Buyer UI            │
                    │  mint · watch · settle      │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
              ┌────────────────────────────────────────┐
              │      Escapement program (Solana)       │
              │  lease PDA · vault escrow · settle     │
              └──────────────┬─────────────────────────┘
                             │  crank_tick (CPI)
                             ▼
              ┌────────────────────────────────────────┐
              │   Counter template program             │
              │   on-chain tick counter + events       │
              └──────────────┬─────────────────────────┘
                             │  protocol crank (cadence)
                             ▼
              ┌────────────────────────────────────────┐
              │   /api/crank · Next.js route handler   │
              │   market-authority signing, cooldowns  │
              └────────────────────────────────────────┘
```

---

## The Escapement program

One program owns the whole market. One instruction per state change, events on
every transition, and a fee schedule that lives on-chain — the UI reads it,
it never hardcodes it.

| Instruction | Who can call it | What it does |
|---|---|---|
| `initialize_market` | once | Creates the market PDA: authority + fee schedule |
| `set_market_config` | authority | Retunes base / per-tick fees |
| `register_program` | provider | Registers a program template for cranking |
| `set_program_status` | provider | Pauses or resumes a template |
| `mint_lease` | buyer | Creates the lease PDA, escrows the prepaid fee |
| `crank_tick` | buyer or crank | Fires one tick; enforces cap + expiry |
| `settle_fees` | anyone | Pays the executed share from escrow — honestly, permissionlessly |
| `expire_lease` | anyone / buyer | Sweeps unused escrow per the no-refund policy |

**Security posture.** The vault pays out only through PDA-signed CPIs. Strangers
cannot burn your purchased iterations — the crank is gated. Settlement math is
derived on-chain, so no operator can overcharge. Keypairs are gitignored and
injected via environment only.

---

## Live on devnet

| Object | Address |
|---|---|
| Escapement program | `KKAQbHv1YAHo3wAAVETEQGaPBix5tRHWdXcb4G28V6z` |
| Counter template program | `E52t2PvfqcE71MGafrLPJBgXN74WdRmkzUk9aBLLLHfi` |
| Market PDA | `DFJtf3GFutZJwCQYyEmSBy8XmDegSu94YErJJo9jbvvk` |
| Fee vault PDA | `DoskBGdxQRW57zhv5oF19BXtY2b7NzeBGsAjK9HEaLqf` |

Every address above is a real account — open it on Solana Explorer. The full
lifecycle has been proven end-to-end on devnet: mint → live ticks → settle.

---

## The platform

| Layer | Choice |
|---|---|
| App | Next.js 16 · React 19 · Tailwind CSS 4 |
| Backend | Next.js route handlers (the crank is the backend) |
| Programs | Anchor 1.1 · tested with LiteSVM |
| Client SDK | Shared package: PDAs, instruction builders, borsh codecs |
| Wallets | Phantom · Solflare · Backpack (injected providers) |
| Design | Near-black, one cyan accent, serif headlines, mono numbers |

A monorepo keeps the on-chain truth and the interface that reads it in one
place: `apps/web` (UI + crank backend), `packages/escapement-client` (the typed
bridge between them), and the two Anchor programs.

---

## Why this is honest

**Lease market first.** ScheduleTask is *how* a lease executes. Escapement is
the *market* that mints, meters, and settles the right to that execution. Same
rails underneath — a different product object on top.

**Soft usefulness.** Useful today for MagicBlock builders who already need
scheduled ER ticks and would rather buy a lease than wire keeper operations
themselves. Early infrastructure beachhead — not a claim of mass consumer
demand.

**The MagicBlock disappear test.** Without MagicBlock Ephemeral Rollups and
cranks, Escapement has no scarce execution resource to lease. The product does
not degrade to L1 keepers — it ceases to exist as designed.

**Not its siblings.** Not WATT (usage-event metering). Not Apron (epoch AMM
fill capacity). Not SKIFF or KILN (game ticks). Not Cadence (an ETHOnline
sibling). Escapement trades execution *rights*.

---

## Project map

```
.
├── apps/web                   # Next.js app — UI + /api/crank backend
├── packages/escapement-client # PDA helpers · ix builders · codecs · pricing
├── programs/escapement        # Anchor market program (8 instructions)
├── programs/template          # Anchor counter template program
├── scripts                    # deploy · on-chain setup · end-to-end proof
├── docs                       # DEMO · PORTAL · DEPLOY guides
└── .github/workflows          # CI: lint, types, tests, build, anchor
```

Deep dives:

- **[docs/DEMO.md](docs/DEMO.md)** — the three-minute walkthrough, judged beat by beat
- **[docs/PORTAL.md](docs/PORTAL.md)** — submission portal status log
- **[docs/DEPLOY.md](docs/DEPLOY.md)** — hosting the app and upgrading programs
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — how to help build the market
- **[CHANGELOG.md](CHANGELOG.md)** — what shipped, and when

---

## Quality

Every layer is tested where it can fail:

- **On-chain** — a LiteSVM suite drives the full lifecycle: mint, tick to
  exhaustion, permissionless settle, partial-settle math, cap enforcement, and
  stranger rejection.
- **Client** — instruction discriminators, PDA determinism, and borsh account
  round-trips under vitest.
- **Continuous** — GitHub Actions runs lint, typecheck, tests, a production
  build, and the Anchor suite on every push.

---

## Roadmap

| Now | Next | Later |
|---|---|---|
| Devnet market, live and proven | MagicBlock ER + ScheduleTask as the tick venue | Second program template |
| Single fixed-price fee schedule | Ephemeral SPL prepaid escrow | A market for lease resale |
| Buyer-crank + protocol crank | Fail / retry tick metrics | Operator dashboard |

Frozen by design: PER, VRF, secondary order books, games, and fake APY. The
mechanism is the product.

---

## Support

Found a bug or have an idea for the market?
[Open an issue](../../issues) — lease-first proposals welcome, tutorial
re-writes are not.

---

<div align="center">

**Escapement** · the live keeper exchange

Built for Solana Blitz × MagicBlock · Released under the [MIT License](LICENSE)

</div>
