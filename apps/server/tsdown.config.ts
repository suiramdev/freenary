import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  define: {
    "process.env.FREENARY_VERSION": JSON.stringify(
      process.env.FREENARY_VERSION ?? ""
    ),
  },
  deps: {
    alwaysBundle: [/@freenary\/.*/u],
  },
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
});
