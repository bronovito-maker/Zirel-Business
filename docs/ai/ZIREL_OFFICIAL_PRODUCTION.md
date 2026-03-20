# zirel_official: seed produzione

Questa scheda raccoglie i contenuti pronti da copiare nel tenant `zirel_official` e nel `Build Prompt` per allineare il comportamento pre-sales alla versione produzione.

## Campi tenant consigliati

### `prezzo_medio`

```text
Piani da EUR69/mese a EUR129/mese + attivazione iniziale. Il piano base parte dal sito; WhatsApp ufficiale e handoff umano entrano dal piano superiore. Soluzioni custom su richiesta. Con annuale: -50% sull'attivazione iniziale. Costi di messaggistica Meta/WhatsApp esclusi.
```

### `servizi_inclusi`

```text
Widget chat personalizzato per sito web, risposte automatiche h24 su sito e WhatsApp, base conoscenza aggiornata dal cliente, supporto multilingua, raccolta lead, gestione richieste commerciali e, nei piani avanzati, handoff umano e automazione prenotazioni con notifiche interne.
```

### `promozione_attiva`

```text
Demo guidata da 10 minuti senza impegno per capire come Zirèl lavorerebbe nel tuo locale. Analisi iniziale del caso d'uso inclusa.
```

### `dati_testuali_brevi`

```text
Zirèl aiuta hotel, ristoranti, beach club e attivita di servizio a non perdere richieste mentre il team e occupato. Risponde in tempo reale, qualifica i contatti e puo automatizzare prenotazioni e passaggi interni senza richiedere competenze tecniche al cliente.
```

### `target_clientela`

```text
Titolari, gestori e manager di hotel, ristoranti, chiringuiti, beach club, studi professionali e attivita hospitality che vogliono ridurre chiamate perse, domande ripetitive e lead non gestiti.
```

### `prompt_base`

```text
Sei l'assistente ufficiale di Zirèl e lavori come pre-sales concierge. Devi aiutare il visitatore a capire rapidamente cos'e Zirèl, come funziona, quale piano e piu adatto e se ha senso fissare una demo. Rispondi in modo professionale, concreto e breve. Non inventare mai funzionalita, sconti, integrazioni o disponibilita. Se una demo non e ancora stata registrata tramite tool, non dire che e stata prenotata o inoltrata. Raccogli i dati commerciali in modo progressivo e chiedi sempre conferma prima di usare un tool.
```

## Build Prompt

Nel ramo `professional`, aggiungere anche il campo prezzi sintetico al `tenant_context`:

```javascript
addField('Prezzi', tenant.prezzo_medio);
```

Regole da aggiungere al `sector_prompt` `professional`:

- Non proporre esempi con giorno della settimana associato a una data se non sei certo della corrispondenza reale.
- Se l'utente dice "settimana prossima", "la mattina" o formule simili, chiedi una data precisa e un orario preciso.
- Non dichiarare mai che una demo e stata registrata davvero senza il workflow `Registra_Appuntamento` andato a buon fine sul ramo `demo_request`.
- Dopo il successo del tool, usa solo i dati restituiti dal tool per la conferma finale.

## KB consigliata: contenuto sorgente

Questo testo e adatto a diventare un PDF da caricare nel vector store.

### Cos'e Zirèl

Zirèl e un concierge AI multi-tenant pensato per attivita hospitality e servizi che vogliono rispondere ai clienti in modo rapido, coerente e professionale 24 ore su 24. Non e un semplice chatbot generico: lavora su dati reali del singolo business, con regole operative definite e tono coerente con il brand.

### Cosa fa

- Risponde a domande frequenti su orari, servizi, regole e contatti.
- Gestisce richieste commerciali e lead in chat.
- Nei piani idonei puo registrare prenotazioni o richieste demo tramite workflow reali.
- Invia notifiche interne e passa i casi sensibili a una persona reale.
- Si integra nel sito tramite widget leggero e puo estendersi ad altri canali.

### Come funziona

Il cliente aggiorna i propri contenuti strutturati dal pannello Zirèl. I contenuti lunghi possono essere caricati come documenti e indicizzati nella knowledge base. L'assistente combina dati tenant, prompt di settore e conoscenza documentale per rispondere in modo contestuale, riducendo le allucinazioni.

### Tempi di attivazione

L'attivazione standard richiede raccolta materiali, configurazione del tenant, personalizzazione del widget e test finale. I tempi dipendono dalla complessita del caso d'uso e dalle integrazioni richieste.

### Demo

La demo serve a mostrare come Zirèl si comporterebbe nel contesto reale del cliente. Durante la demo vengono analizzati volume di richieste, casi d'uso principali, canali da coprire e piano piu adatto.

### Piani

#### Piano Entry

- EUR69/mese
- EUR399 attivazione assistita una tantum
- Risposte AI h24
- Risposte automatiche su WhatsApp
- Informazioni operative e richieste frequenti
- 1 lingua (Italiano)
- Widget chat personalizzato

#### Piano Intermedio

- EUR129/mese
- EUR699 setup e configurazione iniziale una tantum
- Tutto del piano Entry
- 10 lingue incluse
- Flussi operativi piu completi
- Integrazione dashboard
- Handoff umano e gestione conversazioni WhatsApp
- Piano consigliato per la maggior parte delle attivita

#### Gran Turismo

- Prezzo custom
- Analisi e progetto inclusi
- Tutto del piano Azdora
- Formazione staff
- Analisi business intelligence
- Sviluppo feature su misura

### Differenze tra i piani

Il piano Entry copre l'accoglienza digitale di base. Il piano Intermedio aggiunge la parte operativa piu rilevante, con automazioni e multilingua. Il piano Custom e pensato per chi vuole un progetto su misura, integrazioni avanzate e supporto piu stretto.

### FAQ commerciali

- Se ho gia un sito? Zirèl non sostituisce il sito, lo rende piu utile e converte meglio.
- Serve saper programmare? No, il cliente aggiorna contenuti e regole senza codice.
- Posso partire semplice? Si, si puo iniziare con il piano base e poi crescere.
- Fate anche progetti custom? Si, il piano Gran Turismo copre i casi su misura.
