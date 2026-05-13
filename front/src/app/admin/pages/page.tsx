'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Page {
  id: string
  slug: string
  title_sq: string
  title_en: string
  title_sr: string
  hero_title_sq: string
  hero_title_en: string
  hero_subtitle_sq: string
  hero_subtitle_en: string
  hero_image_url: string
  published: boolean
}

interface Section {
  id: string
  page_id: string
  title_sq: string
  title_en: string
  content_sq: string
  content_en: string
  image_url: string
  sort_order: number
}

interface PageBlock {
  id: string
  page_slug: string
  type: string
  title: string | null
  content: unknown
  sort_order: number
  published: boolean
}

const blockTypes = ['hero', 'card_grid', 'rich_section', 'chart_ref', 'faq_ref', 'objectives_ref', 'infographics_ref', 'collection', 'custom']
type CmsValue = string | number | boolean | null | undefined | CmsValue[] | { [key: string]: CmsValue }
type AnyRecord = { [key: string]: CmsValue }

const defaultHomeStrings: AnyRecord = {
  sq: {
    nav: { reforma: 'Reforma', sundimi: 'Sundimi i ligjit', korrupsioni: 'Korrupsioni', be: 'Integrimi në BE', objektivat: 'Objektivat', faq: 'Pyetje', kosova: 'Rreth Kosovës', kerko: 'Kërko' },
    hero: {
      tag: 'Udhëzues qytetar · përditësuar maj 2026',
      title_a: 'Rruga e Kosovës ',
      title_b: 'drejt Bashkimit Evropian',
      title_c: ', e shpjeguar thjesht.',
      sub: 'Reforma në administratë, sundimi i ligjit dhe lufta kundër korrupsionit janë tri shtyllat që qeverisin këtë proces. Këtu i gjen të ndara, të matura dhe të lidhura me jetën e përditshme.',
      cta1: 'Fillo nga këtu',
      cta2: 'Pyet asistentin',
      meta_a: 'Aplikim për anëtarësim',
      meta_b: '14 dhjetor 2022',
      meta_c: 'Statusi i kandidatit',
      meta_d: 'Në pritje',
      days_since: 'Ditë qysh nga aplikimi',
    },
    topics: { eyebrow: 'Katër fusha, një proces', title: 'Cila prej tyre të prek më shumë sot?' },
    progress: { eyebrow: 'Ku jemi në hartën evropiane', title: 'Kosova mes vendeve të rajonit', sub: 'Statusi i procesit të anëtarësimit në BE — 6 vendet e Ballkanit Perëndimor.' },
    objectives: { eyebrow: 'Objektivat', title: 'Çfarë duhet të plotësojë Kosova', sub: 'Kushtet konkrete të marra nga raportet e Komisionit Evropian dhe SAA. Filtroni sipas statusit ose klasterit.' },
    faq: { eyebrow: 'Pyetje të shpeshta', title: 'Përgjigje të shkurtra, pa zhargon institucional.' },
    cta: { title_a: 'Pyet', title_b: ', dhe asistenti përgjigjet në shqip, anglisht ose serbisht — me referencë te dokumenti origjinal.', sub: 'I trajnuar mbi raportet e Komisionit Evropian, ligjet vendore dhe analizat e shoqërisë civile. I përdorshëm me tekst ose me zë.', card_top: 'ASISTENT · SQ/EN/SR', card_action: 'Shkruaj pyetjen', card_hint: '? enter për të dërguar' },
  },
  en: {
    nav: { reforma: 'Reform', sundimi: 'Rule of law', korrupsioni: 'Corruption', be: 'EU Integration', objektivat: 'Objectives', faq: 'FAQ', kosova: 'About Kosovo', kerko: 'Search' },
    hero: { tag: 'Citizen guide · updated May 2026', title_a: "Kosovo's path ", title_b: 'to the European Union', title_c: ', explained simply.', sub: 'Public administration reform, rule of law and the fight against corruption are the three pillars that govern this process. Here they are separated, measured and tied back to everyday life.', cta1: 'Start here', cta2: 'Ask the assistant', meta_a: 'Membership application', meta_b: '14 December 2022', meta_c: 'Candidate status', meta_d: 'Pending', days_since: 'Days since the application' },
    topics: { eyebrow: 'Four areas, one process', title: 'Which one matters to you today?' },
    progress: { eyebrow: 'Where we stand on the European map', title: 'Kosovo among regional countries', sub: 'EU accession status — the six Western Balkan states.' },
    objectives: { eyebrow: 'Objectives', title: 'What Kosovo needs to deliver', sub: 'Concrete conditions taken from EC reports and the SAA. Filter by status or cluster.' },
    faq: { eyebrow: 'FAQ', title: 'Short answers, no institutional jargon.' },
    cta: { title_a: 'Ask', title_b: ', and the assistant answers in Albanian, English or Serbian — with reference to the source document.', sub: 'Trained on EC reports, domestic laws and civil-society analysis. Works with text or voice.', card_top: 'ASSISTANT · SQ/EN/SR', card_action: 'Type your question', card_hint: '? enter to send' },
  },
  sr: {
    nav: { reforma: 'Reforma', sundimi: 'Vladavina prava', korrupsioni: 'Korupcija', be: 'EU integracije', objektivat: 'Ciljevi', faq: 'FAQ', kosova: 'O Kosovu', kerko: 'Pretraga' },
    hero: { tag: 'Vodic za gradane · ažurirano maj 2026', title_a: 'Put Kosova ', title_b: 'ka Evropskoj uniji', title_c: ', jednostavno objašnjen.', sub: 'Reforma javne uprave, vladavina prava i borba protiv korupcije tri su stuba ovog procesa. Ovde su razdvojeni, mereni i povezani sa svakodnevnim životom.', cta1: 'Pocni odavde', cta2: 'Pitaj asistenta', meta_a: 'Aplikacija za clanstvo', meta_b: '14. decembar 2022', meta_c: 'Status kandidata', meta_d: 'U toku', days_since: 'Dana od aplikacije' },
    topics: { eyebrow: 'Cetiri oblasti, jedan proces', title: 'Koja vas se najviše tice danas?' },
    progress: { eyebrow: 'Gde smo na evropskoj mapi', title: 'Kosovo medu zemljama regiona', sub: 'Status EU integracija — šest zemalja Zapadnog Balkana.' },
    objectives: { eyebrow: 'Ciljevi', title: 'Šta Kosovo treba da ispuni', sub: 'Konkretni uslovi iz izveštaja EK i SSP. Filtrirajte po statusu ili klasteru.' },
    faq: { eyebrow: 'Cesta pitanja', title: 'Kratki odgovori, bez institucionalnog žargona.' },
    cta: { title_a: 'Pitaj', title_b: ', a asistent odgovara na albanskom, engleskom ili srpskom — sa referencom na izvor.', sub: 'Obucen na izveštajima EK, domacim zakonima i analizama civilnog društva. Radi sa tekstom ili glasom.', card_top: 'ASISTENT · SQ/EN/SR', card_action: 'Upiši pitanje', card_hint: '? enter za slanje' },
  },
}

const defaultHomeTopics: AnyRecord[] = [
  { key: 'reforma', num: '01', title_sq: 'Reforma\nadministrative', title_en: 'Public\nadministration', title_sr: 'Reforma\nuprave', blurb_sq: 'Si shërbimet publike po bëhen më të shpejta, dixhitale dhe të parashikueshme — nga letërnjoftimi te tatimet.', blurb_en: 'How public services are getting faster, digital and predictable — from ID cards to taxes.', blurb_sr: 'Kako javne usluge postaju brže, digitalne i predvidljive — od licne karte do poreza.', accent: 'var(--blue)', accent_soft: 'var(--blue-soft)', metric: '63%', metric_label_sq: 'shërbime tashmë online', metric_label_en: 'services already online', metric_label_sr: 'usluga vec online' },
  { key: 'sundimi', num: '02', title_sq: 'Sundimi\ni ligjit', title_en: 'Rule of\nlaw', title_sr: 'Vladavina\nprava', blurb_sq: 'Të drejtat e qytetarit para gjykatës, pavarësia e drejtësisë dhe çfarë do të thotë barazi para ligjit në praktikë.', blurb_en: 'Citizen rights in court, judicial independence, and what equality before the law looks like in practice.', blurb_sr: 'Prava gradana pred sudom, nezavisnost pravosuda i šta jednakost pred zakonom znaci u praksi.', accent: 'var(--rust)', accent_soft: 'var(--rust-soft)', metric: '218', metric_label_sq: 'ditë mesatare për një vendim', metric_label_en: 'avg. days per ruling', metric_label_sr: 'prosecno dana po odluci' },
  { key: 'korrupsioni', num: '03', title_sq: 'Lufta kundër\nkorrupsionit', title_en: 'Fight against\ncorruption', title_sr: 'Borba protiv\nkorupcije', blurb_sq: 'Si dallohet korrupsioni, kush e heton dhe ku raportohet anonimisht — me hapa konkretë.', blurb_en: 'How to recognise corruption, who investigates it and where to report anonymously — concrete steps.', blurb_sr: 'Kako prepoznati korupciju, ko je istražuje i gde je anonimno prijaviti — konkretni koraci.', accent: 'var(--gold)', accent_soft: 'var(--gold-soft)', metric: '41/100', metric_label_sq: 'CPI 2025', metric_label_en: 'CPI 2025', metric_label_sr: 'CPI 2025' },
  { key: 'be', num: '04', title_sq: 'Integrimi\nnë BE', title_en: 'EU\nintegration', title_sr: 'EU\nintegracije', blurb_sq: 'SAA, statusi i kandidatit, klasterët, çfarë do të thotë anëtarësia për paga, pasaporta dhe tregun e brendshëm.', blurb_en: 'SAA, candidate status, clusters, and what membership means for wages, passports and the internal market.', blurb_sr: 'SSP, status kandidata, klasteri i šta clanstvo znaci za plate, pasoše i unutrašnje tržište.', accent: 'var(--ink)', accent_soft: '#E1DBC9', metric: '14·12·22', metric_label_sq: 'aplikoi për anëtarësim', metric_label_en: 'applied for membership', metric_label_sr: 'aplicirano za clanstvo' },
]

const defaultHomeStats: AnyRecord[] = [
  { top: '1247', suffix: '', label_sq: 'ditë qysh nga aplikimi për anëtarësim', label_en: 'days since membership application', label_sr: 'dana od aplikacije', accent: 'var(--ink)' },
  { top: '41', suffix: '/100', label_sq: 'CPI 2025, +8 në 10 vjet', label_en: 'CPI 2025, +8 in 10 years', label_sr: 'CPI 2025, +8 za 10 godina', accent: 'var(--rust)' },
  { top: '6', suffix: '/12', label_sq: 'klasterë të hapur në negociata (objektiv)', label_en: 'open negotiation clusters (target)', label_sr: 'otvorenih klastera (cilj)', accent: 'var(--blue)' },
  { top: '0', suffix: '', label_sq: 'anëtarësime në BE që nga 2013', label_en: 'EU memberships since 2013', label_sr: 'EU pristupanja od 2013', accent: 'var(--gold)' },
]

const defaultRegion: AnyRecord[] = [
  { code: 'ME', name_sq: 'Mali i Zi', name_en: 'Montenegro', name_sr: 'Crna Gora', status: 'negotiating', chapters: 33, progress: 78 },
  { code: 'AL', name_sq: 'Shqipëria', name_en: 'Albania', name_sr: 'Albanija', status: 'negotiating', chapters: 14, progress: 38 },
  { code: 'MK', name_sq: 'Maqedonia V.', name_en: 'N. Macedonia', name_sr: 'S. Makedonija', status: 'negotiating', chapters: 6, progress: 22 },
  { code: 'RS', name_sq: 'Serbia', name_en: 'Serbia', name_sr: 'Srbija', status: 'negotiating', chapters: 22, progress: 44 },
  { code: 'BA', name_sq: 'BiH', name_en: 'BiH', name_sr: 'BiH', status: 'candidate', chapters: 0, progress: 12 },
  { code: 'XK', name_sq: 'Kosova', name_en: 'Kosovo', name_sr: 'Kosovo', status: 'pending', chapters: 0, progress: 8 },
]

const topicPageSlugs = ['reforma', 'sundimi', 'korrupsioni', 'be']

const defaultTopicContent: AnyRecord = {
  reforma: {
    sq: [
      { h: 'Çfarë po ndryshon', p: 'Reforma synon shërbime publike që funksionojnë si infrastrukturë: të parashikueshme, të matshme dhe të aksesueshme në distancë.', list: ['Të gjitha shërbimet me një llogari të vetme në eKosova', 'Afate maksimale të publikuara për çdo shërbim', 'Identitet dixhital me eID — pa kërkesa të përsëritura'] },
      { h: 'Si të prek', p: 'Më pak radhë, më pak letra, dhe e drejta për të ditur statusin e kërkesës tënde në çdo moment.' },
      { h: 'Çfarë mbetet', p: 'Sistemi i pagave të shërbimit civil dhe rekrutim mbi bazë meritash janë ende në fazë miratimi.' },
    ],
    en: [
      { h: 'What is changing', p: 'The reform aims at public services that work as infrastructure: predictable, measurable and remotely accessible.', list: ['All services via a single eKosova account', 'Published maximum deadlines for every service', 'Digital identity via eID — no repeated requests'] },
      { h: 'How it affects you', p: 'Fewer queues, less paper, and the right to know the status of your request at any moment.' },
      { h: 'What remains', p: 'A unified civil-service pay system and merit-based recruitment are still being adopted.' },
    ],
    sr: [
      { h: 'Šta se menja', p: 'Reforma cilja javne usluge koje rade kao infrastruktura: predvidljive, merljive i dostupne na daljinu.', list: ['Sve usluge preko jedinstvenog eKosova naloga', 'Objavljeni maksimalni rokovi za svaku uslugu', 'Digitalni identitet preko eID — bez ponovljenih zahteva'] },
      { h: 'Kako vas se tice', p: 'Manje redova, manje papira i pravo da u svakom trenutku znate status svog zahteva.' },
      { h: 'Šta ostaje', p: 'Jedinstven sistem plata državne službe i zapošljavanje na osnovu zasluga još su u fazi usvajanja.' },
    ],
  },
  sundimi: {
    sq: [
      { h: 'Tri shtylla', p: 'Pavarësia e gjyqësorit, llogaridhënia e prokurorisë, dhe e drejta efektive për ankesë.', list: ['Procedurë emërimi transparente për gjyqtarë', 'Vetting i pasurisë dhe integritetit', 'Afate ligjore për shqyrtim ankese'] },
      { h: 'Të drejtat e qytetarit', p: 'Çdo akt administrativ mund të ankimohet brenda 30 ditësh. Gjykata ka detyrim të jepë vendim brenda 60 ditësh për çështje urgjente.' },
      { h: 'Treguesi kryesor', p: 'Kohëzgjatja mesatare e procedurave dhe përqindja e vendimeve të prishura në instancën më të lartë.' },
    ],
    en: [
      { h: 'Three pillars', p: 'Judicial independence, prosecutorial accountability, and an effective right to appeal.', list: ['Transparent appointment procedure for judges', 'Wealth and integrity vetting', 'Legal deadlines for reviewing appeals'] },
      { h: 'Citizen rights', p: 'Every administrative act can be appealed within 30 days. The court must rule within 60 days on urgent matters.' },
      { h: 'Key indicator', p: 'Average length of proceedings and share of decisions overturned at the higher instance.' },
    ],
    sr: [
      { h: 'Tri stuba', p: 'Nezavisnost pravosuda, odgovornost tužilaštva i delotvorno pravo na žalbu.', list: ['Transparentna procedura imenovanja sudija', 'Provera imovine i integriteta', 'Zakonski rokovi za razmatranje žalbi'] },
      { h: 'Prava gradanina', p: 'Svaki administrativni akt može se osporiti u roku od 30 dana. Sud mora doneti odluku u roku od 60 dana za hitne predmete.' },
      { h: 'Kljucni pokazatelj', p: 'Prosecno trajanje postupka i udeo odluka ukinutih u višoj instanci.' },
    ],
  },
  korrupsioni: {
    sq: [
      { h: 'Format më të zakonshme', p: 'Ryshfeti i vogël në shërbime ditore, konflikt interesi në prokurim, dhe ndikim politik te pozita drejtuese.' },
      { h: 'Si raportohet', p: 'Tre kanale të pavarura, identifikimi nuk është i detyrueshëm:', list: ['Agjencia kundër Korrupsionit — formular online, linjë 24/7', 'Prokuroria Speciale — për krim të organizuar', 'Avokati i Popullit — për keqpërdorim pushteti nga zyrtarë'] },
      { h: 'Mbrojtja e sinjalizuesit', p: 'Ligji 06/L-085 (2018) garanton paprekshmëri profesionale dhe anonimat të plotë për raportues të mirëbesimit.' },
    ],
    en: [
      { h: 'Most common forms', p: 'Petty bribery in daily services, conflict of interest in procurement, and political influence over leadership posts.' },
      { h: 'How to report', p: 'Three independent channels, identification is not required:', list: ['Anti-Corruption Agency — online form, 24/7 line', 'Special Prosecution — for organised crime', 'Ombudsperson — for abuse of power by officials'] },
      { h: 'Whistleblower protection', p: 'Law 06/L-085 (2018) guarantees professional immunity and full anonymity for good-faith reporters.' },
    ],
    sr: [
      { h: 'Najcešci oblici', p: 'Sitno podmicivanje u svakodnevnim uslugama, sukob interesa u nabavkama i politicki uticaj na rukovodece pozicije.' },
      { h: 'Kako prijaviti', p: 'Tri nezavisna kanala, identifikacija nije obavezna:', list: ['Antikorupcijska agencija — online formular, 24/7 linija', 'Specijalno tužilaštvo — za organizovani kriminal', 'Ombudsman — za zloupotrebu vlasti od službenika'] },
      { h: 'Zaštita zviždaca', p: 'Zakon 06/L-085 (2018) garantuje profesionalni imunitet i potpunu anonimnost za prijave u dobroj veri.' },
    ],
  },
  be: {
    sq: [
      { h: 'Ku ndodhemi', p: 'Aplikim formal më 14 dhjetor 2022. Po pritet opinioni i Komisionit, pa të cilin nuk fillon negociata.' },
      { h: 'Hapat e ardhshëm', p: 'Procesi shtyhet vetëm me konsensus të 27 shteteve. Pesë prej tyre ende nuk e kanë njohur Kosovën.', list: ['Opinion i Komisionit Evropian', 'Status kandidati (vendim i Këshillit)', 'Hapja e klasterëve të negociatave', 'Mbyllja kapituj-kapituj e 6 klasterëve'] },
      { h: 'Çfarë do të thotë anëtarësia', p: 'Treg i brendshëm, lëvizje e lirë e punës dhe kapitalit, fonde strukturore, dhe pjesëmarrje në vendimmarrjen evropiane.' },
    ],
    en: [
      { h: 'Where we stand', p: "Formal application on 14 December 2022. The Commission's opinion is pending — without it, negotiations cannot begin." },
      { h: 'Next steps', p: 'The process moves forward only with consensus of all 27 states. Five of them have not yet recognised Kosovo.', list: ['European Commission opinion', 'Candidate status (Council decision)', 'Opening of negotiation clusters', 'Chapter-by-chapter closure of the 6 clusters'] },
      { h: 'What membership means', p: 'Internal market, free movement of labour and capital, structural funds, and participation in European decision-making.' },
    ],
    sr: [
      { h: 'Gde smo', p: 'Formalna aplikacija 14. decembra 2022. Mišljenje Komisije se ceka — bez njega pregovori ne mogu poceti.' },
      { h: 'Sledeci koraci', p: 'Proces se nastavlja samo uz konsenzus svih 27 država. Pet država još nije priznalo Kosovo.', list: ['Mišljenje Evropske komisije', 'Status kandidata (odluka Saveta)', 'Otvaranje pregovarackih klastera', 'Zatvaranje poglavlja u 6 klastera'] },
      { h: 'Šta znaci clanstvo', p: 'Unutrašnje tržište, slobodno kretanje rada i kapitala, strukturni fondovi i ucešce u evropskom odlucivanju.' },
    ],
  },
}

const defaultTopicDeepContent: AnyRecord = {
  reforma: {
    sq: [{ h: 'Administrata si shërbim, jo si pengesë', p: 'Qëllimi i reformës është që qytetari të mos ketë nevojë të njohë zyrën, sportelin apo formularin e saktë.' }, { h: 'Çfarë matet realisht', p: 'Matet koha mesatare e shërbimit, numri i dokumenteve që kërkohen nga qytetari, shkalla e ankesave dhe shërbimet online.' }, { h: 'Pse lidhet me BE-në', p: 'BE-ja kërkon administratë profesionale, të qëndrueshme dhe të depolitizuar.' }],
    en: [{ h: 'Administration as a service, not an obstacle', p: 'Public services should be understandable without knowing the right office, counter or form.' }, { h: 'What is actually measured', p: 'Average service time, documents requested from citizens, complaint rates and online completion.' }, { h: 'Why it matters for the EU', p: 'The EU requires a professional, stable and depoliticised administration.' }],
    sr: [{ h: 'Administracija kao usluga, ne prepreka', p: 'Javne usluge treba da budu razumljive bez poznavanja tacne kancelarije ili formulara.' }, { h: 'Šta se zaista meri', p: 'Prosecno vreme usluge, broj dokumenata, žalbe i online završetak.' }, { h: 'Zašto je važno za EU', p: 'EU traži profesionalnu, stabilnu i depolitizovanu administraciju.' }],
  },
  sundimi: {
    sq: [{ h: 'Barazia para ligjit në praktikë', p: 'Sundimi i ligjit është e drejta për informim, procedurë të drejtë, vendim të arsyetuar dhe ankesë reale.' }, { h: 'Pavarësia dhe llogaridhënia', p: 'Gjyqtarët dhe prokurorët duhet të jenë të mbrojtur nga presioni politik, por edhe të përgjegjshëm.' }, { h: 'Pika që shikon BE-ja', p: 'Raportet vlerësojnë efikasitetin e gjykatave, krimin e organizuar, të drejtat themelore dhe zbatimin e vendimeve.' }],
    en: [{ h: 'Equality before the law in practice', p: 'Rule of law means information, fair procedure, reasoned decisions and a real appeal path.' }, { h: 'Independence and accountability', p: 'Judges and prosecutors must be protected from political pressure while remaining accountable.' }, { h: 'What the EU watches', p: 'Reports assess court efficiency, organised-crime cases, fundamental rights and implementation.' }],
    sr: [{ h: 'Jednakost pred zakonom u praksi', p: 'Vladavina prava znaci informacije, pravican postupak, obrazloženu odluku i stvarnu žalbu.' }, { h: 'Nezavisnost i odgovornost', p: 'Sudije i tužioci moraju biti zašticeni, ali odgovorni.' }, { h: 'Šta EU prati', p: 'Izveštaji prate efikasnost sudova, organizovani kriminal, osnovna prava i sprovodenje odluka.' }],
  },
  korrupsioni: {
    sq: [{ h: 'Korrupsioni i vogël dhe ai sistemik', p: 'Ryshfeti dëmton besimin, ndërsa kapja e prokurimit dhe punësimit publik pengon zhvillimin.' }, { h: 'Çfarë e bën raportimin të besueshëm', p: 'Raportimi funksionon kur ka kanal të sigurt, mbrojtje, afat dhe kthim informacioni.' }, { h: 'Nga ndëshkimi te parandalimi', p: 'Standardi evropian mat transparencën, deklarimin e pasurisë, auditimin dhe konfliktin e interesit.' }],
    en: [{ h: 'Petty and systemic corruption', p: 'Bribery damages trust, while capture of procurement and hiring blocks development.' }, { h: 'What makes reporting credible', p: 'Reporting works with a safe channel, protection, deadline and feedback.' }, { h: 'From punishment to prevention', p: 'European standards measure transparency, asset declarations, audits and conflict-of-interest management.' }],
    sr: [{ h: 'Sitna i sistemska korupcija', p: 'Mito ruši poverenje, a kontrola nabavki i zapošljavanja koci razvoj.' }, { h: 'Šta prijavu cini verodostojnom', p: 'Prijava funkcioniše uz bezbedan kanal, zaštitu, rok i povratnu informaciju.' }, { h: 'Od kažnjavanja ka prevenciji', p: 'Evropski standard meri transparentnost, imovinu, revizije i sukob interesa.' }],
  },
  be: {
    sq: [{ h: 'Proces politik dhe teknik', p: 'Anëtarësimi është vendim politik i 27 shteteve dhe proces teknik i harmonizimit me standardet evropiane.' }, { h: 'Pse statusi nuk mjafton', p: 'Statusi kandidat hap derën, por negociatat kërkojnë rezultate të matshme.' }, { h: 'Çfarë fiton qytetari', p: 'Procesi sjell siguri juridike, shërbime më të mira, konkurrencë më të drejtë dhe mundësi për të rinjtë.' }],
    en: [{ h: 'A political and technical process', p: 'EU membership is both a political decision and a technical alignment process.' }, { h: 'Why status is not enough', p: 'Candidate status opens the door, but negotiations require measurable results.' }, { h: 'What citizens gain', p: 'The process means legal certainty, better services, fair competition and opportunities.' }],
    sr: [{ h: 'Politicki i tehnicki proces', p: 'Clanstvo je politicka odluka i tehnicki proces uskladivanja.' }, { h: 'Zašto status nije dovoljan', p: 'Status kandidata otvara vrata, ali pregovori traže merljive rezultate.' }, { h: 'Šta gradanin dobija', p: 'Proces znaci pravnu sigurnost, bolje usluge, pošteniju konkurenciju i mogucnosti.' }],
  },
}

const defaultCpi: AnyRecord[] = [
  { year: 2015, score: 33 }, { year: 2016, score: 36 }, { year: 2017, score: 39 }, { year: 2018, score: 37 }, { year: 2019, score: 36 }, { year: 2020, score: 36 }, { year: 2021, score: 39 }, { year: 2022, score: 41 }, { year: 2023, score: 41 }, { year: 2024, score: 40 }, { year: 2025, score: 41 },
]

const defaultReform: AnyRecord[] = [
  { key: 'admin', label_sq: 'Administratë', label_en: 'Administration', label_sr: 'Uprava', value: 47 },
  { key: 'judiciary', label_sq: 'Drejtësi', label_en: 'Judiciary', label_sr: 'Pravosude', value: 31 },
  { key: 'anti_corr', label_sq: 'Antikorrupsion', label_en: 'Anti-corruption', label_sr: 'Antikorupcija', value: 26 },
  { key: 'economy', label_sq: 'Ekonomi', label_en: 'Economy', label_sr: 'Ekonomija', value: 54 },
  { key: 'rights', label_sq: 'Të drejta themelore', label_en: 'Fundamental rights', label_sr: 'Osnovna prava', value: 49 },
  { key: 'media', label_sq: 'Liria e medias', label_en: 'Media freedom', label_sr: 'Sloboda medija', value: 58 },
]

const defaultClusters: AnyRecord[] = [
  { code: 1, name_sq: 'Themelet', name_en: 'Fundamentals', name_sr: 'Osnove', color: 'var(--ink)', chapters: 7, weight: 22 },
  { code: 2, name_sq: 'Tregu i brendshëm', name_en: 'Internal market', name_sr: 'Unutrašnje tržište', color: 'var(--blue)', chapters: 6, weight: 20 },
  { code: 3, name_sq: 'Konkurrueshmëria & rritja', name_en: 'Competitiveness & growth', name_sr: 'Konkurentnost i rast', color: 'var(--gold)', chapters: 8, weight: 18 },
  { code: 4, name_sq: 'Agjenda e gjelbër', name_en: 'Green agenda', name_sr: 'Zelena agenda', color: 'var(--sage)', chapters: 5, weight: 14 },
  { code: 5, name_sq: 'Burimet & bujqësia', name_en: 'Resources & agriculture', name_sr: 'Resursi i poljoprivreda', color: 'var(--rust)', chapters: 5, weight: 14 },
  { code: 6, name_sq: 'Marrëdhënie të jashtme', name_en: 'External relations', name_sr: 'Spoljni odnosi', color: '#7A6D5A', chapters: 2, weight: 12 },
]

const defaultObjectiveContext: AnyRecord[] = [
  { h_sq: 'Si lexohen objektivat', h_en: 'How to read objectives', h_sr: 'Kako čitati ciljeve', p_sq: 'Objektivat janë ura mes reformave vendore dhe kërkesave të BE-së: secili duhet të ketë status, kusht, burim dhe indikator të matshëm.', p_en: 'Objectives connect domestic reforms with EU requirements: each needs a status, condition, source and measurable indicator.', p_sr: 'Ciljevi povezuju domaće reforme sa zahtevima EU: svaki treba status, uslov, izvor i merljiv indikator.' },
  { h_sq: 'Çfarë do të thotë progresi', h_en: 'What progress means', h_sr: 'Šta znači napredak', p_sq: 'Progresi nuk është vetëm miratim ligji. Ai kërkon zbatim, buxhet, institucion përgjegjës dhe rezultat që qytetari mund ta ndiejë.', p_en: 'Progress is not only adopting a law. It requires implementation, budget, responsible institutions and an outcome citizens can feel.', p_sr: 'Napredak nije samo usvajanje zakona. Potrebni su sprovođenje, budžet, odgovorna institucija i rezultat koji građanin oseća.' },
  { h_sq: 'Pse disa mbeten hapur', h_en: 'Why some stay open', h_sr: 'Zašto neki ostaju otvoreni', p_sq: 'Disa objektiva varen nga konsensusi politik, disa nga kapaciteti administrativ dhe disa nga vendimet e shteteve anëtare të BE-së.', p_en: 'Some objectives depend on political consensus, some on administrative capacity and some on decisions by EU member states.', p_sr: 'Neki ciljevi zavise od političkog konsenzusa, neki od administrativnog kapaciteta, a neki od odluka država članica EU.' },
]

const defaultFaqGuide: AnyRecord = {
  eyebrow_sq: 'Si ta përdorësh FAQ', eyebrow_en: 'How to use the FAQ', eyebrow_sr: 'Kako koristiti FAQ',
  title_sq: 'Pyetjet janë hyrje, jo fundi i kërkimit.', title_en: 'Questions are an entry point, not the end of inquiry.', title_sr: 'Pitanja su ulaz, ne kraj istraživanja.',
  body_sq: 'Nëse përgjigjja është e shkurtër, përdore si orientim: hap temën përkatëse, shiko objektivat dhe pyet EU Agent për shembuj konkretë.',
  body_en: 'If an answer is short, use it as orientation: open the related topic, check the objectives and ask EU Agent for concrete examples.',
  body_sr: 'Ako je odgovor kratak, koristi ga kao orijentaciju: otvori povezanu temu, pogledaj ciljeve i pitaj EU Agent za konkretne primere.',
  cta_sq: 'Pyet për një rast', cta_en: 'Ask about a case', cta_sr: 'Pitaj za slučaj',
}

const defaultInfoMethod: AnyRecord[] = [
  { n: '01', label_sq: 'Pyetja', label_en: 'Question', label_sr: 'Pitanje' },
  { n: '02', label_sq: 'Burimi', label_en: 'Source', label_sr: 'Izvor' },
  { n: '03', label_sq: 'Treguesi', label_en: 'Indicator', label_sr: 'Pokazatelj' },
  { n: '04', label_sq: 'Veprimi', label_en: 'Action', label_sr: 'Akcija' },
]

const defaultKosovaPage: AnyRecord = {
  sq: {
    eyebrow: 'Një histori mbijetese dhe formimi',
    hero: ['Kosova.', 'Zemra e re', 'e Evropës.'],
    heroSub: 'Nga hiri i luftës te agimi i një kapitulli të ri - një komb me dy milionë zëra që shkon drejt një të ardhmeje të përbashkët evropiane.',
    historyLabel: 'I. Pesha e historisë',
    historyP1: 'Në vitin 1999, Kosova përjetoi një nga kapitujt më të errët të Evropës: zhvendosje, shkatërrim dhe përpjekje për fshirjen e një mënyre jetese.',
    historyP2: 'Megjithatë nga ajo heshtje, Kosova u ngrit.',
    quote: 'Kujtesa nuk na mban peng - ajo na mëson vlerën e paqes.',
    quoteBy: 'NJË I MBIJETUAR NGA PRISHTINA, 1999',
    timeline: [{ year: '1999', text: 'Çlirimi dhe fillimi i mbështetjes ndërkombëtare.' }, { year: '2008', text: 'Kosova shpall pavarësinë.' }, { year: '2024', text: 'Hyn në fuqi liberalizimi i vizave me BE-në.' }],
    peopleText: 'Mbi 50% e popullsisë së Kosovës është nën moshën 30 vjeç.',
    pillars: [{ icon: '01', title: 'Sundimi i ligjit', text: 'Një demokraci e re kushtetuese me shoqëri civile aktive.' }],
    euText: 'Gjeografikisht, kulturalisht dhe shpirtërisht, Kosova ka qenë gjithmonë pjesë e historisë evropiane.',
    cta: 'Fillo udhëtimin',
  },
  en: {
    eyebrow: 'A Story of Survival and Becoming',
    hero: ['Kosovo.', "Europe's", 'Young Heart.'],
    heroSub: 'From the ashes of war to the dawn of a new chapter - a nation reaching toward Europe.',
    historyLabel: 'I. The Weight of History',
    historyP1: "In 1999, Kosovo endured one of Europe's darkest chapters.",
    historyP2: 'Yet from that silence, Kosovo rose.',
    quote: 'Memory does not trap us - it teaches us the value of peace.',
    quoteBy: 'A SURVIVOR OF PRISTINA, 1999',
    timeline: [{ year: '1999', text: 'Liberation and the beginning of international support.' }, { year: '2008', text: 'Kosovo declares independence.' }, { year: '2024', text: 'Visa liberalization with the EU begins.' }],
    peopleText: "Over 50% of Kosovo's population is under 30.",
    pillars: [{ icon: '01', title: 'Rule of Law', text: 'A young constitutional democracy with active civil society.' }],
    euText: 'Geographically, culturally, and in spirit - Kosovo has always been part of Europe.',
    cta: 'Begin the Journey',
  },
  sr: {
    eyebrow: 'Priča o opstanku i postajanju',
    hero: ['Kosovo.', 'Mlado srce', 'Evrope.'],
    heroSub: 'Iz pepela rata ka početku novog poglavlja.',
    historyLabel: 'I. Težina istorije',
    historyP1: 'Godine 1999. Kosovo je preživelo jedno od najmračnijih poglavlja Evrope.',
    historyP2: 'Ipak, iz te tišine Kosovo se podiglo.',
    quote: 'Sećanje nas ne zarobljava - ono nas uči vrednosti mira.',
    quoteBy: 'PREŽIVELI IZ PRIŠTINE, 1999',
    timeline: [{ year: '1999', text: 'Oslobođenje i početak međunarodne podrške.' }, { year: '2008', text: 'Kosovo proglašava nezavisnost.' }, { year: '2024', text: 'Stupa na snagu vizna liberalizacija sa EU.' }],
    peopleText: 'Više od 50% stanovništva Kosova mlađe je od 30 godina.',
    pillars: [{ icon: '01', title: 'Vladavina prava', text: 'Mlada ustavna demokratija sa aktivnim civilnim društvom.' }],
    euText: 'Geografski, kulturno i duhovno, Kosovo je oduvek deo evropske priče.',
    cta: 'Započni putovanje',
  },
}

function mergeDeep(base: AnyRecord, override: AnyRecord): AnyRecord {
  const next = { ...base }
  Object.entries(override || {}).forEach(([key, value]) => {
    next[key] = value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])
      ? mergeDeep(base[key] as AnyRecord, value as AnyRecord)
      : value
  })
  return next
}

function asRecord(value: CmsValue): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {}
}

function getHomeValue(strings: AnyRecord, lang: string, section: string, field: string): string {
  const value = asRecord(asRecord(strings[lang])[section])[field]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function toInputValue(value: CmsValue): string | number {
  return typeof value === 'string' || typeof value === 'number' ? value : ''
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [blocks, setBlocks] = useState<PageBlock[]>([])
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [editingBlock, setEditingBlock] = useState<PageBlock | null>(null)
  const [blockJson, setBlockJson] = useState('')
  const [blockError, setBlockError] = useState('')
  const [activePage, setActivePage] = useState<string | null>(null)
  const [homeStrings, setHomeStrings] = useState<AnyRecord>(defaultHomeStrings)
  const [homeTopics, setHomeTopics] = useState<AnyRecord[]>(defaultHomeTopics)
  const [homeStats, setHomeStats] = useState<AnyRecord[]>(defaultHomeStats)
  const [homeRegion, setHomeRegion] = useState<AnyRecord[]>(defaultRegion)
  const [savingHome, setSavingHome] = useState(false)
  const [homeMessage, setHomeMessage] = useState('')
  const [topicContent, setTopicContent] = useState<AnyRecord>({})
  const [topicDeepContent, setTopicDeepContent] = useState<AnyRecord>({})
  const [cpiRows, setCpiRows] = useState<AnyRecord[]>(defaultCpi)
  const [reformRows, setReformRows] = useState<AnyRecord[]>(defaultReform)
  const [clusterRows, setClusterRows] = useState<AnyRecord[]>(defaultClusters)
  const [objectiveContextRows, setObjectiveContextRows] = useState<AnyRecord[]>(defaultObjectiveContext)
  const [faqGuide, setFaqGuide] = useState<AnyRecord>(defaultFaqGuide)
  const [infoMethodRows, setInfoMethodRows] = useState<AnyRecord[]>(defaultInfoMethod)
  const [kosovaPage, setKosovaPage] = useState<AnyRecord>(defaultKosovaPage)
  const [savingPageEditor, setSavingPageEditor] = useState(false)
  const [pageEditorMessage, setPageEditorMessage] = useState('')

  useEffect(() => { loadPages() }, [])

  async function loadPages() {
    const { data } = await supabase.from('pages').select('*').order('slug')
    setPages(data ?? [])
  }

  async function loadSections(pageId: string) {
    setActivePage(pageId)
    const pageSlug = pages.find(p => p.id === pageId)?.slug
    const [{ data }, { data: blockData }] = await Promise.all([
      supabase.from('sections').select('*').eq('page_id', pageId).order('sort_order'),
      pageSlug
        ? supabase.from('page_blocks').select('*').eq('page_slug', pageSlug).order('sort_order')
        : Promise.resolve({ data: [] }),
    ])
    setSections(data ?? [])
    setBlocks(blockData ?? [])
    if (pageSlug === 'home') loadHomeEditor(blockData ?? [])
    if (pageSlug && topicPageSlugs.includes(pageSlug)) loadTopicEditor(pageSlug, blockData ?? [])
    if (pageSlug && ['objektivat', 'faq', 'infografika', 'kosova'].includes(pageSlug)) loadSimplePageEditor(pageSlug, blockData ?? [])
  }

  async function loadHomeEditor(blockRows: PageBlock[]) {
    const [{ data: settingsRows }, { data: regionRows }] = await Promise.all([
      supabase.from('site_settings').select('key,value').eq('key', 'strings').maybeSingle(),
      supabase.from('chart_series').select('data').eq('key', 'region').maybeSingle(),
    ])

    const topicBlock = blockRows.find(b => b.type === 'collection' && (b.content as AnyRecord)?.key === 'topics')
    const statBlock = blockRows.find(b => b.type === 'collection' && (b.content as AnyRecord)?.key === 'home_stats')
    const stringsValue = (settingsRows?.value && typeof settingsRows.value === 'object') ? settingsRows.value as AnyRecord : {}

    setHomeStrings(mergeDeep(defaultHomeStrings, stringsValue))
    const topicItems = (topicBlock?.content as AnyRecord | undefined)?.items
    const statItems = (statBlock?.content as AnyRecord | undefined)?.items
    setHomeTopics(Array.isArray(topicItems) ? topicItems as AnyRecord[] : defaultHomeTopics)
    setHomeStats(Array.isArray(statItems) ? statItems as AnyRecord[] : defaultHomeStats)
    setHomeRegion(Array.isArray(regionRows?.data) && regionRows.data.length ? regionRows.data as AnyRecord[] : defaultRegion)
    setHomeMessage('')
  }

  async function loadTopicEditor(pageSlug: string, blockRows: PageBlock[]) {
    const [cpiRes, reformRes, clustersRes, regionRes, topicsRes] = await Promise.all([
      supabase.from('chart_series').select('data').eq('key', 'cpi').maybeSingle(),
      supabase.from('chart_series').select('data').eq('key', 'reform').maybeSingle(),
      supabase.from('chart_series').select('data').eq('key', 'clusters').maybeSingle(),
      supabase.from('chart_series').select('data').eq('key', 'region').maybeSingle(),
      supabase.from('page_blocks').select('content').eq('page_slug', 'home').eq('type', 'collection').contains('content', { key: 'topics' }).maybeSingle(),
    ])
    const contentBlock = blockRows.find(b => b.type === 'collection' && (b.content as AnyRecord)?.key === 'topic_content')
    const deepBlock = blockRows.find(b => b.type === 'collection' && (b.content as AnyRecord)?.key === 'topic_deep_content')
    const contentValue = asRecord((contentBlock?.content as AnyRecord | undefined)?.value)
    const deepValue = asRecord((deepBlock?.content as AnyRecord | undefined)?.value)

    const topicItems = asRecord(topicsRes.data?.content as CmsValue).items
    setHomeTopics(Array.isArray(topicItems) ? topicItems as AnyRecord[] : defaultHomeTopics)
    const contentForPage = asRecord(contentValue[pageSlug])
    const deepForPage = asRecord(deepValue[pageSlug])
    setTopicContent(Object.keys(contentForPage).length ? contentForPage : asRecord(defaultTopicContent[pageSlug]))
    setTopicDeepContent(Object.keys(deepForPage).length ? deepForPage : asRecord(defaultTopicDeepContent[pageSlug]))
    setCpiRows(Array.isArray(cpiRes.data?.data) && cpiRes.data?.data.length ? cpiRes.data.data as AnyRecord[] : defaultCpi)
    setReformRows(Array.isArray(reformRes.data?.data) && reformRes.data?.data.length ? reformRes.data.data as AnyRecord[] : defaultReform)
    setClusterRows(Array.isArray(clustersRes.data?.data) && clustersRes.data?.data.length ? clustersRes.data.data as AnyRecord[] : defaultClusters)
    setHomeRegion(Array.isArray(regionRes.data?.data) && regionRes.data?.data.length ? regionRes.data.data as AnyRecord[] : defaultRegion)
    setPageEditorMessage('')
  }

  function getBlockItems(blockRows: PageBlock[], key: string, fallback: AnyRecord[]): AnyRecord[] {
    const block = blockRows.find(b => b.type === 'collection' && (b.content as AnyRecord)?.key === key)
    const items = (block?.content as AnyRecord | undefined)?.items
    return Array.isArray(items) && items.length ? items as AnyRecord[] : fallback
  }

  function getBlockValue(blockRows: PageBlock[], key: string, fallback: AnyRecord): AnyRecord {
    const block = blockRows.find(b => b.type === 'collection' && (b.content as AnyRecord)?.key === key)
    const value = asRecord((block?.content as AnyRecord | undefined)?.value)
    return Object.keys(value).length ? value : fallback
  }

  function loadSimplePageEditor(pageSlug: string, blockRows: PageBlock[]) {
    if (pageSlug === 'objektivat') setObjectiveContextRows(getBlockItems(blockRows, 'objective_context', defaultObjectiveContext))
    if (pageSlug === 'faq') setFaqGuide(getBlockValue(blockRows, 'faq_guide', defaultFaqGuide))
    if (pageSlug === 'infografika') setInfoMethodRows(getBlockItems(blockRows, 'infographics_method', defaultInfoMethod))
    if (pageSlug === 'kosova') setKosovaPage(getBlockValue(blockRows, 'kosova_page', defaultKosovaPage))
    setPageEditorMessage('')
  }

  function setHomeText(lang: 'sq' | 'en' | 'sr', section: string, field: string, value: string) {
    setHomeStrings(prev => ({
      ...prev,
      [lang]: {
        ...asRecord(prev[lang]),
        [section]: {
          ...asRecord(asRecord(prev[lang])[section]),
          [field]: value,
        },
      },
    }))
  }

  function updateItem(setter: (items: AnyRecord[]) => void, items: AnyRecord[], index: number, field: string, value: string | number) {
    setter(items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function updateLocalizedList(setter: (value: AnyRecord) => void, value: AnyRecord, lang: string, index: number, field: string, nextValue: CmsValue) {
    const current = Array.isArray(value[lang]) ? value[lang] as AnyRecord[] : []
    setter({ ...value, [lang]: current.map((item, i) => i === index ? { ...item, [field]: nextValue } : item) })
  }

  function addLocalizedListItem(setter: (value: AnyRecord) => void, value: AnyRecord, lang: string) {
    const current = Array.isArray(value[lang]) ? value[lang] as AnyRecord[] : []
    setter({ ...value, [lang]: [...current, { h: '', p: '', list: [] }] })
  }

  function removeLocalizedListItem(setter: (value: AnyRecord) => void, value: AnyRecord, lang: string, index: number) {
    const current = Array.isArray(value[lang]) ? value[lang] as AnyRecord[] : []
    setter({ ...value, [lang]: current.filter((_, i) => i !== index) })
  }

  function setKosovaField(lang: string, field: string, value: CmsValue) {
    setKosovaPage(prev => ({ ...prev, [lang]: { ...asRecord(prev[lang]), [field]: value } }))
  }

  function setKosovaHeroLine(lang: string, index: number, value: string) {
    const langCopy = asRecord(kosovaPage[lang])
    const hero = Array.isArray(langCopy.hero) ? [...langCopy.hero] : ['', '', '']
    hero[index] = value
    setKosovaField(lang, 'hero', hero)
  }

  function updateKosovaList(lang: string, listKey: string, index: number, field: string, value: CmsValue) {
    const langCopy = asRecord(kosovaPage[lang])
    const list = Array.isArray(langCopy[listKey]) ? langCopy[listKey] as AnyRecord[] : []
    setKosovaField(lang, listKey, list.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  async function upsertCollectionBlock(key: string, title: string, items: AnyRecord[], sortOrder: number) {
    const { data: homeBlocks } = await supabase.from('page_blocks').select('id,content').eq('page_slug', 'home').eq('type', 'collection')
    const existing = blocks.find(b => b.page_slug === 'home' && b.type === 'collection' && (b.content as AnyRecord)?.key === key)
      || (homeBlocks ?? []).find(b => (b.content as AnyRecord)?.key === key)
    const row = {
      page_slug: 'home',
      type: 'collection',
      title,
      content: { key, items },
      sort_order: sortOrder,
      published: true,
    }
    if (existing?.id) {
      await supabase.from('page_blocks').update(row).eq('id', existing.id)
    } else {
      await supabase.from('page_blocks').insert(row)
    }
  }

  async function upsertObjectBlock(pageSlug: string, key: string, title: string, value: AnyRecord, sortOrder: number) {
    const existing = blocks.find(b => b.page_slug === pageSlug && b.type === 'collection' && (b.content as AnyRecord)?.key === key)
    const row = {
      page_slug: pageSlug,
      type: 'collection',
      title,
      content: { key, value },
      sort_order: sortOrder,
      published: true,
    }
    if (existing?.id) {
      await supabase.from('page_blocks').update(row).eq('id', existing.id)
    } else {
      await supabase.from('page_blocks').insert(row)
    }
  }

  async function upsertItemsBlock(pageSlug: string, key: string, title: string, items: AnyRecord[], sortOrder: number) {
    const existing = blocks.find(b => b.page_slug === pageSlug && b.type === 'collection' && (b.content as AnyRecord)?.key === key)
    const row = {
      page_slug: pageSlug,
      type: 'collection',
      title,
      content: { key, items },
      sort_order: sortOrder,
      published: true,
    }
    if (existing?.id) {
      await supabase.from('page_blocks').update(row).eq('id', existing.id)
    } else {
      await supabase.from('page_blocks').insert(row)
    }
  }

  async function saveSimplePageEditor(pageSlug: string) {
    setSavingPageEditor(true)
    setPageEditorMessage('')
    if (pageSlug === 'objektivat') await upsertItemsBlock(pageSlug, 'objective_context', 'Objective context cards', objectiveContextRows, 20)
    if (pageSlug === 'faq') await upsertObjectBlock(pageSlug, 'faq_guide', 'FAQ guide section', faqGuide, 20)
    if (pageSlug === 'infografika') await upsertItemsBlock(pageSlug, 'infographics_method', 'Infographics method cards', infoMethodRows, 20)
    if (pageSlug === 'kosova') await upsertObjectBlock(pageSlug, 'kosova_page', 'Kosova page copy', kosovaPage, 20)
    setPageEditorMessage('Faqja u ruajt me sukses.')
    setSavingPageEditor(false)
    if (activePage) loadSections(activePage)
  }

  async function saveTopicEditor(pageSlug: string) {
    setSavingPageEditor(true)
    setPageEditorMessage('')
    const nextTopics = homeTopics.map(topic => topic.key === pageSlug ? topic : topic)
    await Promise.all([
      upsertCollectionBlock('topics', 'Topic cards', nextTopics, 10),
      upsertObjectBlock(pageSlug, 'topic_content', 'Topic detail sections', { [pageSlug]: topicContent }, 10),
      upsertObjectBlock(pageSlug, 'topic_deep_content', 'Topic deep reading', { [pageSlug]: topicDeepContent }, 20),
    ])

    if (pageSlug === 'korrupsioni') {
      await supabase.from('chart_series').upsert({ key: 'cpi', title: 'Kosovo CPI timeline', type: 'line', data: cpiRows, published: true })
    }
    if (pageSlug === 'reforma' || pageSlug === 'sundimi') {
      await supabase.from('chart_series').upsert({ key: 'reform', title: 'Acquis alignment progress', type: 'bar', data: reformRows, published: true })
    }
    if (pageSlug === 'be') {
      await Promise.all([
        supabase.from('chart_series').upsert({ key: 'region', title: 'Western Balkans EU accession progress', type: 'bar', data: homeRegion, published: true }),
        supabase.from('chart_series').upsert({ key: 'clusters', title: 'EU negotiation clusters', type: 'donut', data: clusterRows, published: true }),
      ])
    }
    setPageEditorMessage('Faqja u ruajt me sukses.')
    setSavingPageEditor(false)
    if (activePage) loadSections(activePage)
  }

  async function saveHomeEditor() {
    setSavingHome(true)
    setHomeMessage('')

    const { error: settingsError } = await supabase.from('site_settings').upsert({
      key: 'strings',
      value: homeStrings,
      description: 'All public UI copy: nav, hero, footer, chat, labels, section headings.',
    })
    if (settingsError) {
      setHomeMessage(settingsError.message)
      setSavingHome(false)
      return
    }

    await Promise.all([
      upsertCollectionBlock('topics', 'Topic cards', homeTopics, 10),
      upsertCollectionBlock('home_stats', 'Home stats strip', homeStats, 30),
      supabase.from('chart_series').upsert({
        key: 'region',
        title: 'Western Balkans EU accession progress',
        type: 'bar',
        data: homeRegion,
        published: true,
      }),
    ])

    setHomeMessage('Home u ruajt me sukses.')
    setSavingHome(false)
    if (activePage) loadSections(activePage)
  }

  async function savePage() {
    if (!editingPage) return
    await supabase.from('pages').update({
      title_sq: editingPage.title_sq,
      title_en: editingPage.title_en,
      title_sr: editingPage.title_sr,
      hero_title_sq: editingPage.hero_title_sq,
      hero_title_en: editingPage.hero_title_en,
      hero_subtitle_sq: editingPage.hero_subtitle_sq,
      hero_subtitle_en: editingPage.hero_subtitle_en,
      hero_image_url: editingPage.hero_image_url,
      published: editingPage.published,
    }).eq('id', editingPage.id)
    setEditingPage(null)
    loadPages()
  }

  async function saveSection() {
    if (!editingSection || !activePage) return
    if (editingSection.id) {
      await supabase.from('sections').update({
        title_sq: editingSection.title_sq, title_en: editingSection.title_en,
        content_sq: editingSection.content_sq, content_en: editingSection.content_en,
        image_url: editingSection.image_url, sort_order: editingSection.sort_order,
      }).eq('id', editingSection.id)
    } else {
      await supabase.from('sections').insert({ ...editingSection, page_id: activePage })
    }
    setEditingSection(null)
    loadSections(activePage)
  }

  async function deleteSection(id: string) {
    if (!activePage || !confirm('Fshi seksionin?')) return
    await supabase.from('sections').delete().eq('id', id)
    loadSections(activePage)
  }

  function startBlock(block?: PageBlock) {
    const pageSlug = pages.find(p => p.id === activePage)?.slug || 'home'
    const next = block ?? {
      id: '',
      page_slug: pageSlug,
      type: 'custom',
      title: '',
      content: {},
      sort_order: blocks.length,
      published: true,
    }
    setBlockError('')
    setEditingBlock(next)
    setBlockJson(JSON.stringify(next.content ?? {}, null, 2))
  }

  async function saveBlock() {
    if (!editingBlock || !activePage) return
    let content: unknown
    try {
      content = JSON.parse(blockJson)
    } catch {
      setBlockError('JSON nuk eshte valid.')
      return
    }
    const row = { ...editingBlock, content }
    if (!row.id) {
      const { id: _, ...rest } = row; void _
      await supabase.from('page_blocks').insert(rest)
    } else {
      const { id: _, ...rest } = row; void _
      await supabase.from('page_blocks').update(rest).eq('id', row.id)
    }
    setEditingBlock(null)
    loadSections(activePage)
  }

  async function deleteBlock(id: string) {
    if (!activePage || !confirm('Fshi bllokun?')) return
    await supabase.from('page_blocks').delete().eq('id', id)
    loadSections(activePage)
  }

  const activeSlug = activePage ? pages.find(p => p.id === activePage)?.slug : null
  const activeTopicIndex = activeSlug ? homeTopics.findIndex(topic => topic.key === activeSlug) : -1
  const activeTopic = activeTopicIndex >= 0 ? homeTopics[activeTopicIndex] : null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Faqet</h1>
      <p className="text-sm text-gray-500 mb-6">Kliko emrin e faqes per te hapur editorin e elementeve ekzistuese.</p>

      {/* Pages list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3">Slug</th>
              <th className="text-left px-4 py-3">Titulli (SQ)</th>
              <th className="text-left px-4 py-3">Publikuar</th>
              <th className="px-4 py-3">Veprime</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pages.map(p => (
              <tr key={p.id} className={`hover:bg-gray-50 ${activePage === p.id ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs">
                  <button onClick={() => loadSections(p.id)} className="font-mono text-blue-700 hover:underline">
                    {p.slug}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => loadSections(p.id)} className="font-medium text-gray-900 hover:text-blue-700">
                    {p.title_sq}
                  </button>
                </td>
                <td className="px-4 py-3">{p.published ? '?' : '?'}</td>
                <td className="px-4 py-3 text-center space-x-2">
                  <button onClick={() => setEditingPage(p)} className="text-blue-600 hover:underline">Edito</button>
                  <button onClick={() => loadSections(p.id)} className="text-green-600 hover:underline">Hap editorin</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit page modal */}
      {editingPage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingPage(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Edito Faqen: {editingPage.slug}</h2>
            <div className="space-y-3">
              {(['title_sq', 'title_en', 'title_sr', 'hero_title_sq', 'hero_title_en', 'hero_subtitle_sq', 'hero_subtitle_en', 'hero_image_url'] as const).map(field => (
                <div key={field}>
                  <label className="text-xs text-gray-500">{field}</label>
                  <input value={editingPage[field] ?? ''} onChange={e => setEditingPage({ ...editingPage, [field]: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              ))}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editingPage.published} onChange={e => setEditingPage({ ...editingPage, published: e.target.checked })} />
                <span className="text-sm">Publikuar</span>
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={savePage} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Ruaj</button>
              <button onClick={() => setEditingPage(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Anulo</button>
            </div>
          </div>
        </div>
      )}

      {activePage && activeSlug === 'home' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold">Home editor</h2>
              <p className="text-sm text-gray-500">Edito tekstet dhe elementet ekzistuese te faqes kryesore pa JSON.</p>
            </div>
            <button onClick={saveHomeEditor} disabled={savingHome} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              {savingHome ? 'Duke ruajtur...' : 'Ruaj Home'}
            </button>
          </div>
          {homeMessage && <div className={`mb-4 p-3 rounded-lg text-sm ${homeMessage.includes('sukses') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{homeMessage}</div>}

          <div className="space-y-8">
            <section className="border rounded-xl p-4">
              <h3 className="font-semibold mb-4">Navbar + Hero</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(['sq', 'en', 'sr'] as const).map(lang => (
                  <div key={lang} className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase text-gray-400">{lang}</h4>
                    <Field label="Teksti mbi hero (Udhëzues qytetar)" value={getHomeValue(homeStrings, lang, 'hero', 'tag')} onChange={v => setHomeText(lang, 'hero', 'tag', v)} />
                    <Field label="Titulli pjesa 1" value={getHomeValue(homeStrings, lang, 'hero', 'title_a')} onChange={v => setHomeText(lang, 'hero', 'title_a', v)} />
                    <Field label="Titulli pjesa blu/italic" value={getHomeValue(homeStrings, lang, 'hero', 'title_b')} onChange={v => setHomeText(lang, 'hero', 'title_b', v)} />
                    <Field label="Titulli pjesa 3" value={getHomeValue(homeStrings, lang, 'hero', 'title_c')} onChange={v => setHomeText(lang, 'hero', 'title_c', v)} />
                    <TextArea label="Përshkrimi kryesor" value={getHomeValue(homeStrings, lang, 'hero', 'sub')} onChange={v => setHomeText(lang, 'hero', 'sub', v)} />
                    <Field label="Butoni 1" value={getHomeValue(homeStrings, lang, 'hero', 'cta1')} onChange={v => setHomeText(lang, 'hero', 'cta1', v)} />
                    <Field label="Butoni 2" value={getHomeValue(homeStrings, lang, 'hero', 'cta2')} onChange={v => setHomeText(lang, 'hero', 'cta2', v)} />
                    <Field label="Meta label aplikim" value={getHomeValue(homeStrings, lang, 'hero', 'meta_a')} onChange={v => setHomeText(lang, 'hero', 'meta_a', v)} />
                    <Field label="Meta data aplikim" value={getHomeValue(homeStrings, lang, 'hero', 'meta_b')} onChange={v => setHomeText(lang, 'hero', 'meta_b', v)} />
                    <Field label="Meta label status" value={getHomeValue(homeStrings, lang, 'hero', 'meta_c')} onChange={v => setHomeText(lang, 'hero', 'meta_c', v)} />
                    <Field label="Meta status" value={getHomeValue(homeStrings, lang, 'hero', 'meta_d')} onChange={v => setHomeText(lang, 'hero', 'meta_d', v)} />
                  </div>
                ))}
              </div>
            </section>

            <section className="border rounded-xl p-4">
              <h3 className="font-semibold mb-4">Tekstet e seksioneve në Home</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(['sq', 'en', 'sr'] as const).map(lang => (
                  <div key={lang} className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase text-gray-400">{lang}</h4>
                    <Field label="Topics eyebrow" value={getHomeValue(homeStrings, lang, 'topics', 'eyebrow')} onChange={v => setHomeText(lang, 'topics', 'eyebrow', v)} />
                    <TextArea label="Topics title" value={getHomeValue(homeStrings, lang, 'topics', 'title')} onChange={v => setHomeText(lang, 'topics', 'title', v)} />
                    <Field label="Rajoni eyebrow" value={getHomeValue(homeStrings, lang, 'progress', 'eyebrow')} onChange={v => setHomeText(lang, 'progress', 'eyebrow', v)} />
                    <Field label="Rajoni title" value={getHomeValue(homeStrings, lang, 'progress', 'title')} onChange={v => setHomeText(lang, 'progress', 'title', v)} />
                    <TextArea label="Rajoni subtitle" value={getHomeValue(homeStrings, lang, 'progress', 'sub')} onChange={v => setHomeText(lang, 'progress', 'sub', v)} />
                    <Field label="Objektivat title" value={getHomeValue(homeStrings, lang, 'objectives', 'title')} onChange={v => setHomeText(lang, 'objectives', 'title', v)} />
                    <TextArea label="Objektivat subtitle" value={getHomeValue(homeStrings, lang, 'objectives', 'sub')} onChange={v => setHomeText(lang, 'objectives', 'sub', v)} />
                    <Field label="FAQ title" value={getHomeValue(homeStrings, lang, 'faq', 'title')} onChange={v => setHomeText(lang, 'faq', 'title', v)} />
                  </div>
                ))}
              </div>
            </section>

            <section className="border rounded-xl p-4">
              <h3 className="font-semibold mb-4">Cards: Reforma / Sundimi / Korrupsioni / BE</h3>
              <div className="space-y-4">
                {homeTopics.map((topic, i) => (
                  <div key={toInputValue(topic.key) || i} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <Field label="Key" value={topic.key} onChange={v => updateItem(setHomeTopics, homeTopics, i, 'key', v)} />
                      <Field label="Nr" value={topic.num} onChange={v => updateItem(setHomeTopics, homeTopics, i, 'num', v)} />
                      <Field label="Metric" value={topic.metric} onChange={v => updateItem(setHomeTopics, homeTopics, i, 'metric', v)} />
                      <Field label="Accent CSS" value={topic.accent} onChange={v => updateItem(setHomeTopics, homeTopics, i, 'accent', v)} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      {(['sq', 'en', 'sr'] as const).map(lang => (
                        <div key={lang} className="space-y-2">
                          <h4 className="text-xs font-semibold uppercase text-gray-400">{lang}</h4>
                          <TextArea label="Titulli" value={topic[`title_${lang}`]} onChange={v => updateItem(setHomeTopics, homeTopics, i, `title_${lang}`, v)} />
                          <TextArea label="Përshkrimi" value={topic[`blurb_${lang}`]} onChange={v => updateItem(setHomeTopics, homeTopics, i, `blurb_${lang}`, v)} />
                          <Field label="Metric label" value={topic[`metric_label_${lang}`]} onChange={v => updateItem(setHomeTopics, homeTopics, i, `metric_label_${lang}`, v)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="border rounded-xl p-4">
              <h3 className="font-semibold mb-4">Stats strip</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {homeStats.map((stat, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Numri" value={stat.top} onChange={v => updateItem(setHomeStats, homeStats, i, 'top', v)} />
                      <Field label="Suffix" value={stat.suffix} onChange={v => updateItem(setHomeStats, homeStats, i, 'suffix', v)} />
                      <Field label="Ngjyra" value={stat.accent} onChange={v => updateItem(setHomeStats, homeStats, i, 'accent', v)} />
                    </div>
                    {(['sq', 'en', 'sr'] as const).map(lang => (
                      <Field key={lang} label={`Label ${lang}`} value={stat[`label_${lang}`]} onChange={v => updateItem(setHomeStats, homeStats, i, `label_${lang}`, v)} />
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section className="border rounded-xl p-4">
              <h3 className="font-semibold mb-4">Chart: Kosova mes vendeve të rajonit</h3>
              <div className="space-y-3">
                {homeRegion.map((row, i) => (
                  <div key={toInputValue(row.code) || i} className="grid grid-cols-1 lg:grid-cols-8 gap-2 border rounded-lg p-3">
                    <Field label="Code" value={row.code} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'code', v)} />
                    <Field label="Emri SQ" value={row.name_sq} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'name_sq', v)} />
                    <Field label="Name EN" value={row.name_en} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'name_en', v)} />
                    <Field label="Name SR" value={row.name_sr} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'name_sr', v)} />
                    <Field label="Status" value={row.status} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'status', v)} />
                    <Field label="Chapters" type="number" value={row.chapters} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'chapters', Number(v))} />
                    <Field label="Progress" type="number" value={row.progress} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'progress', Number(v))} />
                    <button onClick={() => setHomeRegion(homeRegion.filter((_, idx) => idx !== i))} className="self-end text-red-600 text-sm">Fshi</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setHomeRegion([...homeRegion, { code: '', name_sq: '', name_en: '', name_sr: '', status: 'candidate', chapters: 0, progress: 0 }])} className="mt-3 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm">+ Shto vend</button>
            </section>
          </div>
        </div>
      )}

      {activePage && activeSlug && topicPageSlugs.includes(activeSlug) && activeTopic && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold">Editor i faqes: {activeSlug}</h2>
              <p className="text-sm text-gray-500">Edito card-in, seksionet, leximin e thelluar dhe chart-et per kete faqe.</p>
            </div>
            <button onClick={() => saveTopicEditor(activeSlug)} disabled={savingPageEditor} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              {savingPageEditor ? 'Duke ruajtur...' : `Ruaj ${activeSlug}`}
            </button>
          </div>
          {pageEditorMessage && <div className={`mb-4 p-3 rounded-lg text-sm ${pageEditorMessage.includes('sukses') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{pageEditorMessage}</div>}

          <div className="space-y-8">
            <section className="border rounded-xl p-4">
              <h3 className="font-semibold mb-4">Card/Hero i temes</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <Field label="Key" value={activeTopic.key} onChange={v => updateItem(setHomeTopics, homeTopics, activeTopicIndex, 'key', v)} />
                <Field label="Nr" value={activeTopic.num} onChange={v => updateItem(setHomeTopics, homeTopics, activeTopicIndex, 'num', v)} />
                <Field label="Metric" value={activeTopic.metric} onChange={v => updateItem(setHomeTopics, homeTopics, activeTopicIndex, 'metric', v)} />
                <Field label="Accent CSS" value={activeTopic.accent} onChange={v => updateItem(setHomeTopics, homeTopics, activeTopicIndex, 'accent', v)} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {(['sq', 'en', 'sr'] as const).map(lang => (
                  <div key={lang} className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-gray-400">{lang}</h4>
                    <TextArea label="Titulli" value={activeTopic[`title_${lang}`]} onChange={v => updateItem(setHomeTopics, homeTopics, activeTopicIndex, `title_${lang}`, v)} />
                    <TextArea label="Përshkrimi" value={activeTopic[`blurb_${lang}`]} onChange={v => updateItem(setHomeTopics, homeTopics, activeTopicIndex, `blurb_${lang}`, v)} />
                    <Field label="Metric label" value={activeTopic[`metric_label_${lang}`]} onChange={v => updateItem(setHomeTopics, homeTopics, activeTopicIndex, `metric_label_${lang}`, v)} />
                  </div>
                ))}
              </div>
            </section>

            <LocalizedSectionsEditor
              title="Seksionet kryesore te faqes"
              value={topicContent}
              onChange={setTopicContent}
              updateLocalizedList={updateLocalizedList}
              addLocalizedListItem={addLocalizedListItem}
              removeLocalizedListItem={removeLocalizedListItem}
            />

            <LocalizedSectionsEditor
              title="Lexim i thelluar"
              value={topicDeepContent}
              onChange={setTopicDeepContent}
              updateLocalizedList={updateLocalizedList}
              addLocalizedListItem={addLocalizedListItem}
              removeLocalizedListItem={removeLocalizedListItem}
            />

            {(activeSlug === 'reforma' || activeSlug === 'sundimi') && (
              <section className="border rounded-xl p-4">
                <h3 className="font-semibold mb-4">Chart: Përafrimi me acquis</h3>
                <div className="space-y-3">
                  {reformRows.map((row, i) => (
                    <div key={toInputValue(row.key) || i} className="grid grid-cols-1 lg:grid-cols-6 gap-2 border rounded-lg p-3">
                      <Field label="Key" value={row.key} onChange={v => updateItem(setReformRows, reformRows, i, 'key', v)} />
                      <Field label="SQ" value={row.label_sq} onChange={v => updateItem(setReformRows, reformRows, i, 'label_sq', v)} />
                      <Field label="EN" value={row.label_en} onChange={v => updateItem(setReformRows, reformRows, i, 'label_en', v)} />
                      <Field label="SR" value={row.label_sr} onChange={v => updateItem(setReformRows, reformRows, i, 'label_sr', v)} />
                      <Field label="Value" type="number" value={row.value} onChange={v => updateItem(setReformRows, reformRows, i, 'value', Number(v))} />
                      <button onClick={() => setReformRows(reformRows.filter((_, idx) => idx !== i))} className="self-end text-red-600 text-sm">Fshi</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setReformRows([...reformRows, { key: '', label_sq: '', label_en: '', label_sr: '', value: 0 }])} className="mt-3 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm">+ Shto rresht</button>
              </section>
            )}

            {activeSlug === 'korrupsioni' && (
              <section className="border rounded-xl p-4">
                <h3 className="font-semibold mb-4">Chart: CPI</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {cpiRows.map((row, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 border rounded-lg p-3">
                      <Field label="Year" type="number" value={row.year} onChange={v => updateItem(setCpiRows, cpiRows, i, 'year', Number(v))} />
                      <Field label="Score" type="number" value={row.score} onChange={v => updateItem(setCpiRows, cpiRows, i, 'score', Number(v))} />
                      <button onClick={() => setCpiRows(cpiRows.filter((_, idx) => idx !== i))} className="col-span-2 text-red-600 text-sm text-left">Fshi</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setCpiRows([...cpiRows, { year: new Date().getFullYear(), score: 0 }])} className="mt-3 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm">+ Shto vit</button>
              </section>
            )}

            {activeSlug === 'be' && (
              <>
                <section className="border rounded-xl p-4">
                  <h3 className="font-semibold mb-4">Chart: Kosova mes vendeve te rajonit</h3>
                  <div className="space-y-3">
                    {homeRegion.map((row, i) => (
                      <div key={toInputValue(row.code) || i} className="grid grid-cols-1 lg:grid-cols-8 gap-2 border rounded-lg p-3">
                        <Field label="Code" value={row.code} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'code', v)} />
                        <Field label="SQ" value={row.name_sq} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'name_sq', v)} />
                        <Field label="EN" value={row.name_en} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'name_en', v)} />
                        <Field label="SR" value={row.name_sr} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'name_sr', v)} />
                        <Field label="Status" value={row.status} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'status', v)} />
                        <Field label="Chapters" type="number" value={row.chapters} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'chapters', Number(v))} />
                        <Field label="Progress" type="number" value={row.progress} onChange={v => updateItem(setHomeRegion, homeRegion, i, 'progress', Number(v))} />
                        <button onClick={() => setHomeRegion(homeRegion.filter((_, idx) => idx !== i))} className="self-end text-red-600 text-sm">Fshi</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setHomeRegion([...homeRegion, { code: '', name_sq: '', name_en: '', name_sr: '', status: 'candidate', chapters: 0, progress: 0 }])} className="mt-3 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm">+ Shto vend</button>
                </section>
                <section className="border rounded-xl p-4">
                  <h3 className="font-semibold mb-4">Chart: Klasteret</h3>
                  <div className="space-y-3">
                    {clusterRows.map((row, i) => (
                      <div key={toInputValue(row.code) || i} className="grid grid-cols-1 lg:grid-cols-8 gap-2 border rounded-lg p-3">
                        <Field label="Code" type="number" value={row.code} onChange={v => updateItem(setClusterRows, clusterRows, i, 'code', Number(v))} />
                        <Field label="SQ" value={row.name_sq} onChange={v => updateItem(setClusterRows, clusterRows, i, 'name_sq', v)} />
                        <Field label="EN" value={row.name_en} onChange={v => updateItem(setClusterRows, clusterRows, i, 'name_en', v)} />
                        <Field label="SR" value={row.name_sr} onChange={v => updateItem(setClusterRows, clusterRows, i, 'name_sr', v)} />
                        <Field label="Color" value={row.color} onChange={v => updateItem(setClusterRows, clusterRows, i, 'color', v)} />
                        <Field label="Chapters" type="number" value={row.chapters} onChange={v => updateItem(setClusterRows, clusterRows, i, 'chapters', Number(v))} />
                        <Field label="Weight" type="number" value={row.weight} onChange={v => updateItem(setClusterRows, clusterRows, i, 'weight', Number(v))} />
                        <button onClick={() => setClusterRows(clusterRows.filter((_, idx) => idx !== i))} className="self-end text-red-600 text-sm">Fshi</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setClusterRows([...clusterRows, { code: clusterRows.length + 1, name_sq: '', name_en: '', name_sr: '', color: 'var(--blue)', chapters: 0, weight: 0 }])} className="mt-3 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm">+ Shto klaster</button>
                </section>
              </>
            )}
          </div>
        </div>
      )}

      {activePage && activeSlug && ['objektivat', 'faq', 'infografika', 'kosova'].includes(activeSlug) && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold">Editor i faqes: {activeSlug}</h2>
              <p className="text-sm text-gray-500">Editim i fushave kryesore qe jane specifike per kete faqe.</p>
            </div>
            <button onClick={() => saveSimplePageEditor(activeSlug)} disabled={savingPageEditor} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              {savingPageEditor ? 'Duke ruajtur...' : `Ruaj ${activeSlug}`}
            </button>
          </div>
          {pageEditorMessage && <div className={`mb-4 p-3 rounded-lg text-sm ${pageEditorMessage.includes('sukses') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{pageEditorMessage}</div>}

          {activeSlug === 'objektivat' && (
            <MultiLangCardsEditor title="Kartelat sqaruese poshte objektivave" rows={objectiveContextRows} setRows={setObjectiveContextRows} />
          )}

          {activeSlug === 'faq' && (
            <section className="border rounded-xl p-4">
              <h3 className="font-semibold mb-4">Guide poshte FAQ</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(['sq', 'en', 'sr'] as const).map(lang => (
                  <div key={lang} className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase text-gray-400">{lang}</h4>
                    <Field label="Eyebrow" value={faqGuide[`eyebrow_${lang}`]} onChange={v => setFaqGuide({ ...faqGuide, [`eyebrow_${lang}`]: v })} />
                    <TextArea label="Titulli" value={faqGuide[`title_${lang}`]} onChange={v => setFaqGuide({ ...faqGuide, [`title_${lang}`]: v })} />
                    <TextArea label="Teksti" value={faqGuide[`body_${lang}`]} onChange={v => setFaqGuide({ ...faqGuide, [`body_${lang}`]: v })} />
                    <Field label="CTA" value={faqGuide[`cta_${lang}`]} onChange={v => setFaqGuide({ ...faqGuide, [`cta_${lang}`]: v })} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSlug === 'infografika' && (
            <MultiLangCardsEditor title="Kartelat e metodologjise" rows={infoMethodRows} setRows={setInfoMethodRows} numberField="n" titleField="label" />
          )}

          {activeSlug === 'kosova' && (
            <section className="border rounded-xl p-4">
              <h3 className="font-semibold mb-4">Kosova page copy</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(['sq', 'en', 'sr'] as const).map(lang => {
                  const copy = asRecord(kosovaPage[lang])
                  const hero = Array.isArray(copy.hero) ? copy.hero : ['', '', '']
                  const timeline = Array.isArray(copy.timeline) ? copy.timeline as AnyRecord[] : []
                  const pillars = Array.isArray(copy.pillars) ? copy.pillars as AnyRecord[] : []
                  return (
                    <div key={lang} className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase text-gray-400">{lang}</h4>
                      <Field label="Eyebrow" value={copy.eyebrow} onChange={v => setKosovaField(lang, 'eyebrow', v)} />
                      <Field label="Hero line 1" value={hero[0]} onChange={v => setKosovaHeroLine(lang, 0, v)} />
                      <Field label="Hero line 2" value={hero[1]} onChange={v => setKosovaHeroLine(lang, 1, v)} />
                      <Field label="Hero line 3" value={hero[2]} onChange={v => setKosovaHeroLine(lang, 2, v)} />
                      <TextArea label="Hero subtitle" value={copy.heroSub} onChange={v => setKosovaField(lang, 'heroSub', v)} />
                      <Field label="History label" value={copy.historyLabel} onChange={v => setKosovaField(lang, 'historyLabel', v)} />
                      <TextArea label="History P1" value={copy.historyP1} onChange={v => setKosovaField(lang, 'historyP1', v)} />
                      <TextArea label="History P2" value={copy.historyP2} onChange={v => setKosovaField(lang, 'historyP2', v)} />
                      <TextArea label="Quote" value={copy.quote} onChange={v => setKosovaField(lang, 'quote', v)} />
                      <Field label="Quote by" value={copy.quoteBy} onChange={v => setKosovaField(lang, 'quoteBy', v)} />
                      <TextArea label="People text" value={copy.peopleText} onChange={v => setKosovaField(lang, 'peopleText', v)} />
                      <TextArea label="EU text" value={copy.euText} onChange={v => setKosovaField(lang, 'euText', v)} />
                      <Field label="CTA" value={copy.cta} onChange={v => setKosovaField(lang, 'cta', v)} />
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-semibold uppercase text-gray-400">Timeline</h5>
                          <button onClick={() => setKosovaField(lang, 'timeline', [...timeline, { year: '', text: '' }])} className="text-xs text-blue-600">+ Shto</button>
                        </div>
                        {timeline.map((row, i) => (
                          <div key={i} className="grid grid-cols-3 gap-2">
                            <Field label="Year" value={row.year} onChange={v => updateKosovaList(lang, 'timeline', i, 'year', v)} />
                            <div className="col-span-2"><Field label="Text" value={row.text} onChange={v => updateKosovaList(lang, 'timeline', i, 'text', v)} /></div>
                          </div>
                        ))}
                      </div>
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-semibold uppercase text-gray-400">Pillars</h5>
                          <button onClick={() => setKosovaField(lang, 'pillars', [...pillars, { icon: '', title: '', text: '' }])} className="text-xs text-blue-600">+ Shto</button>
                        </div>
                        {pillars.map((row, i) => (
                          <div key={i} className="space-y-2">
                            <Field label="Icon" value={row.icon} onChange={v => updateKosovaList(lang, 'pillars', i, 'icon', v)} />
                            <Field label="Title" value={row.title} onChange={v => updateKosovaList(lang, 'pillars', i, 'title', v)} />
                            <TextArea label="Text" value={row.text} onChange={v => updateKosovaList(lang, 'pillars', i, 'text', v)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Sections for selected page */}
      {activePage && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold">CMS Blocks — {pages.find(p => p.id === activePage)?.slug}</h2>
              <p className="text-sm text-gray-500">Blloqet JSON kontrollojne content dinamik: collections, chart_ref, hero, rich_section.</p>
            </div>
            <button onClick={() => startBlock()} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">+ Shto bllok</button>
          </div>
          <div className="space-y-2">
            {blocks.map(b => (
              <div key={b.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <span className="text-xs text-gray-400 mr-2">#{b.sort_order}</span>
                  <span className="font-medium">{b.title || b.type}</span>
                  <span className="text-xs text-gray-400 ml-2">{b.type}</span>
                  {!b.published && <span className="text-xs text-gray-400 ml-2">(draft)</span>}
                </div>
                <div className="space-x-2">
                  <button onClick={() => startBlock(b)} className="text-blue-600 text-sm">Edito</button>
                  <button onClick={() => deleteBlock(b.id)} className="text-red-600 text-sm">Fshi</button>
                </div>
              </div>
            ))}
            {blocks.length === 0 && <p className="text-gray-400 text-sm">Nuk ka CMS blocks.</p>}
          </div>
        </div>
      )}

      {activePage && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Seksionet — {pages.find(p => p.id === activePage)?.slug}</h2>
            <button onClick={() => setEditingSection({ id: '', page_id: activePage, title_sq: '', title_en: '', content_sq: '', content_en: '', image_url: '', sort_order: sections.length })}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm">+ Shto seksion</button>
          </div>
          <div className="space-y-2">
            {sections.map(s => (
              <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <span className="text-xs text-gray-400 mr-2">#{s.sort_order}</span>
                  <span className="font-medium">{s.title_sq}</span>
                  <span className="text-gray-400 text-sm ml-2">{s.title_en}</span>
                </div>
                <div className="space-x-2">
                  <button onClick={() => setEditingSection(s)} className="text-blue-600 text-sm">Edito</button>
                  <button onClick={() => deleteSection(s.id)} className="text-red-600 text-sm">Fshi</button>
                </div>
              </div>
            ))}
            {sections.length === 0 && <p className="text-gray-400 text-sm">Nuk ka seksione.</p>}
          </div>
        </div>
      )}

      {/* Edit block modal */}
      {editingBlock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingBlock(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editingBlock.id ? 'Edito' : 'Shto'} CMS Block</h2>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div><label className="text-xs text-gray-500">Type</label>
                <select value={editingBlock.type} onChange={e => setEditingBlock({ ...editingBlock, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {blockTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div className="col-span-2"><label className="text-xs text-gray-500">Title</label>
                <input value={editingBlock.title ?? ''} onChange={e => setEditingBlock({ ...editingBlock, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Sort order</label>
                <input type="number" value={editingBlock.sort_order} onChange={e => setEditingBlock({ ...editingBlock, sort_order: +e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <label className="col-span-4 flex items-center gap-2">
                <input type="checkbox" checked={editingBlock.published} onChange={e => setEditingBlock({ ...editingBlock, published: e.target.checked })} />
                <span className="text-sm">Publikuar</span>
              </label>
            </div>
            <label className="text-xs text-gray-500">Content JSON</label>
            <textarea rows={18} value={blockJson} onChange={e => setBlockJson(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs font-mono" />
            {blockError && <p className="text-red-600 text-sm mt-2">{blockError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={saveBlock} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Ruaj</button>
              <button onClick={() => setEditingBlock(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Anulo</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit section modal */}
      {editingSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingSection(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editingSection.id ? 'Edito' : 'Shto'} Seksion</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-gray-500">Titulli (SQ)</label>
                <input value={editingSection.title_sq} onChange={e => setEditingSection({ ...editingSection, title_sq: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Titulli (EN)</label>
                <input value={editingSection.title_en} onChange={e => setEditingSection({ ...editingSection, title_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Content (SQ)</label>
                <textarea rows={5} value={editingSection.content_sq} onChange={e => setEditingSection({ ...editingSection, content_sq: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Content (EN)</label>
                <textarea rows={5} value={editingSection.content_en} onChange={e => setEditingSection({ ...editingSection, content_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Image URL</label>
                <input value={editingSection.image_url ?? ''} onChange={e => setEditingSection({ ...editingSection, image_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Sort order</label>
                <input type="number" value={editingSection.sort_order} onChange={e => setEditingSection({ ...editingSection, sort_order: +e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveSection} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Ruaj</button>
              <button onClick={() => setEditingSection(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Anulo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
function LocalizedSectionsEditor({
  title,
  value,
  onChange,
  updateLocalizedList,
  addLocalizedListItem,
  removeLocalizedListItem,
}: {
  title: string
  value: AnyRecord
  onChange: (value: AnyRecord) => void
  updateLocalizedList: (setter: (value: AnyRecord) => void, value: AnyRecord, lang: string, index: number, field: string, nextValue: CmsValue) => void
  addLocalizedListItem: (setter: (value: AnyRecord) => void, value: AnyRecord, lang: string) => void
  removeLocalizedListItem: (setter: (value: AnyRecord) => void, value: AnyRecord, lang: string, index: number) => void
}) {
  return (
    <section className="border rounded-xl p-4">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(['sq', 'en', 'sr'] as const).map(lang => {
          const rows = Array.isArray(value[lang]) ? value[lang] as AnyRecord[] : []
          return (
            <div key={lang} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase text-gray-400">{lang}</h4>
                <button onClick={() => addLocalizedListItem(onChange, value, lang)} className="text-xs text-blue-600">+ Shto</button>
              </div>
              {rows.map((row, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <Field label="Titulli" value={row.h} onChange={v => updateLocalizedList(onChange, value, lang, index, 'h', v)} />
                  <TextArea label="Teksti" value={row.p} onChange={v => updateLocalizedList(onChange, value, lang, index, 'p', v)} />
                  <TextArea
                    label="Lista (nje rresht = nje pike)"
                    value={Array.isArray(row.list) ? row.list.join('\n') : ''}
                    onChange={v => updateLocalizedList(onChange, value, lang, index, 'list', v.split('\n').map(x => x.trim()).filter(Boolean))}
                  />
                  <button onClick={() => removeLocalizedListItem(onChange, value, lang, index)} className="text-xs text-red-600">Fshi seksionin</button>
                </div>
              ))}
              {rows.length === 0 && <p className="text-sm text-gray-400">Nuk ka seksione.</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MultiLangCardsEditor({
  title,
  rows,
  setRows,
  numberField,
  titleField = 'h',
}: {
  title: string
  rows: AnyRecord[]
  setRows: (rows: AnyRecord[]) => void
  numberField?: string
  titleField?: string
}) {
  return (
    <section className="border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        <button onClick={() => setRows([...rows, { [numberField || 'order']: String(rows.length + 1).padStart(2, '0'), [`${titleField}_sq`]: '', [`${titleField}_en`]: '', [`${titleField}_sr`]: '', p_sq: '', p_en: '', p_sr: '' }])} className="text-sm text-blue-600">+ Shto</button>
      </div>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between gap-3">
              {numberField && <Field label="Nr" value={row[numberField]} onChange={v => setRows(rows.map((item, i) => i === index ? { ...item, [numberField]: v } : item))} />}
              <button onClick={() => setRows(rows.filter((_, i) => i !== index))} className="text-sm text-red-600">Fshi</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {(['sq', 'en', 'sr'] as const).map(lang => (
                <div key={lang} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-gray-400">{lang}</h4>
                  <Field label="Titulli" value={row[`${titleField}_${lang}`]} onChange={v => setRows(rows.map((item, i) => i === index ? { ...item, [`${titleField}_${lang}`]: v } : item))} />
                  {titleField !== 'label' && <TextArea label="Teksti" value={row[`p_${lang}`]} onChange={v => setRows(rows.map((item, i) => i === index ? { ...item, [`p_${lang}`]: v } : item))} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: CmsValue
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type={type}
        value={toInputValue(value)}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm"
      />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: CmsValue
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <textarea
        rows={3}
        value={toInputValue(value)}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm"
      />
    </label>
  )
}
