import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    // Multi-page app: each HTML file becomes a separate entry point
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        cookie: resolve(__dirname, 'cookie.html'),
      },
      // Suppress Rollup warnings for static scripts intentionally served
      // from public/ without type="module". These scripts (config.js,
      // chat.js, ui-helpers.js) are IIFE-style globals — bundling them
      // would break their contract. The warnings are informational only.
      onwarn(warning, defaultHandler) {
        if (warning.message?.includes("can't be bundled without type=\"module\"")) return;
        defaultHandler(warning);
      },
    },
  },
});
