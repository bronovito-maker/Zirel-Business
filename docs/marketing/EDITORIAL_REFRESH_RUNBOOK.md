# Zirèl Editorial Refresh Runbook (Trimestrale)

## Obiettivo
Mantenere contenuti SEO/AEO/GEO aggiornati, coerenti con il prodotto e pronti per motori di ricerca e answer engines.

## Frequenza
- Cadence: ogni 3 mesi.
- Finestra consigliata: prima settimana del trimestre.

## Checklist operativa
1. Verificare pagine core: home, verticali (`/hotel`, `/restaurant`, `/professional`), pricing, FAQ, guide.
2. Aggiornare `dateModified` negli `Article` JSON-LD delle guide modificate.
3. Verificare canonical su tutte le pagine pubbliche (`npm run seo:generate`).
4. Rigenerare `sitemap.xml`, `robots.txt`, `llms.txt` (`npm run seo:generate`).
5. Aggiornare esempi, claim e CTA non più coerenti con prodotto/prezzi.
6. Controllare linking interno tra cluster guide e pagine soluzione.
7. Eseguire build locale (`npm run build`) e validare rendering pagine chiave.

## Governance contenuti
- Owner contenuti: Marketing.
- Owner tecnico SEO: Dev.
- Reviewer finale: Founders/PM.

## KPI minimi da tracciare
- Impression e click organici per pagina cluster.
- Query brand/non-brand principali per settore.
- Pagine citate da answer engines (quando disponibile nei tool analytics).
- CTR pagina guide -> pagina soluzione (link interni).

## Definition of Done (per ciclo)
- Tutte le pagine pubbliche con canonical valido.
- Guide aggiornate con `dateModified` coerente.
- Sitemap/robots/llms rigenerati e deployati.
- Nessun errore build.
