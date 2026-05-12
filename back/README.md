# euguide-ks — AI Backend

Backend i deployuar live: **https://euguide-ks-back.vercel.app**

---

## Stack

| Teknologjia | Përdorimi |
|---|---|
| Next.js 15 (App Router) | Framework — API routes |
| TypeScript | Gjuha |
| GPT-4o (OpenAI) | Model gjuhësor për chat dhe voice |
| text-embedding-3-small (OpenAI) | Embedding dokumentesh dhe pyetjeve |
| Supabase PostgreSQL + pgvector | Ruajtja e dokumenteve + similarity search |
| Supabase (sessions table) | Histori bisedash chat ↔ voice |
| Vapi | Voice agent webhook |
| Vercel | Hosting (auto-deploy nga `back/`) |

---

## API Endpoints

### `POST /api/chat`
Chat me RAG + streaming SSE.

**Body:**
```json
{ "message": "Çfarë është reforma administrative?", "sessionId": "uuid" }
```

**Reply:** SSE stream
```
data: {"delta":"Reforma administrative është..."}
data: {"delta":" proces i..."}
data: {"done":true,"sessionId":"uuid"}
```

- Kërkon dokumente relevante nga pgvector (similarity search)
- Injekton context + historinë e sesionit në prompt
- I përgjigjet në gjuhën e pyetjes (shqip/anglisht/serbisht) automatikisht
- Refuzon pyetjet jashtë temave: reforma, sundimi i ligjit, korrupsioni, BE

---

### `POST /api/ingest`
Ingestion dokumentesh nga admin panel.

**Body:**
```json
{ "fileName": "reforma.pdf", "content": "<base64>" }
```

**Reply:**
```json
{ "status": "ok", "chunks": 24 }
```

- Pranon PDF dhe Word (.docx)
- Fshin chunks të vjetra për të njëjtin fileName
- Ndan dokumentin në chunks
- Krijon embedding për çdo chunk (text-embedding-3-small)
- Ruan në Supabase pgvector

---

### `POST /api/vapi`
Webhook për Vapi voice agent.

- `assistant-request` → kthen konfigurimin e asistentit me historinë e sesionit + context RAG
- `end-of-call-report` → ruan transkriptin e bisedës zanore në sesion

---

### `GET /api/session/[id]`
Merr historinë e sesionit (për continuity chat ↔ voice).

**Reply:**
```json
{ "messages": [{"role":"user","content":"..."},{"role":"assistant","content":"..."}], "sessionId": "uuid" }
```

---

## Arkitektura RAG + Web Search Fallback

```
User dërgon pyetje
        ↓
Krijohet embedding i pyetjes (OpenAI)
        ↓
Similarity search në pgvector (top 5 chunks)
        ↓
Merret historia e sesionit nga Supabase
        ↓
┌─── Ka dokumente relevante? ───┐
│                                │
│ PO                          JO │
│ ↓                            ↓ │
│ Chat Completions      Responses API │
│ GPT-4o + context      GPT-4o + web_search │
│ (dokumente lokale)    (kërkon online në │
│                        burime të besueshme: │
│                        europa.eu, mei-ks.net, │
│                        kryeministri.rks-gov.net, │
│                        ec.europa.eu, etc.) │
└────────────────────────────────┘
        ↓
SSE stream → frontend
        ↓
Sesioni ruhet në Supabase
```

### Burimet online të besueshme (kur RAG nuk gjen)
- europa.eu, ec.europa.eu (Komisioni Evropian)
- consilium.europa.eu (Këshilli i BE-së)
- kryeministri.rks-gov.net (Qeveria e Kosovës)
- mei-ks.net (Ministria për Integrim Evropian)
- md.rks-gov.net (Ministria e Drejtësisë)
- gjyqesori-rks.org (Këshilli Gjyqësor)
- assembly-kosova.org (Kuvendi i Kosovës)

AI citon burimin kur përgjigjet nga interneti.

---

## Session Continuity (Chat ↔ Voice)

```
Chat widget → POST /api/chat { sessionId: "abc" }
                    ↓
            sesioni ruhet me sessionId "abc"
                    ↓
Voice buton → Vapi call me sessionId "abc"
                    ↓
POST /api/vapi → merr historinë → vazhdon bisedën
                    ↓
Mbaron thirrja → transcript ruhet → chat vazhdon
```

`sessionId` ruhet në `localStorage` të browserit dhe kalon si parametër.

---

## Supabase Schema

Ekzekuto një herë në Supabase SQL Editor:

**`supabase.sql`** — tabela AI:
- `documents` — chunks + embeddings (1536 dim pgvector)
- `sessions` — histori bisedash (JSONB)
- Funksioni `match_documents` — similarity search me threshold

**`supabase-cms.sql`** — tabela CMS (lexohen nga frontend):
- `pages` — faqet kryesore (sq/en/sr)
- `sections` — seksionet brenda faqeve (rich text)
- `articles` — artikuj dhe lajme
- `faq_items` — pyetje & përgjigje (sq/en/sr)
- `infographics` — infografika me imazhe

---

## Environment Variables

Vendosen direkt në Vercel (jo në kod):

```
OPENAI_API_KEY       = sk-...
SUPABASE_URL         = https://onitqrbcncgikyhsngon.supabase.co
SUPABASE_SERVICE_KEY = eyJ...   ← service_role key (jo anon)
VAPI_SECRET          = ...
ALLOWED_ORIGIN       = https://www.euguide-ks.info
```

---

## Strukturë Folderësh

```
back/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts       ← SSE streaming chat + RAG
│   │   │   ├── vapi/route.ts       ← Voice webhook
│   │   │   ├── ingest/route.ts     ← Document ingestion
│   │   │   └── session/[id]/route.ts ← Session fetch
│   │   └── page.tsx                ← Lista e API routes
│   └── lib/
│       ├── rag.ts                  ← searchDocuments()
│       ├── session.ts              ← getSession() / saveSession()
│       └── prompt.ts               ← System prompt (multilingual + topic restriction)
├── supabase.sql                    ← AI schema (ekzekuto në Supabase)
├── supabase-cms.sql                ← CMS schema (ekzekuto në Supabase)
└── package.json
```

---

## Deployment

Auto-deploy në çdo `git push` në `main`.

- **Platform:** Vercel
- **Root directory:** `back/`
- **Build:** `npm run build`
- **Start:** `npm run start` (port 8000)
