# KO-in-EU — Platformë Informuese për Integrimin e Kosovës në BE

> **KO-in-EU Hackathon** · Platforma ndihmon qytetarët, studentët dhe palët e interesit të kuptojnë tre fusha të procesit të integrimit evropian: reformën administrative, sundimin e ligjit dhe luftën kundër korrupsionit.

---

## Synimi i Platformës

Shumë qytetarë të Kosovës kanë informacione të fragmentuara për proceset e integrimit. Kjo platformë shërben si **qendër informuese** ku temat komplekse shpjegohen me gjuhë të thjeshtë, infografika, dokumente dhe pyetje të shpeshta — me mbështetje të **AI chatbot** dhe **voice agent** shumëgjuhësh.

---

## Struktura e Repo-s (Monorepo)

```
AAB-HACKATHON-1/
├── back/     ← AI Backend  (Koyeb)
└── front/    ← Web Frontend (Vercel)
```

---

## Stack Teknologjik

| Shtresa | Teknologjia |
|---|---|
| Frontend | Next.js 15 · React 19 · TypeScript · Tailwind CSS · shadcn/ui |
| Backend AI | Next.js 15 · GPT-4o · OpenAI Embeddings · Vapi |
| Database | Supabase (PostgreSQL · pgvector · Storage · Auth) |
| Hosting Backend | Koyeb (auto-deploy nga `back/`) |
| Hosting Frontend | Vercel (auto-deploy nga `front/`) |
| Versionim | GitHub → push → auto-deploy të dyja |

---

## Ekipi dhe Rolet

| Roli | Detyra |
|---|---|
| **Juristët** | Sigurojnë content (dokumente PDF/Word, FAQ, tekste ligjore) |
| **Dizajnerët** | Dizajnojnë UI/UX në Figma (nuk vendosin content) |
| **Web Devs** | Ndërtojnë `front/` — faqet publike + admin panel |
| **AI Devs** | Ndërtojnë `back/` — chatbot, voice agent, RAG, ingestion |

---

## Faqet e Platformës

### Publike
| Route | Faqja | Përshkrimi |
|---|---|---|
| `/` | **Home** | Hero · 4 karta temash · statistika · artikuj të fundit |
| `/reforma` | **Reforma Administrative** | Qëllimi i reformës · dokumentet strategjike · përfitimet |
| `/sundimi` | **Sundimi i Ligjit** | Të drejtat e qytetarëve · barafia para ligjit · institucionet |
| `/korrupsioni` | **Lufta kundër Korrupsionit** | Format e korrupsionit · si raportohet · institucionet |
| `/be` | **Integrimi në BE** | Pse BE · progresi i Kosovës · hapat e ardhshëm |
| `/faq` | **Pyetje të Shpeshta** | Search · kategori · accordion Q&A |
| `/infografika` | **Infografika** | Grid · download · filter |

### Admin Panel (i mbrojtur — Supabase Auth)
| Route | Funksioni |
|---|---|
| `/admin` | Dashboard me statistika |
| `/admin/pages` | Menaxhim hero + seksionesh për çdo faqe |
| `/admin/articles` | Artikuj dhe lajme |
| `/admin/faq` | FAQ CRUD (shqip · anglisht · serbisht) |
| `/admin/infographics` | Upload + renditje infografikash |
| `/admin/documents` | Upload PDF/Word → trigger AI ingestion automatik |
| `/admin/media` | Media library (Supabase Storage) |
| `/admin/users` | Menaxhim adminëve |

---

## Shtresat AI (back/)

### API Endpoints

| Endpoint | Metoda | Funksioni |
|---|---|---|
| `/api/chat` | POST | Chat me RAG + streaming SSE |
| `/api/vapi` | POST | Vapi voice webhook |
| `/api/ingest` | POST | Auto-ingestion dokumentesh nga admin |
| `/api/session/[id]` | GET | Merr historinë e sesionit |

### Shtesa AI (jo në dokumentin origjinal)

| Shtesa | Përshkrimi |
|---|---|
| **Chat widget** | Floating button gjithë faqet · drawer me streaming |
| **Voice agent** | Vapi call · vazhdon bisedën nga chat |
| **Session continuity** | Chat → Voice → Chat me histori të njëjtë |
| **Multilingual** | Shqip · Anglisht · Serbisht automatikisht |
| **RAG** | Dokumentet e juristëve → knowledge base → përgjigje të sakta |
| **Topic restriction** | AI refuzon pyetjet jashtë temës |

### Bashkëpunimi AI ↔ Ekipit

```
Juristët → /admin/documents → upload PDF/Word
                  ↓
           Auto-ingestion → pgvector (Supabase)
                  ↓
    Chatbot + Voice → përgjigje bazuar në dokumente reale
```

---

## Database Schema (Supabase)

### Tabela AI (`back/supabase.sql`)
- `documents` — chunks + embeddings (pgvector)
- `sessions` — histori bisedash

### Tabela CMS (`back/supabase-cms.sql`)
- `pages` — faqet kryesore (slug, hero, multilang)
- `sections` — seksionet brenda faqeve (rich text)
- `articles` — artikuj dhe lajme
- `faq_items` — pyetje & përgjigje (sq/en/sr)
- `infographics` — infografika me imazhe

---

## API Contract (Frontend ↔ Backend)

```
POST {KOYEB_URL}/api/chat
Body:  { message: string, sessionId: string }
Reply: SSE stream → { delta } ... { done: true, sessionId }

POST {KOYEB_URL}/api/ingest
Body:  { fileName: string, content: string (base64) }
Reply: { status: 'ok', chunks: number }

GET  {KOYEB_URL}/api/session/:id
Reply: { messages: Message[], sessionId: string }
```

---

## Deployment (Auto-deploy në çdo push)

### Backend → Koyeb
```
Root directory:  back/
Build command:   npm run build
Run command:     npm run start
Port:            8000
```

**Env vars në Koyeb:**
```
OPENAI_API_KEY       = sk-...
SUPABASE_URL         = https://xxx.supabase.co
SUPABASE_SERVICE_KEY = eyJ...
VAPI_SECRET          = ...
ALLOWED_ORIGIN       = https://your-app.vercel.app
```

### Frontend → Vercel
```
Root directory:  front/
Framework:       Next.js
```

**Env vars në Vercel:**
```
NEXT_PUBLIC_AI_URL          = https://your-app.koyeb.app
NEXT_PUBLIC_SUPABASE_URL    = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON   = eyJ...
```

---

## Hapat e Setup-it (Rend Ekzekutimi)

### Faza 1 — Accountet dhe API Keys
- [ ] Krijo account [Supabase](https://supabase.com) → merr `URL` + `anon key` + `service key`
- [ ] Krijo account [OpenAI](https://platform.openai.com) → merr `API Key`
- [ ] Krijo account [Vapi](https://vapi.ai) → merr `API Key` + konfiguро voice assistant
- [ ] Krijo account [Koyeb](https://koyeb.com) → lidh me GitHub repo
- [ ] Lidh [Vercel](https://vercel.com) me GitHub repo

### Faza 2 — Database Setup
- [ ] Supabase SQL Editor → ekzekuto `back/supabase.sql`
- [ ] Supabase SQL Editor → ekzekuto `back/supabase-cms.sql`
- [ ] Supabase → aktivizo `Email Auth`
- [ ] Supabase Storage → krijo bucket `media`

### Faza 3 — Backend Deploy (Koyeb)
- [ ] Shto env vars në Koyeb
- [ ] Set root directory: `back/`
- [ ] Deploy → testo `POST /api/chat`

### Faza 4 — Frontend (Web Devs)
- [ ] Krijo Next.js projekt në `front/`
- [ ] Instalo: `@supabase/supabase-js @supabase/ssr tailwindcss shadcn-ui`
- [ ] Shto env vars në Vercel
- [ ] Ndërto faqet nga CMS (dynamic)
- [ ] Integro chat widget me `NEXT_PUBLIC_AI_URL`

### Faza 5 — Content (Juristët)
- [ ] Hyr në `/admin` → shto dokumentet PDF/Word
- [ ] Plotëso content për çdo faqe
- [ ] Shto FAQ items
- [ ] Upload infografika

### Faza 6 — Testim Para Demo
- [ ] Chat shqip: "Çfarë është reforma administrative?" → përgjigje shqip ✓
- [ ] Chat jashtë temës: "Çmimi i bukës?" → refuzim ✓
- [ ] Voice → vazhdo në chat me histori ✓
- [ ] Admin CRUD → reflektohet live në faqe ✓
- [ ] Mobile responsive ✓

---

## Dizajni — Çfarë Duhet Dizajnuar

Dizajnerët punojnë në **Figma** për këto ekrane:

1. **Home** — Navbar · Hero · 4 karta · statistika · footer
2. **Faqe teme** — Hero · seksione · sidebar navigim · FAQ mini
3. **FAQ** — Search · kategori · accordion
4. **Infografika** — Grid · hover preview · download
5. **Chat Widget** — Floating button · drawer · bubble messages · voice buton
6. **Admin Panel** — Dashboard · tabela CRUD · rich text editor · upload

> Dizajnerët dizajnojnë strukturën vizuale — content vendoset nga juristët nëpërmjet admin panel.

---

*KO-in-EU Hackathon — Pergatitur për përdorim akademik dhe orientues*
