#!/usr/bin/env node
/*!
 * stamp-version.mjs — appends the package.json version to the library name
 * (webflow.json) and to every component's display name (src/*.webflow.tsx)
 * right before `webflow devlink import`, so the Designer's Libraries panel
 * reads "Sestek Code Components v1.13.0" and "Top Bar v1.13.0".
 *
 * Identity is untouched: library.id and the component export names stay
 * the same, so this renames the existing library/components — it does not
 * create new ones. Idempotent: an existing " vX.Y.Z" suffix is replaced.
 *
 * Meant for CI (the stamped files are not committed). Run locally only on a
 * throwaway checkout, or revert afterwards with `git checkout -- .`.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const SUFFIX = /\s+v\d+\.\d+\.\d+$/;
const stamp = (name) => name.replace(SUFFIX, "") + " v" + version;

// 1. library name
const manifestPath = join(root, "webflow.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.library.name = stamp(manifest.library.name);
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log("library :", manifest.library.name);

// 2. component names — the first `name:` after declareComponent( in each *.webflow.tsx
const srcDir = join(root, "src");
const files = readdirSync(srcDir).filter((f) => f.endsWith(".webflow.tsx"));
let stamped = 0;
for (const f of files) {
  const p = join(srcDir, f);
  const src = readFileSync(p, "utf8");
  const re = /(declareComponent\([\s\S]*?\{\s*\n\s*name:\s*")([^"]+)(")/;
  if (!re.test(src)) { console.warn("skip (no declareComponent name):", f); continue; }
  const out = src.replace(re, (_, pre, name, post) => pre + stamp(name) + post);
  writeFileSync(p, out);
  console.log("component:", out.match(re)[2].padEnd(34), "←", f);
  stamped++;
}
console.log(`stamped ${stamped}/${files.length} components with v${version}`);
