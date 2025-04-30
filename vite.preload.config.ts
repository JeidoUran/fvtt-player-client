// noinspection JSUnusedGlobalSymbols

import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, '.vite/build'),
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: false,
    emptyOutDir: false,
    rollupOptions: {
      external: ['ws'], // <-- dit à Vite de NE PAS inclure ws dans le bundle
      output: {
        compact: true
      }
    }
  },
  esbuild: {
    //drop: ['console', 'debugger']
  }
});

