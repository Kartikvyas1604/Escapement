# Runbook — Escapement

What to do when it breaks at 3am. The chain is the database; everything else
is stateless and redeployable.

## Topology

| Piece | Where | Failure mode | Recovery |
|---|---|---|---|
| Web app + crank API | Vercel (`apps/web`) | Build fails, 5xx, keypair unset | Redeploy / rollback (below) |
| Escapement program | Devnet, id `KKAQbHv1YAHo3wAAVETEQGaPBix5tRHWdXcb4G28V6z` | Logic bug | Upgrade deploy with same keypair (see below) |
| Template program | Devnet, id `E52t2PvfqcE71MGafrLPJBgXN74WdRmkzUk9aBLLLHfi` | Logic bug | Upgrade deploy with same keypair |
| Market config | Market PDA on devnet | Fee drift | `set_market_config` via authority |
| Crank keypair | Vercel env `CRANK_KEYPAIR_PATH`/`CRANK_KEYPAIR` | Missing/compromised | Re-set env; rotate keypair (see below) |

## Web app rollback (under 5 minutes)

Vercel keeps every deployment. Rollback = promote the previous deployment
in the Vercel dashboard (Deployments → latest good build → "Promote to
Production"). No rebuild needed.

Redeploy from source: push `main`; CI gates the merge.

## Program upgrade

The program is deployable with its local keypair (gitignored, present in
`programs/escapement/escapement-keypair.json`):

```bash
bash scripts/deploy-devnet.sh   # builds + deploys both programs + setup
```

An upgrade deploy keeps the program id, so PDAs, leases, and the vault stay
valid. **Never** change account layouts without a reallocation plan — current
account sizes are frozen (Lease 162 B, Market 57 B, Counter 48 B) and the
client enforces them strictly.

## Crank keypair rotation

1. `solana-keygen new -o /tmp/new-crank.json --no-bip39-passphrase`
2. Fund it from the operator wallet: `solana transfer --allow-unfunded-recipient ...`
3. On devnet, transfer the market authority via a re-init is not supported —
   instead update `CRANK_KEYPAIR_PATH` in Vercel env to the new keypair and
   redeploy. The old keypair must be deleted.
4. If the old keypair is compromised, it can only crank leases (buyer-or-
   authority gate) — revoke by changing the market authority is an upgrade;
   see the audit note in SECURITY.md.

## Health checks

- `/api/crank` returns 501 without a keypair, 400 on bad input, 429 on
  cooldown — any of those mean the route is alive.
- Dead giveaway of a broken deployment: homepage stats strip shows dashes
  and the fee card says "env fallback (market RPC unreachable)".
- `node scripts/e2e-devnet.mjs` is the full end-to-end probe: mint → ticks →
  settle on devnet with real transactions.

## Known accepted risks

- 4 moderate transitive npm advisories via `@solana/web3.js` 1.x (uuid,
  stream-json) — no non-breaking fix; CI blocks on high+ only. Tracked in
  SECURITY.md.
- Unsettled partial-lease remainder stays in the vault until expiry sweep
  (on-chain policy, not a bug).
- Program upgrades are single-authority (devnet MVP). For any mainnet or
  value-bearing deployment, move the authority behind a multisig first —
  see SECURITY.md.

## Incident response

1. Identify scope: is it the UI (Vercel) or the chain (program)?
2. UI: promote the last-good Vercel deployment.
3. Chain: pause damage — `set_market_config` (authority) can retune fees;
   `set_program_status` pauses new lease mints. Existing leases keep
   ticking (they are prepaid; that is honest).
4. Write up what happened in CHANGELOG.md with the fix commit.
