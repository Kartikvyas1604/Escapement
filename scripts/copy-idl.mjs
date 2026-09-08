#!/usr/bin/env node
// Copies freshly built IDLs to the workspace-root idls/ directory so
// declare_program!(escapement_template) keeps resolving on clean builds.
import { cpSync, existsSync, mkdirSync } from "node:fs";

for (const name of ["escapement_template"]) {
  const src = new URL(`../target/idl/${name}.json`, import.meta.url);
  if (!existsSync(src)) continue;
  mkdirSync(new URL("../idls", import.meta.url), { recursive: true });
  cpSync(src, new URL(`../idls/${name}.json`, import.meta.url));
  console.log(`idl: synced ${name}.json -> idls/`);
}
