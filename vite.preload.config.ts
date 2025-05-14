// noinspection JSUnusedGlobalSymbols
// vite.preload.config.ts
import { defineConfig } from "vite";
import { resolve } from "path";
import { builtinModules } from "module";
import pkg from "./package.json";

export default defineConfig({
  build: {
    // ─── BUILD AS A CJS LIBRARY FOR PRELOAD ───────────────────
    lib: {
      entry: resolve(__dirname, "src/preload.ts"),
      formats: ["cjs"],
      fileName: () => "preload.js", // → .vite/build/preload.js
    },
    emptyOutDir: false,
    outDir: resolve(__dirname, ".vite/build"),
    target: "es2022",
    minify: "esbuild",
    rollupOptions: {
      external: [
        ...builtinModules,
        ...Object.keys(pkg.dependencies || {}),
        "electron",
      ],
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
        exports: "named",
        compact: true,
      },
    },
  },
});
