import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // Locale lives in a cookie, not the URL: every route here is behind auth,
    // so localized paths would buy no SEO and cost a router rewrite.
    // The `dev` script pre-compiles with these same options: Vite caches the
    // first failed resolution of `@/paraglide/server.js`, so the outdir must
    // exist before Vite starts. A shared `project.inlang/paraglide.config.js`
    // would be the drift-proof home, but inlang's `.gitignore` there keeps
    // everything but `settings.json` out of the repo.
    paraglideVitePlugin({
      cookieName: "PARAGLIDE_LOCALE",
      // Declarations keep the generated JS typed without relaxing the project
      // to `allowJs`.
      emitTsDeclarations: true,
      outdir: "./src/paraglide",
      outputStructure: "message-modules",
      project: "./project.inlang",
      strategy: ["cookie", "preferredLanguage", "baseLocale"],
    }),
    tailwindcss(),
    tanstackStart(),
    nitro({ preset: "bun" }),
    viteReact(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    allowedHosts: true,
    port: 3001,
  },
});
