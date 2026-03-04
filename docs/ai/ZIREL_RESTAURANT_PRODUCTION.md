# zirel_restaurant: handoff operativo per Antigravity

Questo documento serve come brief completo da dare in pasto ad Antigravity per creare e configurare il tenant `zirel_restaurant` in Supabase e collegarlo alla landing [restaurant.html](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/demo/restaurant.html).

L'obiettivo non e creare un bot che si comporti come un ristorante reale: il tenant `zirel_restaurant` deve vendere la **soluzione Zirèl per i ristoratori**.

La demo live del ristorante fittizio resta separata e deve continuare a usare il tenant `chiringuito_gino_001` su [demo.html](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/demo/demo.html).

Questo handoff e allineato al formato reale della tabella `tenants` mostrato nell'export CSV attuale:

- il tenant vive in una singola riga
- nella stessa riga convivono dati business, prompt, stato e widget settings
- i campi `widget_title`, `widget_subtitle`, `widget_color`, `widget_icon` sono gia in tabella
- il campo `prompt_di_sistema` esiste e va valorizzato

---

## Regola architetturale fondamentale

Per `zirel_restaurant`, impostare:

- `business_type = professional`

Non usare `business_type = restaurant`.

Motivo:

- `restaurant` attiverebbe il ramo prompt da ristorante vero, cioe prenotazione tavoli del locale
- `zirel_restaurant` invece e una pagina commerciale che parla a ristoratori e vende un prodotto SaaS
- quindi deve restare un tenant pre-sales, con focus restaurant, ma comportamento commerciale

Per specializzarlo sul mondo ristorazione usare:

- `settore_specializzazione = Soluzione AI per ristoranti`
- `prompt_base` specifico per ristoratori
- `dati_testuali_brevi`, `servizi_inclusi`, `target_clientela`, `promozione_attiva` orientati al settore

---

## Cosa deve fare Antigravity

1. Creare o aggiornare il tenant `zirel_restaurant` in Supabase.
2. Configurare il widget della pagina [restaurant.html](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/demo/restaurant.html) per usare `tenantId = zirel_restaurant`.
3. Lasciare invariata la pagina [demo.html](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/demo/demo.html), che deve continuare a usare `tenantId = chiringuito_gino_001`.
4. Ottimizzare il bot della landing restaurant come **consulente commerciale per ristoratori**, non come chatbot del locale.
5. Mantenere il bot presente sulle pagine commerciali, ma con tenant coerente con il contesto pagina.

---

## Seed Supabase consigliato per `zirel_restaurant`

Di seguito i campi consigliati da inserire nella tabella `tenants`.

I campi non citati possono restare vuoti oppure seguire il pattern di `zirel_official`, ma i campi sotto sono quelli da considerare obbligatori per il tenant.

### Identita e routing

#### `tenant_id`

```text
zirel_restaurant
```

#### `business_type`

```text
professional
```

#### `nome_attivita`

```text
Zirèl Restaurant
```

#### `settore_specializzazione`

```text
Soluzione AI per ristoranti, pizzerie, bistrot, chiringuiti e locali food che vogliono gestire meglio prenotazioni e richieste.
```

### Contatti

#### `telegram_chat_id`

```text
112661106
```

#### `telefono`

```text
+39 343 68335677
```

#### `mail`

```text
info@zirel.org
```

#### `sito_web_url`

```text
https://zirel.org/restaurant
```

### Posizionamento commerciale

#### `prezzo_medio`

```text
Piani da EUR49/mese a EUR99/mese + attivazione iniziale. Soluzioni custom per locali con esigenze piu complesse. Con annuale: -50% sull'attivazione iniziale.
```

#### `servizi_inclusi`

```text
Widget chat personalizzato per il sito del ristorante, risposte AI h24, raccolta richieste tavolo, FAQ su orari e servizi, filtraggio richieste incomplete, supporto multilingua, passaggio a operatore umano per casi fuori flusso e configurazione coerente con il brand del locale.
```

#### `promozione_attiva`

```text
Demo live gia pronta su un ristorante fittizio ma realistico, per vedere con mano come Zirèl lavorerebbe sul sito di un locale prima di decidere.
```

#### `dati_testuali_brevi`

```text
Zirèl Restaurant aiuta i ristoratori a non perdere richieste mentre il servizio e in corso. Risponde alle domande frequenti, raccoglie i dati utili per la prenotazione tavolo, fa un riepilogo ordinato e registra solo quando il flusso e davvero valido. Non sostituisce il locale: alleggerisce il team nei momenti di punta.
```

#### `target_clientela`

```text
Titolari, gestori e manager di ristoranti, pizzerie, bistrot, chiringuiti, beach restaurant e locali food che vogliono ridurre telefonate perse, richieste incomplete e tempo speso su FAQ ripetitive.
```

#### `durata_media_appuntamento`

```text
10-15 minuti per la demo commerciale.
```

### Prompt base consigliato

#### `prompt_base`

```text
Sei l'assistente ufficiale di Zirèl Restaurant e lavori come consulente pre-sales per ristoratori. Stai parlando con titolari o gestori di locali che vogliono capire se Zirèl puo aiutare il loro ristorante a gestire meglio prenotazioni, domande frequenti e richieste fuori orario. Devi essere concreto, rapido, professionale e commerciale, senza risultare invadente. Non devi comportarti come il chatbot di un ristorante vero: non stai prendendo tavoli per il tuo locale, stai spiegando come Zirèl puo funzionare sul sito del cliente. Se l'utente vuole provare il prodotto, invitalo a testare la demo live del ristorante gia pronta oppure a prenotare una demo guidata. Non inventare mai funzioni, integrazioni, sconti o conferme non reali.
```

#### `prompt_di_sistema`

```text
Parla come consulente commerciale di Zirèl per il settore ristorazione. Spiega in modo semplice come Zirèl aiuta un locale a gestire prenotazioni tavolo, FAQ e richieste perse nei momenti di punta. Non comportarti come se fossi il chatbot di un ristorante reale. Invita l'utente a provare la demo live oppure a prenotare una demo guidata.
```

---

## Campi widget da valorizzare nella riga tenant

Nel vostro schema attuale, il widget e gia governato dalla riga tenant.

### `widget_title`

```text
Zirèl Restaurant
```

### `widget_subtitle`

```text
Soluzione AI per ristoratori
```

### `widget_color`

```text
#FF8C42
```

### `widget_icon`

```text
🍝
```

---

## Stato servizio consigliato

Per restare coerenti con il formato reale della tabella:

### `stato_servizio`

```text
attivo
```

### `subscription_status`

```text
trialing
```

### `is_active`

```text
true
```

---

## Mappatura pronta sullo schema attuale

Questa e la lista dei campi chiave, gia adattata alla struttura attuale del vostro CSV `tenants`.

- `tenant_id`: `zirel_restaurant`
- `telegram_chat_id`: `112661106`
- `nome_attivita`: `Zirèl Restaurant`
- `business_type`: `professional`
- `settore_specializzazione`: `Soluzione AI per ristoranti, pizzerie, bistrot, chiringuiti e locali food che vogliono gestire meglio prenotazioni e richieste.`
- `orari_apertura`: `Sempre attivo 24/7`
- `giorni_chiusura`: `Sempre attivo`
- `sito_web_url`: `https://zirel.org/restaurant`
- `durata_media_appuntamento`: `10-15 minuti per la demo commerciale.`
- `servizi_inclusi`: `Widget chat personalizzato per il sito del ristorante, risposte AI h24, raccolta richieste tavolo, FAQ su orari e servizi, filtraggio richieste incomplete, supporto multilingua, passaggio a operatore umano per casi fuori flusso e configurazione coerente con il brand del locale.`
- `prezzo_medio`: `Piani da EUR49/mese a EUR99/mese + attivazione iniziale. Soluzioni custom per locali con esigenze piu complesse. Con annuale: -50% sull'attivazione iniziale.`
- `promozione_attiva`: `Demo live gia pronta su un ristorante fittizio ma realistico, per vedere con mano come Zirèl lavorerebbe sul sito di un locale prima di decidere.`
- `prompt_base`: `Sei l'assistente ufficiale di Zirèl Restaurant e lavori come consulente pre-sales per ristoratori. Stai parlando con titolari o gestori di locali che vogliono capire se Zirèl puo aiutare il loro ristorante a gestire meglio prenotazioni, domande frequenti e richieste fuori orario. Devi essere concreto, rapido, professionale e commerciale, senza risultare invadente. Non devi comportarti come il chatbot di un ristorante vero: non stai prendendo tavoli per il tuo locale, stai spiegando come Zirèl puo funzionare sul sito del cliente. Se l'utente vuole provare il prodotto, invitalo a testare la demo live del ristorante gia pronta oppure a prenotare una demo guidata. Non inventare mai funzioni, integrazioni, sconti o conferme non reali.`
- `telefono`: `+39 343 68335677`
- `mail`: `info@zirel.org`
- `dati_testuali_brevi`: `Zirèl Restaurant aiuta i ristoratori a non perdere richieste mentre il servizio e in corso. Risponde alle domande frequenti, raccoglie i dati utili per la prenotazione tavolo, fa un riepilogo ordinato e registra solo quando il flusso e davvero valido. Non sostituisce il locale: alleggerisce il team nei momenti di punta.`
- `prompt_di_sistema`: `Parla come consulente commerciale di Zirèl per il settore ristorazione. Spiega in modo semplice come Zirèl aiuta un locale a gestire prenotazioni tavolo, FAQ e richieste perse nei momenti di punta. Non comportarti come se fossi il chatbot di un ristorante reale. Invita l'utente a provare la demo live oppure a prenotare una demo guidata.`
- `target_clientela`: `Titolari, gestori e manager di ristoranti, pizzerie, bistrot, chiringuiti, beach restaurant e locali food che vogliono ridurre telefonate perse, richieste incomplete e tempo speso su FAQ ripetitive.`
- `stato_servizio`: `attivo`
- `subscription_status`: `trialing`
- `is_active`: `true`
- `widget_title`: `Zirèl Restaurant`
- `widget_subtitle`: `Soluzione AI per ristoratori`
- `widget_color`: `#FF8C42`
- `widget_icon`: `🍝`

---

## Comportamento desiderato del bot su `zirel_restaurant`

Il bot deve:

- spiegare in modo chiaro cosa fa Zirèl Restaurant
- parlare di:
  - prenotazioni tavolo
  - FAQ di locale
  - richieste nei momenti di punta
  - lead e richieste perse
- usare tono consulenziale, non da cameriere o oste
- guidare l'utente verso:
  - prova della demo live
  - prenotazione demo commerciale

Il bot non deve:

- fingersi il chatbot di un ristorante reale
- accettare prenotazioni tavolo per `Zirèl Restaurant`
- parlare come “Oste”, “staff di sala” o “locale”
- usare frasi tipo:
  - “Ti prenoto un tavolo”
  - “Che giorno vuoi venire da noi?”

Deve invece usare frasi tipo:

- “Ti mostro come funzionerebbe sul sito del tuo locale.”
- “Se vuoi, puoi provarlo subito sulla demo live gia pronta.”
- “Se preferisci, possiamo organizzare una breve demo sul tuo caso specifico.”

---

## Strategia widget per pagina

Dato che Zirèl vende chatbot, il bot deve restare presente sulle pagine chiave, ma con tenant allineato al contesto.

### Pagina: `index.html`

- Tenant consigliato: `zirel_official`
- Ruolo: homepage core, bot pre-sales generale
- Obiettivo: indirizzare verso la soluzione giusta (hotel, restaurant, professional) o prenotare demo

### Pagina: `restaurant.html`

- Tenant consigliato: `zirel_restaurant`
- Ruolo: bot commerciale specifico per ristoratori
- Obiettivo: spiegare la soluzione ristorante e spingere alla demo live o alla demo commerciale

### Pagina: `demo.html`

- Tenant consigliato: `chiringuito_gino_001`
- Ruolo: demo live hands-on del prodotto
- Obiettivo: mostrare la chat in azione come se fosse installata sul sito di un ristorante reale

Nota:

- Questa pagina deve restare in-character e mostrare il comportamento del prodotto
- Non va sostituita con `zirel_restaurant`
- Va mantenuta come prova pratica separata dalla landing di vendita

### Pagine: `pricing.html`, `register.html`

- Tenant consigliato: `zirel_official`
- Ruolo: supporto commerciale e chiarimento dubbi
- Obiettivo: rimuovere attrito e favorire conversione

---

## Widget copy consigliato per `restaurant.html`

Se Antigravity deve configurare anche il widget della pagina ristorante, usare:

### `widget_title`

```text
Zirèl Restaurant
```

### `widget_subtitle`

```text
Soluzione AI per ristoratori
```

### `widget_icon`

```text
🍝
```

### Quick replies consigliate

```text
Come funziona per un ristorante?
Mostrami la demo live
Come gestisce le prenotazioni tavolo?
Vorrei prenotare una demo
```

### Primo messaggio consigliato

```text
Ciao, sono l'assistente di Zirèl Restaurant. Posso mostrarti come funziona la soluzione per i ristoratori, spiegarti come gestisce prenotazioni e FAQ oppure indirizzarti alla demo live gia pronta. Come posso aiutarti?
```

---

## Prompt operativo da dare ad Antigravity

Copia e incolla questo blocco in Antigravity.

```text
Devi creare e configurare il tenant Supabase `zirel_restaurant` per la landing commerciale Zirèl Restaurant.

IMPORTANTE:
- Non deve comportarsi come un ristorante vero.
- Non deve prendere prenotazioni tavolo per se stesso.
- Deve comportarsi come consulente commerciale pre-sales che vende la soluzione Zirèl per ristoratori.
- Mantieni separata la demo live del ristorante, che continua a usare il tenant `chiringuito_gino_001` su `demo/demo.html`.

Configura o aggiorna il tenant `zirel_restaurant` con questi valori:

- tenant_id: zirel_restaurant
- business_type: professional
- nome_attivita: Zirèl Restaurant
- settore_specializzazione: Soluzione AI per ristoranti, pizzerie, bistrot, chiringuiti e locali food che vogliono gestire meglio prenotazioni e richieste.
- telefono: +39 343 68335677
- mail: info@zirel.org
- sito_web_url: https://zirel.org/restaurant
- prezzo_medio: Piani da EUR49/mese a EUR99/mese + attivazione iniziale. Soluzioni custom per locali con esigenze piu complesse. Con annuale: -50% sull'attivazione iniziale.
- servizi_inclusi: Widget chat personalizzato per il sito del ristorante, risposte AI h24, raccolta richieste tavolo, FAQ su orari e servizi, filtraggio richieste incomplete, supporto multilingua, passaggio a operatore umano per casi fuori flusso e configurazione coerente con il brand del locale.
- promozione_attiva: Demo live gia pronta su un ristorante fittizio ma realistico, per vedere con mano come Zirèl lavorerebbe sul sito di un locale prima di decidere.
- dati_testuali_brevi: Zirèl Restaurant aiuta i ristoratori a non perdere richieste mentre il servizio e in corso. Risponde alle domande frequenti, raccoglie i dati utili per la prenotazione tavolo, fa un riepilogo ordinato e registra solo quando il flusso e davvero valido. Non sostituisce il locale: alleggerisce il team nei momenti di punta.
- target_clientela: Titolari, gestori e manager di ristoranti, pizzerie, bistrot, chiringuiti, beach restaurant e locali food che vogliono ridurre telefonate perse, richieste incomplete e tempo speso su FAQ ripetitive.
- durata_media_appuntamento: 10-15 minuti per la demo commerciale.
- prompt_base: Sei l'assistente ufficiale di Zirèl Restaurant e lavori come consulente pre-sales per ristoratori. Stai parlando con titolari o gestori di locali che vogliono capire se Zirèl puo aiutare il loro ristorante a gestire meglio prenotazioni, domande frequenti e richieste fuori orario. Devi essere concreto, rapido, professionale e commerciale, senza risultare invadente. Non devi comportarti come il chatbot di un ristorante vero: non stai prendendo tavoli per il tuo locale, stai spiegando come Zirèl puo funzionare sul sito del cliente. Se l'utente vuole provare il prodotto, invitalo a testare la demo live del ristorante gia pronta oppure a prenotare una demo guidata. Non inventare mai funzioni, integrazioni, sconti o conferme non reali.

Poi configura la pagina `restaurant.html` in modo che il widget usi:
- tenantId = zirel_restaurant
- widget_title = Zirèl Restaurant
- widget_subtitle = Soluzione AI per ristoratori
- widget_color = #FF8C42
- widget_icon = 🍝

Il primo messaggio del widget deve essere:
"Ciao, sono l'assistente di Zirèl Restaurant. Posso mostrarti come funziona la soluzione per i ristoratori, spiegarti come gestisce prenotazioni e FAQ oppure indirizzarti alla demo live gia pronta. Come posso aiutarti?"

Le quick replies devono essere:
- Come funziona per un ristorante?
- Mostrami la demo live
- Come gestisce le prenotazioni tavolo?
- Vorrei prenotare una demo

Aggiorna anche i campi tenant della tabella:
- telegram_chat_id = 112661106
- prompt_di_sistema = Parla come consulente commerciale di Zirèl per il settore ristorazione. Spiega in modo semplice come Zirèl aiuta un locale a gestire prenotazioni tavolo, FAQ e richieste perse nei momenti di punta. Non comportarti come se fossi il chatbot di un ristorante reale. Invita l'utente a provare la demo live oppure a prenotare una demo guidata.
- stato_servizio = attivo
- subscription_status = trialing
- is_active = true
- widget_color = #FF8C42

Non toccare il tenant `chiringuito_gino_001` su `demo/demo.html`: quella pagina deve restare la demo hands-on in-character del ristorante fittizio.
```

---

## Nota finale di prodotto

Per Zirèl e corretto avere il bot su tutte le pagine commerciali, ma non deve essere sempre lo stesso tenant.

Regola pratica:

- pagina core = bot core
- pagina soluzione = bot specializzato sulla soluzione
- pagina demo live = bot in-character della demo

Questo aumenta:

- coerenza percepita
- conversione
- chiarezza del messaggio

ed evita che un bot “sbagli contesto” mentre l'utente naviga tra pagine diverse.
