# Zirèl Brand Identity (Current)

Data aggiornamento: 2026-03-04

Questa guida definisce l'identita visuale di Zirèl per:

- homepage `Core`
- pagine settore (`Restaurant`, `Hotel`, `Professional`)
- pricing hub e pricing settore

Obiettivo: migliorare chiarezza, vendibilita e leggibilita senza stravolgere UI/UX.

## Principi non negoziabili

- Struttura UX coerente: non cambiare i flussi principali tra le pagine.
- Minimal premium: meno rumore visivo, piu gerarchia, piu respiro.
- CTA chiare: una primaria evidente, una secondaria sobria.
- Leggibilita prima di tutto: contrasti alti, testi brevi, scan rapido.
- Coerenza di sistema: stessa grammatica grafica in tutto il sito.

## Architettura del brand

Zirèl usa un sistema a due livelli:

- livello 1: identita madre condivisa (`Zirèl Core`)
- livello 2: accento per settore (`Restaurant`, `Hotel`, `Professional`)

Regola pratica:

- la struttura non cambia
- la temperatura visiva cambia in modo controllato

## Fondamentali condivisi

### Palette base

- `--primary`: `#FF8C42`
- `--primary-dark`: `#E67E22`
- `--secondary`: `#003049`
- `--secondary-dark`: `#001D2D`
- `--accent`: `#00AEEF`
- `--light`: `#FDF0D5`
- `--white`: `#FFFFFF`
- `--dark`: `#001219`

Ruoli:

- arancione: conversione e focus
- blu: fiducia, struttura, leggibilita
- cyan: accento tecnico leggero
- sand: superfici calde e respiro

### Tipografia

- Primario: `Outfit`
- Editoriale (solo enfasi): `Playfair Display`

Regola:

- evitare decorazione tipografica non funzionale
- usare frasi brevi e titoli netti

### Componenti

- navbar: stessa logica su tutte le pagine
- card: stessa base (`zirel-card`) con varianti cromatiche leggere
- widget: stesso schema tecnico, micro-copy contestuale
- footer: struttura unica, link pricing contestuali al settore

## Direzione per pagina

### Core

Carattere: istituzionale, chiaro, piattaforma.

Indicazioni:

- tono neutro/freddo
- accenti cyan controllati
- percezione di ecosistema

### Restaurant

Carattere: caldo, operativo, immediato.

Indicazioni:

- sabbia e arancione piu presenti
- energia visiva maggiore ma ordinata
- copy orientato a velocita e servizio

### Hotel

Carattere: arioso, hospitality premium.

Indicazioni:

- superfici piu leggere e luminose
- tono acqua/cyan secondario
- copy orientato a richieste dirette e follow-up

### Professional

Carattere: sobrio, affidabile, preciso.

Indicazioni:

- neutrali/slate piu presenti
- arancione usato solo per focus/CTA
- copy orientato a ordine, intake, agenda

## Pricing pages (allineamento brand)

Regola:

- il pricing hub resta `Core`
- ogni pagina pricing settore deve ereditare il tono della landing settore corrispondente

Terminologia:

- usare sempre `settore`, non `verticale`, nei testi pubblico-facing

## Copy style (riferimento operativo)

Stile richiesto:

- autorevole ma accessibile
- minimalista
- rassicurante
- orientato al beneficio immediato

Regole:

- frasi corte
- zero gergo non necessario
- vendere la fine del problema, non la funzione
- CTA brevi e dirette

## Guardrail da mantenere

- Non rifare la UX.
- Non introdurre nuovi pattern di navigazione.
- Non usare palette scollegate dal sistema Zirèl.
- Non rendere i settori indistinguibili tra loro.

## Documenti collegati

- `docs/technical/PRICING_MODEL.md`
- `docs/technical/FRONTEND_TENANT_MAP.md`
- `docs/technical/HANDOFF_CONTEXT_CURRENT.md`
