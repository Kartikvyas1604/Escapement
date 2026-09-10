#!/usr/bin/env bash
# Builds and deploys both Escapement programs to devnet.
# Requires: anchor CLI, solana CLI funded on devnet.
set -euo pipefail
cd "$(dirname "$0")/.."

NO_DNA=1 anchor build

WALLET="${WALLET:-$HOME/.config/solana/id.json}"
URL="${URL:-devnet}"

BALANCE=$(solana balance --url "$URL" --keypair "$WALLET" | awk '{print $1}')
if [ -z "$BALANCE" ]; then
  echo "ERROR: could not read wallet balance — check the keypair at $WALLET" >&2
  exit 1
fi
if awk "BEGIN{exit !($BALANCE < 2)}"; then
  echo "ERROR: wallet has only ${BALANCE} SOL — program deploys on devnet need rent; airdrop or fund it." >&2
  exit 1
fi
echo "wallet balance: ${BALANCE} SOL — deploying"

solana program deploy --url "$URL" --keypair "$WALLET" \
  --upgrade-authority "$WALLET" \
  --program-id programs/template/template-keypair.json \
  --max-len 160000 \
  target/deploy/escapement_template.so

solana program deploy --url "$URL" --keypair "$WALLET" \
  --upgrade-authority "$WALLET" \
  --program-id programs/escapement/escapement-keypair.json \
  --max-len 272000 \
  target/deploy/escapement.so

node scripts/setup-devnet.mjs
