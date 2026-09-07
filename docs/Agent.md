# agent.md — Escapement (Live Keeper Exchange)

> Build-ready spec. COS PASS 2026-09-07. Solana Blitz v8 × MagicBlock. Deadline Fri 11 Sep 2026 18:00 SGT (re-confirm; portal risk).
> Cadence stays ETHOnline-only — do not mix. ≠ WATT / SKIFF / KILN. MagicBlock load-bearing.

---

> **Rename law:** Product is **Escapement** (formerly PULSE). Demo: buy an Escapement lease → watch ticks → Magic Action settle. Lease market first; ≠ bare ScheduleTask; ≠ Cadence (ETHOnline). Mechanism freeze unchanged.

## One-Liner

**Escapement** is an onchain market for MagickBlock **crank slots / Escapement leases**: buy a time-bounded right to scheduled ER execution (interval, iterations, program target), watch live gasless ticks, settle fees to Solana via Magic Actions.

Not a crank tutorial. Not WATT metering. Not Apron AMM capacity. Not a game. Edge = leasing scarce automation bandwidth.

**If MagicBlock disappears:** ER + cranks die → no gasless high-freq scheduled execution to lease; L1 fees/latency destroy the market. **Core product dead.** Remove Solana → Magic Action fee settle dies.

---

## Narrative Law (COS QA · uniqueness 78)

**Lease market first. Always.**

1. Pitch order: **Escapement lease (what you buy)** → live ticks (what you get) → Magic Action settle (how you pay). Never reverse.
2. Explicitly **≠ bare ScheduleTask tutorial**: MagickBlock docs teach *you* to schedule *your* task. Escapement sells the **right** to scarce crank capacity as a mintable, expiring, fee-settled lease. Same primitive underneath; different product object.
3. Home, demo open, README H1, and judge Q&A must say “buy an Escapement lease / crank slot,” not “we integrated cranks.”
4. If a slide or README sentence could describe the MagickBlock crank getting-started page, rewrite it until it cannot.

### Soft usefulness (README honesty)
Beachhead usefulness is real but early: builders who already need ScheduleTask this week can buy a lease instead of wiring ops. This is **infra for MagickBlock-era automation**, not a consumer app and not a promise of wide demand yet. Soft claim only — no “everyone needs this” language.

---

## Problem & Target User

### Problem
Every automated MagickBlock app needs cranks, but each team wires its own ScheduleTask. L1 keepers race gas and miss sub-second cadence. There is no marketplace where **crank capacity itself** trades as a lease.

### Target users
- **Buyers:** protocols needing reliable ticks (oracle refresh, SLA clocks, inventory bots, liquidations-lite) without a private keeper fleet.
- **Supply:** MagickBlock crank capacity exposed by Escapement (protocol-owned execution budget in MVP).

### JTBD
"Buy a 1h Escapement lease so my program gets scheduled ER ticks — without wiring ScheduleTask ops myself."

### Invention
Object traded: time-bounded **Escapement lease / crank slot** = right to MagickBlock-execute a declared schedule on an ER. Unused Escapement expires. Fees settle on Solana.

### Explicit ≠ siblings

| | Bare ScheduleTask | WATT | Apron | SKIFF/KILN | **Escapement** |
|---|---|---|---|---|---|
| Object | Your own crank wiring | Usage event metering | Epoch AMM fill capacity | Game ticks | **Tradable Escapement lease / crank slot** |
| Product | Tutorial / SDK feature | Invoice metering | AMM fill tickets | Games | **Market for execution rights** |
| Chain/context | MagickBlock docs | Blitz prior | ETHOnline | Blitz games | **Blitz MagickBlock infra** |

**≠ ScheduleTask (one line):** ScheduleTask = how a lease *executes*. Escapement = the **market** that mints, meters iterations, and settles the right to that execution.


---

## Hackathon & Bounty Fit

**Event:** Solana Blitz v8 × MagicBlock — re-confirm deadline Fri 11 Sep 2026 18:00 SGT.
**Ops risk (FACT):** build.magicblock.app/?stage=blitz may show “No open events to submit to right now.” Re-check before demo day; still build for Forge path (Blitz → Forge → Hacker House). Cash prizes are small ($500/$250/$150/$100) — upside is Forge/Camp, not a fake $10k claim.

**MagickBlock primitives (MVP)**

| Primitive | Role |
|---|---|
| Ephemeral Rollup | High-freq execution venue |
| Cranks | The scarce resource being leased |
| Session keys | Attach without wallet spam |
| Magic Actions | Fee settle on Solana after commit |
| Ephemeral SPL | Stretch: prepaid lease escrow |
| PER / VRF | **OUT of MVP** |

**Disappear test:** Without MagickBlock, product becomes brittle L1 keepers or a centralized cron — core dead.

---

## Market Validation Summary

| Field | Value |
|---|---|
| Venture Readiness | **76/100 · Mixed-leaning-strong** |
| MagickBlock fit | **9/10** |
| Why now | Cranks documented; Blitz/Forge funnel; ER automation wave |
| Biggest risk | “Just crank tutorial” — lead with lease as market object |
| Cheapest test | 5 MagickBlock builders: buy 1h Escapement vs wire ScheduleTask yourself? |
| Honesty | No win guarantee. No fake APY. Portal may be closed. |

Pillars: demand 8 · timing 8 · competition 8 · customer 7 · GTM 7 · execution 7 · unit econ 7.
Idea-pipeline ~7.71. Practicality/feasibility **7**. Axes: T8 O9 P7 U8 W8.

FACT: Cranks = scheduled ER ix execution, gasless per tick. Twin marketplace NOT FOUND (2026-09-07).
INFERENCE: Leasing MagickBlock automation bandwidth is the missing infra market.
HYPOTHESIS: DeFi/DePIN/agent builders buy Escapement leases instead of standing L1 keepers.


---

## MVP vs Stretch — User Stories

### MVP (law)

1. As a provider, I register **one** program template (counter or oracle-refresh stub).
2. As a buyer, I mint a **Escapement lease** (interval, iterations, prepaid fee).
3. As a judge, I see **≥10 live crank fires** on the dashboard.
4. As a buyer, Magic Action settles lease fee to Solana (devnet/fork ok) with explorer / MagickBlock proof link.
5. Demo ≤3 min: buy → ticks → settle; multi-commit git.

### Stretch (only if MVP green by Wed Sep 9)
- Ephemeral SPL prepaid escrow
- Second program template
- Fixed-price book with multiple open leases
- Fail/retry tick metrics

### Forbidden
PER dark desk · secondary CLOB · games · Apron semantics · WATT metering · SKIFF/KILN · fake APY · “just ScheduleTask tutorial” without lease object

---

## Non-Functionals

| NFR | Requirement |
|---|---|
| MagickBlock necessity | Removing ER/cranks must break the product |
| Lease honesty | Unused Escapement expires; lease ≠ unlimited cron |
| Demo clarity | Lead with “buy an Escapement lease,” not “we use cranks” |
| Proof | Explorer or MagickBlock link for settle |
| UI | Near-black, one accent, serif + mono; no purple SaaS |
| Portal | Document re-check of build.magicblock.app submit status |
| Commits | Multi-commit history |
| Deadline | Fri 11 Sep 2026 18:00 SGT (re-confirm) |

---

## Architecture and Stack

```
Buyer UI
  mint Escapement lease (interval, iterations, fee)
        |
        v
MagickBlock Ephemeral Rollup
  lease account + ScheduleTask / crank fires program template
        |
  live tick counter (≥10)
        |
  Magic Action / commit
        v
Solana L1 fee settle + explorer proof
```

### Stack

| Layer | Choice |
|---|---|
| App | Vite or Next + React + Tailwind |
| Wallet | Solana wallet adapter + session keys |
| MagickBlock | ER + crank/ScheduleTask per docs + Magic Actions |
| Template | Counter ix or oracle-refresh stub program |
| Host | Vercel for UI |


### MagickBlock mapping (load-bearing)

| Concern | MagickBlock | Why load-bearing |
|---|---|---|
| Lease execution venue | Ephemeral Rollup | Sub-second gasless ticks; L1 cannot host the market |
| Scarce resource | Cranks | The object being leased |
| Buyer attach | Session keys | No wallet spam per tick |
| Fee settle | Magic Actions | Portable USDC/fee on Solana after commit |
| Escrow (stretch) | Ephemeral SPL | Prepaid lease balance |

**Disappear test (explicit):** If MagickBlock (ER + cranks + Magic Actions) is removed, Escapement has nothing to sell. A centralized cron or L1 bot farm is a different product with different economics. Do not ship a fallback that softens this.

---

## Data Model

### Accounts (conceptual)

**EscapementProgram**
- `authority: Pubkey`
- `program_id: Pubkey`
- `ix_discriminator: [u8; 8]`
- `default_accounts_hash: [u8; 32]`
- `status: Active | Paused`

**EscapementLease**
- `buyer: Pubkey`
- `program: Pubkey` (EscapementProgram)
- `interval_ms: u32`
- `iterations: u32`
- `iterations_done: u32`
- `fee_prepaid: u64`
- `fee_settled: u64`
- `status: Active | Exhausted | Expired | Settling
- `created_at / expires_at: i64`
- `er_session / crank_handle: bytes` (opaque MagickBlock refs)

**TickReceipt** (ER or indexed)
- `lease: Pubkey`
- `seq: u32`
- `success: bool`
- `slot_or_er_ts: u64`
- `error_code: u16` (optional)

**FeeSettleReceipt** (Solana after Magic Action)
- `lease: Pubkey`
- `amount: u64`
- `tx_sig: string`
- `committed_at: i64`

### Pricing (MVP)
Fixed prepaid fee = `base + iterations * per_tick` (constants in config). No secondary market. No CLOB.


---

## API / Program Spec

### Instructions (MVP)

1. **`register_program`**
   - Args: `ix_discriminator`, account meta template
   - Creates EscapementProgram PDA
   - Auth: provider wallet

2. **`mint_lease`**
   - Args: `program`, `interval_ms`, `iterations`, prepaid fee
   - Creates EscapementLease; schedules MagickBlock crank/ScheduleTask for that lease
   - Fail if program not Active or fee underpaid

3. **`crank_tick`** (invoked by MagickBlock crank, not user wallet)
   - Loads lease; if Active and iterations_done < iterations: CPI template ix; bump counter; emit TickReceipt
   - If exhausted: mark Exhausted, stop schedule

4. **`settle_fees`** (Magic Action path)
   - Commit lease fee accounting to Solana; emit FeeSettleReceipt; undelegate/cleanup as needed

5. **`expire_lease`**
   - If past expires_at or buyer cancels: stop crank; settle unused portion per policy (MVP: no refund for simplicity — document)

### Events
- `LeaseMinted { lease, buyer, interval_ms, iterations, fee }`
- `TickFired { lease, seq, success }`
- `LeaseSettled { lease, amount, tx_sig }`

### Invariants
- Tick only fires if lease Active and under iteration cap
- Fee settle amount ≤ fee_prepaid
- No lease without a registered program
- Crank path must not require buyer signature per tick (session/key MagickBlock)

---

## UX Flow

### Narrative law
Lead with **“Buy an Escapement lease”** — the market object. Never open with “we integrated MagickBlock cranks” or “ScheduleTask demo.”
Judges must hear: **lease (market)** → ticks (delivery) → settle (money).
Forbidden opening lines: “Here’s how MagickBlock cranks work,” “We followed the crank tutorial,” “ScheduleTask in three steps.”
Required closing line: “You bought execution rights — not a tutorial.”

### Screens (MVP)

1. **Home** — One sentence: “Lease MagickBlock crank bandwidth.” CTA: Buy Escapement lease.
2. **Mint** — Interval (e.g. 500ms), iterations (e.g. 20), fee preview, program = demo counter. Confirm.
3. **Live lease** — Big tick counter, last 10 fires, countdown / remaining iterations, status pill.
4. **Settle** — Button or auto: Magic Action settle; show Solana explorer + MagickBlock proof link.
5. **Footer** — Portal re-check note if submit closed; Forge path honesty.

### Demo script (≤3 min)
1. Connect wallet (30s)
2. Mint lease 500ms × 20 (30s)
3. Watch ≥10 ticks fire live (60–90s)
4. Settle fees; open explorer link (30s)
5. One line: “You bought execution rights, not a tutorial.” (10s)


---

## Success Metrics

| Metric | Target by deadline |
|---|---|
| Live ticks in one lease | ≥10 successful |
| Demo length | ≤3 min buy → ticks → settle |
| MagickBlock proof | Visible link |
| Multi-commit git | ≥5 meaningful commits |
| Portal status | Documented re-check timestamp |
| Judge understanding | Lease framed as market object (not tutorial) |

Post-Blitz (Forge path): 5 builders asked; ≥2 say they would buy a lease for their demo program.

---

## Launch & First-Customer Plan

1. Ship MVP on MagickBlock ER + Solana (devnet ok).
2. Re-check build.magicblock.app submit; if closed, document + pursue Forge/Discord path.
3. First 10 users: Blitz Telegram builders needing ticks; MagickBlock Discord; one DePIN/oracle demo; Forge quest participant.
4. Pitch: infra startup — automation bandwidth exchange for MagickBlock era.
5. Do not claim Blitz $10k or fake APY.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| “Just crank tutorial” | Critical | Narrative law; lease UI first; tick burn-down |
| Submit portal closed | High | Re-check; build for Forge; document |
| ScheduleTask + lease too tight for deadline | High | One template only; freeze held |
| Confused with WATT | Medium | Explicit ≠ metering; execution rights |
| Confused with Apron | Medium | Different chain/object; never mention AMM tickets |
| Fee settle flaky | Medium | Devnet/fork ok; show proof link anyway |
| Deadline slip | High | Wed checkpoint: ticks live or cut stretch |

Biggest risk (COS): judges hear tutorial — **lead with lease as market object.**


---

## Build Roadmap (time-scoped)

**Deadline:** Fri 11 Sep 2026 18:00 SGT (re-confirm).

| Window | Ship |
|---|---|
| Day 0 (now) | Repo + EscapementProgram register + counter stub |
| Day 1 | mint_lease + ScheduleTask/crank wiring |
| Day 2 | Live tick UI (≥10) + status |
| Day 3 | Magic Action settle + explorer link |
| Day 4 | Polish demo script, multi-commit cleanup, portal re-check note |
| Stretch only if Day 2 green | Ephemeral SPL escrow / second template |

Kill switch: if ticks not live by Wed Sep 9 EOD SGT → cut all stretch; if settle broken, show ER tick proof + manual settle stub with honesty label.

---

## Build Instructions for Codegen

Imperative. Near-black UI (#0a0a0a), one accent (electric lime `#B8FF3C` or cyan `#22D3EE` — pick one), serif headlines + mono numbers. No purple SaaS chrome. No gradients wallpaper.

### Repo layout
```
apps/web/          # Vite React UI
programs/Escapement/    # Anchor or MagickBlock-compatible program
programs/template/ # Counter or oracle-refresh stub
docs/DEMO.md       # ≤3 min script
docs/PORTAL.md     # submit portal re-check log
```

### Must implement
1. Register one EscapementProgram (counter: bump u64 each tick).
2. mint_lease(interval_ms, iterations, fee) creates lease + schedules crank.
3. Crank fires template ix gaslessly; UI polls or websockets tick count.
4. After ≥10 ticks, settle_fees via Magic Action; show Solana tx + MagickBlock proof.
5. Copy everywhere: “Escapement lease = MagickBlock crank bandwidth.” Never “we used cranks” / “ScheduleTask tutorial.” README must include soft usefulness + ≠ ScheduleTask.
6. Multi-commit: scaffold → register → mint → ticks → settle → polish.

### Must NOT implement
- PER, VRF, secondary CLOB, games, Apron/SEAT language, WATT metering invoices, SKIFF/KILN.
- Fake APY, social features, multi-program marketplace routing.

### README.md (required sections — ship verbatim intent)

1. **H1 / one-liner:** Escapement = Live Keeper Exchange — market for MagickBlock Escapement leases (crank slots). Lead with the lease.
2. **≠ bare ScheduleTask:** One short paragraph: MagickBlock ScheduleTask schedules *your* task; Escapement **sells the right** as a lease (interval, iterations, prepaid fee, settle). Same rails; different object.
3. **Soft usefulness note (honesty):**
   > Useful today for MagickBlock builders who already need scheduled ER ticks and would rather buy an Escapement lease than wire ScheduleTask ops themselves. Early infra beachhead — not a claim of mass consumer demand.
4. **MagickBlock disappear test:**
   > Without MagickBlock Ephemeral Rollups and cranks, Escapement has no scarce execution resource to lease. The product does not degrade to L1 keepers; it ceases to exist as designed.
5. **Portal:** Link + last re-check timestamp for build.magicblock.app submit status.
6. **≠ siblings:** One line each vs WATT (metering), Apron (ETH capacity), games.

### Acceptance
Demo: buy → ≥10 ticks → settle ≤3 min. README has lease-first narrative, ≠ ScheduleTask, soft usefulness, disappear test, portal note. Pitch ≠ WATT/Apron.

