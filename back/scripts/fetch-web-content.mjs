/**
 * fetch-web-content.mjs
 * Shkarkon content nga burimet zyrtare dhe i ruan si .txt në /documents
 * Ekzekuto: node scripts/fetch-web-content.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_DIR = path.join(__dirname, '../documents')

if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true })

// Burimet kryesore — URL + emri i skedarit
const SOURCES = [
  // Kosovo Progress Reports (EC)
  {
    name: 'kosovo-progress-report-2024-ec',
    url: 'https://neighbourhood-enlargement.ec.europa.eu/document/download/e4b5e439-8bcd-4f46-ab59-00d1b98d1b4b_en?filename=Kosovo%20Report%202024.pdf',
    type: 'pdf',
  },
  // SAA - Stabilisation and Association Agreement
  {
    name: 'stabilisation-association-agreement-kosovo',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:22016A0218(01)',
    type: 'html',
  },
  // Kushtetuta e Kosovës
  {
    name: 'kushtetuta-kosoves',
    url: 'https://gzk.rks-gov.net/ActDocumentDetail.aspx?ActID=3702',
    type: 'html',
  },
  // Komisioni Evropian - Kosovo faqja kryesore
  {
    name: 'eu-commission-kosovo-overview',
    url: 'https://neighbourhood-enlargement.ec.europa.eu/enlargement-policy/country-profiles/kosovo_en',
    type: 'html',
  },
  // EULEX Kosovo
  {
    name: 'eulex-kosovo-mandate',
    url: 'https://www.eulex-kosovo.eu/en/info/whatisEULEX.php',
    type: 'html',
  },
  // MEI - Ministria per Integrim Evropian
  {
    name: 'mei-kosova-integrim',
    url: 'https://mei-ks.net/sq/integrimi-evropian',
    type: 'html',
  },
  // Agjencia Kundër Korrupsionit
  {
    name: 'akk-kosovo-about',
    url: 'https://www.akk-ks.net/sq/akk',
    type: 'html',
  },
  // Kuvendi i Kosovës
  {
    name: 'kuvendi-kosoves',
    url: 'https://assembly-kosova.org/sq/kuvendi/rreth-kuvendit',
    type: 'html',
  },
  // Ombudsperson
  {
    name: 'ombudsperson-kosova',
    url: 'https://oik-rks.org/sq/rreth-nesh/prezantimi',
    type: 'html',
  },
  // Gjykata Kushtetuese
  {
    name: 'gjykata-kushtetuese-kosoves',
    url: 'https://gjk-ks.org/sq/per-gjykaten/prezantimi',
    type: 'html',
  },
]

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function fetchHtml(url, name) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EUGuide-KS RAG Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'sq,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const text = stripHtml(html)
    if (text.length < 200) throw new Error('Content shumë i shkurtër')
    const outPath = path.join(DOCS_DIR, `${name}.txt`)
    fs.writeFileSync(outPath, text, 'utf-8')
    console.log(`  ✓ ${name}.txt (${Math.round(text.length / 1000)}KB)`)
    return true
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`)
    return false
  }
}

async function fetchPdf(url, name) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EUGuide-KS RAG Bot/1.0)' },
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const outPath = path.join(DOCS_DIR, `${name}.pdf`)
    fs.writeFileSync(outPath, buf)
    console.log(`  ✓ ${name}.pdf (${Math.round(buf.length / 1024)}KB)`)
    return true
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`)
    return false
  }
}

// Shto edhe content të strukturuar nga app-i vetë
function writeStaticContent() {
  const content = {
    'reforma-administrative-kosova': `
REFORMA ADMINISTRATIVE E KOSOVËS — Informacion i strukturuar

ÇFARË ËSHTË REFORMA ADMINISTRATIVE?
Reforma administrative në Kosovë ka për qëllim modernizimin e shërbimeve publike, dixhitalizimin e administratës, dhe rritjen e efikasitetit të institucioneve shtetërore.

OBJEKTIVAT KRYESORE:
1. Shërbime të integruara dixhitale — qytetarët të kenë qasje në shërbime online
2. Transparencë dhe llogaridhënie — publikimi i buxheteve dhe vendimeve
3. Reduktimi i burokracisë — thjeshtimi i procedurave administrative
4. Decentralizimi — transferimi i kompetencave te komunat

LEGJISLACIONI BAZË:
- Ligji Nr. 03/L-149 për Shërbimin Civil të Kosovës
- Ligji Nr. 04/L-051 për Organizimin dhe Funksionimin e Administratës Shtetërore
- Ligji Nr. 05/L-031 për Procedurën Administrative
- Ligji Nr. 06/L-113 për Qasje në Dokumente Publike

INSTITUCIONET KYÇE:
- Ministria e Administratës Publike (MAP)
- Departamenti i Administratës Publike
- Agjensia për Shërbime të Qeverisjes Elektronike (ASQE)

PROGRESI DERI TANI (2024):
- Platforma e-Kosovo operacionale për disa shërbime
- Sistemet e pagesave online të tarifave shtetërore
- Regjistri i ndërmarrjeve publike i reformuar
- Portali i transparencës buxhetore aktiv

SFIDAT:
- Ndryshimi i kulturës organizative
- Kapacitete të kufizuara teknike
- Koordinim i dobët ndërinstitucional
    `.trim(),

    'sundimi-ligjit-kosova': `
SUNDIMI I LIGJIT NË KOSOVË — Informacion i strukturuar

SISTEMI GJYQËSOR I KOSOVËS:
- Gjykata Kushtetuese — kontrollon kushtetutshmërinë e ligjeve
- Gjykata Supreme — shkalla e fundit e apelit
- Gjykata e Apelit — shqyrton ankesa nga gjykatat themelore
- Gjykata Themelore (7 gjykata + degë) — çështje civile, penale, administrative
- Gjykata Themelore Komerciale — çështje tregtare

PROKURORIA:
- Prokuroria e Shtetit
- Prokuroria Themelore (7)
- Departamenti Special i Prokurorisë — krim i organizuar, korrupsion
- Departamenti i Luftës kundër Trafikimit

KËSHILLAT:
- Këshilli Gjyqësor i Kosovës (KGjK) — qeveris sistemin gjyqësor
- Këshilli Prokurorial i Kosovës (KPK) — qeveris prokurorinë

LIGJET KRYESORE:
- Kushtetuta e Kosovës (2008)
- Kodi Penal i Kosovës (Nr. 06/L-074)
- Kodi i Procedurës Penale (Nr. 07/L-012)
- Kodi Civil i Kosovës
- Ligji për Gjykatat (Nr. 06/L-054)
- Ligji për Prokurorinë e Shtetit (Nr. 06/L-056)

SFIDAT KRYESORE:
- Vonesa në gjykime
- Kapacitete të kufizuara
- Zbatimi i vendimeve gjyqësore
- Pavarësia nga ndikimet politike

EULEX KOSOVO:
Misioni i BE-së për sundimin e ligjit. Mbështet gjyqësorin, prokurorinë dhe policinë.
Mandat deri në 2027.
    `.trim(),

    'lufta-korrupsion-kosova': `
LUFTA KUNDËR KORRUPSIONIT NË KOSOVË — Informacion i strukturuar

INSTITUCIONET KYÇE:
1. Agjencia Kundër Korrupsionit (AKK)
   - Themeluar: 2006
   - Mandati: parandalim, edukimi, monitorimi i konfliktit të interesit
   - Raporton para Kuvendit

2. Prokuroria Speciale (PSRK)
   - Heton korrupsionin e nivelit të lartë
   - Krim i organizuar ndërkombëtar

3. SHTF (Task Forca Speciale Hetimore)
   - Bashkëpunim EULEX-Kosovë

LEGJISLACIONI:
- Ligji Nr. 05/L-082 kundër Korrupsionit
- Ligji Nr. 06/L-011 për Deklarimin e Pasurisë
- Ligji Nr. 05/L-096 për Konfiskimin e Pasurisë
- Ligji Nr. 04/L-042 për Prokurimin Publik
- Ligji Nr. 06/L-082 për Mbrojtjen e Sinjalizuesve

DEKLARIMI I PASURISË:
- Të gjithë zyrtarët publik obligohen të deklarojnë pasurinë
- AKK verifikon dhe publikon deklaratat
- Mosdeklarimi ose deklarimi i rremë — vepër penale

PROKURIMI PUBLIK:
- Autoriteti Qendror i Prokurimit (AQP)
- Sistemi elektronik i prokurimit (e-prokurimi)
- Tenderat publike duhet të publikohen

SINJALIZUESIT (WHISTLEBLOWERS):
- Ligji mbron personat që raportojnë korrupsionin
- Mekanizma të sigurt raportimi
- Ndalim i hakmarrjes ndaj sinjalizuesve

STATISTIKAT (2024):
- Mbi 1000 raste aktive hetimore
- Bllokimi i pasurive të dyshuara
- Bashkëpunim i rritur ndërkombëtar
    `.trim(),

    'integrimi-kosova-be': `
INTEGRIMI I KOSOVËS NË BASHKIMIN EVROPIAN — Informacion i strukturuar

STATUSI AKTUAL:
- Kosova është kandidate potenciale për anëtarësim në BE
- Procesi i Stabilizim-Asociimit (PSA) në vazhdim
- Marrëveshja e Stabilizim-Asociimit (MSA) nënshkruar 2016, hyrë në fuqi 2016

KORNIZA LIGJORE:
- Marrëveshja e Stabilizim-Asociimit (MSA) 2016
- Dialogu i Vizave (liberalizimi i vizave)
- Agjenda Reformuese Evropiane (ARE)

LIBERALIZIMI I VIZAVE:
- Vendimi i Parlamentit Evropian dhe Këshillit: Janar 2024
- Qytetarët e Kosovës mund të udhëtojnë pa viza në zonën Shengen
- E drejta: 90 ditë brenda 180 ditëve (jo punë/studim)

KUSHTET PËR ANËTARËSIM (Kriteret e Kopenhagës):
1. Kriteret politike: demokraci, sundim i ligjit, të drejta të njeriut
2. Kriteret ekonomike: ekonomi tregu funksionale
3. Acquis communautaire: adopto legjislacionin e BE-së

KAPITUJT E ACQUIS (35 kapituj):
- Lëvizja e lirë e mallrave
- E drejta e themelimit
- Shërbimet financiare
- Drejtësia, liria dhe siguria
- Mjedisi
- ... (total 35 kapituj)

MINISTRIA PËR INTEGRIM EVROPIAN (MEI):
- Koordinon procesin e integrimit
- Monitoron zbatimin e MSA-së
- Harton Planet Kombëtare të Veprimit

PROGRESI (Kosovo Report 2024 — Komisioni Evropian):
- Progres i kufizuar në reforma strukturore
- Nevojitet forcim i sundimit të ligjit
- Rekomandohet vazhdimi i reformave anti-korrupsion
- Ekonomia tregon stabilitet por nevojiten investime

NJOHJA NDËRKOMBËTARE:
- 117 shtete kanë njohur pavarësinë e Kosovës (2024)
- 5 shtete anëtare të BE nuk kanë njohur: Spanja, Sllovakia, Rumania, Greqia, Qipro
- Kjo pengon aderimin formal në BE
    `.trim(),

    'te-drejtat-qytetareve-kosova': `
TË DREJTAT E QYTETARËVE TË KOSOVËS — Informacion i strukturuar

KUSHTETUTA — TË DREJTAT THEMELORE:
Neni 24: Barazia para Ligjit
Neni 25: E Drejta e Jetës
Neni 29: E Drejta e Lirisë dhe Sigurisë
Neni 31: E Drejta e Gjykimit të Drejtë
Neni 32: E Drejta e Mbrojtjes Juridike
Neni 33: Parimi i Ligjshmërisë
Neni 35: Liria e Lëvizjes
Neni 36: E Drejta e Privatësisë
Neni 37: Liria e Martesës dhe Familjes
Neni 38: E Drejta e Pronës
Neni 40: Liria e Shprehjes
Neni 41: E Drejta e Qasjes në Dokumente Publike
Neni 44: Liria e Tubimit dhe Shoqërimit
Neni 47: E Drejta e Zgjedhjes

TË DREJTAT E MINORITETEVE:
- Shqiptarët, Serbët, Boshnjakët, Romët, Ashkalitë, Egjiptasit, Goranët, Turqit
- Ligji Nr. 03/L-047 për Mbrojtjen dhe Promovimin e të Drejtave të Komuniteteve

OMBUDSPERSONI:
- Mbron të drejtat e qytetarëve kundrejt shkeljes nga institucionet
- Pranon ankesa pa pagesë
- Raporton para Kuvendit
- Tel: 0800 15555 (pa pagesë)

PROCEDURA ADMINISTRATIVE:
- Ligji Nr. 05/L-031 për Procedurën Administrative
- Të drejtë anke ndaj vendimeve administrative
- Afati: 15 ditë nga marrja e vendimit
- Instanca e dytë: organi epror
- Gjykata Administrative: ankesa gjyqësore

QASJA NË DREJTËSI:
- Ndihma juridike falas për personat me të ardhura të ulëta
- Ligji Nr. 04/L-017 për Ndihmën Juridike Falas
- Avokati i Popullit (Ombudspersoni)

MBROJTJA E TË DHËNAVE PERSONALE:
- Ligji Nr. 06/L-082 për Mbrojtjen e të Dhënave Personale
- Agjencia për Mbrojtjen e të Dhënave Personale (AMDP)
    `.trim(),

    'procedurat-administrative-kosova': `
PROCEDURAT ADMINISTRATIVE NË KOSOVË — Udhëzues praktik

REGJISTRI I BIZNESIT:
- ARBK (Agjencia e Regjistrimit të Bizneseve të Kosovës)
- Regjistrimi online: regjistro.rks-gov.net
- Kohëzgjatja: 1-3 ditë pune
- Kostoja: 10€ (biznes individual) deri 30€ (SH.P.K.)
- Dokumentet: letërnjoftim, adresa, statuti (për SH.P.K.)

DOKUMENTET E IDENTITETIT:
- Letërnjoftimi: Ministria e Punëve të Brendshme
- Pasaporta: MPB — Zyrat Rajonale
- Certifikata e lindjes: Zyra Komunale e Gjendjes Civile
- Çertifikata e martesës: Zyra Komunale

PRONËSIA E PALUAJTSHMËRISË:
- Agjencia Kadastrale e Kosovës (AKK)
- Regjistrimi i pronës: Zyrja Komunale e Kadastrit
- Dokumentet: kontrata e shitblerjes, vërtetimi i pronësisë

ARSIMI:
- Ministria e Arsimit, Shkencës dhe Teknologjisë (MASHT)
- Nostrifikimi i diplomave nga jashtë
- Universitetet publike: UP Prishtinë, UGJ Gjakovë, etj.

TATIMI DHE FINANCAT:
- Administrata Tatimore e Kosovës (ATK) — atk.rks-gov.net
- TVSH: 18% (standard), 8% (ushqime bazë, ilaçe)
- Tatimi mbi të ardhurat: 0-10% (individë), 10% (biznese)
- Kontributet pensionale: 5% punëtor + 5% punëdhënës
- Dogana: dogana.rks-gov.net

SHËNDETËSIA:
- Fondi i Sigurimeve Shëndetësore i Kosovës
- Spitalet publike: shërbim pa pagesë me kartë shëndetësore
- Lista e barnave esenciale — të rimbursueshme
    `.trim(),
  }

  let written = 0
  for (const [name, text] of Object.entries(content)) {
    const outPath = path.join(DOCS_DIR, `${name}.txt`)
    fs.writeFileSync(outPath, text, 'utf-8')
    console.log(`  ✓ ${name}.txt (${Math.round(text.length / 1000)}KB)`)
    written++
  }
  console.log(`\n  ${written} skedarë statikë të shkruar`)
}

async function main() {
  console.log('🌐 Duke shkarkuar content nga web...\n')

  let fetched = 0
  let failed = 0

  for (const src of SOURCES) {
    process.stdout.write(`→ ${src.name}... `)
    const ok = src.type === 'pdf'
      ? await fetchPdf(src.url, src.name)
      : await fetchHtml(src.url, src.name)
    if (ok) fetched++; else failed++
    // Prit pak midis kërkesave
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log('\n📝 Duke shkruar content statik të strukturuar...\n')
  writeStaticContent()

  console.log(`\n✅ Kompletuar: ${fetched} të shkarkuara, ${failed} dështuan`)
  console.log(`📁 Të gjitha skedarët janë në: back/documents/`)
  console.log(`\n🚀 Tash ekzekuto: npm run ingest`)
}

main().catch(console.error)
