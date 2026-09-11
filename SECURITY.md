# Security notes

## Disclosure

Found a bug? Open a [GitHub issue](../../issues) with steps and impact. This
is a devnet-stage project — no bug bounty yet, but every report is read.
Please do not open unencrypted issues with working exploits against funded
keypairs; email the maintainer first in that case.

## Current posture

- **No mainnet deployment.** Devnet only, devnet-only lamports at risk.
- Vault funds move only via PDA-signed CPIs (vault seed, program authority).
- `crank_tick` is gated on-chain: buyer or market authority only.
- Settlement math is derived on-chain from prepaid escrow — no operator can
  overcharge or settle more than the buyer prepaid.
- The `/api/crank` route signs as the protocol crank. It is same-origin
  restricted and per-IP rate-limited. A malicious client can still spend
  *its own* lease's prepaid iterations via a buyer-signed crank — that is
  the product (permissionless cranking of your own lease).
- Keypairs are gitignored (`*.json` allowlist) and reach the server only via
  environment. No private key ever reaches the browser.
- Client decoders are strict: malformed accounts throw instead of decoding
  into plausible-but-wrong state.

## Known accepted risks (devnet MVP)

1. **Transitive npm advisories** (4 × moderate) via `@solana/web3.js` 1.x —
   `uuid` <11.1.1, `stream-json` ≤3.4.0. No non-breaking fix exists; CI
   fails on high+ only. If a high appears, this gate blocks the build.
2. **Single-authority market.** The authority can retune fees and receives
   settled fees. Acceptable for devnet; a value-bearing deployment must move
   the authority behind a multisig (Squads) before mainnet.
3. **No third-party audit.** The program is small (8 instructions) and
   LiteSVM-tested, but an external review is required before any real value
   flows.
4. **`CRANK_KEYPAIR` compromise** lets an attacker crank any lease (burning
   prepaid iterations faster than cadence is prevented by per-lease cooldown;
   buyer-owned cranks are unaffected). Rotation: generate a new keypair,
   update the `CRANK_KEYPAIR`/`CRANK_KEYPAIR_PATH` env var, redeploy, and
   destroy the old keypair.
5. **Explorer links** point at explorer.solana.com only; no other explorer
   is configurable.

## Before mainnet (gate list)

- [ ] Third-party audit of both programs
- [ ] Market authority behind a multisig
- [ ] Real fee accounting soak on testnet with realistic usage
- [ ] On-chain anomaly monitoring (settle volume spikes, vault balance)
- [ ] Key management moved off env vars (KMS/Vercel encrypted secrets at minimum)
