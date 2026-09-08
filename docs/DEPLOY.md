# Deploying Escapement

## Vercel (web app)

1. Import the repo; set **Root Directory** to `apps/web` (framework: Next.js is auto-detected there).
2. Environment variables (Project → Settings → Environment Variables):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_CLUSTER` | `devnet` |
| `NEXT_PUBLIC_ESCAPEMENT_PROGRAM_ID` | `KKAQbHv1YAHo3wAAVETEQGaPBix5tRHWdXcb4G28V6z` |
| `NEXT_PUBLIC_TEMPLATE_PROGRAM_ID` | `E52t2PvfqcE71MGafrLPJBgXN74WdRmkzUk9aBLLLHfi` |
| `NEXT_PUBLIC_SITE_URL` | your production URL |
| `CRANK_KEYPAIR` | JSON array of the market-authority keypair (secret) |

> `CRANK_KEYPAIR` is the market authority (`C1tU85e6...`). It signs real
> crank transactions whose fees come from that wallet — keep it funded with a
> small devnet SOL buffer. Never commit it; inject via env only.

3. Deploy. `/api/crank` runs as a serverless function; client reads go
   directly to the public devnet RPC.

## Programs (devnet)

```bash
bash scripts/deploy-devnet.sh   # anchor build + deploy + market bootstrap
```

Upgrades: bump `--max-len` if the binary grows, then `solana program deploy`
with the same program-id keypair. Program authority is the deploy wallet.

## Local

```bash
npm install
cp .env.example apps/web/.env.local   # add CRANK_KEYPAIR_PATH
npm run dev
```
