# euguide-ks — Frontend

Frontend i deployuar live: **https://euguide-ks.info**

---

## Stack

| Teknologjia | Përdorimi |
|---|---|
| Next.js 15 (App Router) | Framework |
| React 19 | UI |
| TypeScript | Gjuha |
| Tailwind CSS | Styling |
| shadcn/ui | Komponente UI (Button, Dialog, Sheet, Accordion, Table, etc.) |
| @supabase/supabase-js | Supabase client (database + auth + storage) |
| @supabase/ssr | Server-side auth + middleware |
| Vercel | Hosting (auto-deploy nga `front/`) |

---

## Setup

```bash
cd front
npm install

# Supabase client + SSR (tashmë në package.json, instalohen me npm install)
# Nëse mungojnë:
npm install @supabase/supabase-js @supabase/ssr

# Inicializo shadcn/ui
npx shadcn@latest init

# Shto komponentin Supabase Auth nga shadcn (gati për përdorim — login form, session, etc.)
npx shadcn@latest add @supabase/supabase-client-nextjs

# Komponente shadcn shtesë sipas nevojës
npx shadcn@latest add button input dialog sheet accordion table dropdown-menu form select textarea
```

Krijo `.env.local` nga `.env.local.example`:
```
NEXT_PUBLIC_AI_URL=https://euguide-ks-back.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://onitqrbcncgikyhsngon.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key nga Supabase → Settings → API>
```

```bash
npm run dev   # localhost:3000
```

### Komponente shadcn UI të rekomanduara
- **Button, Input, Form** — për të gjitha format
- **Dialog, Sheet** — për chat widget drawer, modale admin
- **Accordion** — për FAQ
- **Table, DropdownMenu** — për admin CRUD
- **Select, Textarea** — për form admin
- Më shumë komponente: [ui.shadcn.com](https://ui.shadcn.com) dhe [supabase.com/ui](https://supabase.com/ui)

---

## User Auth — Google Login (për qytetarët)

Qytetarët (vizitorët e platformës) logohen me Google account para se të përdorin chat-in. Kjo mundëson ruajtjen e bisedave nën accountin e tyre.

### Si funksionon
1. User hap chat widget → nëse nuk është i loguar, shfaqet buton **"Vazhdo me Google"**
2. Klik → Supabase Auth `signInWithOAuth({ provider: 'google' })` → Google consent screen
3. Pas login-it, user merr `user.id` nga Supabase — ky përdoret si `sessionId` për chat
4. Bisedat ruhen në Supabase nën `user.id` — user mund t'i shohë historinë kur kthehet

### Supabase Setup (njëherë)
1. Supabase → Authentication → Providers → **Google** → Enable
2. Shto Google OAuth credentials (Client ID + Client Secret):
   - Shko te [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
   - Create OAuth Client ID → Web application
   - Authorized redirect URI: `https://onitqrbcncgikyhsngon.supabase.co/auth/v1/callback`
   - Kopjo Client ID dhe Client Secret → vendos në Supabase Google provider settings

### Të dhënat që merren nga Google
- **email** — adresa e email-it
- **full_name** — emri i plotë
- **avatar_url** — foto e profilit

Këto ruhen automatikisht në `auth.users` të Supabase. Nuk ka nevojë për tabelë ekstra.

### Ku shfaqet
- **Chat widget** — para se user të shkruajë, duhet loguar me Google
- **Navbar** — nëse i loguar, shfaq avatar + emrin; nëse jo, buton "Hyr"
- User mund të bëjë logout nga Navbar

### Dallimi Admin vs User
| | User (qytetar) | Admin |
|---|---|---|
| Login | Google OAuth | Email + Password |
| Qëllimi | Chat + histori bisedash | Menaxhim content |
| Qasja | Faqet publike + chat | /admin/* |
| Supabase Auth | `signInWithOAuth` | `signInWithPassword` |

---

## Faqet Publike

### `/` — Home
- **Navbar** — logo euguide-ks, 4 lidhje temash (Reforma, Sundimi, Korrupsioni, BE), zgjedhës gjuhe (sq/en/sr)
- **Hero** — tekst motivues për integrimin e Kosovës në BE, imazh/ilustrim, buton "Mëso më shumë"
- **4 karta temash** — Reforma Administrative, Sundimi i Ligjit, Lufta kundër Korrupsionit, Integrimi në BE — çdo kartë linkon te faqja përkatëse
- **Seksion "Pse rëndëson integrimi në BE"** — tekst i shkurtër me statistika
- **Statistika** — numra kyç (progres bar EU, numri i dokumenteve të harmonizuara, etc.)
- **Artikujt e fundit** — 3 karta artikujsh nga tabela `articles` (rendit sipas `published_at`)
- **Footer** — logo, lidhje te faqet, kontakt, copyright
- **Chat widget** — floating button bottom-right (global, shfaqet në të gjitha faqet)

### `/reforma` — Reforma Administrative
- **Hero** — titull + nëntitull + imazh hero (nga tabela `pages` ku `slug='reforma'`)
- **Seksione** — listë seksionesh nga tabela `sections` (page_id = reforma) — secili ka titull, rich text content, imazh opsional, renditur sipas `sort_order`
- **Sidebar navigim** — lidhje te secili seksion (scroll to)
- **FAQ mini** — 3-5 pyetje nga tabela `faq_items` ku `page_id = reforma`, accordion format
- **Artikuj të lidhur** — artikuj nga `articles` ku `page_id = reforma`

### `/sundimi` — Sundimi i Ligjit
- Njëjtë si `/reforma` por slug = `sundimi`
- Tema: të drejtat e qytetarëve, barazia para ligjit, institucionet e sundimit të ligjit

### `/korrupsioni` — Lufta kundër Korrupsionit
- Njëjtë si `/reforma` por slug = `korrupsioni`
- Tema: format e korrupsionit, si raportohet, institucionet përgjegjëse

### `/be` — Integrimi në BE
- Njëjtë si `/reforma` por slug = `be`
- Tema: pse BE, progresi i Kosovës, hapat e ardhshëm, kriteret e anëtarësimit

### `/faq` — Pyetje të Shpeshta
- **Search bar** — kërko pyetje me tekst
- **Filter kategori** — filtrimi sipas page_id (Reforma, Sundimi, Korrupsioni, BE, Generale)
- **Accordion Q&A** — çdo pyetje hapet/mbyllet, shfaq përgjigjen
- **Mesazh në fund** — "Nuk gjete përgjigje? Pyet chatbotin tonë!" → hap chat widget
- Lexon nga tabela `faq_items` ku `published = true`

### `/infografika` — Infografika
- **Grid** me karta infografikash (imazh + titull + pershkrim)
- **Hover** → preview më i madh
- **Download buton** — shkarko imazhin origjinal
- **Filter** sipas kategorisë (opsional)
- Lexon nga tabela `infographics` ku `published = true`, renditur sipas `sort_order`

---

## Chat Widget (Global — të gjitha faqet)

Komponent floating bottom-right i dukshëm në çdo faqe:

- **Buton floating** — ikona chat, bottom-right, z-index i lartë
- **Drawer** — hapet nga djathtas kur klikohet butoni
- **Input mesazhi** — tekst + buton Send
- **Mesazhet** — bubble format (user djathtas, AI majtas)
- **SSE Streaming** — mesazhi i AI shfaqet fjala-pas-fjale
- **Buton Voice** — hap Vapi thirrje zanore me sessionId (AI vazhdon bisedën me zë)
- **Indicator gjuhe** — tregon gjuhën aktive (sq/en/sr)
- **sessionId** — ruhet në `localStorage`, i njëjtë për chat dhe voice

**Si funksionon:**
```
Klik chat buton → drawer hapet
User shkruan mesazh → POST /api/chat { message, sessionId }
AI përgjigjet me SSE stream → shfaqet live
User klikon voice → Vapi thirrje me sessionId → AI vazhdon bisedën me zë
Mbaron thirrja → transcript ruhet → chat vazhdon me histori
```

Klienti ndodhet gati te `front/src/lib/ai.ts` — funksionet `chatStream()`, `getSession()`.

---

## Histori Bisedash (Chat History)

Useri i loguar mund të shohë bisedat e mëparshme:

- **Sidebar në chat drawer** — lista e bisedave (renditur sipas datës, më e reja lart)
- **Çdo bisedë** — shfaq 2-3 fjalët e para të mesazhit të parë si titull
- **Klik** → hap bisedën e vjetër me të gjitha mesazhet
- **Bisedë e re** — buton "+" krijon sesion të ri
- Nëse user nuk është i loguar → nuk ka histori, vetëm bisedën aktuale (si anonim)

### Si ruhen
- `sessionId` = `user.id + timestamp` (ose UUID)
- Backend i ruan në tabelën `sessions` (Supabase) me `user_id` kolona
- Frontend merr listën: `GET /api/sessions?userId=xxx` ose direkt nga Supabase `sessions` tabela ku `user_id = auth.uid()`

---

## Gjuha — Multilingual (sq/en/sr)

- **Zgjedhësi** në Navbar — klik → ndrysho gjuhën
- Gjuha ruhet në `localStorage` nëpërmjet hook-ut `useLang` (`front/src/hooks/useLang.ts`)
- Të gjitha tabelat në Supabase kanë kolona `_sq`, `_en`, `_sr` — lexo kolonën sipas gjuhës aktive
- Shembull: nëse gjuha = `en`, lexo `title_en`, `content_en`, `question_en`, `answer_en`
- Chatbot-i automatikisht i përgjigjet në gjuhën e pyetjes (nuk ka nevojë t'i thuhet)

---

## Admin Panel — i mbrojtur me Supabase Auth

### `/login` — Login
- Form me email + password
- Autentikimi: Supabase Auth (`signInWithPassword`)
- Pas login-it → redirekto te `/admin`
- Nëse nuk je i autentikuar → redirekto te `/login`

### Middleware Auth
Krijo `front/src/middleware.ts` — kontrollon sesionin Supabase për çdo request te `/admin/*`. Nëse nuk ka sesion → redirekto te `/login`.

### `/admin` — Dashboard
- Numri i faqeve, artikujve, FAQ-ve, dokumenteve, infografikave
- Lidhje te secili seksion i admin-it
- Activity feed (opsional): veprimet e fundit

### `/admin/pages` — Menaxhim Faqesh
- **Tabelë** me faqet ekzistuese (Reforma, Sundimi, Korrupsioni, BE)
- **Edit** — ndryshon: hero title (sq/en/sr), hero subtitle, hero image
- **Seksionet** — brenda çdo faqe, listë seksionesh (CRUD):
  - Titull (sq/en/sr)
  - Content rich text (sq/en/sr) — përdor Tiptap ose react-quill
  - Imazh opsional (upload në Supabase Storage)
  - Sort order (drag & drop ose numër)
- Tabela Supabase: `pages` + `sections`

### `/admin/articles` — Artikuj dhe Lajme
- **Tabelë** e artikujve me titull, status (draft/published), data
- **CRUD** — krijo/edito/fshi artikuj:
  - Titull (sq/en)
  - Body rich text (sq/en) — Tiptap ose react-quill
  - Cover image (upload në Supabase Storage)
  - Page (opsional — lidh me një faqe specifike)
  - Published boolean + published_at date
- Tabela Supabase: `articles`

### `/admin/faq` — FAQ
- **Tabelë** me pyetjet ekzistuese
- **CRUD** — krijo/edito/fshi pyetje:
  - Question (sq/en/sr)
  - Answer (sq/en/sr)
  - Page (opsional — lidh me faqe specifike)
  - Sort order
  - Published boolean
- Tabela Supabase: `faq_items`

### `/admin/infographics` — Infografika
- **Grid** me infografikat ekzistuese
- **CRUD** — krijo/edito/fshi:
  - Titull (sq/en)
  - Pershkrim (sq/en)
  - Imazh (upload në Supabase Storage)
  - Sort order
  - Published boolean
- Tabela Supabase: `infographics`

### `/admin/documents` — Upload Dokumentesh (PDF/Word → AI)
- **Upload zone** — drag & drop ose klik për zgjedhje file
- **Pranon:** PDF (.pdf) dhe Word (.docx)
- **Pas upload-it:**
  1. Lexon file-in, konverton në base64
  2. Dërgon `POST https://euguide-ks-back.vercel.app/api/ingest` me `{ fileName, content }`
  3. Tregon statusin: "U indeksua — 24 chunks"
- **Listë dokumentesh** — emri, data e upload-it, numri i chunks
- Juristët përdorin këtë faqe për të ngarkuar dokumente ligjore — AI i indekson automatikisht dhe chatbot-i i përdor për përgjigje

### `/admin/media` — Media Library
- **Upload** imazhe në Supabase Storage (bucket `media`)
- **Grid** me imazhet ekzistuese — preview + URL
- **Kopjo URL** — klik → kopjon URL-në publike (për hero images, artikuj, etc.)
- **Fshi** — fshi imazhin nga Storage

### `/admin/users` — Menaxhim Adminëve
- **Tabelë** e user-ave admin (nga Supabase Auth)
- **Invite** — ftesa me email (Supabase `inviteUserByEmail`)
- **Deactivate** — çaktivizim (nuk fshin, vetëm ndalon hyrjen)

---

## Supabase Database (Tabelat CMS)

Këto tabela lexohen/shkruhen nga frontend-i:

### `pages`
| Kolona | Tipi | Përshkrimi |
|---|---|---|
| id | uuid | PK |
| slug | text | 'reforma', 'sundimi', 'korrupsioni', 'be' |
| title_sq, title_en, title_sr | text | Titulli i faqes |
| hero_title_sq, hero_title_en | text | Teksti hero |
| hero_subtitle_sq, hero_subtitle_en | text | Nëntitulli hero |
| hero_image_url | text | URL e imazhit hero |
| published | boolean | E publikuar? |

### `sections`
| Kolona | Tipi | Përshkrimi |
|---|---|---|
| id | uuid | PK |
| page_id | uuid | FK → pages |
| title_sq, title_en, title_sr | text | Titulli i seksionit |
| content_sq, content_en, content_sr | text | Rich text HTML |
| image_url | text | Imazh opsional |
| sort_order | int | Renditja |

### `articles`
| Kolona | Tipi | Përshkrimi |
|---|---|---|
| id | uuid | PK |
| page_id | uuid | FK → pages (null = general) |
| title_sq, title_en | text | Titulli |
| body_sq, body_en | text | Body rich text |
| cover_image_url | text | Cover image |
| published | boolean | E publikuar? |
| published_at | timestamptz | Data e publikimit |

### `faq_items`
| Kolona | Tipi | Përshkrimi |
|---|---|---|
| id | uuid | PK |
| page_id | uuid | FK → pages (null = general) |
| question_sq, question_en, question_sr | text | Pyetja |
| answer_sq, answer_en, answer_sr | text | Përgjigja |
| sort_order | int | Renditja |
| published | boolean | E publikuar? |

### `infographics`
| Kolona | Tipi | Përshkrimi |
|---|---|---|
| id | uuid | PK |
| title_sq, title_en | text | Titulli |
| image_url | text | URL e imazhit |
| description_sq, description_en | text | Pershkrimi |
| sort_order | int | Renditja |
| published | boolean | E publikuar? |

---

## Strukturë Folderësh

```
front/
├── src/
│   ├── app/
│   │   ├── page.tsx                           ← Home
│   │   ├── layout.tsx                         ← Root layout (Navbar, Footer, ChatWidget)
│   │   ├── login/page.tsx                     ← Login
│   │   ├── (public)/
│   │   │   ├── reforma/page.tsx               ← Reforma Administrative
│   │   │   ├── sundimi/page.tsx               ← Sundimi i Ligjit
│   │   │   ├── korrupsioni/page.tsx           ← Lufta kundër Korrupsionit
│   │   │   ├── be/page.tsx                    ← Integrimi në BE
│   │   │   ├── faq/page.tsx                   ← Pyetje të Shpeshta
│   │   │   └── infografika/page.tsx           ← Infografika
│   │   └── admin/
│   │       ├── page.tsx                       ← Dashboard
│   │       ├── pages/page.tsx                 ← Menaxhim faqesh + seksionesh
│   │       ├── articles/page.tsx              ← Artikuj
│   │       ├── faq/page.tsx                   ← FAQ CRUD
│   │       ├── infographics/page.tsx          ← Infografika CRUD
│   │       ├── documents/page.tsx             ← Upload docs → AI ingestion
│   │       ├── media/page.tsx                 ← Media library
│   │       └── users/page.tsx                 ← Menaxhim adminëve
│   ├── components/
│   │   ├── ui/                                ← shadcn/ui komponente
│   │   ├── layout/
│   │   │   ├── Navbar.tsx                     ← Navbar global
│   │   │   └── Footer.tsx                     ← Footer global
│   │   ├── chat/
│   │   │   └── ChatWidget.tsx                 ← Chat widget floating
│   │   └── admin/                             ← Komponente admin (tabela, forma, etc.)
│   ├── hooks/
│   │   ├── useChat.ts                         ← Menaxhon chat messages + SSE stream
│   │   └── useLang.ts                         ← Gjuha aktive (sq/en/sr)
│   ├── lib/
│   │   ├── supabase.ts                        ← Supabase client (gati ✅)
│   │   └── ai.ts                              ← chatStream, ingestDocument, getSession (gati ✅)
│   ├── types/
│   │   └── index.ts                           ← TypeScript types (gati ✅)
│   └── middleware.ts                          ← Auth guard për /admin/*
├── .env.local.example                         ← Shembull env vars
└── package.json
```

---

## Supabase Setup (njëherë — para se të filloni punë)

Supabase projekti: `euguide-ks` — https://supabase.com/dashboard

### 0. Ftesa në projekt (për të gjithë devsat)
Owner-i i projektit (Elon) duhet të ftojë devsat tjerë:
1. Supabase → **Organization Settings** → **Team** → **Invite member**
2. Vendos email-in e dev-it
3. Role: **Developer** (mund të bëjë SQL Editor, krijojë tabela) ose **Owner** (akses i plotë)
4. Dev-i pranon ftesën nga email-i → e sheh projektin në dashboard-in e vet

**Të gjithë devsat mund të bëjnë hapat 1-5 më poshtë** — nuk është vetëm punë e owner-it.

### 1. Database — Ekzekuto SQL Schema
Shko te **SQL Editor** → New query → copy-paste `back/supabase.sql` → **Run**.

Krijon të gjitha tabelat me **një ekzekutim**:

**AI:**
- `documents` — chunks + embeddings (pgvector)
- `uploaded_documents` — listë e dokumenteve PDF/Word të ngarkuara
- `sessions` — histori bisedash (lidhet me user)
- `match_documents()` — RPC për similarity search me threshold

**CMS:**
- `pages`, `sections`, `articles`, `faq_items`, `infographics`
- `categories`, `tags`, `article_tags`
- Seed data: 4 faqet + 4 kategori

**Auth & Tracking:**
- `profiles` — user me role (user/admin/editor), auto-krijohet me trigger
- `media_library` — metadata për imazhet në Storage
- `activity_log` — log i veprimeve admin

**Plus:**
- RLS policies për të gjitha tabelat (public read + admin write)
- Triggers për `updated_at` automatik
- 2 Storage buckets: `media` (public), `documents` (private)
- Helper function `is_admin()`

### 2. Authentication — Aktivizo Providers

**Google (për qytetarët):**
1. Supabase → Authentication → Providers → **Google** → Enable
2. Shko te [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
3. Create OAuth Client ID → Web application
4. Authorized JavaScript origins: `https://euguide-ks.info`
5. Authorized redirect URI: `https://onitqrbcncgikyhsngon.supabase.co/auth/v1/callback`
6. Kopjo **Client ID** + **Client Secret** → vendos në Supabase Google provider settings

**Email (për adminët):**
1. Supabase → Authentication → Providers → **Email** → duhet jetë Enable (default)
2. Supabase → Authentication → Users → **Add user** → shto admin-in e parë me email + password

### 3. Storage — Bucket për Media
1. Supabase → Storage → **New bucket**
2. Name: `media`
3. Public: **ON** (që imazhet të jenë aksesibël pa auth)
4. Allowed MIME types: `image/png, image/jpeg, image/webp, image/svg+xml, application/pdf`
5. Max file size: `10MB`

### 4. Admin Bootstrap (i pari admin manualisht)

Pas ekzekutimit të skemës, krijo admin-in e parë:

1. Supabase → Authentication → Users → **Add user** → email + password
2. Profilja krijohet automatikisht (trigger)
3. Promovo në admin:
   ```sql
   update profiles set role = 'admin' where email = 'YOUR_EMAIL@gmail.com';
   ```

Pastaj ai admin mund të promovojë të tjerët nga faqja `/admin/users` (UI me buton "Promote to admin").

### 5. Supabase URL + Keys (ku gjenden)
Supabase → Settings → API:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON` (frontend)
- **service_role key** → `SUPABASE_SERVICE_KEY` (backend vetëm — KURRSESI në frontend!)

---

## Vapi Setup (Voice Agent)

### 1. Krijo account
- [vapi.ai](https://vapi.ai) → Sign Up

### 2. Krijo Assistant
- Dashboard → Assistants → Create Assistant
- **Name:** `euguide-ks`
- **Server URL:** `https://euguide-ks-back.vercel.app/api/vapi`
- **Voice:** `nova` (rekomandoj)
- **First message:** `Përshëndetje! Si mund t'ju ndihmoj me integrimin e Kosovës në BE?`

### 3. Merr Keys
- Organization Settings → **API Key** → shkon si `VAPI_SECRET` në backend (Vercel)
- Organization Settings → **Public Key** → përdoret në frontend code

### 4. Përdorimi në frontend
```typescript
import Vapi from '@vapi-ai/web'

const vapi = new Vapi('<VAPI_PUBLIC_KEY>')
vapi.start('<ASSISTANT_ID>', {
  metadata: { sessionId }  // i njëjti sessionId si chat
})
```

Libraria `@vapi-ai/web` është tashmë e instaluar në `front/package.json`.

---

## Deployment

Auto-deploy në çdo `git push` në `main`.

- **Platform:** Vercel
- **Root directory:** `front/`
- **Domain:** euguide-ks.info
- **Env vars:** vendosen në Vercel dashboard
