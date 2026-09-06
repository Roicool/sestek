/*
 * bundle-search.mjs — builds the self-mounting embed for the Webflow site.
 *
 *   node scripts/bundle-search.mjs            → public/site-search.v<major>.js (+ .map)
 *
 * Single IIFE, minified, CSS inlined (styles.ts), React aliased to Preact. The version
 * comes from package.json "searchVersion" — bump the MAJOR to change the
 * filename (so a rollback is just pointing the <script> at the old file),
 * bump minor/patch for in-place updates behind the same URL.
 */

import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const version = pkg.searchVersion || "1.0.0";
const major = version.split(".")[0];
const outfile = resolve(root, `public/site-search.v${major}.js`);

const result = await build({
  entryPoints: [resolve(root, "src/components/SiteSearch/embed.tsx")],
  outfile,
  bundle: true,
  minify: true,
  sourcemap: true,
  format: "iife",
  target: ["es2019", "chrome90", "safari14", "firefox90"],
  jsx: "automatic",
  // Preact under the hood for the embed (~45 KB instead of ~205 KB with React);
  // the same component renders with React inside the Next app.
  alias: { "react": "preact/compat", "react-dom/client": "preact/compat/client", "react-dom": "preact/compat", "react/jsx-runtime": "preact/jsx-runtime" },
  define: { "process.env.NODE_ENV": '"production"', __SEARCH_VERSION__: JSON.stringify(version) },
  legalComments: "none",
  metafile: true,
});

const out = Object.entries(result.metafile.outputs).find(([k]) => k.endsWith(".js"));
console.log(`site-search v${version} → ${outfile.replace(root + "/", "")} (${(out[1].bytes / 1024).toFixed(1)} KB min)`);
