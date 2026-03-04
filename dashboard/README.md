# Zirèl Dashboard

Dashboard clienti React/TypeScript connesso a Supabase.

## Dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Env richieste

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Note

- Routing SPA gestito da `vercel.json`.
- Le operazioni applicative passano da helper Supabase nel codice `src/lib`.
