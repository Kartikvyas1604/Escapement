# Contributing to Escapement

First — thank you. Escapement is an infrastructure market, and infrastructure
gets better when the people who need it help shape it.

Before you start, read the two laws that govern this codebase:

1. **Lease market first.** The object being sold is the lease — execution
   rights. Anything that reads like a crank tutorial is a bug in the narrative.
2. **Honesty is load-bearing.** Unused iterations expire. No fake APY, no
   inflated claims, no fallback that softens the MagicBlock disappear test.

---

## Ways to contribute

- **Program work** — the Anchor programs under `programs/`. New instructions,
  tighter constraints, fewer compute units, sharper invariants.
- **Client SDK** — `packages/escapement-client`: PDA derivation, instruction
  builders, account codecs. This is the contract between chain and UI; changes
  here are API changes.
- **App & backend** — `apps/web`: the buyer experience and the crank route
  handler. UX, resilience, and rate-limiting improvements are high-value.
- **Documentation** — the demo script, deploy guides, and this README. If you
  had to reverse-engineer something, write it down.
- **Security** — found something exploitable? See [Reporting a vulnerability](#reporting-a-vulnerability).

---

## Ground rules

- **Every PR changes one thing.** A fix, a feature, or a refactor — not all
  three. Small PRs get reviewed fast; large ones rot.
- **Tests are not optional.** Program behavior needs LiteSVM coverage; client
  codecs and pure logic need vitest coverage. If you can't test it, explain why
  in the PR.
- **No mock data in the product.** This project exists because its demo era
  ended. State comes from the chain; errors surface verbatim. Do not reintroduce
  simulated delays, random failures, or fabricated signatures.
- **Keypairs never enter the repository.** Secrets travel by environment
  variables only. The gitignore enforces this — keep it that way.
- **Narrative copy is reviewed like code.** Changes to the README, docs, or UI
  copy must respect the lease-first framing above.
- **The mechanism is frozen.** No PER, VRF, secondary order books, or games.
  Proposals that change the mechanism belong in an issue for discussion before
  any code.

---

## The contribution flow

1. **Open an issue first** for anything that isn't an obvious bug fix. Describe
   the problem, not just the solution — the maintainers will confirm the
   approach before you invest time.
2. **Fork and branch.** Work on a branch named after the issue
   (for example: `42-partial-settle-rounding`).
3. **Commit meaningfully.** Each commit should build and pass tests on its own.
   Write commit messages that say *why*, not just *what*.
4. **Run the checks.** Lint, typecheck, unit tests, and a production build must
   all pass locally before you open the PR — the CI will run them again.
5. **Open the pull request.** Link the issue, describe the change, and note any
   risk it introduces — especially anything touching signing, fees, or CPIs.
6. **Respond to review.** Keep the diff green and the conversation focused.

---

## Reporting a vulnerability

Do **not** open a public issue for security reports.

Instead, use GitHub's private security advisory feature (Security → Report a
vulnerability) with a description, impact assessment, and reproduction steps.
Program-level vulnerabilities — anything that could move escrowed lamports,
bypass the iteration cap, or forge settlement — are triaged first.

Please include: affected program or package, the transaction or instruction
sequence that triggers the issue, and what an attacker would gain.

---

## Code style

- TypeScript: strict mode, no unused exports, imports at the top.
- Rust: idiomatic Anchor — one instruction per module, errors in the single
  program error enum, events for every state change.
- Copy: sentence case, mono font for numbers and addresses, lease-first
  language everywhere.

---

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE) and that you have the right to grant it.
