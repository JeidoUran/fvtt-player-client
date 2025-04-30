// noinspection JSUnusedGlobalSymbols

import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    // Précise à Vite de prioriser les modules Node.js
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  build: {
    target: 'node18',
    outDir: path.resolve(__dirname, '.vite/build'),
    sourcemap: false,
    minify: 'esbuild',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        compact: true
      }
    }
  },
  esbuild: {
    //drop: ['console', 'debugger']
  }
});
