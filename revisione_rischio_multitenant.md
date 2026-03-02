# Revisione Rischio Multi-Tenant (Conservativa)

Questa revisione analizza come l'isolamento tra i tenant è gestito nell'attuale architettura del dashboard Zirèl, evidenziando i punti in cui la sicurezza dipende dal client o da configurazioni Supabase esterne (RLS).

## 1. Punti di Accesso Determinati da `tenant_id` / `api_token`

Tutte le chiamate al backend sono state recentemente centralizzate in `lib/supabase-helpers.ts` e `lib/auth.ts`. I parametri chiave vengono usati come segue:

*   **`api_token` (Identità)**: 
    *   Usato in `authenticateTenant` e `getTenantData` per recuperare il `tenant_id` corrispondente.
    *   È l'unica "chiave" che il client possiede per dimostrare la propria identità.
*   **`tenant_id` (Isolamento)**:
    *   Usato come filtro clausola `.eq('tenant_id', tenantId)` in tutte le query (`tenants`, `prenotazioni`, `zirel_vectors`).
    *   Usato come prefisso di cartella nel bucket `tenant-documents`.

## 2. Vulnerabilità Teoriche di Cross-Tenant

Senza modifiche lato server (RLS), esistono i seguenti rischi teorici:

*   **Enumerazione / Iniezione ID**: Un utente malintenzionato potrebbe tentare di indovinare o enumerare `tenant_id` di altri clienti. Se le RLS di Supabase non sono configurate correttamente, una query manuale via console (es. `supabase.from('prenotazioni').select('*').eq('tenant_id', 'altroid')`) potrebbe restituire dati di terzi.
*   **Accesso allo Storage**: La struttura a cartelle `/tenant-documents/{tenant_id}/file.pdf` è sicura solo se le policy di Supabase Storage impediscono l'accesso a percorsi che non iniziano con il proprio `tenant_id`. Attualmente, il client richiede "Signed URL", ma la generazione di questi URL deve essere protetta lato server.

## 3. Verifiche Affidate Fondamentalmente al Client

Alcune verifiche critiche avvengono esclusivamente nel codice frontend:

*   **Correttezza del `tenant_id`**: I componenti (Dashboard, Reservations, DocumentManager) ricevono il `tenant_id` come prop e lo passano agli helper. Se il client venisse manipolato per passare un `tenant_id` diverso mantenendo il proprio token valido, la richiesta partirebbe comunque.
*   **Chiamate Webhook (n8n)**: Il `DocumentManager.tsx` invoca il webhook di n8n inviando il `tenant_id` nel body. Non c'è una verifica "server-to-server" che il mittente sia autorizzato per quel `tenant_id`.

## 4. Dipendenza Implicita dalle Policy RLS (Supabase)

Il progetto attuale è **estremamente dipendente** dalle Row Level Security (RLS) di Supabase. 

> [!WARNING]
> Se le RLS su `tenants`, `prenotazioni` o `storage.objects` sono disabilitate o impostate su `true` (permissive), l'isolamento multi-tenant è puramente "cosmetico" (frontend) e non offre sicurezza reale contro utenti tecnici malintenzionati.

## 5. Gap Analysis: Stato Attuale vs Futuro

| Area di Rischio | Stato Attuale (Frontend Guardrails) | Obiettivo (Backend Hardening) |
| :--- | :--- | :--- |
| **Isolamento Dati** | Validazione e filtri centralizzati in `supabase-helpers.ts`. | Policy RLS attive su ogni tabella basate su `api_token`. |
| **Storage** | Sanitizzazione nomi file e prefissi `tenant_id` nel client. | RLS Storage che impedisce l'accesso a `path` estranei. |
| **Webhooks** | Header di tracciabilità e metadati di sicurezza aggiunti. | Validazione `Authorization: Bearer` lato n8n. |
| **Sessioni** | `sessionStorage` come default, fallback legacy da `localStorage`, offuscamento solo cosmetico. | `HttpOnly Cookies` per prevenire furto via XSS. |

## Roadmap di Mitigazione

### 1. Fase Immediata (Documentazione & Allineamento)
- [x] Sincronizzazione Audit Tecnico con le ultime patch del frontend.
- [x] Documentazione delle dipendenze RLS critiche non ancora risolte.
- [x] Centralizzazione di tutte le chiamate esterne (Supabase, n8n).

### 2. Fase Tecnica (Sviluppo Backend/Integrity)
- [ ] Configurazione Policy RLS su Supabase (Priorità Alta).
- [ ] Implementazione Shared Secret per Webhook n8n.
- [ ] Protezione della funzione RPC per la rigenerazione token.

---
**Ultima verifica del codice:** 03 Marzo 2026. La documentazione riflette il runtime attuale del repository e separa i guardrail client-side dalle misure server-side ancora in roadmap.
