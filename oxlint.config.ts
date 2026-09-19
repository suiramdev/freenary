import preset from "@jliocsar/begone-slop/preset.json" with { type: "json" };
import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";

export default defineConfig({
  extends: [core, react, tanstack, preset],
  ignorePatterns: [
    ...core.ignorePatterns,
    ".claude/**",
    ".cursor/**",
    ".agent/**",
    ".agents/**",
    ".codex/**",
    ".continue/**",
    ".gemini/**",
    ".opencode/**",
    ".pi/**",
    ".roo/**",
    ".windsurf/**",
    "packages/ui/**",
    "apps/web/src/paraglide/**",
  ],
  jsPlugins: ["@jliocsar/begone-slop", "@shadcn/lint"],
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "begone-slop/expect-padding": "error",
        "begone-slop/require-safety-comment-for-type-assertion": "off",
      },
    },
  ],
  plugins: [
    "eslint",
    "typescript",
    "unicorn",
    "oxc",
    "import",
    "jsdoc",
    "node",
    "promise",
    "react",
    "react-perf",
    "jsx-a11y",
  ],
  rules: {
    "begone-slop/no-reexport-only-modules": [
      "error",
      { allowedFilenames: ["index.ts"], routeDirectoryNames: ["src"] },
    ],
  },
  settings: {
    shadcn: {
      componentImports: ["^@/shared/ui(/|$)"],
    },
  },
});
