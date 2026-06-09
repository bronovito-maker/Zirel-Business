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
        guideIndex: resolve(__dirname, 'guide/index.html'),
        guideAiPerRistoranti: resolve(__dirname, 'guide/ai-per-ristoranti.html'),
        guideComeAumentarePrenotazioniRistorante: resolve(__dirname, 'guide/come-aumentare-prenotazioni-ristorante.html'),
        guideAutomazioneRichiesteHotel: resolve(__dirname, 'guide/automazione-richieste-hotel.html'),
        guideWhatsappHotelPrenotazioni: resolve(__dirname, 'guide/whatsapp-hotel-prenotazioni.html'),
        guideGestionePrimoContattoStudiProfessionali: resolve(__dirname, 'guide/gestione-primo-contatto-studi-professionali.html'),
        guideComeFiltrareRichiesteClientiPrimaAppuntamento: resolve(__dirname, 'guide/come-filtrare-richieste-clienti-prima-appuntamento.html'),
        contatti: resolve(__dirname, 'contatti.html'),
        demo: resolve(__dirname, 'demo.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        cookie: resolve(__dirname, 'cookie.html'),
        settoreHotel: resolve(__dirname, 'settore-hotel.html'),
        settoreRistoranti: resolve(__dirname, 'settore-ristoranti.html'),
        settoreCentriEstetici: resolve(__dirname, 'settore-centri-estetici.html'),
        casiStudioGotBunRiccione: resolve(__dirname, 'casi-studio/got-bun-riccione.html'),
        settoreArtigiani: resolve(__dirname, 'settore-artigiani.html'),
        demoRighetti: resolve(__dirname, 'fratelli-righetti.html'),
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