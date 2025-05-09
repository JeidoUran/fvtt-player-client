// noinspection JSUnusedGlobalSymbols

import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    mainFields: ["module", "jsnext:main", "jsnext"],
  },
  build: {
    target: "node22",
    outDir: path.resolve(__dirname, ".vite/build"),
    sourcemap: false,
    minify: "esbuild",
    emptyOutDir: false,
    rollupOptions: {
      external: ["ws"],
      output: {
        compact: true,
      },
    },
  },
  esbuild: {
    drop: ["console", "debugger"],
  },
});
