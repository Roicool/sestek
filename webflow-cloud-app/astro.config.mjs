import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";

import react from "@astrojs/react";

// Mount path of the Webflow Cloud environment. Webflow Cloud provides
// BASE_URL at build time; the fallback must match the mount path chosen at
// deploy ("/demos"). Change both together if you remount the app elsewhere.
const base = process.env.BASE_URL || "/demos";

// https://astro.build/config
export default defineConfig({
  base,
  output: "server",
  compressHTML: true,
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),

  integrations: [react()],
  vite: {
    resolve: {
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19.
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled.
      alias: import.meta.env.PROD
        ? {
            "react-dom/server": "react-dom/server.edge",
          }
        : undefined,
    },
  },
});
