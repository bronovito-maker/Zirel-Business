# n8n AI Orchestration Workflows

## Overview
n8n acts as the central intelligence engine for Zirèl, connecting the chat UI to the AI models and the tenant's knowledge base. Three main workflows drive the system.

---

## 1. AI Core Workflow (Chat)

### Endpoint: `POST /webhook/chat`
**Headers:** `X-API-TOKEN`
**Payload:** `{ "message": "...", "sessionId": "..." }`

### Logic Blocks:
1.  **Auth Node:** Validates the `X-API-TOKEN` against the `tenants` table in Supabase.
2.  **Tenant Info Retrieval:** Fetches all relevant tenant metadata (Contacts, Opening Hours, Services, specialty info).
3.  **Vector Search Node (Supabase Vector):** Querying the vector database for relevant text snippets from the tenant's uploaded documents.
    -   **Critical Filter:** `metadata->>tenant_id = {{tenantId}}` to prevent cross-tenant data leaks.
4.  **AI Agent Node (OpenAI ChatModel):**
    -   **System Prompt:** Combines the core Zirèl identity with the specific tenant metadata and retrieved fragments.
    -   **Memory:** Context-aware conversation using the `sessionId`.
5.  **Output Formatter:** Standardizes the JSON response for the widget.

---

## 2. Ingestion Workflow (Knowledge Base)

### Endpoint: `POST /webhook/ingest`
**Payload:** Binary file data + `tenantId` + `api_token`

### Logic Blocks:
1.  **Extraction Node:** Parsing PDFs, CSVs, or text files into raw content.
2.  **Chunking Node:** Splitting text into optimized fragments (e.g., 500-1000 tokens) with overlap.
3.  **Embedding Generation:** Creating vector representations of each chunk using OpenAI's `text-embedding-ada-002`.
4.  **Supabase Vector Insert:** Storing the vectors along with metadata (e.g., `filename`, `tenant_id`).
5.  **Indexing:** The `match_documents` SQL function in Supabase handles the similarity search at runtime.

---

## 3. Appointment Workflow (`Registra_Appuntamento`)

This workflow is the shared appointment engine for non-restaurant tenants. It should be called only after explicit user confirmation and only when the assistant has already collected the required contact data, date, and time.

### Recommended Trigger
`When Executed by Another Workflow`

### Purpose
- Save a real appointment into Supabase.
- Send an internal Telegram alert.
- Optionally send a customer confirmation email via Resend.
- Return a structured success payload so the AI can confirm the appointment without hallucinating.

### Guardrails
- Reject unsupported sectors.
- Reject unsupported appointment types.
- Reject incomplete contact data.
- Reject vague scheduling requests that cannot be parsed reliably.
- Use `Europe/Rome` when resolving dates.
- Never let the assistant claim the appointment is booked before this workflow returns `success: true`.
- Keep Telegram and Resend on side branches so notification failures do not invalidate the successful database write.
- Brand the customer email body with the tenant identity; keep the sender on a verified Zirèl domain unless the tenant domain is separately verified.

### Operational Note
- If Railway shows `Queued` / `Starting soon`, this is usually infrastructure contention (busy worker, restart, cold start), not a workflow logic failure.

> See the detailed build spec in `docs/technical/REGISTRA_APPUNTAMENTO.md`.

---

## 4. Webhook Integration Details
- **Environment Variables:** All base URLs and keys are stored in n8n/Railway environment variables.
- **Fail-Safe:** If the webhook is unreachable, the widget should gracefully handle errors or switch to a fallback "Sito in manutenzione" message.
- **Scalability:** Hosted on Railway for predictable auto-scaling and high availability.
