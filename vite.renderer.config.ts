// noinspection JSUnusedGlobalSymbols

import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './',
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, '.vite/renderer/main_window'),
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: false,
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        compact: true,
        manualChunks: undefined
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger']
  },
  optimizeDeps: {
    exclude: ['electron']
  }
});

