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

  'kushtetuta-kosoves': `
KUSHTETUTA E REPUBLIKËS SË KOSOVËS
Miratuar: 09 Prill 2008 | Kuvendi i Republikës së Kosovës | Nr. K-09042008
Amendamentuar: 2012, 2013, 2015, 2016, 2020
Ligji më i lartë i vendit. Të gjitha ligjet, aktet dhe veprimet shtetërore duhet të jenë në përputhje me Kushtetutën.

KAPITULLI I — DISPOZITAT THEMELORE (Nenet 1–20)

Neni 1 — Përkufizimi i Shtetit:
Republika e Kosovës është shtet i pavarur, sovran, demokratik, unik dhe i pandashëm. Kosova nuk ka pretendime territoriale ndaj asnjë shteti tjetër dhe nuk kërkon bashkim me asnjë shtet.

Neni 2 — Sovraniteti:
Sovraniteti rrjedh nga populli. Është i paprekshëm, i patjetërsueshëm dhe i pandashëm.

Neni 3 — Barazia Para Ligjit:
Kosova është shoqëri shumetnike e qeverisur demokratikisht. Pushteti publik bazohet në barabarësinë e të gjithë individëve.

Neni 4 — Forma e Qeverisjes dhe Ndarja e Pushteteve:
Republika Demokratike e bazuar në ndarjen e pushteteve dhe balancimin e tyre. Kuvendi ushtron pushtetin legjislativ. Presidenti përfaqëson unitetin e popullit. Qeveria zbaton ligjet dhe politikat shtetërore. Pushteti gjyqësor është unik, i pavarur, i ushtruar nga gjykatat.

Neni 5 — Gjuhët:
Gjuhët zyrtare: Shqipja dhe Serbishtja. Turqishtja, Boshnjakishtja dhe Romanishtja kanë status zyrtar në nivel komunal.

Neni 7 — Vlerat:
Rendi kushtetues bazohet në lirinë, paqen, demokracinë dhe barabarësinë. Barazia gjinore është vlerë themelore.

Neni 8 — Shteti Laik:
"Republika e Kosovës është shtet laik dhe është neutral në çështjet e besimit fetar."

Neni 10 — Ekonomia:
"Ekonomia e tregut me konkurrencë të lirë është baza e rendit ekonomik."

Neni 16 — Epërsia e Kushtetutës:
Kushtetuta është akti më i lartë juridik. Çdo ligj duhet të jetë në përputhje me të. Rendi ndërkombëtar respektohet.

Neni 19 — Zbatueshmëria e së Drejtës Ndërkombëtare:
Marrëveshjet e ratifikuara ndërkombëtare bëhen pjesë e sistemit juridik të brendshëm dhe kanë epërsi ndaj ligjeve të brendshme.

KAPITULLI II — TË DREJTAT DHE LIRITË THEMELORE (Nenet 21–56)

Neni 21 — Parimet e Përgjithshme:
Të drejtat dhe liritë themelore janë të pandashme, të patjetërsueshme dhe të padhunueshme. Kushtetuta i mbron dhe garanton ato.

Neni 22 — Zbatimi i Drejtpërdrejtë:
Instrumentet ndërkombëtare zbatohen drejtpërdrejt: Deklarata Universale e të Drejtave të Njeriut, Konventa Evropiane për të Drejtat e Njeriut, Pakti Ndërkombëtar për të Drejta Civile dhe Politike, Konventa Kuadër e Këshillit të Evropës për Mbrojtjen e Minoriteteve Kombëtare.

Neni 23 — Dinjiteti i Njeriut:
"Dinjiteti i njeriut është i pacenueshëm dhe është baza e të gjitha të drejtave dhe lirive themelore."

Neni 24 — Barazia Para Ligjit:
Të gjithë janë të barabartë para ligjit. Ndalohet diskriminimi bazuar në: racë, ngjyrë, gjini, gjuhë, fe, opinion politik, origjinë kombëtare ose sociale, orientim seksual, lindje, aftësi të kufizuar ose çdo status tjetër personal.

Neni 25 — E Drejta e Jetës:
Çdo individ gëzon të drejtën e jetës. "Dënimi me vdekje është i ndaluar."

Neni 27 — Ndalimi i Torturës:
"Askush nuk do t'i nënshtrohet torturës, trajtimit ose ndëshkimit çnjerëzor ose degradues."

Neni 28 — Ndalimi i Skllavërisë dhe Punës së Detyruar:
Ndalohet skllavëria, servituti dhe puna e detyruar. "Trafikimi me njerëz është i ndaluar."

Neni 29 — E Drejta e Lirisë dhe Sigurisë:
Askush nuk mund të privohet nga liria pa vendim gjykate. Maksimumi 48 orë ndalim pa urdhër gjykate. Personi i ndaluar menjëherë njoftohet për arsyet e ndalimit.

Neni 30 — Të Drejtat e të Akuzuarit:
Gjashtë të drejta minimale: informim për akuzat, kohë e mjaftueshme për mbrojtje, interpretim falas, avokat, marrje pyetje i dëshmitarëve, heshtje.

Neni 31 — E Drejta e Gjykimit të Drejtë dhe të Paanshëm:
Çdo person ka të drejtë gjykimi të drejtë, publik dhe brenda afateve të arsyeshme. Prezumimi i pafajësisë. Ndihma juridike e garantuar.

Neni 32 — E Drejta e Mbrojtjes Juridike:
Çdo person ka të drejtë ankimi ndaj vendimeve gjyqësore dhe administrative që shkelin të drejtat ose interesat e tij.

Neni 34 — E Drejta të Mos Gjykohet dy Herë:
"Askush nuk do të gjykohet më shumë se një herë për të njëjtën vepër penale." (ne bis in idem)

Neni 35 — Liria e Lëvizjes:
Lëvizje e lirë brenda Kosovës. E drejta e largimit dhe kthimit. Asnjë qytetar nuk mund të dëbohet.

Neni 36 — E Drejta e Privatësisë:
Jeta private, familja, banesa dhe korrespondenca janë të mbrojtura. Policia nuk mund të hyjë pa urdhër gjykate.

Neni 38 — Liria e Besimit, Ndërgjegjës dhe Fesë:
Liria fetare dhe manifestimi i saj. Kufizimet vetëm për sigurinë publike.

Neni 40 — Liria e Shprehjes:
Të drejtat e shprehjes mbrohen. Kufizimet vetëm për parandalimin e dhunës ose urrejtjes.

Neni 41 — E Drejta e Qasjes në Dokumente Publike:
Çdo qytetar ka të drejtë qasje në dokumente zyrtare. Përjashtimet: privatësia, sekretet tregtare, siguria.

Neni 43 — Liria e Tubimit:
"Liria e tubimit paqësor është e garantuar. Çdo person ka të drejtë të organizojë tubime, protesta dhe demonstrata."

Neni 45 — Liria e Zgjedhjes dhe Pjesëmarrjes:
Të drejtë vote kanë qytetarët mbi 18 vjeç. Votim i fshehtë.

Neni 46 — Mbrojtja e Pronës:
Pronësia e garantuar, e mbrojtur nga privimi arbitrar. Shpronësimi vetëm me kompensim të drejtë.

Neni 47 — E Drejta e Arsimit:
Arsimi bazë është falas. Mundësi e barabartë arsimimi.

Neni 49 — E Drejta e Punës:
Liria e punës dhe zgjedhjes së profesionit.

Neni 55 — Kufizimet e të Drejtave dhe Lirive Themelore:
Kufizimet vetëm me ligj. Duhet të jenë të nevojshme dhe proporcionale në shoqërinë demokratike.

Neni 56 — Të Drejtat Themelore Gjatë Gjendjes së Jashtëzakonshme:
Nenet 23–38 (dinjiteti, jeta, torturas, ndalimi skllavërisë) janë të papresueshme në çdo rrethanë.

KAPITULLI III — TË DREJTAT E KOMUNITETEVE (Nenet 57–62)

Neni 57 — Parimet e Përgjithshme:
Anëtarët e komuniteteve mund të zgjedhin lirisht identitetin e tyre, pa diskriminim.

Neni 59 — Të Drejtat e Komuniteteve:
Komunitetet kanë të drejtë: shprehin kulturën, marrin arsim në gjuhën amtare, përdorin gjuhën lirshëm, themelojnë media, mbajnë kontakte me diasporën.

Neni 61 — Përfaqësimi në Institucione Publike:
Komunitetet kanë të drejtë përfaqësimi të drejtë në organet publike.

KAPITULLI IV — KUVENDI I KOSOVËS (Nenet 63–82)

Neni 63 — Parimet e Përgjithshme:
"Kuvendi është institucioni legjislativ i Republikës së Kosovës i zgjedhur drejtpërdrejt nga populli."

Neni 64 — Struktura:
120 deputetë të zgjedhur me votim të fshehtë. 20 vende të garantuara për komunitetet joshumicë (10 serbë, 10 të tjera).

Neni 65 — Kompetencat:
Miraton ligje, amendamentet kushtetuese me dy të tretat e votave, ratifikon traktate, miraton buxhetin, zgjedh Presidentin, mbikëqyr Qeverinë.

Neni 70 — Mandati i Deputetëve:
Deputetët përfaqësojnë popullin pa mandat të detyruar. Imuniteti nga ndjekja penale.

Neni 79 — Iniciativa Legjislative:
Iniciativa mund të merret nga: Presidenti, Qeveria, deputetët, ose të paktën 10,000 qytetarë.

KAPITULLI V — PRESIDENTI (Nenet 83–91)

Neni 83 — Statusi:
"Presidenti është kreu i shtetit dhe përfaqëson unitetin e popullit të Republikës së Kosovës."

Neni 85 — Kualifikimi:
Kandidat mund të jetë çdo qytetar i Kosovës mbi 35 vjeç.

Neni 87 — Mandati:
"Mandati i Presidentit është pesë (5) vjet" dhe "mund të rizgjedhet vetëm një herë."

KAPITULLI VI — QEVERIA (Nenet 92–101)

Neni 92 — Parimet e Përgjithshme:
Qeveria përbëhet nga Kryeministri, zëvendëskryeministrat dhe ministrat. Ushtron pushtetin ekzekutiv.

Neni 96 — Ministritë dhe Përfaqësimi:
Të paktën një ministër nga komuniteti serb dhe nga komunitetet e tjera joshumicë.

KAPITULLI VII — SISTEMI I DREJTËSISË (Nenet 102–111)

Neni 102 — Parimet e Përgjithshme:
"Pushteti gjyqësor ushtrohet nga gjykatat." Pushteti gjyqësor është "unik, i pavarur, i drejtë, apolitik dhe i paanshëm."

Neni 103 — Organizimi:
"Gjykata Supreme e Kosovës është autoriteti më i lartë gjyqësor." Të paktën 15% e gjyqtarëve të Gjykatës Supreme nga komunitetet joshumicë (minimumi 3 gjyqtarë).

Neni 104 — Emërimi dhe Shkarkimi:
Presidenti emëron dhe shkarkon gjyqtarët me propozim të Këshillit Gjyqësor. Gjyqtarët shkarkohen vetëm për krim të rëndë ose neglizhencë të rëndë.

Neni 108 — Këshilli Gjyqësor i Kosovës (KGjK):
Trembëdhjetë anëtarë: shtatë gjyqtarë të zgjedhur nga gjyqësori, dy nga Kuvendi, dy nga deputetët serbë, dy nga deputetët e komuniteteve të tjera joshumicë.

Neni 109 — Prokurori i Shtetit:
"Prokurori i Shtetit është institucion i pavarur." Prokurori Kryesor emërohet nga Presidenti me propozim të Këshillit Prokurorial — mandat 7 vjeç, i paripërsëritshëm.

KAPITULLI VIII — GJYKATA KUSHTETUESE (Nenet 112–118)

Neni 112 — Parimet e Përgjithshme:
"Gjykata Kushtetuese është autoriteti përfundimtar për interpretimin e Kushtetutës" dhe është plotësisht e pavarur.

Neni 113 — Jurisdiksioni:
Kuvendi, Presidenti, Qeveria dhe Avokati i Popullit mund t'i drejtohen Gjykatës Kushtetuese. Individët mund të ankojnë shkeljet e të drejtave pas shterimit të mjeteve juridike.

Neni 114 — Përbërja dhe Mandati:
Nëntë gjyqtarë me "jo më pak se dhjetë (10) vjet përvojë profesionale relevante." Mandat "nëntë (9) vjet i paripërsëritshëm."

Neni 116 — Efekti Juridik i Vendimeve:
Vendimet e Gjykatës Kushtetuese "janë të detyrueshme për gjyqësorin dhe të gjithë personat dhe institucionet."

KAPITULLI IX — MARRËDHËNIET EKONOMIKE

Neni 119 — Parimet e Përgjithshme:
Republika siguron mjedis të favorshëm juridik për ekonominë e tregut. Liria e veprimtarisë ekonomike. Mbrojtja e pronës. Të drejta të barabarta për investitorët vendas dhe të huaj. Ndalohen praktikat anti-konkurruese.
  `.trim(),

  'ligjet-kosoves': `
LIGJET KRYESORE TË REPUBLIKËS SË KOSOVËS
Burimi: Gazeta Zyrtare e Kosovës (gzk.rks-gov.net) | Ministria e Drejtësisë (md.rks-gov.net)
Totali i akteve në GZK: 75,837 akte | Institucioni: Kuvendi i Republikës së Kosovës

GAZETA ZYRTARE E KOSOVËS (GZK):
Portal: gzk.rks-gov.net
Mbështetet nga: USAID
Aplikacione mobile: Android/iOS
Llojet e akteve: Kushtetuta, marrëveshje ndërkombëtare, kode, ligje, dekrete presidenciale, udhëzime administrative, rregullore, vendime, urdhra, gjykime gjyqësore, deklarata, rezoluta, njoftimet, raporte, opinione, planet rregullatore, aktet e konsoliduara.

KODET KRYESORE:
1. Kodi Penal Nr. 06/L-074 (amendamentuar me Ligjin Nr. 08/L-188, 05.12.2023)
   — Veprat penale, ndëshkimet, parimet penale
2. Kodi i Procedurës Penale Nr. 08/L-032 (amendamentuar me Ligjin Nr. 08/L-187, 05.12.2023)
   — Hetimi, ndjekja penale, gjykimi, mjetet juridike, mbrojtja e palëve
3. Kodi Civil i Kosovës — marrëdhëniet civile, kontrata, prona, trashëgimia
4. Kodi i Procedurës Civile — paditë, palët, afatet, seancat, provat, ankesat

LIGJET MBI SISTEMIN GJYQËSOR DHE PROKURORIAL:
- Ligji Nr. 06/L-054 për Gjykatat — organizimi i sistemit gjyqësor
- Ligji Nr. 06/L-056 për Prokurorinë e Shtetit (amendamentuar me Ligjin Nr. 08/L-249, 27.05.2025)
- Ligji Nr. 04/L-017 për Ndihmën Juridike Falas
- Ligji Nr. 08/L-168 për Prokurorinë Speciale (05.12.2023)
- Ligji Nr. 08/L-194 për Sistemin Qendror të Evidencës Penale të Kosovës (05.12.2023)
- Ligji Nr. 08/L-182 për Konfliktet Administrative (23.01.2024)
- Ligji Nr. 08/L-227 për Përfaqësimin e Institucioneve Shtetërore në Procedura Gjyqësore, Ndërmjetësim dhe Arbitrazh (10.01.2024)
- Ligji Nr. 08/L-307 për Ratifikimin e Traktatit me Danimarkën për Institucionin Korrektues në Gjilan (21.06.2024)

LIGJET MBI PRONËN DHE PASURINË PUBLIKE:
- Ligji Nr. 08/L-125 për Pronën Publike (05.12.2023)
- Agjencia Kadastrale e Kosovës (AKK): kadastriks.net
- Regjistrimi i pronës te Zyrat Komunale të Kadastrit

LIGJET ANTI-KORRUPSION:
- Ligji Nr. 05/L-082 kundër Korrupsionit
- Ligji Nr. 06/L-011 për Deklarimin, Prejardhjen dhe Kontrollin e Pasurisë
- Ligji Nr. 05/L-096 për Konfiskimin e Pasurisë pa Dënim
- Ligji Nr. 06/L-082 për Mbrojtjen e Sinjalizuesve (Whistleblower)
- Ligji Nr. 04/L-116 për Parandalimin e Konfliktit të Interesit
- Ligji Nr. 04/L-042 për Prokurimin Publik

LIGJET MBI SHËRBIMIN CIVIL DHE ADMINISTRATËN:
- Ligji Nr. 03/L-149 për Shërbimin Civil të Kosovës
- Ligji Nr. 04/L-051 për Organizimin dhe Funksionimin e Administratës Shtetërore
- Ligji Nr. 05/L-031 për Procedurën Administrative
- Ligji Nr. 06/L-113 për Qasje në Dokumente Publike
- Ligji Nr. 08/L-255 për Shërbime Sociale dhe Familjare (10.01.2024)

LIGJET MBI TË DREJTAT E NJERIUT DHE MBROJTJEN SOCIALE:
- Ligji Nr. 03/L-047 për Mbrojtjen e Komuniteteve dhe të Anëtarëve të Tyre
- Ligji Nr. 06/L-082 për Mbrojtjen e të Dhënave Personale
- Ligji Nr. 04/L-017 për Ndihmën Juridike Falas
- Ligji Nr. 08/L-255 për Shërbime Sociale dhe Familjare
- Ligji për Mosdiskriminim

LIGJET MBI BIZNESIN DHE EKONOMINË:
- Ligji për Shoqëritë Tregtare — rregullon Sh.P.K., Sh.A., bizneset individuale
- Ligji për Tatimin mbi të Ardhura të Korporatave — tatim 10%
- Ligji për TVSH — norma standarde 18%, e reduktuar 8%
- Ligji Nr. 10/L-025 për Kontabilitetin, Raportimin Financiar dhe Auditimin (amendamentuar 2026)
- Ligji Nr. 10/L-024 për Materialet Shpërthyese (2026)
- Ligji Nr. 10/L-021 për Financimin e Menaxhimit të Burimeve Ujore (2026)
- Ligji Nr. 04/L-034 për Agjencinë Kosovare të Privatizimit — menaxhimi i ndërmarrjeve shoqërore

MINISTRIA E DREJTËSISË (MD):
Web: md.rks-gov.net | Tel: +383(0)38-200-67-035 | Falas: 080010010
Ministri: Donika Gërvalla | Zëvendës Ministri: Genc Nimoni

Departamentet: çështje ligjore, bashkëpunim ndërkombëtar, integrim evropian, buxhet, shërbime të përgjithshme, politika të sistemit të drejtësisë, mbikëqyrje e profesioneve të lira, qasja në drejtësi, shërbime sociale/familjare.

Agjencitë nën MD:
1. Avokatura e Shtetit — përfaqëson institucionet shtetërore në gjykatë
2. Shërbimi Korrektues — administron burgjet dhe dënimin
3. Shërbimi i Provës — monitoron dënimin me kusht
4. Administrata e Pasurisë së Sekuestruar — menaxhon pasurinë e konfiskuar
5. Ndihma Juridike Falas — ofron avokat falas për të paaftet financiarisht
6. Instituti i Mjekësisë Ligjore
7. Inspektorati Korrektues

Shërbimet për Qytetarët nga MD:
- Bazat e të dhënave të jurisprudencës
- Shërbimi i administratorëve të falimentimit
- Noterët dhe shërbimi privat i ekzekutimit
- Ndërmjetësimi
- Ndihma juridike falas
- Kompensimi i viktimave
- Mbrojtja e sinjalizuesve (whistleblower)
- Mbrojtja e të dhënave personale
- Qasja në dokumente publike
- Ankesa dhe peticionet

PROCEDURA E ANKESËS ADMINISTRATIVE:
- Ankesë ndaj vendimit administrativ: brenda 15 ditëve te organi epror
- Organi epror refuzon: drejtohuni Gjykatës Administrative
- Shkelje të drejtash: Ombudspersoni — Tel: 0800 15555 (falas), Web: oik-rks.org, Adresa: Rr. Migjeni, nr. 21, Prishtinë
- Diskriminim: Komisioni për Barazi dhe Kthim (KBK)

SISTEMI I GJYKATAVE TË KOSOVËS:
1. Gjykata Kushtetuese — kushtetutshmëria e ligjeve, konfliktet ndërinstitucionale, mbrojtja e të drejtave themelore. Web: gjk-ks.org
2. Gjykata Supreme e Kosovës — shkalla e fundit e apelit, zbatimi uniform i ligjit
3. Gjykata e Apelit — katër departamente: i Përgjithshëm, Penal, Civil, Administrativ
4. Gjykatat Themelore (7): Prishtinë, Prizren, Pejë, Gjakovë, Mitrovicë, Gjilan, Ferizaj
5. Gjykata Themelore Komerciale — çështje tregtare

PROKURORIA:
- Prokuroria e Shtetit — kryeson gjithë prokurorinë
- Prokuroritë Themelore (7) — krime të zakonshme
- Prokuroria Speciale e Republikës së Kosovës (PSRK) — krim i organizuar, korrupsion, terrorizëm, pastrim parash
- Departamenti për Krime Lufte

NDIHMA JURIDIKE FALAS — SI TË APLIKONI:
Ligji Nr. 04/L-017 garanton ndihmë juridike falas.
Kushtet: persona me të ardhura nën kufirin minimal social.
Ku: Shërbimi i Ndihmës Juridike Falas pranë Ministrisë së Drejtësisë ose gjykatave.
Dokumentet: vërtetim i gjendjes financiare nga komuna.
Kontakt: md.rks-gov.net | 080010010 (falas)

AVOKATIA E PAVARUR:
- Dhoma e Avokatëve të Kosovës (DAK) — rregullon profesionin e avokatisë
- Avokatia është profesion i pavarur sipas Kushtetutës (Neni 111)
- Avokat i detyruar: në rastet penale nëse i akuzuari nuk ka mjete financiare
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
