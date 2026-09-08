#!/usr/bin/env bash
# Builds and deploys both Escapement programs to devnet.
# Requires: anchor CLI, solana CLI funded on devnet.
set -euo pipefail
cd "$(dirname "$0")/.."

NO_DNA=1 anchor build

WALLET="${WALLET:-$HOME/.config/solana/id.json}"
URL="${URL:-devnet}"

solana program deploy --url "$URL" --keypair "$WALLET" \
  --program-id programs/template/template-keypair.json \
  --max-len 160000 \
  target/deploy/escapement_template.so

solana program deploy --url "$URL" --keypair "$WALLET" \
  --program-id programs/escapement/escapement-keypair.json \
  --max-len 272000 \
  target/deploy/escapement.so

node scripts/setup-devnet.mjs
