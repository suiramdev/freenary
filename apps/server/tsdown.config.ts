import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: [/@freenary\/.*/],
  },
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
});
