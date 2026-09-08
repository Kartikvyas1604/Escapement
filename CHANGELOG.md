# Changelog

## 0.2.0 — production build (2026-09-08)

### Added
- Anchor workspace with two on-chain programs, deployed to devnet:
  - **Escapement** (`KKAQbHv1YAHo3wAAVETEQGaPBix5tRHWdXcb4G28V6z`):
    `initialize_market`, `set_market_config`, `register_program`,
    `set_program_status`, `mint_lease`, `crank_tick`, `settle_fees`,
    `expire_lease`; fee escrow in a vault PDA; events for every state change.
  - **Counter template** (`E52t2PvfqcE71MGafrLPJBgXN74WdRmkzUk9aBLLLHfi`):
    per-lease counter bumped by the crank via CPI.
- LiteSVM lifecycle test suite (mint → crank → settle, caps, strangers,
  partial settle math).
- On-chain end-to-end proof on devnet (`scripts/e2e-devnet.mjs`).
- Monorepo: `apps/web` (Next.js) + `packages/escapement-client`.
- Protocol crank backend as a Next route handler (`POST /api/crank`) with
  per-lease cadence cooldown; buyer-signed fallback.
- Real wallet connection (Phantom / Solflare / Backpack), injected-provider
  detection, session restore.
- Error boundaries, branded 404, lease state recovery from the chain.
- SEO metadata, robots, sitemap; CI pipeline (lint/typecheck/test/build +
  anchor build/test).

### Changed
- Fee schedule now read from the on-chain market account.
- Lease IDs are real lease PDAs; settle receipts are real devnet signatures.

### Removed
- All mock wallets, random failure injection, fabricated transaction
  signatures, and hardcoded devnet links from the demo-era frontend.
