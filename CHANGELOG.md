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

## 0.3.0 — production hardening (2026-09-10)

### Fixed
- **Partial settle no longer strands escrow.** `settle_fees` is incremental:
  it pays only the newly earned share and a partially executed lease keeps
  its live status, so the unexecuted remainder settles on later ticks or
  sweeps on expiry instead of being locked forever.
- `mint_lease` enforces interval (100–2000 ms) and iteration (1–100) bounds
  on-chain — a lease cannot be minted as an unlimited cron.
- The client codec is strict: truncated, oversized, unknown-status, and
  over-precision accounts now throw instead of decoding into plausible state.
- `/api/crank` hardening: same-origin enforcement, per-IP rate limiting,
  bounded cooldown map (the dead ownership check is gone; the program still
  enforces buyer-or-authority).
- Web engine matches on-chain settle semantics: partial settles keep the
  lease ticking; settle amounts are read back from the chain.
- Honest error surfaces: cooldown 429s are pacing, not alerts; the error
  banner retries the action that failed; buyer-signed crank failures are
  caught instead of unhandled.

### Added
- Security headers (CSP, HSTS, frame-ancestors), generated OG image,
  canonical alternates, single site-URL source, robots disallows `/api`.
- Skip link, menu keyboard navigation, wallet connect timeout, copy
  feedback, progressbar label — a11y pass.
- localStorage payload validation, cross-tab reconciliation, wallet-account
  change handling, background-tab crank pausing.
- `docs/RUNBOOK.md` (rollback, upgrades, key rotation, incident response),
  `SECURITY.md` (disclosure, accepted risks, mainnet gates),
  `docs/PORTAL.md` re-check log.
- CI: concurrency cancellation, `npm audit --audit-level=high` gate,
  Dependabot (npm + actions), `npm ci` on Vercel.

### Tests
- LiteSVM: 5 → 8 (bounds, partial-settle, expiry sweep).
- Client: 9 → 21 (reference discriminators, PDA cross-checks, codec edges).
