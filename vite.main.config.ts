// noinspection JSUnusedGlobalSymbols

import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    // Précise à Vite de prioriser les modules Node.js
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  build: {
    target: 'node18', // Electron 35 tourne sur Node 18
    outDir: path.resolve(__dirname, '.vite/build'),
    sourcemap: false,
    minify: 'esbuild', // plus rapide que terser
    emptyOutDir: true,
    rollupOptions: {
      output: {
        compact: true
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'] // supprime console.log et debugger en prod
  }
});
