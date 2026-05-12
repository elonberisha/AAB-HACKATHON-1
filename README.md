# euguide-ks — Platformë Informuese për Integrimin e Kosovës në BE

> Platforma ndihmon qytetarët, studentët dhe palët e interesit të kuptojnë procesin e integrimit të Kosovës në BE — reforma administrative, sundimi i ligjit, lufta kundër korrupsionit.

---

## URLs të Deployuara

| Shërbimi | URL |
|---|---|
| **Frontend** | https://euguide-ks.info |
| **Backend AI** | https://euguide-ks-back.vercel.app |
| **Supabase** | https://supabase.com → projekti `euguide-ks` |

---

## Struktura e Repo-s

```
AAB-HACKATHON-1/
├── back/     ← AI Backend (i ndërtuar, i deployuar ✅)
└── front/    ← Web Frontend (strukturë gati, web devs ndërtojnë)
```

---

## Stack

| Shtresa | Teknologjia |
|---|---|
| Frontend | Next.js 15 · React 19 · TypeScript · Tailwind CSS · shadcn/ui |
| Backend AI | Next.js 15 · GPT-4o · OpenAI Embeddings text-embedding-3-small |
| Voice | Vapi |
| Database | Supabase (PostgreSQL · pgvector · Storage · Auth) |
| Hosting | Vercel (të dyja `back/` dhe `front/`) |
| Domain | euguide-ks.info (Namecheap → Vercel) |

---

## Ekipi dhe Rolet

| Roli | Detyra |
|---|---|
| **Juristët** | Content: dokumente PDF/Word, FAQ, tekste ligjore — nëpërmjet admin panel |
| **Dizajnerët** | UI/UX në Figma për të gjitha faqet dhe komponentet |
| **Web Devs** | Ndërtojnë `front/` — faqet publike + admin panel (shih seksionin më poshtë) |
| **AI Devs** | `back/` i ndërtuar dhe deployuar ✅ |

---

## API Contract — Backend ↔ Frontend

Backend URL: `https://euguide-ks-back.vercel.app`

```
POST /api/chat
Body:  { message: string, sessionId: string }
Reply: SSE stream → data: {"delta":"..."} ... data: {"done":true,"sessionId":"..."}

POST /api/ingest
Body:  { fileName: string, content: string }  ← content është base64 i file-it
Reply: { status: "ok", chunks: number }

GET /api/session/:sessionId
Reply: { messages: [{role:"user"|"assistant", content:string}], sessionId: string }
```

Klienti i gatshëm ndodhet te `front/src/lib/ai.ts`.

---

## Faqet (Routes)

### Publike
| Route | Faqja | Seksionet |
|---|---|---|
| `/` | Home | Hero, 4 karta temash, statistika, artikuj të fundit |
| `/reforma` | Reforma Administrative | Hero, seksione nga CMS, FAQ, artikuj |
| `/sundimi` | Sundimi i Ligjit | Hero, seksione nga CMS, FAQ, artikuj |
| `/korrupsioni` | Lufta kundër Korrupsionit | Hero, seksione nga CMS, FAQ, artikuj |
| `/be` | Integrimi në BE | Hero, seksione nga CMS, FAQ, artikuj |
| `/faq` | Pyetje të Shpeshta | Search, kategori, accordion Q&A |
| `/infografika` | Infografika | Grid, hover preview, download |

### Admin Panel — i mbrojtur me Supabase Auth
| Route | Funksioni |
|---|---|
| `/login` | Login me email/password (Supabase Auth) |
| `/admin` | Dashboard: statistika dhe lidhje |
| `/admin/pages` | CRUD për faqet kryesore (hero + seksione) |
| `/admin/articles` | Artikuj dhe lajme |
| `/admin/faq` | FAQ (shqip · anglisht · serbisht) |
| `/admin/infographics` | Upload + renditje infografikash |
| `/admin/documents` | Upload PDF/Word → POST `/api/ingest` automatikisht |
| `/admin/media` | Media library (Supabase Storage bucket `media`) |
| `/admin/users` | Menaxhim adminëve |

---

## Çfarë Duhet të Ndërtojnë Web Devs

Struktura e folderëve dhe konfigurimi bazë janë gati në `front/`. Web devs duhet të:

### 1. Setup fillestar
```bash
cd front
npm install
# krijo .env.local nga .env.local.example dhe mbush vlerat
```

### 2. Instalo libraritë shtesë
```bash
npm install @supabase/ssr
npx shadcn@latest init
# komponente shadcn sipas nevojës: button, input, dialog, sheet, accordion, etc.
```

### 3. Supabase Auth middleware
Krijo `front/src/middleware.ts` — mbron të gjitha rotat `/admin/*` dhe redirekton te `/login` nëse jo i autentikuar. Përdor `@supabase/ssr` për server-side session.

### 4. Layout publik
Krijo layout për grupin `(public)` me:
- `Navbar` — logo + 4 lidhje + zgjedhës gjuhe (sq/en/sr)
- `Footer`
- `ChatWidget` — floating bottom-right, drawer me SSE streaming

### 5. Faqet publike (dynamic nga Supabase)
Çdo faqe (`/reforma`, `/sundimi`, `/korrupsioni`, `/be`) lexon nga:
- tabela `pages` (sipas `slug`) — hero title, subtitle, image
- tabela `sections` (sipas `page_id`) — seksione me rich text
- tabela `articles` (sipas `page_id`) — artikuj të lidhur
- tabela `faq_items` (sipas `page_id`) — FAQ mini

### 6. Chat Widget (`front/src/components/chat/ChatWidget.tsx`)
- Floating button bottom-right në të gjitha faqet
- Drawer hapet nga djathtas
- Dërgon `POST /api/chat` me SSE streaming
- `sessionId` ruhet në `localStorage`
- Buton voice → hap Vapi call me `sessionId`

### 7. Admin Panel
Çdo faqe admin kryen CRUD direkt me Supabase client (`front/src/lib/supabase.ts`).

Faqja `/admin/documents` duhet:
1. Marrë file PDF/Word nga user
2. Konvertuar në base64
3. `POST https://euguide-ks-back.vercel.app/api/ingest` me `{ fileName, content }`

### 8. Gjuha (i18n)
Hook `useLang` (`front/src/hooks/useLang.ts`) menaxhon gjuhën aktive (`sq`/`en`/`sr`) në `localStorage`. Të gjitha faqet shfaqin kolonën e duhur nga Supabase (`title_sq`, `title_en`, etj.).

---

## Çfarë Duhet të Dizajnojnë Dizajnerët (Figma)

1. **Home** — Navbar, Hero, 4 karta temash, statistika, footer
2. **Faqe teme** (`/reforma` etj.) — Hero, seksione me imazh+tekst, sidebar navigim, FAQ accordion
3. **FAQ** (`/faq`) — Search bar, filter kategori, accordion Q&A
4. **Infografika** (`/infografika`) — Grid kartat, hover preview, download buton
5. **Chat Widget** — Floating button, drawer, bubble messages, buton voice, indicator gjuhe
6. **Admin Panel** — Dashboard, tabela me CRUD, rich text editor, upload zona

---

## Çfarë Duhet të Bëjnë Juristët

1. Hyr te `https://euguide-ks.info/admin` (pasi web devs ta ndërtojnë)
2. Shto dokumente PDF/Word te `/admin/documents` → AI i indekson automatikisht
3. Plotëso content për çdo faqe te `/admin/pages`
4. Shto FAQ te `/admin/faq` (shqip + anglisht + serbisht)
5. Upload infografika te `/admin/infographics`

---

## Supabase — Çfarë Mbetet

Ekzekuto këto dy skedarë në Supabase SQL Editor (një herë):

1. `back/supabase.sql` — pgvector + tabela AI (documents, sessions)
2. `back/supabase-cms.sql` — tabela CMS (pages, sections, articles, faq_items, infographics)

Pastaj:
- Supabase → Authentication → aktivizo **Email** provider
- Supabase → Storage → krijo bucket `media` (public)
- Krijo user-in e parë admin: Authentication → Users → Invite user

---

## Variabla të Mjedisit

### front/.env.local
```
NEXT_PUBLIC_AI_URL=https://euguide-ks-back.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://onitqrbcncgikyhsngon.supabase.co
NEXT_PUBLIC_SUPABASE_ANON=<anon key nga Supabase Settings → API>
```

### back/ (në Vercel env vars — jo në kod)
```
OPENAI_API_KEY       = sk-...
SUPABASE_URL         = https://onitqrbcncgikyhsngon.supabase.co
SUPABASE_SERVICE_KEY = eyJ...
VAPI_SECRET          = ...
ALLOWED_ORIGIN       = https://www.euguide-ks.info
```

---

## Testim Para Demo

- [ ] Chat shqip: "Çfarë është reforma administrative?" → përgjigje shqip
- [ ] Chat jashtë temës: "Çmimi i bukës?" → refuzim
- [ ] Upload dokument PDF → pyet chatbotin për content → përgjigje e saktë
- [ ] Voice → vazhdo në chat me histori
- [ ] Admin CRUD → reflektohet live në faqe
- [ ] Mobile responsive
- [ ] `euguide-ks.info` hapet pa gabime

---

*euguide-ks — AAB Hackathon*
