// noinspection JSUnusedGlobalSymbols
// vite.main.config.ts
import { defineConfig } from "vite";
import { resolve } from "path";
// ← import Node’s list of built-ins
import { builtinModules } from "module";
// ← import your package.json to externalize deps
import pkg from "./package.json";

export default defineConfig({
  build: {
    // ─── BUILD AS A CJS LIBRARY FOR ELECTRON MAIN ──────────────
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      formats: ["cjs"], // CommonJS output
      fileName: () => "main.js", // → .vite/build/main.js
    },
    emptyOutDir: false,
    outDir: resolve(__dirname, ".vite/build"),
    target: "node22",
    sourcemap: false,
    minify: false,
    rollupOptions: {
      external: [
        // all Node.js built-ins (fs, path, util, etc.)
        ...builtinModules,
        // plus anything under "dependencies" in your package.json
        ...Object.keys(pkg.dependencies || {}),
        // and Electron itself
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
