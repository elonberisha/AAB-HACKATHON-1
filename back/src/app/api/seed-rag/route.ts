import { NextRequest } from 'next/server'
import { openai } from '@/lib/openai'
import { supabase } from '@/lib/supabase'

// E thirr vetëm njëherë për të seeduar RAG-un me content statik
// POST /api/seed-rag  +  header: x-seed-secret: <SEED_SECRET env var>

const CHUNK_SIZE = 400
const CHUNK_OVERLAP = 50

function chunk(text: string): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const c = words.slice(i, i + CHUNK_SIZE).join(' ').trim()
    if (c.length > 60) chunks.push(c)
    if (i + CHUNK_SIZE >= words.length) break
  }
  return chunks
}

async function embedAndStore(text: string, source: string): Promise<number> {
  const chunks = chunk(text)
  let stored = 0
  for (let i = 0; i < chunks.length; i++) {
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunks[i],
    })
    const { error } = await supabase.from('documents').insert({
      content: chunks[i],
      embedding: res.data[0].embedding,
      source,
      metadata: { chunk_index: i, total_chunks: chunks.length },
    })
    if (!error) stored++
  }
  return stored
}

const CONTENT: Record<string, string> = {
  'reforma-administrative': `
REFORMA ADMINISTRATIVE E KOSOVËS

ÇFARË ËSHTË REFORMA ADMINISTRATIVE?
Reforma administrative në Kosovë ka për qëllim modernizimin e shërbimeve publike, dixhitalizimin e administratës shtetërore, dhe rritjen e efikasitetit të institucioneve. Ky proces është pjesë e detyrimeve të Kosovës sipas Marrëveshjes së Stabilizim-Asociimit me BE-në.

OBJEKTIVAT KRYESORE:
1. Shërbime të integruara dixhitale — qytetarët të kenë qasje në shërbime online pa pasur nevojë të paraqiten fizikisht
2. Transparencë dhe llogaridhënie — publikimi i buxheteve, vendimeve dhe kontratave publike
3. Reduktimi i burokracisë — thjeshtimi i procedurave administrative dhe heqja e barrierave administrative
4. Decentralizimi — transferimi i kompetencave dhe burimeve te komunat
5. Profesionalizimi i shërbimit civil — rekrutim meritokratik, trajnim i vazhdueshëm

LEGJISLACIONI BAZË:
- Ligji Nr. 03/L-149 për Shërbimin Civil të Kosovës — rregullon rekrutimin, promovimin dhe disiplinën
- Ligji Nr. 04/L-051 për Organizimin dhe Funksionimin e Administratës Shtetërore dhe të Komunave
- Ligji Nr. 05/L-031 për Procedurën Administrative — rregullon marrëdhëniet me qytetarët
- Ligji Nr. 06/L-113 për Qasje në Dokumente Publike — e drejta e qasjes në informata
- Ligji Nr. 04/L-116 për Konfliktin e Interesit — parandalon abuzimin e pozitës

INSTITUCIONET KYÇE:
- Ministria e Administratës Publike (MAP) — harton politikat e reformës
- Departamenti i Administratës Publike (DAP) — zbaton reformën e shërbimit civil
- Agjensia për Shërbime të Qeverisjes Elektronike (ASQE) — infrastruktura dixhitale
- Komisioni i Pavarur Mbikëqyrës i Shërbimit Civil (KPMSHC) — mbron të drejtat e nëpunësve

PROGRESI DHE ARRITJET:
- Platforma e-Kosovo: regjistrim biznesi online, pagesat tatimore elektronike
- Sistemi i menaxhimit të dokumenteve (SMEDOS) i implementuar
- Regjistri Qendror i Personelit i dixhitalizuar
- Portali i transparencës buxhetore https://fukosova.org
- Sistemet e pagesave bankare online për shërbime komunale
- Interoperabiliteti midis sistemeve qeveritare (shkëmbimi i të dhënave)

SFIDAT KRYESORE:
- Ndryshimi i kulturës organizative dhe rezistenca ndaj ndryshimeve
- Kapacitete të kufizuara teknike të stafit
- Koordinim i dobët ndërinstitucional
- Qarkullimi i lartë i personelit të kualifikuar
- Financimi i pamjaftueshëm për modernizim

RAPORTI I PROGRESIT 2024 (Komisioni Evropian):
Komisioni Evropian vlerëson progres të kufizuar në reformën e administratës publike. Rekomandimet kryesore: forcimi i meritokracisë, reduktimi i emërimeve politike, dhe zbatimi i plotë i ligjit për shërbimin civil.

PYETJET MÁ TË SHPESHTA:
Si mund të bëj ankesë ndaj një vendimi administrativ?
Brenda 15 ditëve nga marrja e vendimit duhet të depozitoni ankesë te organi epror. Nëse organi epror e refuzon, mund të drejtoheni te Gjykata Administrative.

Si regjistrohet një biznes në Kosovë?
Përmes portalit online regjistro.rks-gov.net, ose fizikisht te ARBK. Koha: 1-3 ditë, kosto: 10-30€.
  `.trim(),

  'sundimi-ligjit': `
SUNDIMI I LIGJIT NË KOSOVË

SISTEMI GJYQËSOR:
Kosova ka sistem gjyqësor të pavarur të organizuar në katër shkallë:

1. GJYKATA KUSHTETUESE
   - Kontrollon kushtetutshmërinë e ligjeve dhe akteve normative
   - Vendos mbi konfliktet e kompetencave ndërmjet institucioneve
   - Mbron të drejtat dhe liritë themelore
   - Vendime përfundimtare dhe të detyrueshme
   - Kontakt: gjk-ks.org

2. GJYKATA SUPREME E KOSOVËS
   - Shkalla e fundit e apelit
   - Siguron zbatim uniform të ligjit
   - Gjykon çështjet e rëndësisë së veçantë

3. GJYKATA E APELIT
   - Shqyrton ankesa ndaj vendimeve të gjykatave themelore
   - Katër departamente: i Përgjithshëm, Penal, Civil, Administrativ

4. GJYKATAT THEMELORE (7 gjykata + degë)
   - Prishtinë, Prizren, Pejë, Gjakovë, Mitrovicë, Gjilan, Ferizaj
   - Kompetente për çështje civile, penale, administrative, tregtare
   - Gjykata Themelore Komerciale (çështje tregtare)

PROKURORIA:
- Prokuroria e Shtetit — kryeson të gjithë prokurorinë
- Prokuroritë Themelore (7) — hetojnë krimet e zakonshme
- Departamenti Special i Prokurorisë (PSRK) — krim i organizuar, korrupsion, terrorizëm
- Departamenti për Krime Lufte

KËSHILLAT QEVERISËSE:
- Këshilli Gjyqësor i Kosovës (KGjK) — qeveris sistemin gjyqësor, emëron gjyqtarë
- Këshilli Prokurorial i Kosovës (KPK) — qeveris prokurorinë
- Të dyja garantojnë pavarësinë e sistemit nga pushteti ekzekutiv dhe legjislativ

LIGJET KRYESORE:
- Kushtetuta e Kosovës (2008) — ligji më i lartë
- Kodi Penal Nr. 06/L-074
- Kodi i Procedurës Penale Nr. 07/L-012
- Kodi Civil i Kosovës
- Ligji për Gjykatat Nr. 06/L-054
- Ligji për Prokurorinë e Shtetit Nr. 06/L-056
- Ligji për Ndihmën Juridike Falas Nr. 04/L-017
- Ligji për Ekzekutimin e Sanksioneve Penale

EULEX KOSOVO — Misioni i BE-së:
- Misioni i Bashkimit Evropian për Sundimin e Ligjit në Kosovë
- Themeluar 2008, mandat i rinovuar deri 2027
- Mbështet gjyqësorin, prokurorinë dhe policin
- Trajnon profesionistët e drejtësisë
- Monitoron çështjet e rëndësishme (korrupsion, krim i organizuar)
- eulex-kosovo.eu

POLICIA E KOSOVËS:
- Institucion civil i sigurisë publike
- Raportues te Ministria e Punëve të Brendshme
- Bashkëpunim me Europol dhe Interpol

SFIDAT:
- Vonesa të mëdha në gjykim (mbivendosje e lëndëve)
- Zbatim i dobët i vendimeve gjyqësore
- Presion ndaj pavarësisë gjyqësore
- Korrupsion brenda sistemit gjyqësor (raporton Komisioni Evropian)
- Mungesa e gjyqtarëve dhe prokurorëve të specializuar

TË DREJTAT E PERSONIT TË ARRESTUAR:
- E drejta të informohet për arsyet e arrestimit
- E drejta të heshtë (nuk obligohet të dëshmojë)
- E drejta të ketë avokat (falas nëse nuk ka mundësi financiare)
- E drejta të njoftohet familja
- Maksimumi 48 orë ndalim pa vendim gjykate
  `.trim(),

  'lufta-korrupsion': `
LUFTA KUNDËR KORRUPSIONIT NË KOSOVË

KORRUPSIONI — ÇFARË ËSHTË?
Korrupsioni është shfrytëzimi i pozitës publike për përfitime private. Përfshin ryshfet, nepotizëm, konflikt interesi, keqpërdorim të fondeve publike, blerje votash, etj.

INSTITUCIONET KRYESORE ANTI-KORRUPSION:

1. AGJENCIA KUNDËR KORRUPSIONIT (AKK)
   - Themeluar me Ligjin Nr. 03/L-159
   - Mandati: parandalim, edukim qytetar, monitorim konflikti interesi
   - Verifikon dhe publikon deklaratat e pasurisë të zyrtarëve
   - Raporton para Kuvendit të Kosovës
   - Nuk ka kompetencë hetimore penale (vetëm administrative)
   - Web: akk-ks.net | Tel: 038 200 62 601

2. PROKURORIA SPECIALE (PSRK)
   - Heton korrupsionin e nivelit të lartë
   - Krim i organizuar ndërkombëtar
   - Terrorizëm, pastrim parash
   - Ka kapacitete dhe mandate të veçanta

3. POLICIA KRIMINALE — Njësia kundër Korrupsionit
   - Zbaton hetime të korrupsionit me urdhër prokurorie

4. EULEX — Task Forca Speciale Hetimore
   - Bashkëpunim ndërkombëtar në hetimet kundër korrupsionit

DEKLARIMI I PASURISË — DETYRIMI LIGJOR:
Kush është i obliguar? Gjithë zyrtarët publik:
- Deputetët e Kuvendit
- Ministrat dhe zëvendësministrat
- Gjyqtarët dhe prokurorët
- Drejtorët e agjencive shtetërore
- Kryetarët dhe anëtarët e komunave
- Drejtorët e ndërmarrjeve publike

Çka deklarohet? Pasuria e paluajtshme, automjetet, llogaritë bankare, aksionet, detyrimet financiare — e gjithë pasuria e zyrtarit dhe familjes.
Ku? Te AKK, çdo vit, brenda 30 ditëve nga fillimi i mandatit/vitit.
Sanksioni: deri 3 vite burgim për deklarim të rremë.

LIGJET KRYESORE:
- Ligji Nr. 05/L-082 kundër Korrupsionit
- Ligji Nr. 06/L-011 për Deklarimin, Prejardhjen dhe Kontrollin e Pasurisë
- Ligji Nr. 05/L-096 për Konfiskimin e Pasurisë pa Dënim
- Ligji Nr. 04/L-042 për Prokurimin Publik
- Ligji Nr. 06/L-082 për Mbrojtjen e Sinjalizuesve (Whistleblower)
- Ligji Nr. 04/L-116 për Parandalimin e Konfliktit të Interesit

SINJALIZUESIT (WHISTLEBLOWERS):
- Çdo person mund të raportojë korrupsionin
- Ligji mbron nga hakmarrja dhe largimi nga puna
- Raportim anonim i mundshëm
- Ku raportohet: AKK (akk-ks.net), Prokuroria, Policia
- Linea direkte: 0800 77 000 (pa pagesë)

PROKURIMI PUBLIK:
- Autoriteti Qendror i Prokurimit (AQP) koordinon tenderat e mëdhenj
- Sistemi elektronik i prokurimit (e-prokurimi) — transparencë
- Të gjithë tenderat publik mbi 10,000€ publikohen
- Ankesa: Organi Shqyrtues i Prokurimit (OSHP)

KONFISKIMI I PASURISË:
- Ligji lejon konfiskimin civil të pasurisë pa dënim penal
- Prokuroria mund të ngrejë padi civile nëse prova penale janë të pamjaftueshme
- Barra e provës: zyrtari duhet të provojë prejardhjen e ligjshme të pasurisë

STATISTIKAT 2024:
- AKK ka trajtuar mbi 2,500 raste konflikti interesi
- PSRK ka ngritur akuza në raste të profilit të lartë
- Bashkëpunimi me EULEX ka intensifikuar hetimet
- Problematike mbeten rastet e prokurimit publik dhe ndërtimit

SI TË RAPORTONI KORRUPSIONIN:
1. Thirrni: 0800 77 000 (AKK, pa pagesë)
2. Email: akk@akk-ks.net
3. Online: akk-ks.net/sq/raporto
4. Prokuroria: 038 200 62 555
5. Policia: 192
  `.trim(),

  'integrimi-be': `
INTEGRIMI I KOSOVËS NË BASHKIMIN EVROPIAN

STATUSI AKTUAL (2024-2025):
Kosova ka statusin e "kandidatit potencial" për anëtarësim në BE. Ky status nënkupton se Kosova ka perspektivën e anëtarësimit por ende nuk ka aplikuar zyrtarisht si kandidat.

ARSYEJA E VONESËS — NJOHJA NDËRKOMBËTARE:
- 117 shtete kanë njohur pavarësinë e Kosovës
- 5 shtete anëtare të BE nuk kanë njohur: Spanja, Sllovakia, Rumania, Greqia, Qipro
- Pa njohje unanime të BE-së, anëtarësimi formal është i pamundur
- Kjo është pengesë juridike-politike, jo teknike

MARRËVESHJA E STABILIZIM-ASOCIIMIT (MSA):
- Nënshkruar: 27 tetor 2015 në Strasburg
- Hyrë në fuqi: 1 prill 2016
- Baza ligjore e marrëdhënieve Kosovë-BE
- Obligimet: liberalizimi i tregtisë, reforma ligjore, harmonizimi me acquis
- Zbatimi monitorohet nga Komisioni i Stabilizim-Asociimit

LIBERALIZIMI I VIZAVE — ARRITJA HISTORIKE:
- Vendimi i PE dhe Këshillit: dhjetor 2023
- Hyrë në fuqi: 1 janar 2024
- Të drejta: udhëtim pa viza në 27 shtete Shengen + disa të tjera
- Kushti: pasaportë biometrike e Kosovës
- Kufizim: max 90 ditë brenda 180 ditëve (jo punë, jo studim)
- Vende ku mund të shkoni: Gjermania, Franca, Italia, Spanja, Austria, etj.

KUSHTET PËR ANËTARËSIM (Kriteret e Kopenhagës 1993):
1. KRITERET POLITIKE:
   - Demokraci funksionale dhe shtet ligjor
   - Sundimi i ligjit dhe drejtësia e pavarur
   - Mbrojtja e të drejtave të njeriut dhe minoriteteve

2. KRITERET EKONOMIKE:
   - Ekonomi tregu funksionale
   - Kapacitete konkurruese në tregun e BE

3. ACQUIS COMMUNAUTAIRE (Legjislacioni i BE):
   - Adoptimi dhe zbatimi i mbi 80,000 faqeve legjislacion
   - 35 kapituj negociatash (nga tregu i brendshëm deri te bujqësia)

35 KAPITUJT E ACQUIS:
1. Lëvizja e lirë e mallrave
2. Lëvizja e lirë e punëtorëve
3. E drejta e themelimit dhe e ofrimit të shërbimeve
4. Lëvizja e lirë e kapitalit
5. Prokurimi publik
6. E drejta e kompanive
7. E drejta e pronësisë intelektuale
8. Politika e konkurrencës
9. Shërbimet financiare
10. Shoqëria e informacionit
... (35 kapituj gjithsej)

AGJENDA REFORMUESE EVROPIANE (ARE):
- Dokumenti kryesor strategjik i Kosovës për integrim
- Hartohet nga MEI, miratohet nga Qeveria
- Paraqet masat konkrete të reformave
- Monitorohet nga Komisioni Evropian çdo vit

RAPORTI I PROGRESIT 2024 — EC:
Vlerësimet kryesore:
- Progres i kufizuar në sundimin e ligjit
- Nevojitet forcim i luftës kundër korrupsionit
- Reformë e administratës publike e ngadaltë
- Marrëdhëniet Kosovë-Serbi — sfidë e vazhdueshme
- Ekonomia: rritje 3.5% (e qëndrueshme por nën potencial)
- Vizat: arritje e rëndësishme historike

MINISTRIA PËR INTEGRIM EVROPIAN (MEI):
- Koordinon të gjitha procesin e integrimit
- Harton dhe monitoron zbatimin e MSA-së
- Organizon negociatat dhe takimet me BE-në
- Web: mei-ks.net

INSTRUMENTET FINANCIARE TË BE:
- IPA (Instrumenti i Para-Anëtarësimit): ~95 milion €/vit për Kosovën
- Financon: infrastrukturë, demokraci, sundim ligji, bujqësi
- WBIF (Western Balkans Investment Framework): investime infrastrukturore

DIALOGU KOSOVË-SERBI:
- Lehtësuar nga BE që nga 2011
- Marrëveshja e Brukselit 2013 — normalizimi i marrëdhënieve
- Marrëveshja e Ohrit 2023 — hapi i fundit
- Bllokuese për anëtarësimin: Kosova nuk mund të anëtarësohet pa normalizim me Serbinë
  `.trim(),

  'te-drejtat-qytetareve': `
TË DREJTAT E QYTETARËVE TË KOSOVËS

KUSHTETUTA E KOSOVËS — KAPITULLI II: TË DREJTAT DHE LIRITË THEMELORE

Neni 21 — Parimet e Përgjithshme:
Të drejtat dhe liritë themelore janë të pandashme, të patjetërsueshme dhe të padhunueshme.

Neni 24 — Barazia para Ligjit:
Të gjithë janë të barabartë para ligjit. Ndalohet diskriminimi.

Neni 25 — E Drejta e Jetës:
Jeta e njeriut është e pacenueshme. Nuk ka dënim me vdekje.

Neni 27 — Ndalimi i Torturës:
Ndalohet tortура, trajtimi çnjerëzor ose degradues.

Neni 29 — E Drejta e Lirisë dhe Sigurisë:
Askush nuk mund të privohet nga liria pa vendim gjykate.
Maksimumi 48 orë ndalim pa urdhër gjykate.

Neni 31 — E Drejta e Gjykimit të Drejtë:
Çdo person ka të drejtë gjykimi të drejtë, publik dhe brenda afateve të arsyeshme.
Prezumimi i pafajësisë.

Neni 32 — E Drejta e Mbrojtjes Juridike:
Çdo person ka të drejtë avokati.
Ndihma juridike falas për ata që nuk kanë mundësi financiare.

Neni 35 — Liria e Lëvizjes:
E drejta e lëvizjes dhe vendosjes kudo në territorin e Kosovës.
E drejta e largimit dhe kthimit.

Neni 36 — E Drejta e Privatësisë:
Jeta private, familja, shtëpia dhe korrespondenca janë të mbrojtura.
Nuk mund të hyjë policia pa urdhër gjykate.

Neni 38 — E Drejta e Pronës:
Prona private është e garantuar. Shpronësimi vetëm me kompensim të drejtë.

Neni 40 — Liria e Shprehjes:
Liria e fjalës, e shtypit dhe e mediave. Ndalohet nxitja e urrejtjes.

Neni 41 — E Drejta e Qasjes në Dokumente Publike:
Çdo qytetar ka të drejtë të ketë qasje në dokumente zyrtare.

Neni 44 — Liria e Tubimit:
E drejta e protestës dhe tubimit paqësor.

Neni 47 — E Drejta e Zgjedhjes:
Çdo qytetar mbi 18 vjeç ka të drejtë vote.

TË DREJTAT E MINORITETEVE:
Ligji Nr. 03/L-047 mbron: Serbët, Boshnjakët, Romët, Ashkalinjtë, Egjiptasit, Goranët, Turqit.
- E drejta e arsimit në gjuhën amtare
- Përfaqësim i garantuar në institucione
- 20 vende të rezervuara për pakica në Kuvend

OMBUDSPERSONI (AVOKATI I POPULLIT):
- Mbron qytetarët nga shkeljet e institucioneve publike
- Pranon ankesa falas
- Nuk kërkon avokat
- Tel: 0800 15555 (falas) | Web: oik-rks.org
- Adresa: Rr. Migjeni, nr. 21, Prishtinë

NDIHMA JURIDIKE FALAS:
- Ligji Nr. 04/L-017
- E drejta: persona me të ardhura nën kufirin minimal
- Apliko te: Shërbimi Juridik Falas pranë gjykatave
- Dokumentet: vërtetim i gjendjes financiare

MBROJTJA E TË DHËNAVE PERSONALE:
- Ligji Nr. 06/L-082
- Agjencia për Mbrojtjen e të Dhënave Personale (AMDP)
- Ankeso nëse dikush ka shfrytëzuar të dhënat tuaja pa leje
- E drejta e fshirjes (e drejta e "harrimit")

SI TË ANKOHENI:
1. Vendime administrative: ankesë brenda 15 ditëve te organi epror
2. Shkelje të të drejtave: Ombudspersoni (falas)
3. Çështje gjyqësore: Gjykata Themelore
4. Diskriminim: Komisioni për Barazi dhe Kthim (KBK)
  `.trim(),

  'procedura-administrative': `
PROCEDURAT ADMINISTRATIVE PRAKTIKE NË KOSOVË

REGJISTRI I BIZNESIT:
Agjencia e Regjistrimit të Bizneseve të Kosovës (ARBK)
Portal online: regjistro.rks-gov.net
Afati: 1-3 ditë pune
Kostot:
- Biznes Individual (NI): 10€
- Shoqëri me Përgjegjësi të Kufizuar (Sh.P.K.): 30€
- Shoqëri Aksionare (Sh.A.): 50€
Dokumentet: letërnjoftim, adresa e biznesit, statuti (Sh.P.K./Sh.A.)

NUMRI FISKAL:
- Administrata Tatimore e Kosovës (ATK): atk.rks-gov.net
- Obligator për çdo biznes
- Regjistrohet brenda 30 ditëve nga fillimi i aktivitetit
- Afati deklarimit të TVSH: çdo tremujor

TAKSAT E BIZNESIT:
- Tatimi mbi të Ardhura të Korporatave: 10%
- TVSH (standarde): 18%
- TVSH (e reduktuar): 8% (ushqime bazë, ilaçe, libra, ujë)
- Pagesa e TVSH: mujore nëse qarkullimi > 50,000€/vit
- Tatimi mbi të Ardhura Personale: shkallëzuar 0% deri 10%
- Kontributet pensionale: 5% punëtor + 5% punëdhënës

LETËRNJOFTIMI DHE PASAPORTA:
- Ministria e Punëve të Brendshme (MPB)
- Aplikimi: online ose zyrat komunale të MPB
- Letërnjoftim: 5€ (standard), 15€ (urgjent)
- Pasaportë: 30€ (standard), 60€ (urgjent)
- Vlefshmëria: 10 vjet (mbi 18 vjeç), 5 vjet (nën 18)
- Kushti: certifikatë lindje + 2 foto

CERTIFIKATAT E GJENDJES CIVILE:
- Certifikata e lindjes: Zyra e Gjendjes Civile, komuna
- Certifikata e martesës: e njëjtë
- Certifikata e vdekjes: e njëjtë
- Kosto: 1€ secila
- Apostile (njohja ndërkombëtare): Ministria e Punëve të Jashtme, 10€

KADASTRI DHE PRONA:
- Agjencia Kadastrale e Kosovës (AKK): kadastriks.net
- Regjistrimi i pronës: Zyra Komunale e Kadastrit
- Certifikata e pronësisë: 5€
- Kontrata e shitblerjes: noter + regjistrim kadastral
- Hipoteka bankare: regjistrohet te kadastri

LEJA E NDËRTIMIT:
- Komuna (Drejtoria për Urbanizëm)
- Dokumentet: projekti teknik, titujt e pronësisë, ATK
- Afati komunal: 30 ditë (ligji parasheh)
- Inspektorati i Ndërtimit: mbikëqyr zbatimin

ARSIMIMI — NOSTRIFIKIMI:
- Ministria e Arsimit (MASHT): masht-rks.net
- Nostrifikimi i diplomave nga jashtë: 20€
- Afati: 30 ditë
- Dokumentet: diploma origjinale + përkthim i noterizuar

SHËNDETI — KARTELA SHËNDETËSORE:
- Fondi i Sigurimeve Shëndetësore: fsh-rks.org
- E drejta: çdo qytetar i Kosovës
- Klinika familjare: shërbim primar falas
- Spitalet rajonale: me recetë mjeku familjar
- Barnat esenciale: të rimbursueshme (lista zyrtare)

LEJAT E QARKULLIMIT (PATENTA):
- Ministria e Punëve të Brendshme
- Kategoritë: A (motoçikletë), B (veturë), C (kamion), D (autobus)
- Provimi teorik + praktik
- Kosto: 50-100€ (shkolle shoferësh) + 30€ (tarifa zyrtare)

PENSIONI:
- Trusti i Kursimeve Pensionale (TKP): trstkosova.org
- Pensioni bazë: 75€/muaj (mbi 65 vjeç, të gjithë qytetarët)
- Pensioni kontributiv: sipas viteve të punës dhe pagës
- Pensioni i invaliditetit: sipas shkallës

DOGANA:
- Dogana e Kosovës: dogana.rks-gov.net
- TVSH importi: 18% + doganë
- Produktet nga BE: pa doganë (MSA)
- Kufijtë e deklarimit: mallra mbi 150€ nga jashtë
  `.trim(),

  'dialogu-kosove-serbi-be': `
DIALOGU KOSOVË-SERBI I LEHTËSUAR NGA BE

HISTORIA:
- 2011: Fillimi i dialogut teknik Bruksel
- 2013: Marrëveshja e Parë e Brukselit — normalizim i marrëdhënieve
- 2015: Marrëveshjet e Brukselit dhe Stabilizim-Asociimi
- 2023: Marrëveshja e Ohrit — plani i zbatimit

MARRËVESHJA E BRUKSELIT 2013:
- Integrimi i strukturave paralele serbe në Kosovë
- Themelimi i Asociacionit të Komunave me shumicë Serbe
- Heqja e strukturave paralele të sigurisë serbe
- Zbatimi: i pjesshëm, shumë pika mbeten të pazbatuara

MARRËVESHJA E OHRIT 2023:
- Njohje de facto e Kosovës nga Serbia (jo formale)
- Serbia nuk do të bllokojë anëtarësimin e Kosovës në organizata ndërkombëtare
- Kosova pranon autonomi për komunat serbe
- Zbatimi monitorohet nga BE çdo 3 muaj

ASOCIACIONI I KOMUNAVE SERBE:
- Kontroversial dhe i pambajtur deri tani
- Kosova ka frikë nga krijimi i entitetit paralel
- Gjykata Kushtetuese ka vendosur kufizime
- Negociatat vazhdojnë

NDIKIMI NË RRUGËN DREJT BE:
- Normalizimi me Serbinë është kusht i domosdoshëm
- 5 vende të BE që njohin Serbinë por jo Kosovën: Spanjë, Sllovaki, Rumani, Greqi, Qipro
- Mekanizmi i kushtëzimit: BE mund të bllokojë fondet IPA nëse dialogu nuk avancon
  `.trim(),

  'ekonomia-kosoves': `
EKONOMIA E KOSOVËS DHE INTEGRIMI EKONOMIK NE BE

TREGUESIT KRYESORË EKONOMIKË (2024):
- BPV: ~12 miliardë € (vlerësim)
- Rritja ekonomike: ~3.5%
- Papunësia: ~25% (shumë e lartë, veçanërisht tek të rinjtë 55%)
- Inflacioni: ~2.5%
- Remitancat: ~1.5 miliardë €/vit (15% e BPV) — diaspora kontribuon shumë
- Eksportet kryesore: metalet bazë, prodhime ushqimore, tekstil
- Importet: mallra të gatshme, energji, makineri

SEKTORËT KRYESORË:
- Shërbime: 65% e BPV (tregti, transport, financa)
- Ndërtimtaria: 12% (sektor dinamik)
- Industria prodhuese: 15% (ende e zhvilluar dobët)
- Bujqësia: 8% (potencial i madh, zhvillim i kufizuar)

TREGTIA ME BE:
- BE është partneri kryesor tregtar i Kosovës
- MSA garanton qasje të lirë në tregun e BE
- Eksportet në BE pa doganë
- Importet nga BE pa doganë (progressiv sipas MSA)
- Balanca tregtare: negative (Kosova importon më shumë)

INVESTIMET E HUAJA DIREKTE (IHD):
- ~500 milion €/vit (nën potencial)
- Sektorët kryesorë: telekomunikacione, banka, ndërtimtari
- Pengesat: korrupsioni, sundimi i dobët i ligjit, infrastruktura
- Diaspora: investitor i rëndësishëm

BANKAT DHE FINANCAT:
- Banka Qendrore e Kosovës (BQK): bqk-kos.org
- 11 banka komerciale operative
- Valuta: Euro (edhe pse Kosova nuk është në BE)
- Sistemi bankar: i qëndrueshëm, i mbikëqyrur mirë

ENERGJIA:
- KEK (Korporata Energjetike e Kosovës) — prodhon 90% nga qymyri
- Tranzicion energjetik: qëllim 35% energji të rinovueshme deri 2031
- Integrimi në tregun energjetik të BE — ENTSO-E
- Projekti i gazit: lidhja me Shqipërinë planifikohet

BUJQËSIA DHE FSHATI:
- 35% e popullsisë jeton në fshat
- IPARD (programi bujqësor i BE): 60 milion € deri 2027
- Subvencionet bujqësore: rreth 40€/hektar
- Problemi: fragmentimi i tokës, trashëgimia e papunuar

ARSIMI DHE TREGU I PUNËS:
- Universitetet: UP Prishtinë, 7 universitete publike, 19 private
- Largimi i trurit (brain drain): problem i madh
- Programi Erasmus+ i hapur për Kosovën
- Kuadrot e nevojshme: IT, inxhinieri, shëndetësi
  `.trim(),
}

export async function POST(req: NextRequest) {
  const secret = process.env.SEED_SECRET
  const provided = req.headers.get('x-seed-secret')

  if (secret && provided !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: { source: string; chunks: number; status: string }[] = []
  let totalChunks = 0

  for (const [source, text] of Object.entries(CONTENT)) {
    try {
      // Fshi chunks të vjetra
      await supabase.from('documents').delete().eq('source', source)

      const stored = await embedAndStore(text, source)
      results.push({ source, chunks: stored, status: 'ok' })
      totalChunks += stored
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ source, chunks: 0, status: `error: ${msg}` })
    }
  }

  return Response.json({
    message: 'RAG seed kompletuar',
    total_chunks: totalChunks,
    sources: results.length,
    results,
  })
}
