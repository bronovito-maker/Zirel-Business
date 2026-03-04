# Frontend Tenant Map (Current)

Data aggiornamento: 2026-03-04

Questa mappa definisce il `tenantId` corretto per ogni pagina frontend.

## Regola generale

- Pagine corporate e supporto centrale: `zirel_official`
- Pagine commerciali per settore: tenant commerciale del settore
- Pagine demo in-character: tenant demo del business fittizio

## Mappa completa

### Core e supporto

- `demo/index.html` -> `zirel_official`
- `demo/pricing.html` -> `zirel_official`
- `demo/contatti.html` -> `zirel_official`
- `demo/login.html` -> nessun widget obbligatorio (se aggiunto: `zirel_official`)
- `demo/register.html` -> nessun widget obbligatorio (se aggiunto: `zirel_official`)
- `demo/privacy.html` -> nessun widget consigliato
- `demo/cookie.html` -> nessun widget consigliato

### Settore Restaurant

- `demo/restaurant.html` -> `zirel_restaurant`
- `demo/pricing-restaurant.html` -> nessun widget obbligatorio
- `demo/demo.html` -> `chiringuito_gino_001` (demo in-character)

### Settore Hotel

- `demo/hotel.html` -> `zirel_hotel`
- `demo/pricing-hotel.html` -> nessun widget obbligatorio
- `demo/hotel-demo.html` -> `hotel_rivamare_demo_001` (demo in-character)

### Settore Professional

- `demo/professional.html` -> `zirel_professional`
- `demo/pricing-professional.html` -> nessun widget obbligatorio
- `demo/professional-demo.html` -> `studio_nova_demo_001` (demo in-character)

## Pagine con widget ufficiale attivo oggi

- `demo/index.html`
- `demo/pricing.html`
- `demo/contatti.html`

Tutte e tre usano:

- `window.ZirelConfig.tenantId = 'zirel_official'`
- `data-tenant-id="zirel_official"`

## Regola per nuove pagine

- nuova pagina commerciale settore -> tenant commerciale settore
- nuova pagina demo realistica -> tenant demo in-character dedicato
- nuova pagina corporate/supporto -> `zirel_official`
