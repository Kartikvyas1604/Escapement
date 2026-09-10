#!/usr/bin/env node
// Copies freshly built IDLs to the workspace-root idls/ directory so
// declare_program!(escapement_template) keeps resolving on clean builds.
import { cpSync, existsSync, mkdirSync } from "node:fs";

for (const name of ["escapement_template"]) {
  const src = new URL(`../target/idl/${name}.json`, import.meta.url);
  if (!existsSync(src)) {
    console.error(
      `idl: target/idl/${name}.json is missing — run \`anchor build\` before syncing. Stale idls/${name}.json was NOT updated.`
    );
    process.exitCode = 1;
    continue;
  }
  mkdirSync(new URL("../idls", import.meta.url), { recursive: true });
  cpSync(src, new URL(`../idls/${name}.json`, import.meta.url));
  console.log(`idl: synced ${name}.json -> idls/`);
}
