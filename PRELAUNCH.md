# Checklist Pre-Lancio — Zirèl Business 🚀

Controlla ogni punto prima di pubblicare. Spunta con [x] quando fatto.

---

## 1. Build & Artefatti

- [ ] `cd demo && npm run build` termina senza errori
- [ ] `demo/dist/` contiene: `index.html`, `demo.html`, `pricing.html`, `privacy.html`, `cookie.html`
- [ ] `demo/dist/` contiene: `config.js`, `chat.js`, `ui-helpers.js`
- [ ] `demo/dist/assets/` contiene CSS e immagini
- [ ] `demo/dist/` **NON** contiene `config.template.js` (è un file di sviluppo)

## 2. Funzionamento Chat

- [ ] Chat si apre e si chiude correttamente
- [ ] L'invio di un messaggio riceve una risposta dal bot
- [ ] I tooltip del widget appaiono dopo ~5 secondi
- [ ] Il widget funziona su mobile (schermo < 768px)
- [ ] Nessun errore in console (CORS, 404, JS error)

## 3. UX & Navigazione

- [ ] Il menu hamburger funziona su mobile
- [ ] Il carousel delle testimonianze scorre (auto + dots + frecce)
- [ ] Le FAQ si espandono e chiudono
- [ ] I link del footer portano a `privacy.html` e `cookie.html`
- [ ] Il pulsante "Inizia Ora" porta alla sezione contatti
- [ ] La pagina `pricing.html` è raggiungibile e corretta
- [ ] La pagina `demo.html` mostra la demo del Chiringuito

## 4. SEO & Metatag

- [ ] Ogni pagina ha un `<title>` descrittivo unico
- [ ] Ogni pagina ha un `<meta name="description">` non generico
- [ ] `<h1>` presente e unico per pagina
- [ ] Le immagini hanno attributo `alt` descrittivo

## 5. Legal & Privacy

- [ ] `privacy.html` è accessibile e mostra informazioni corrette
- [ ] `cookie.html` è accessibile e mostra informazioni corrette
- [ ] L'email di contatto `privacy@zirel.it` è attiva (o aggiornata)
- [ ] La data "Aggiornata il 01/03/2026" è corretta

## 6. Performance (opzionale ma consigliato)

- [ ] Test su [PageSpeed Insights](https://pagespeed.web.dev/) → score > 80 mobile
- [ ] Immagini ottimizzate (< 500KB idealmente — `hero_premium.png` è attualmente grande)
- [ ] Nessuna risorsa bloccante non necessaria nel `<head>`

## 7. Deploy Vercel

- [ ] Root Directory impostata su `demo`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Dominio custom collegato (Namecheap → CNAME → Vercel)
- [ ] SSL attivo (automatico con Vercel)
- [ ] Preview deploy testato prima della promozione a production

## 7b. Deploy Dashboard

- [ ] Root Directory impostata su `dashboard`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Variabili Vercel configurate:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_N8N_INGESTION_WEBHOOK` (se vuoi ingestion live)
- [ ] Verificato che `dashboard/vercel.json` venga incluso nel deploy
- [ ] Preview deploy testato con login reale prima della promozione a production

## 8. Repository GitHub

- [ ] `demo/dist/` non è tracciato (check: `git status` non mostra file in dist/)
- [ ] `demo/config.template.js` non è in dist/ (è un file di sviluppo, NON in `public/`)
- [ ] Non ci sono credenziali cliente in chiaro nel repo
- [ ] Il `README.md` riflette lo stato reale del progetto

---

## Rischi Residui Noti

| Rischio | Gravità | Mitigazione |
|---------|---------|-------------|
| Webhook Railway non risponde | Alta | Monitorare uptime di Railway; considerare ridondanza |
| Immagini hero pesanti (690KB each) | Media | Convertire in WebP con Vite plugin o manualmente |
| Vite warning `type="module"` su script legacy | Bassa | Non blocca nulla; risolto passando a ES modules in futuro |
| Pagine legali con email placeholder | Media | Aggiornare `privacy@zirel.it` e `info@zirel.it` prima del lancio |
| CORS non configurato per dominio produzione | Alta | Aggiungere il dominio Vercel in n8n → Webhook CORS prima di andare live |
| Env del dashboard mancanti su Vercel | Alta | Copiare tutte le variabili da `dashboard/.env` alle env del progetto dashboard |

---

*Ultima revisione: 01/03/2026*
