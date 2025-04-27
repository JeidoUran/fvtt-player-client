// noinspection JSUnusedGlobalSymbols

import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, '.vite/build'),
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: false,
    emptyOutDir: false, // pour ne pas effacer ce que main a mis
    rollupOptions: {
      output: {
        compact: true
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger']
  }
});

