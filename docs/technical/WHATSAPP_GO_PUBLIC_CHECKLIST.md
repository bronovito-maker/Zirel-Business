# WhatsApp Go Public Checklist

Checklist corta per aprire WhatsApp su Zirèl in beta pubblica o rollout controllato.

## Meta

1. app Meta in stato `Live`
2. `config_id` Embedded Signup creato e testato
3. `Data deletion instructions URL` impostato:
   - `https://dashboard.zirel.org/meta/data-deletion`
4. `Revoke / deauthorize callback URL` impostato:
   - `https://dashboard.zirel.org/api/meta/deauthorize`
5. `Accedi con l'SDK JavaScript` attivo
6. domini SDK JS corretti:
   - `dashboard.zirel.org`
   - eventuale dominio Vercel usato nei test
7. `META_APP_SECRET` presente lato server

## Dashboard

1. card `Canale WhatsApp` mostra:
   - stato canale
   - numero collegato
   - ultimo aggiornamento
   - badge webhook
2. `Collega WhatsApp` testato almeno una volta con successo
3. `Ricollega` e `Scollega` verificati
4. tab `Conversazioni` raggiungibile e usabile
5. handoff (`Passa a operatore`, `Riattiva AI`, `Chiudi`) testato

## Runtime

1. workflow ingestion attivo
2. workflow processor attivo
3. workflow AI orchestrator attivo
4. workflow outbound sender attivo
5. cron validati almeno a `30s`
6. token Meta stabile presente nel runtime corretto

## Dati e monitoraggio

1. `tenant_whatsapp_accounts` valorizzata correttamente per il tenant reale
2. query di monitoraggio pronte:
   - [whatsapp_monitoring_queries.sql](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/docs/technical/sql/whatsapp_monitoring_queries.sql)
3. cleanup dati test completato
4. vista admin dashboard controllata:
   - ultimi errori outbound
   - ultimi eventi webhook
   - badge webhook attivo/verificato

## Test finali

1. un inbound reale riuscito
2. una reply AI reale riuscita
3. un outbound manuale riuscito
4. un test `human_handoff` riuscito
5. un test `closed` riuscito
6. un test `deauthorize` o simulazione endpoint riuscito

## Apertura consigliata

1. apri prima a pochi tenant reali
2. osserva 3-7 giorni:
   - errori outbound
   - webhook inattivi
   - duplicate reply
3. solo dopo passa da beta controllata a apertura piu ampia
