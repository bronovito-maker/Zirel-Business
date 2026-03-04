# Handoff Context (Current)

Data: 2026-03-04

## Stato frontend

- Core: `demo/index.html`
- Settori commerciali: `restaurant.html`, `hotel.html`, `professional.html`
- Demo in-character: `demo.html`, `hotel-demo.html`, `professional-demo.html`
- Pricing: `pricing.html` (hub) + `pricing-restaurant.html` + `pricing-hotel.html` + `pricing-professional.html`
- Supporto: `login.html`, `register.html`, `contatti.html`

## Pricing attivo

Fonte ufficiale: `docs/technical/PRICING_MODEL.md`

- Entry: `€49/mese + €349` attivazione assistita
- Intermedio: `€99/mese + €599` setup e configurazione iniziale
- Custom: su progetto
- Annuale: `-50%` sull'attivazione iniziale

Condizioni chiarite in pagina pricing:

- attivazione iniziale sempre prevista
- canone mensile sempre attivo
- configurazione widget e implementazione standard sul sito gratuite
- annullamento gratuito e senza vincoli
- attivazione iniziale una tantum non rimborsabile

## Tenant map

Fonte ufficiale: `docs/technical/FRONTEND_TENANT_MAP.md`

Mappa principale:

- `index.html` -> `zirel_official`
- `restaurant.html` -> `zirel_restaurant`
- `demo.html` -> `chiringuito_gino_001`
- `hotel.html` -> `zirel_hotel`
- `hotel-demo.html` -> `hotel_rivamare_demo_001`
- `professional.html` -> `zirel_professional`
- `professional-demo.html` -> `studio_nova_demo_001`
- `pricing.html` -> `zirel_official` (widget attivo)
- `contatti.html` -> `zirel_official` (widget attivo)

## Navigazione

- Header con `PRICING` contestuale al settore
- Footer con `Pricing` contestuale come l'header
- Terminologia pubblico-facing: usare `settore`, non `verticale`

## Brand

Fonte ufficiale: `docs/technical/BRAND_IDENTITY.md`

Sistema attivo:

- identita madre condivisa (`Core`)
- accenti per settore (`Restaurant`, `Hotel`, `Professional`)
- UX invariata, differenziazione visiva controllata

## Widget ufficiale

Tenant ufficiale: `zirel_official`

Pagine attive:

- `demo/index.html`
- `demo/pricing.html`
- `demo/contatti.html`

## Prossimi check consigliati

- test browser desktop/mobile su pricing pages
- verifica apertura/invio widget su `index`, `pricing`, `contatti`
- verifica overflow nav su viewport intermedi
- revisione copy globale in stile minimal premium su tutte le pagine
