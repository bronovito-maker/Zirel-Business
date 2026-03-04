import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // Multi-page app: each HTML file becomes a separate entry point
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        restaurant: resolve(__dirname, 'restaurant.html'),
        hotel: resolve(__dirname, 'hotel.html'),
        professional: resolve(__dirname, 'professional.html'),
        contatti: resolve(__dirname, 'contatti.html'),
        faq: resolve(__dirname, 'faq.html'),
        demo: resolve(__dirname, 'demo.html'),
        hotelDemo: resolve(__dirname, 'hotel-demo.html'),
        professionalDemo: resolve(__dirname, 'professional-demo.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        pricingRestaurant: resolve(__dirname, 'pricing-restaurant.html'),
        pricingHotel: resolve(__dirname, 'pricing-hotel.html'),
        pricingProfessional: resolve(__dirname, 'pricing-professional.html'),
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
