# hotel_rivamare_demo_001: handoff operativo per Antigravity

Questo documento serve come brief completo da dare in pasto ad Antigravity per creare e configurare il tenant demo `hotel_rivamare_demo_001` in Supabase.

Questo tenant non e una landing commerciale: e il tenant **demo in-character** da usare per la versione definitiva di [hotel-demo.html](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/demo/hotel-demo.html).

L'obiettivo e avere una demo hotel davvero equivalente a quella ristorante:

- struttura fittizia ma credibile
- tono da hotel reale
- risposte su soggiorno, servizi e richieste
- zero linguaggio da pagina commerciale Zirèl

---

## Regola architetturale fondamentale

Per `hotel_rivamare_demo_001`, impostare:

- `business_type = hotel`

Qui, a differenza del tenant commerciale `zirel_hotel`, il bot deve comportarsi come il chatbot di una struttura ricettiva reale.

Motivo:

- `zirel_hotel` vende la soluzione
- `hotel_rivamare_demo_001` dimostra il prodotto in-character

---

## Cosa deve fare Antigravity

1. Creare il tenant `hotel_rivamare_demo_001` in Supabase.
2. Configurarlo come hotel demo fittizio ma realistico.
3. Prepararlo per essere usato da [hotel-demo.html](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/demo/hotel-demo.html).
4. Mantenere separato questo tenant dal tenant commerciale `zirel_hotel`.

---

## Profilo del tenant demo

### `tenant_id`

```text
hotel_rivamare_demo_001
```

### `nome_attivita`

```text
Hotel Rivamare
```

### `business_type`

```text
hotel
```

### `settore_specializzazione`

```text
Hotel 3 stelle fronte mare pensato per soggiorni leisure, weekend e famiglie.
```

### Posizionamento del demo tenant

- hotel leisure
- tono cordiale da reception
- focus su richieste soggiorno, servizi, check-in, check-out
- nessuna vendita del software Zirèl

---

## Dati chiave consigliati per Supabase

- `telegram_chat_id`: `112661106`
- `telefono`: `+39 0541 730321`
- `mail`: `booking@hotelrivamare-demo.it`
- `indirizzo`: `Viale delle Onde, 24 - 47924 Rimini (RN)`
- `sito_web_url`: `https://zirel.org/hotel-demo`
- `orari_apertura`: `Reception attiva tutti i giorni 07:00-23:00`
- `giorni_chiusura`: `Sempre aperto in stagione`
- `orari_checkin_checkout`: `Check-in dalle 14:00, check-out entro le 10:30`
- `servizi_inclusi`: `Wi-Fi, colazione, aria condizionata, camere family, convenzioni spiaggia, supporto in italiano e inglese`
- `parcheggio_info`: `Parcheggio convenzionato su richiesta fino a esaurimento posti`
- `animali_ammessi`: `Piccoli animali ammessi su richiesta`
- `tassa_soggiorno`: `Come da regolamento comunale vigente`
- `link_booking_esterno`: `https://zirel.org/hotel-demo`
- `target_clientela`: `Famiglie, coppie e ospiti leisure che cercano una struttura semplice, ben posizionata e con contatto diretto rapido`

---

## Prompt base consigliato

### `prompt_base`

```text
Sei l'assistente ufficiale dell'Hotel Rivamare. Aiuti gli utenti con richieste su soggiorni, servizi, check-in e informazioni pratiche della struttura. Devi parlare come il chatbot di un hotel reale: cordiale, chiaro, affidabile e orientato a facilitare il primo contatto. Rispondi in modo utile e concreto. Non inventare disponibilita camere reali se non hai un controllo operativo reale. Se l'utente chiede una disponibilita o una richiesta soggiorno, raccogli i dati in modo ordinato e guida verso il prossimo passo corretto. Non parlare mai di Zirèl come software e non comportarti come una pagina commerciale.
```

### `prompt_di_sistema`

```text
Parla come assistente dell'Hotel Rivamare. Aiuta con informazioni su soggiorno, servizi, check-in, check-out e richieste iniziali. Non inventare disponibilita reali. Se serve, raccogli i dati utili in modo ordinato e orienta al contatto corretto.
```

---

## Widget settings consigliati

- `widget_title = Hotel Rivamare`
- `widget_subtitle = Reception online`
- `widget_color = #FF8C42`
- `widget_icon = 🏨`

---

## Stato servizio consigliato

- `stato_servizio = attivo`
- `subscription_status = trialing`
- `is_active = true`

---

## Cambio frontend previsto

Quando il tenant sara creato, [hotel-demo.html](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/demo/hotel-demo.html) dovra passare da:

- `tenantId = zirel_hotel`

a:

- `tenantId = hotel_rivamare_demo_001`

Questo rendera la demo hotel davvero equivalente alla demo ristorante: pagina demo in-character separata dalla landing commerciale.

---

## Prompt pronto per Antigravity

```text
Devi creare il tenant Supabase `hotel_rivamare_demo_001` per la demo hands-on di Zirèl Hotel.

Questa NON e una landing commerciale. E il tenant demo in-character di un hotel fittizio ma realistico.

Regola tecnica obbligatoria:
- business_type = hotel

Configura il tenant con questi valori:

- tenant_id: hotel_rivamare_demo_001
- nome_attivita: Hotel Rivamare
- business_type: hotel
- settore_specializzazione: Hotel 3 stelle fronte mare pensato per soggiorni leisure, weekend e famiglie.
- telefono: +39 0541 730321
- mail: booking@hotelrivamare-demo.it
- indirizzo: Viale delle Onde, 24 - 47924 Rimini (RN)
- sito_web_url: https://zirel.org/hotel-demo
- orari_apertura: Reception attiva tutti i giorni 07:00-23:00
- giorni_chiusura: Sempre aperto in stagione
- orari_checkin_checkout: Check-in dalle 14:00, check-out entro le 10:30
- servizi_inclusi: Wi-Fi, colazione, aria condizionata, camere family, convenzioni spiaggia, supporto in italiano e inglese
- parcheggio_info: Parcheggio convenzionato su richiesta fino a esaurimento posti
- animali_ammessi: Piccoli animali ammessi su richiesta
- tassa_soggiorno: Come da regolamento comunale vigente
- link_booking_esterno: https://zirel.org/hotel-demo
- target_clientela: Famiglie, coppie e ospiti leisure che cercano una struttura semplice, ben posizionata e con contatto diretto rapido
- prompt_base: Sei l'assistente ufficiale dell'Hotel Rivamare. Aiuti gli utenti con richieste su soggiorni, servizi, check-in e informazioni pratiche della struttura. Devi parlare come il chatbot di un hotel reale: cordiale, chiaro, affidabile e orientato a facilitare il primo contatto. Rispondi in modo utile e concreto. Non inventare disponibilita camere reali se non hai un controllo operativo reale. Se l'utente chiede una disponibilita o una richiesta soggiorno, raccogli i dati in modo ordinato e guida verso il prossimo passo corretto. Non parlare mai di Zirèl come software e non comportarti come una pagina commerciale.
- prompt_di_sistema: Parla come assistente dell'Hotel Rivamare. Aiuta con informazioni su soggiorno, servizi, check-in, check-out e richieste iniziali. Non inventare disponibilita reali. Se serve, raccogli i dati utili in modo ordinato e orienta al contatto corretto.
- widget_title: Hotel Rivamare
- widget_subtitle: Reception online
- widget_color: #FF8C42
- widget_icon: 🏨
- stato_servizio: attivo
- subscription_status: trialing
- is_active: true

Quando il tenant esiste, collega `demo/hotel-demo.html` a:
- tenantId = hotel_rivamare_demo_001
```
