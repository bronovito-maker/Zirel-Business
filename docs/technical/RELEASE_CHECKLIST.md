# Release Checklist (Current)

Data: 2026-03-04

## Build

- `demo`: build senza errori
- `dashboard`: build senza errori

## Frontend pages

- home core: `demo/index.html`
- settore: `restaurant.html`, `hotel.html`, `professional.html`
- demo in-character: `demo.html`, `hotel-demo.html`, `professional-demo.html`
- pricing: `pricing.html`, `pricing-restaurant.html`, `pricing-hotel.html`, `pricing-professional.html`
- supporto: `login.html`, `register.html`, `contatti.html`

## Nav / Footer

- Header: `PRICING` contestuale al settore
- Footer: pricing allineato alla stessa logica contestuale
- Link login -> `demo/login.html` e da li a `https://dashboard.zirel.org`

## Pricing commerciale

- Entry: `€69/mese + €399` attivazione assistita
- Intermedio: `€129/mese + €699` setup e configurazione iniziale
- Annuale: `-50%` attivazione iniziale
- Policy testuale visibile:
  - canone sempre attivo
  - attivazione iniziale sempre prevista
  - implementazione standard e configurazione widget gratuite
  - annullamento gratuito senza vincoli
  - attivazione non rimborsabile

## Tenant / Widget

Verificare `tenantId` coerenti con:

- `docs/technical/FRONTEND_TENANT_MAP.md`

Widget ufficiale `zirel_official` attivo su:

- `demo/index.html`
- `demo/pricing.html`
- `demo/contatti.html`

## Responsive / UX

- mobile nav senza overflow
- sezioni pricing leggibili su mobile
- widget fullscreen mobile funzionante

## Smoke test manuale minimo

- apertura/chiusura widget
- invio messaggio widget
- quick reply funzionanti
- FAQ accordion funzionanti
- CTA principali coerenti col funnel
