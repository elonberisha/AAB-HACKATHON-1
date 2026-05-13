'use client';

import React, { useEffect, useRef, useState } from 'react';
import { chatStream, getSession } from '@/lib/ai';
import { supabase } from '@/lib/supabase';


// ---- data.js ----
// All data + translations for euguide-ks.
// Every textual field exists in sq/en/sr. A helper `tr(obj, field, lang)` falls back to sq.

function tr(obj, field, lang) {
  if (!obj) return '';
  return obj[field + '_' + lang] || obj[field + '_sq'] || obj[field] || '';
};

const STRINGS = {
  sq: {
    nav: { reforma: 'Reforma', sundimi: 'Sundimi i ligjit', korrupsioni: 'Korrupsioni', be: 'Integrimi në BE', objektivat: 'Objektivat', faq: 'Pyetje', kosova: 'Rreth Kosovës', kerko: 'Kërko' },
    crumb_home: 'HOME',
    common: {
      all: 'Të gjitha', completed: 'Të plotësuara', pending: 'Të paplotësuara',
      cluster: 'Klasteri', source: 'Burimi', see_all: 'Shih të gjitha',
      previous: 'Më parë', next: 'Më pas',
      chapters: 'kapituj', days: 'ditë', percent: 'përqind',
      progress_global: 'Progres i përgjithshëm', completed_caps: 'Të plotësuara',
      from_main_objectives: 'nga objektivat kryesore',
      next_step: 'Hapi i ardhshëm', candidate_status: 'Statusi i kandidatit', expected: 'pritet',
      description: 'Përshkrim', conditions: 'Kushtet', completed_at: 'plotësuar',
      key_metric: 'Metrikë kyçe', pillar: 'shtylla', live: 'LIVE',
    },
    hero: {
      tag: 'Udhëzues qytetar · përditësuar maj 2026',
      title_a: 'Rruga e Kosovës ',
      title_b: 'drejt Bashkimit Evropian',
      title_c: ', e shpjeguar thjesht.',
      sub: 'Reforma në administratë, sundimi i ligjit dhe lufta kundër korrupsionit janë tri shtyllat që qeverisin këtë proces. Këtu i gjen të ndara, të matura dhe të lidhura me jetën e përditshme.',
      cta1: 'Fillo nga këtu', cta2: 'Pyet asistentin',
      meta_a: 'Aplikim për anëtarësim', meta_b: '14 dhjetor 2022',
      meta_c: 'Statusi i kandidatit', meta_d: 'Në pritje',
      days_since: 'Ditë qysh nga aplikimi',
      tl: ['SAA', 'aplikoi', 'viza', 'sot', 'kandidat?', 'anëtarësia'],
    },
    topics: { eyebrow: 'Katër fusha, një proces', title: 'Cila prej tyre të prek më shumë sot?' },
    progress: { eyebrow: 'Ku jemi në hartën evropiane', title: 'Kosova mes vendeve të rajonit', sub: 'Statusi i procesit të anëtarësimit në BE — 6 vendet e Ballkanit Perëndimor.', legend_neg: 'Në negociata', legend_cand: 'Kandidat', legend_pend: 'Aplikim në pritje', note: 'progres i përbërë (kapituj + raporte)' },
    chart1: { eyebrow: 'Indeksi i perceptimit të korrupsionit', title: 'Si është lëvizur Kosova në dhjetë vitet e fundit', sub: 'Burimi: Transparency International. Vlerë më e lartë = perceptohet më pak korrupsion.', anno: 'liberalizimi i vizave' },
    cluster: { eyebrow: 'Klasterët e negociatave', title: 'Çfarë mbulon secili kapitull', sub: 'Procesi i pranimit në BE është i ndarë në 6 klasterë tematikë. Sundimi i ligjit hapet i pari dhe mbyllet i fundit.', reform_title: 'Progresi i përafrimit me acquis-në', reform_sub: 'vlerësim 2025 · %', cluster_label: 'KLASTERI' },
    objectives: { eyebrow: 'Objektivat', title: 'Çfarë duhet të plotësojë Kosova', sub: 'Kushtet konkrete të marra nga raportet e Komisionit Evropian dhe SAA. Filtroni sipas statusit ose klasterit.' },
    faq: { eyebrow: 'Pyetje të shpeshta', title: 'Përgjigje të shkurtra, pa zhargon institucional.', all: 'Të gjitha', no_match: 'Nuk u gjet asnjë pyetje në këtë kategori.' },
    info: { eyebrow: 'Infografika', title: 'Të shpjeguara në një faqe.' },
    cta: { title_a: 'Pyet', title_b: ', dhe asistenti përgjigjet në shqip, anglisht ose serbisht — me referencë te dokumenti origjinal.', sub: 'I trajnuar mbi raportet e Komisionit Evropian, ligjet vendore dhe analizat e shoqërisë civile. I përdorshëm me tekst ose me zë.', card_top: 'ASISTENT · SQ/EN/SR', card_action: 'Shkruaj pyetjen', card_hint: '↩ enter për të dërguar' },
    chat: { title: 'Asistent', sub: 'Pyet diçka për reformat ose BE-në', greeting: 'Përshëndetje. Mund të të ndihmoj me reformën në administratë, sundimin e ligjit, luftën kundër korrupsionit dhe procesin e BE-së. Çfarë do të dije?', placeholder: 'Shkruaj pyetjen tënde…', send: 'Dërgo', sample: ['Çfarë është SAA?', 'Si raportohet korrupsioni?', 'Cilat janë kushtet për anëtarësim?'], auth: 'Vazhdo me Google për të ruajtur historinë' },
    footer: { tagline: 'Burim i pavarur, jo-zyrtar, për qytetarët e Kosovës që duan të kuptojnë procesin evropian.', cols: { temat: 'Temat', burimet: 'Burimet', platforma: 'Platforma' }, copy: '© 2026 · MIT-licensed open data · Hackathon Edition', built: 'euguide-ks.info · built for Kosovo · Hackathon May 2026' },
    kosova: {
      eyebrow: 'Rreth Kosovës',
      title: 'Republika e Kosovës — fakte, datat, instancat.',
      sub: 'Një portret i shkurtër i shtetit: pavarësia, kushtetuta, institucionet, simbolet dhe rrugëtimi diplomatik.',
      kf: 'Faktet kyçe', kf_pop: 'popullsia', kf_area: 'sipërfaqja', kf_cap: 'kryeqyteti', kf_curr: 'monedha', kf_lang: 'gjuhët zyrtare', kf_phone: 'kodi telefonik', kf_tld: 'domeni i internetit', kf_tz: 'zona kohore', kf_recog: 'shtete njohëse',
      inst_title: 'Institucionet', inst_pres: 'Presidente', inst_pm: 'Kryeministër', inst_speaker: 'Kryetar i Kuvendit', inst_chief: 'Kryetar i Gjykatës Kushtetuese', inst_terms: 'mandat',
      tl_title: 'Datat që përcaktuan Kosovën', tl_sub: 'Nga shpallja e pavarësisë te liberalizimi i vizave.',
      recog_title: 'Njohjet diplomatike', recog_sub: 'Numri kumulativ i shteteve që e kanë njohur Kosovën.',
      sym_title: 'Simbolet', sym_flag: 'Flamuri', sym_anthem: 'Himni', sym_anthem_name: '“Evropa”', sym_anthem_year: 'miratuar 2008',
    },
    extra: {
      services_title: 'Shërbimet publike që janë dixhitalizuar',
      services_sub: 'eKosova: numri kumulativ i shërbimeve që mund të kryhen plotësisht online.',
      report_title: 'Si raportohet korrupsioni',
      report_sub: 'Shpërndarja e raporteve sipas kanalit (2024).',
      support_title: 'Mbështetja qytetare për BE-në',
      support_sub: 'Përqindja e të anketuarve që mbështesin anëtarësimin (sondazh, IRI 2025).',
      ec_title: 'Kalendar i raporteve të Komisionit Evropian',
      ec_sub: 'Vlerësimi vjetor i progresit · 2014 → 2025.',
      court_title: 'Ngarkesa e gjykatave',
      court_sub: 'Çështje të reja vs të mbyllura, mijëra · 2019–2025.',
    },
  },
  en: {
    nav: { reforma: 'Reform', sundimi: 'Rule of law', korrupsioni: 'Corruption', be: 'EU Integration', objektivat: 'Objectives', faq: 'FAQ', kosova: 'About Kosovo', kerko: 'Search' },
    crumb_home: 'HOME',
    common: {
      all: 'All', completed: 'Completed', pending: 'Pending',
      cluster: 'Cluster', source: 'Source', see_all: 'See all',
      previous: 'Previous', next: 'Next',
      chapters: 'chapters', days: 'days', percent: 'percent',
      progress_global: 'Overall progress', completed_caps: 'Completed',
      from_main_objectives: 'of the main objectives',
      next_step: 'Next step', candidate_status: 'Candidate status', expected: 'expected',
      description: 'Description', conditions: 'Conditions', completed_at: 'completed',
      key_metric: 'Key metric', pillar: 'pillar', live: 'LIVE',
    },
    hero: {
      tag: 'Citizen guide · updated May 2026',
      title_a: "Kosovo's path ",
      title_b: 'to the European Union',
      title_c: ', explained simply.',
      sub: 'Public administration reform, rule of law and the fight against corruption are the three pillars that govern this process. Here they are separated, measured and tied back to everyday life.',
      cta1: 'Start here', cta2: 'Ask the assistant',
      meta_a: 'Membership application', meta_b: '14 December 2022',
      meta_c: 'Candidate status', meta_d: 'Pending',
      days_since: 'Days since the application',
      tl: ['SAA', 'applied', 'visa', 'today', 'candidate?', 'membership'],
    },
    topics: { eyebrow: 'Four areas, one process', title: 'Which one matters to you today?' },
    progress: { eyebrow: 'Where we stand on the European map', title: 'Kosovo among regional countries', sub: 'EU accession status — the six Western Balkan states.', legend_neg: 'Negotiating', legend_cand: 'Candidate', legend_pend: 'Application pending', note: 'composite progress (chapters + reports)' },
    chart1: { eyebrow: 'Corruption Perceptions Index', title: 'How Kosovo has moved over the last decade', sub: 'Source: Transparency International. Higher value = less perceived corruption.', anno: 'visa liberalization' },
    cluster: { eyebrow: 'Negotiation clusters', title: 'What each chapter covers', sub: 'EU accession is split into 6 thematic clusters. Rule of law opens first and closes last.', reform_title: 'Progress aligning with the acquis', reform_sub: '2025 assessment · %', cluster_label: 'CLUSTER' },
    objectives: { eyebrow: 'Objectives', title: 'What Kosovo needs to deliver', sub: 'Concrete conditions taken from EC reports and the SAA. Filter by status or cluster.' },
    faq: { eyebrow: 'FAQ', title: 'Short answers, no institutional jargon.', all: 'All', no_match: 'No questions found in this category.' },
    info: { eyebrow: 'Infographics', title: 'Explained on a single page.' },
    cta: { title_a: 'Ask', title_b: ', and the assistant answers in Albanian, English or Serbian — with reference to the source document.', sub: 'Trained on EC reports, domestic laws and civil-society analysis. Works with text or voice.', card_top: 'ASSISTANT · SQ/EN/SR', card_action: 'Type your question', card_hint: '↩ enter to send' },
    chat: { title: 'Assistant', sub: 'Ask anything about reforms or the EU', greeting: 'Hello. I can help with public administration reform, rule of law, anti-corruption and the EU process. What would you like to know?', placeholder: 'Type your question…', send: 'Send', sample: ['What is the SAA?', 'How do I report corruption?', 'What are the membership conditions?'], auth: 'Continue with Google to save history' },
    footer: { tagline: 'An independent, non-official source for citizens of Kosovo who want to understand the European process.', cols: { temat: 'Topics', burimet: 'Sources', platforma: 'Platform' }, copy: '© 2026 · MIT-licensed open data · Hackathon Edition', built: 'euguide-ks.info · built for Kosovo · Hackathon May 2026' },
    kosova: {
      eyebrow: 'About Kosovo',
      title: 'Republic of Kosovo — facts, dates, institutions.',
      sub: 'A short portrait of the state: independence, constitution, institutions, symbols and the diplomatic journey.',
      kf: 'Key facts', kf_pop: 'population', kf_area: 'area', kf_cap: 'capital', kf_curr: 'currency', kf_lang: 'official languages', kf_phone: 'phone code', kf_tld: 'internet domain', kf_tz: 'time zone', kf_recog: 'recognising states',
      inst_title: 'Institutions', inst_pres: 'President', inst_pm: 'Prime Minister', inst_speaker: 'Speaker of Parliament', inst_chief: 'Chief Justice (Constitutional Court)', inst_terms: 'term',
      tl_title: 'Dates that defined Kosovo', tl_sub: 'From the declaration of independence to visa liberalization.',
      recog_title: 'Diplomatic recognitions', recog_sub: 'Cumulative number of states that have recognised Kosovo.',
      sym_title: 'Symbols', sym_flag: 'Flag', sym_anthem: 'Anthem', sym_anthem_name: '"Europe"', sym_anthem_year: 'adopted 2008',
    },
    extra: {
      services_title: 'Digitised public services',
      services_sub: 'eKosova: cumulative number of services that can be completed fully online.',
      report_title: 'How corruption is reported',
      report_sub: 'Distribution of reports by channel (2024).',
      support_title: 'Citizen support for the EU',
      support_sub: 'Share of respondents who support membership (poll, IRI 2025).',
      ec_title: 'EC report calendar',
      ec_sub: 'Annual progress assessment · 2014 → 2025.',
      court_title: 'Court caseload',
      court_sub: 'New vs closed cases, thousands · 2019–2025.',
    },
  },
  sr: {
    nav: { reforma: 'Reforma', sundimi: 'Vladavina prava', korrupsioni: 'Korupcija', be: 'EU integracije', objektivat: 'Ciljevi', faq: 'FAQ', kosova: 'O Kosovu', kerko: 'Pretraga' },
    crumb_home: 'POČETNA',
    common: {
      all: 'Sve', completed: 'Završeno', pending: 'U toku',
      cluster: 'Klaster', source: 'Izvor', see_all: 'Pogledaj sve',
      previous: 'Prethodno', next: 'Sledeće',
      chapters: 'poglavlja', days: 'dana', percent: 'procenat',
      progress_global: 'Ukupan napredak', completed_caps: 'Završeno',
      from_main_objectives: 'od glavnih ciljeva',
      next_step: 'Sledeći korak', candidate_status: 'Status kandidata', expected: 'očekuje se',
      description: 'Opis', conditions: 'Uslovi', completed_at: 'završeno',
      key_metric: 'Ključni pokazatelj', pillar: 'stub', live: 'UŽIVO',
    },
    hero: {
      tag: 'Vodič za građane · ažurirano maj 2026',
      title_a: 'Put Kosova ',
      title_b: 'ka Evropskoj uniji',
      title_c: ', jednostavno objašnjen.',
      sub: 'Reforma javne uprave, vladavina prava i borba protiv korupcije tri su stuba ovog procesa. Ovde su razdvojeni, mereni i povezani sa svakodnevnim životom.',
      cta1: 'Počni odavde', cta2: 'Pitaj asistenta',
      meta_a: 'Aplikacija za članstvo', meta_b: '14. decembar 2022',
      meta_c: 'Status kandidata', meta_d: 'U toku',
      days_since: 'Dana od aplikacije',
      tl: ['SSP', 'aplicirano', 'vize', 'danas', 'kandidat?', 'članstvo'],
    },
    topics: { eyebrow: 'Četiri oblasti, jedan proces', title: 'Koja vas se najviše tiče danas?' },
    progress: { eyebrow: 'Gde smo na evropskoj mapi', title: 'Kosovo među zemljama regiona', sub: 'Status EU integracija — šest zemalja Zapadnog Balkana.', legend_neg: 'U pregovorima', legend_cand: 'Kandidat', legend_pend: 'Aplikacija na čekanju', note: 'kompozitni napredak (poglavlja + izveštaji)' },
    chart1: { eyebrow: 'Indeks percepcije korupcije', title: 'Kako se Kosovo kretalo u poslednjih deset godina', sub: 'Izvor: Transparency International. Viša vrednost = manje percipirane korupcije.', anno: 'liberalizacija viza' },
    cluster: { eyebrow: 'Pregovaračka poglavlja', title: 'Šta pokriva svaki klaster', sub: 'EU pristupanje podeljeno je u 6 klastera. Vladavina prava se otvara prva i zatvara poslednja.', reform_title: 'Napredak usaglašavanja sa acquis-em', reform_sub: 'procena 2025 · %', cluster_label: 'KLASTER' },
    objectives: { eyebrow: 'Ciljevi', title: 'Šta Kosovo treba da ispuni', sub: 'Konkretni uslovi iz izveštaja EK i SSP. Filtrirajte po statusu ili klasteru.' },
    faq: { eyebrow: 'Česta pitanja', title: 'Kratki odgovori, bez institucionalnog žargona.', all: 'Sve', no_match: 'Nema pitanja u ovoj kategoriji.' },
    info: { eyebrow: 'Infografike', title: 'Sve na jednoj stranici.' },
    cta: { title_a: 'Pitaj', title_b: ', a asistent odgovara na albanskom, engleskom ili srpskom — sa referencom na izvor.', sub: 'Obučen na izveštajima EK, domaćim zakonima i analizama civilnog društva. Radi sa tekstom ili glasom.', card_top: 'ASISTENT · SQ/EN/SR', card_action: 'Upiši pitanje', card_hint: '↩ enter za slanje' },
    chat: { title: 'Asistent', sub: 'Pitaj bilo šta o reformama ili EU', greeting: 'Zdravo. Mogu vam pomoći sa reformom uprave, vladavinom prava, antikorupcijom i procesom EU. Šta želite da znate?', placeholder: 'Upišite pitanje…', send: 'Pošalji', sample: ['Šta je SSP?', 'Kako se prijavljuje korupcija?', 'Koji su uslovi za članstvo?'], auth: 'Nastavi sa Google nalogom da sačuvaš istoriju' },
    footer: { tagline: 'Nezavisan, nezvaničan izvor za građane Kosova koji žele da razumeju evropski proces.', cols: { temat: 'Teme', burimet: 'Izvori', platforma: 'Platforma' }, copy: '© 2026 · MIT licencirani otvoreni podaci · Hackathon Edition', built: 'euguide-ks.info · napravljeno za Kosovo · Hackathon Maj 2026' },
    kosova: {
      eyebrow: 'O Kosovu',
      title: 'Republika Kosovo — činjenice, datumi, institucije.',
      sub: 'Kratak portret države: nezavisnost, ustav, institucije, simboli i diplomatski put.',
      kf: 'Ključne činjenice', kf_pop: 'stanovništvo', kf_area: 'površina', kf_cap: 'glavni grad', kf_curr: 'valuta', kf_lang: 'službeni jezici', kf_phone: 'telefonski kod', kf_tld: 'internet domen', kf_tz: 'vremenska zona', kf_recog: 'države koje priznaju',
      inst_title: 'Institucije', inst_pres: 'Predsednica', inst_pm: 'Premijer', inst_speaker: 'Predsednik Skupštine', inst_chief: 'Predsednik Ustavnog suda', inst_terms: 'mandat',
      tl_title: 'Datumi koji su definisali Kosovo', tl_sub: 'Od proglašenja nezavisnosti do liberalizacije viza.',
      recog_title: 'Diplomatska priznanja', recog_sub: 'Kumulativni broj država koje su priznale Kosovo.',
      sym_title: 'Simboli', sym_flag: 'Zastava', sym_anthem: 'Himna', sym_anthem_name: '"Evropa"', sym_anthem_year: 'usvojena 2008',
    },
    extra: {
      services_title: 'Digitalizovane javne usluge',
      services_sub: 'eKosova: kumulativni broj usluga koje se mogu obaviti potpuno online.',
      report_title: 'Kako se prijavljuje korupcija',
      report_sub: 'Raspodela prijava po kanalu (2024).',
      support_title: 'Podrška građana EU',
      support_sub: 'Procenat ispitanika koji podržavaju članstvo (anketa, IRI 2025).',
      ec_title: 'Kalendar izveštaja EK',
      ec_sub: 'Godišnja procena napretka · 2014 → 2025.',
      court_title: 'Opterećenost sudova',
      court_sub: 'Novi vs zatvoreni predmeti, hiljade · 2019–2025.',
    },
  }
};

const TOPICS = [
  {
    key: 'reforma', num: '01',
    title_sq: 'Reforma\nadministrative', title_en: 'Public\nadministration', title_sr: 'Reforma\nuprave',
    blurb_sq: 'Si shërbimet publike po bëhen më të shpejta, dixhitale dhe të parashikueshme — nga letërnjoftimi te tatimet.',
    blurb_en: 'How public services are getting faster, digital and predictable — from ID cards to taxes.',
    blurb_sr: 'Kako javne usluge postaju brže, digitalne i predvidljive — od lične karte do poreza.',
    accent: 'var(--blue)', accent_soft: 'var(--blue-soft)',
    metric: '63%',
    metric_label_sq: 'shërbime tashmë online',
    metric_label_en: 'services already online',
    metric_label_sr: 'usluga već online',
  },
  {
    key: 'sundimi', num: '02',
    title_sq: 'Sundimi\ni ligjit', title_en: 'Rule of\nlaw', title_sr: 'Vladavina\nprava',
    blurb_sq: 'Të drejtat e qytetarit para gjykatës, pavarësia e drejtësisë dhe çfarë do të thotë "barazi para ligjit" në praktikë.',
    blurb_en: 'Citizen rights in court, judicial independence, and what "equality before the law" looks like in practice.',
    blurb_sr: 'Prava građana pred sudom, nezavisnost pravosuđa i šta "jednakost pred zakonom" znači u praksi.',
    accent: 'var(--rust)', accent_soft: 'var(--rust-soft)',
    metric: '218',
    metric_label_sq: 'ditë mesatare për një vendim',
    metric_label_en: 'avg. days per ruling',
    metric_label_sr: 'prosečno dana po odluci',
  },
  {
    key: 'korrupsioni', num: '03',
    title_sq: 'Lufta kundër\nkorrupsionit', title_en: 'Fight against\ncorruption', title_sr: 'Borba protiv\nkorupcije',
    blurb_sq: 'Si dallohet korrupsioni, kush e heton dhe ku raportohet anonimisht — me hapa konkretë.',
    blurb_en: 'How to recognise corruption, who investigates it and where to report anonymously — concrete steps.',
    blurb_sr: 'Kako prepoznati korupciju, ko je istražuje i gde je anonimno prijaviti — konkretni koraci.',
    accent: 'var(--gold)', accent_soft: 'var(--gold-soft)',
    metric: '41/100',
    metric_label_sq: 'CPI 2025', metric_label_en: 'CPI 2025', metric_label_sr: 'CPI 2025',
  },
  {
    key: 'be', num: '04',
    title_sq: 'Integrimi\nnë BE', title_en: 'EU\nintegration', title_sr: 'EU\nintegracije',
    blurb_sq: 'SAA, statusi i kandidatit, klasterët, çfarë do të thotë anëtarësia për paga, pasaporta dhe tregun e brendshëm.',
    blurb_en: 'SAA, candidate status, clusters, and what membership means for wages, passports and the internal market.',
    blurb_sr: 'SSP, status kandidata, klasteri i šta članstvo znači za plate, pasoše i unutrašnje tržište.',
    accent: 'var(--ink)', accent_soft: '#E1DBC9',
    metric: '14·12·22',
    metric_label_sq: 'aplikoi për anëtarësim',
    metric_label_en: 'applied for membership',
    metric_label_sr: 'aplicirano za članstvo',
  },
];

const REGION = [
  { code: 'ME', name_sq: 'Mali i Zi', name_en: 'Montenegro', name_sr: 'Crna Gora', status: 'negotiating', chapters: 33, progress: 78 },
  { code: 'AL', name_sq: 'Shqipëria', name_en: 'Albania', name_sr: 'Albanija', status: 'negotiating', chapters: 14, progress: 38 },
  { code: 'MK', name_sq: 'Maqedonia V.', name_en: 'N. Macedonia', name_sr: 'S. Makedonija', status: 'negotiating', chapters: 6, progress: 22 },
  { code: 'RS', name_sq: 'Serbia', name_en: 'Serbia', name_sr: 'Srbija', status: 'negotiating', chapters: 22, progress: 44 },
  { code: 'BA', name_sq: 'BiH', name_en: 'BiH', name_sr: 'BiH', status: 'candidate', chapters: 0, progress: 12 },
  { code: 'XK', name_sq: 'Kosova', name_en: 'Kosovo', name_sr: 'Kosovo', status: 'pending', chapters: 0, progress: 8 },
];

const CPI = [
  { year: 2015, score: 33 }, { year: 2016, score: 36 }, { year: 2017, score: 39 },
  { year: 2018, score: 37 }, { year: 2019, score: 36 }, { year: 2020, score: 36 },
  { year: 2021, score: 39 }, { year: 2022, score: 41 }, { year: 2023, score: 41 },
  { year: 2024, score: 40 }, { year: 2025, score: 41 },
];

const REFORM = [
  { key: 'admin', label_sq: 'Administratë', label_en: 'Administration', label_sr: 'Uprava', value: 47 },
  { key: 'judiciary', label_sq: 'Drejtësi', label_en: 'Judiciary', label_sr: 'Pravosuđe', value: 31 },
  { key: 'anti_corr', label_sq: 'Antikorrupsion', label_en: 'Anti-corruption', label_sr: 'Antikorupcija', value: 26 },
  { key: 'economy', label_sq: 'Ekonomi', label_en: 'Economy', label_sr: 'Ekonomija', value: 54 },
  { key: 'rights', label_sq: 'Të drejta themelore', label_en: 'Fundamental rights', label_sr: 'Osnovna prava', value: 49 },
  { key: 'media', label_sq: 'Liria e medias', label_en: 'Media freedom', label_sr: 'Sloboda medija', value: 58 },
];

const CLUSTERS = [
  { code: 1, name_sq: 'Themelet', name_en: 'Fundamentals', name_sr: 'Osnove', color: 'var(--ink)', chapters: 7, weight: 22 },
  { code: 2, name_sq: 'Tregu i brendshëm', name_en: 'Internal market', name_sr: 'Unutrašnje tržište', color: 'var(--blue)', chapters: 6, weight: 20 },
  { code: 3, name_sq: 'Konkurrueshmëria & rritja', name_en: 'Competitiveness & growth', name_sr: 'Konkurentnost i rast', color: 'var(--gold)', chapters: 8, weight: 18 },
  { code: 4, name_sq: 'Agjenda e gjelbër', name_en: 'Green agenda', name_sr: 'Zelena agenda', color: 'var(--sage)', chapters: 5, weight: 14 },
  { code: 5, name_sq: 'Burimet & bujqësia', name_en: 'Resources & agriculture', name_sr: 'Resursi i poljoprivreda', color: 'var(--rust)', chapters: 5, weight: 14 },
  { code: 6, name_sq: 'Marrëdhënie të jashtme', name_en: 'External relations', name_sr: 'Spoljni odnosi', color: '#7A6D5A', chapters: 2, weight: 12 },
];

const OBJECTIVES = [
  {
    id: 1, cluster: 'visa', completed: true, completed_at: '2024-01-01', progress: 100,
    name_sq: 'Liberalizimi i vizave për qytetarët e Kosovës',
    name_en: 'Visa liberalization for citizens of Kosovo',
    name_sr: 'Liberalizacija viza za građane Kosova',
    desc_sq: 'Qytetarët e Kosovës mund të udhëtojnë në zonën Shengen pa vizë për 90 ditë.',
    desc_en: 'Citizens of Kosovo can travel to the Schengen area visa-free for 90 days.',
    desc_sr: 'Građani Kosova mogu putovati u šengensku zonu bez vize do 90 dana.',
    cond_sq: '8 kushte plotësohen për sigurinë e dokumenteve, menaxhimin e kufijve, azilin dhe luftën kundër krimit.',
    cond_en: '8 conditions met covering document security, border management, asylum and the fight against crime.',
    cond_sr: '8 uslova ispunjeno za bezbednost dokumenata, upravljanje granicom, azil i borbu protiv kriminala.'
  },
  {
    id: 2, cluster: 'saa', completed: true, completed_at: '2016-04-01', progress: 100,
    name_sq: 'Marrëveshja e Stabilizim-Asociimit (SAA)',
    name_en: 'Stabilisation and Association Agreement (SAA)',
    name_sr: 'Sporazum o stabilizaciji i pridruživanju (SSP)',
    desc_sq: 'Korniza e parë kontraktuale mes Kosovës dhe BE-së, në fuqi që nga 1 prill 2016.',
    desc_en: 'The first contractual framework between Kosovo and the EU, in force since 1 April 2016.',
    desc_sr: 'Prvi ugovorni okvir između Kosova i EU, na snazi od 1. aprila 2016.',
    cond_sq: 'Përafrim gradual i legjislacionit, treg i lirë, dialog politik.',
    cond_en: 'Gradual legislative alignment, free market, political dialogue.',
    cond_sr: 'Postepeno usaglašavanje zakonodavstva, slobodno tržište, politički dijalog.'
  },
  {
    id: 3, cluster: 'saa', completed: true, completed_at: '2022-12-14', progress: 100,
    name_sq: 'Aplikim formal për anëtarësim',
    name_en: 'Formal application for membership',
    name_sr: 'Formalna aplikacija za članstvo',
    desc_sq: 'Kosova ka aplikuar zyrtarisht më 14 dhjetor 2022.',
    desc_en: 'Kosovo officially applied on 14 December 2022.',
    desc_sr: 'Kosovo je zvanično apliciralo 14. decembra 2022.',
    cond_sq: 'Aplikimi është dorëzuar; pritet opinion nga Komisioni Evropian.',
    cond_en: 'The application has been submitted; awaiting opinion from the European Commission.',
    cond_sr: 'Aplikacija je podneta; čeka se mišljenje Evropske komisije.'
  },
  {
    id: 4, cluster: 'saa', completed: false, progress: 35,
    name_sq: 'Marrja e statusit të kandidatit',
    name_en: 'Obtaining candidate status',
    name_sr: 'Sticanje statusa kandidata',
    desc_sq: 'Hapi pas aplikimit — Komisioni jep opinionin, Këshilli vendos.',
    desc_en: 'The step after applying — the Commission gives an opinion, the Council decides.',
    desc_sr: 'Korak nakon aplikacije — Komisija daje mišljenje, Savet odlučuje.',
    cond_sq: 'Plotësim i kritereve të Kopenhagës: institucione demokratike, sundim i ligjit, ekonomi tregu, dhe kapacitet për të marrë obligimet e anëtarësimit.',
    cond_en: 'Meeting the Copenhagen criteria: democratic institutions, rule of law, market economy, and capacity to take on membership obligations.',
    cond_sr: 'Ispunjavanje kriterijuma iz Kopenhagena: demokratske institucije, vladavina prava, tržišna ekonomija i kapacitet za preuzimanje obaveza članstva.'
  },
  {
    id: 5, cluster: 'rule_of_law', completed: false, progress: 45,
    name_sq: 'Pavarësia funksionale e Këshillit Gjyqësor',
    name_en: 'Functional independence of the Judicial Council',
    name_sr: 'Funkcionalna nezavisnost Sudskog saveta',
    desc_sq: 'Sistemi gjyqësor duhet të jetë i pavarur nga ndikimi politik.',
    desc_en: 'The judicial system must be independent of political influence.',
    desc_sr: 'Pravosudni sistem mora biti nezavisan od političkog uticaja.',
    cond_sq: 'Procedura transparente emërimi, integritet i provueshëm, disiplinë e gjyqtarëve nën standardet evropiane.',
    cond_en: 'Transparent appointment procedure, demonstrable integrity, judge discipline meeting European standards.',
    cond_sr: 'Transparentna procedura imenovanja, dokaziv integritet, disciplina sudija prema evropskim standardima.'
  },
  {
    id: 6, cluster: 'rule_of_law', completed: false, progress: 20,
    name_sq: 'Vetting i prokurorëve dhe gjyqtarëve',
    name_en: 'Vetting of prosecutors and judges',
    name_sr: 'Vetting tužilaca i sudija',
    desc_sq: 'Verifikim sistematik i pasurisë, integritetit dhe profesionalizmit.',
    desc_en: 'Systematic verification of wealth, integrity and professionalism.',
    desc_sr: 'Sistematska provera imovine, integriteta i profesionalizma.',
    cond_sq: 'Ligj i miratuar, organ verifikues i pavarur, mekanizëm ankese.',
    cond_en: 'Adopted law, independent verifying body, complaint mechanism.',
    cond_sr: 'Usvojen zakon, nezavisno verifikaciono telo, mehanizam za žalbe.'
  },
  {
    id: 7, cluster: 'rule_of_law', completed: false, progress: 30,
    name_sq: 'Mekanizëm i pavarur antikorrupsioni',
    name_en: 'Independent anti-corruption mechanism',
    name_sr: 'Nezavisan antikorupcijski mehanizam',
    desc_sq: 'Agjenci me mandat të qartë për parandalim, hetim dhe sanksione.',
    desc_en: 'An agency with a clear mandate for prevention, investigation and sanctions.',
    desc_sr: 'Agencija sa jasnim mandatom za prevenciju, istragu i sankcije.',
    cond_sq: 'Pavarësi buxhetore, akses në regjistra publikë, mbrojtje për sinjalizuesit.',
    cond_en: 'Budgetary independence, access to public registers, whistleblower protection.',
    cond_sr: 'Budžetska nezavisnost, pristup javnim registrima, zaštita zviždača.'
  },
  {
    id: 8, cluster: 'admin_reform', completed: false, progress: 72,
    name_sq: 'Dixhitalizim i shërbimeve publike (eKosova)',
    name_en: 'Digitization of public services (eKosova)',
    name_sr: 'Digitalizacija javnih usluga (eKosova)',
    desc_sq: 'Të paktën 80% e shërbimeve administrative në një platformë të vetme.',
    desc_en: 'At least 80% of administrative services on a single platform.',
    desc_sr: 'Najmanje 80% administrativnih usluga na jedinstvenoj platformi.',
    cond_sq: 'Interoperabilitet, identitet dixhital, mbrojtje e të dhënave personale.',
    cond_en: 'Interoperability, digital identity, personal data protection.',
    cond_sr: 'Interoperabilnost, digitalni identitet, zaštita ličnih podataka.'
  },
  {
    id: 9, cluster: 'admin_reform', completed: false, progress: 55,
    name_sq: 'Reformë e shërbimit civil bazuar në merita',
    name_en: 'Merit-based civil service reform',
    name_sr: 'Reforma državne službe na osnovu zasluga',
    desc_sq: 'Rekrutim, vlerësim dhe avancim transparent.',
    desc_en: 'Transparent recruitment, evaluation and promotion.',
    desc_sr: 'Transparentno zapošljavanje, evaluacija i unapređenje.',
    cond_sq: 'Ligj i ri, sistem pagash i njëtrajtshëm, depolitizim i pozitave drejtuese.',
    cond_en: 'New law, unified salary system, depoliticization of leadership posts.',
    cond_sr: 'Novi zakon, jedinstven sistem plata, depolitizacija rukovodećih pozicija.'
  },
  {
    id: 10, cluster: 'economy', completed: false, progress: 38,
    name_sq: 'Përafrim i legjislacionit ekonomik me acquis',
    name_en: 'Alignment of economic legislation with the acquis',
    name_sr: 'Usaglašavanje ekonomskog zakonodavstva sa acquis',
    desc_sq: 'Konkurrencë, ndihmë shtetërore, prokurim publik, taksim.',
    desc_en: 'Competition, state aid, public procurement, taxation.',
    desc_sr: 'Konkurencija, državna pomoć, javne nabavke, oporezivanje.',
    cond_sq: 'Trupa rregullatorë funksionalë dhe të pavarur.',
    cond_en: 'Functional and independent regulatory bodies.',
    cond_sr: 'Funkcionalna i nezavisna regulatorna tela.'
  },
  {
    id: 11, cluster: 'other', completed: false, progress: 28,
    name_sq: 'Dialogu Beograd–Prishtinë me rezultate juridikisht detyruese',
    name_en: 'Belgrade–Pristina dialogue with legally binding results',
    name_sr: 'Dijalog Beograd–Priština sa pravno obavezujućim rezultatima',
    desc_sq: 'Marrëveshje gjithëpërfshirëse drejt normalizimit.',
    desc_en: 'Comprehensive agreement toward normalization.',
    desc_sr: 'Sveobuhvatan sporazum o normalizaciji.',
    cond_sq: 'Implementim i marrëveshjeve të arritura, jo vetëm nënshkrimi i tyre.',
    cond_en: 'Implementation of reached agreements, not only signing them.',
    cond_sr: 'Sprovođenje postignutih sporazuma, ne samo njihovo potpisivanje.'
  },
  {
    id: 12, cluster: 'democracy', completed: false, progress: 50,
    name_sq: 'Liria e medias dhe pluralizmi',
    name_en: 'Media freedom and pluralism',
    name_sr: 'Sloboda i pluralizam medija',
    desc_sq: 'Pavarësi editoriale, financim transparent, mbrojtje e gazetarëve.',
    desc_en: 'Editorial independence, transparent funding, protection of journalists.',
    desc_sr: 'Uredjivačka nezavisnost, transparentno finansiranje, zaštita novinara.',
    cond_sq: 'Reformë e RTK-së, ligj i transparencës së pronësisë mediatike.',
    cond_en: 'RTK reform, law on media ownership transparency.',
    cond_sr: 'Reforma RTK-a, zakon o transparentnosti vlasništva nad medijima.'
  },
];

const CLUSTER_LABELS = {
  visa: { sq: 'Viza', en: 'Visa', sr: 'Vize', color: 'var(--blue)' },
  saa: { sq: 'SAA', en: 'SAA', sr: 'SSP', color: 'var(--ink)' },
  rule_of_law: { sq: 'Sundimi i ligjit', en: 'Rule of law', sr: 'Vladavina prava', color: 'var(--rust)' },
  admin_reform: { sq: 'Reforma administrative', en: 'Admin reform', sr: 'Reforma uprave', color: 'var(--blue)' },
  economy: { sq: 'Ekonomi', en: 'Economy', sr: 'Ekonomija', color: 'var(--gold)' },
  democracy: { sq: 'Demokraci', en: 'Democracy', sr: 'Demokratija', color: 'var(--sage)' },
  other: { sq: 'Tjetër', en: 'Other', sr: 'Drugo', color: '#7A6D5A' },
};

const FAQ_DATA = [
  {
    cat: 'be',
    q_sq: 'Çfarë do të thotë statusi i kandidatit dhe pse Kosova nuk e ka ende?',
    q_en: 'What does candidate status mean and why does Kosovo not have it yet?',
    q_sr: 'Šta znači status kandidata i zašto ga Kosovo još uvek nema?',
    a_sq: 'Statusi i kandidatit është një vendim politik i Këshillit të BE-së pas opinionit të Komisionit. Kërkon konsensus të 27 shteteve anëtare. Pesë shtete (Spanja, Greqia, Qipro, Rumania, Sllovakia) ende nuk e kanë njohur Kosovën — kjo ndikon në procesin për momentin.',
    a_en: 'Candidate status is a political decision of the EU Council after the Commission\'s opinion. It requires consensus among all 27 member states. Five states (Spain, Greece, Cyprus, Romania, Slovakia) have not yet recognised Kosovo — this affects the process for the time being.',
    a_sr: 'Status kandidata je politička odluka Saveta EU nakon mišljenja Komisije. Zahteva konsenzus svih 27 država članica. Pet država (Španija, Grčka, Kipar, Rumunija, Slovačka) još uvek nije priznalo Kosovo — to za sada utiče na proces.'
  },
  {
    cat: 'reforma',
    q_sq: 'Si ndikon reforma administrative në jetën time të përditshme?',
    q_en: 'How does administrative reform affect my daily life?',
    q_sr: 'Kako reforma uprave utiče na moj svakodnevni život?',
    a_sq: 'Më pak letra fizike: dokumentet që dikur kërkonin disa zyra (letërnjoftimi, certifikatat, leja e ndërtimit, deklaratat tatimore) po lëvizin në eKosova. Më pak presje: standardet e shërbimit përcaktojnë afatet maksimale. Më shumë transparencë: çdo qytetar ka të drejtë të dijë kush i ka qasur të dhënat e tij.',
    a_en: 'Less paper: documents that used to require multiple offices (ID cards, certificates, building permits, tax filings) are moving to eKosova. Less waiting: service standards set maximum deadlines. More transparency: every citizen has the right to know who has accessed their data.',
    a_sr: 'Manje papira: dokumenti koji su nekada zahtevali više kancelarija (lična karta, sertifikati, građevinska dozvola, poreske prijave) prelaze na eKosova. Manje čekanja: standardi službe određuju maksimalne rokove. Više transparentnosti: svaki građanin ima pravo da zna ko je pristupao njegovim podacima.'
  },
  {
    cat: 'sundimi',
    q_sq: 'Çfarë domethënë "barazi para ligjit" në praktikë?',
    q_en: 'What does "equality before the law" mean in practice?',
    q_sr: 'Šta znači "jednakost pred zakonom" u praksi?',
    a_sq: 'Që një ministri trajtohet njësoj si një qytetar privat para gjykatës. Që një gjykatës nuk mund të mbrojë mikun e tij të fëmijërisë. Që akti administrativ mund të ankimohet dhe ankimi duhet të shqyrtohet brenda afateve të caktuara. Në praktikë, kjo matet me ditët deri në vendim dhe me sa raste të ngjashme përfundojnë me vendime të ndryshme.',
    a_en: 'That a minister is treated the same as a private citizen before the court. That a judge cannot protect a childhood friend. That an administrative act can be appealed and the appeal must be reviewed within set deadlines. In practice, this is measured by days until a ruling and by how many similar cases end with different decisions.',
    a_sr: 'Da se ministar tretira jednako kao privatan građanin pred sudom. Da sudija ne može da štiti prijatelja iz detinjstva. Da se administrativni akt može osporiti i da se žalba mora razmotriti u određenim rokovima. U praksi, to se meri brojem dana do odluke i koliko sličnih slučajeva završava različitim odlukama.'
  },
  {
    cat: 'korrupsioni',
    q_sq: 'Ku mund të raportoj korrupsion në mënyrë anonime?',
    q_en: 'Where can I report corruption anonymously?',
    q_sr: 'Gde mogu anonimno prijaviti korupciju?',
    a_sq: 'Tri kanale kryesore: 1) Agjencia kundër Korrupsionit — formular online dhe linjë telefonike, raportet pranohen edhe pa identitet. 2) Prokuroria Speciale — për raste me dyshime për krim të organizuar. 3) Avokati i Popullit — për keqpërdorim të pushtetit nga zyrtarë. Mbrojtja e sinjalizuesve është e garantuar me ligj që nga viti 2018.',
    a_en: 'Three main channels: 1) The Anti-Corruption Agency — online form and phone line, reports are accepted without identification. 2) The Special Prosecution — for cases involving organised crime. 3) The Ombudsperson — for abuse of power by officials. Whistleblower protection has been guaranteed by law since 2018.',
    a_sr: 'Tri glavna kanala: 1) Antikorupcijska agencija — online formular i telefonska linija, prijave se primaju i bez identifikacije. 2) Specijalno tužilaštvo — za slučajeve organizovanog kriminala. 3) Ombudsman — za zloupotrebu vlasti od strane službenika. Zaštita zviždača je zakonom garantovana od 2018.'
  },
  {
    cat: 'be',
    q_sq: 'A do të nënkuptojë anëtarësia paga më të larta dhe pasaportë evropiane?',
    q_en: 'Will membership mean higher wages and a European passport?',
    q_sr: 'Da li članstvo znači veće plate i evropski pasoš?',
    a_sq: 'Jo automatikisht. Anëtarësia hap tregun e brendshëm, pra punësim të lirë në 27 vende. Pagat zakonisht konvergojnë gradualisht. Pasaporta e BE-së vjen vetëm me anëtarësi të plotë — para kësaj, vetëm liberalizim i vizave (i cili ka hyrë në fuqi më 1 janar 2024).',
    a_en: 'Not automatically. Membership opens the internal market, i.e. free employment in 27 countries. Wages usually converge gradually. The EU passport comes only with full membership — before that, only visa liberalization (in force since 1 January 2024).',
    a_sr: 'Ne automatski. Članstvo otvara unutrašnje tržište, tj. slobodno zapošljavanje u 27 zemalja. Plate obično konvergiraju postepeno. EU pasoš dolazi samo sa punim članstvom — pre toga, samo liberalizacija viza (na snazi od 1. januara 2024).'
  },
  {
    cat: 'reforma',
    q_sq: 'Çfarë është eKosova dhe kush e administron?',
    q_en: 'What is eKosova and who administers it?',
    q_sr: 'Šta je eKosova i ko je administrira?',
    a_sq: 'eKosova është platforma qeveritare ku qytetari kryen shërbime administrative online: certifikata, deklarime tatimore, regjistrim biznesi, kërkesa për dokumente. E administron Agjencia e Shoqërisë së Informacionit. Identifikimi bëhet me numër personal + verifikim me SMS ose me eID.',
    a_en: 'eKosova is the government platform where citizens carry out administrative services online: certificates, tax filings, business registration, document requests. It is run by the Information Society Agency. Identification is done with a personal number + SMS verification or eID.',
    a_sr: 'eKosova je vladina platforma na kojoj građani obavljaju administrativne usluge online: sertifikati, poreske prijave, registracija biznisa, zahtevi za dokumente. Administrira je Agencija za informaciono društvo. Identifikacija se vrši ličnim brojem + SMS verifikacijom ili eID-om.'
  },
];

const INFOGRAPHICS = [
  { title_sq: 'Si funksionon procesi i anëtarësimit', title_en: 'How the accession process works', title_sr: 'Kako funkcioniše proces pristupanja', tag_sq: 'BE', tag_en: 'EU', tag_sr: 'EU', shape: 'flow' },
  { title_sq: '6 klasterët, të shpjeguar në një faqe', title_en: 'The 6 clusters, on a single page', title_sr: '6 klastera, na jednoj stranici', tag_sq: 'BE', tag_en: 'EU', tag_sr: 'EU', shape: 'cluster' },
  { title_sq: 'Si raportohet korrupsioni — hap pas hapi', title_en: 'How to report corruption — step by step', title_sr: 'Kako prijaviti korupciju — korak po korak', tag_sq: 'Korrupsioni', tag_en: 'Corruption', tag_sr: 'Korupcija', shape: 'steps' },
  { title_sq: 'Të drejtat e qytetarit para administratës', title_en: 'Citizen rights before the administration', title_sr: 'Prava građanina pred upravom', tag_sq: 'Sundimi', tag_en: 'Rule of law', tag_sr: 'Vladavina prava', shape: 'rights' },
  { title_sq: 'Cilat shërbime tashmë janë në eKosova', title_en: 'Which services are already in eKosova', title_sr: 'Koje usluge su već u eKosova', tag_sq: 'Reforma', tag_en: 'Reform', tag_sr: 'Reforma', shape: 'grid' },
  { title_sq: 'Kalendar i raporteve të Komisionit (2014–2025)', title_en: 'Commission report calendar (2014–2025)', title_sr: 'Kalendar izveštaja Komisije (2014–2025)', tag_sq: 'BE', tag_en: 'EU', tag_sr: 'EU', shape: 'timeline' },
];

// ============================================================
// NEW: Topic content per language
// ============================================================
const TOPIC_CONTENT = {
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
      { h: 'Kako vas se tiče', p: 'Manje redova, manje papira i pravo da u svakom trenutku znate status svog zahteva.' },
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
      { h: 'Tri stuba', p: 'Nezavisnost pravosuđa, odgovornost tužilaštva i delotvorno pravo na žalbu.', list: ['Transparentna procedura imenovanja sudija', 'Provera imovine i integriteta', 'Zakonski rokovi za razmatranje žalbi'] },
      { h: 'Prava građanina', p: 'Svaki administrativni akt može se osporiti u roku od 30 dana. Sud mora doneti odluku u roku od 60 dana za hitne predmete.' },
      { h: 'Ključni pokazatelj', p: 'Prosečno trajanje postupka i udeo odluka ukinutih u višoj instanci.' },
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
      { h: 'Najčešći oblici', p: 'Sitno podmićivanje u svakodnevnim uslugama, sukob interesa u nabavkama i politički uticaj na rukovodeće pozicije.' },
      { h: 'Kako prijaviti', p: 'Tri nezavisna kanala, identifikacija nije obavezna:', list: ['Antikorupcijska agencija — online formular, 24/7 linija', 'Specijalno tužilaštvo — za organizovani kriminal', 'Ombudsman — za zloupotrebu vlasti od službenika'] },
      { h: 'Zaštita zviždača', p: 'Zakon 06/L-085 (2018) garantuje profesionalni imunitet i potpunu anonimnost za prijave u dobroj veri.' },
    ],
  },
  be: {
    sq: [
      { h: 'Ku ndodhemi', p: 'Aplikim formal më 14 dhjetor 2022. Po pritet opinioni i Komisionit, pa të cilin nuk fillon negociata.' },
      { h: 'Hapat e ardhshëm', p: 'Procesi shtyhet vetëm me konsensus të 27 shteteve. Pesë prej tyre ende nuk e kanë njohur Kosovën.', list: ['Opinion i Komisionit Evropian', 'Status kandidati (vendim i Këshillit)', 'Hapja e klasterëve të negociatave', 'Mbyllja kapituj-kapituj e 6 klasterëve'] },
      { h: 'Çfarë do të thotë anëtarësia', p: 'Treg i brendshëm, lëvizje e lirë e punës dhe kapitalit, fonde strukturore, dhe pjesëmarrje në vendimmarrjen evropiane.' },
    ],
    en: [
      { h: 'Where we stand', p: 'Formal application on 14 December 2022. The Commission\'s opinion is pending — without it, negotiations cannot begin.' },
      { h: 'Next steps', p: 'The process moves forward only with consensus of all 27 states. Five of them have not yet recognised Kosovo.', list: ['European Commission opinion', 'Candidate status (Council decision)', 'Opening of negotiation clusters', 'Chapter-by-chapter closure of the 6 clusters'] },
      { h: 'What membership means', p: 'Internal market, free movement of labour and capital, structural funds, and participation in European decision-making.' },
    ],
    sr: [
      { h: 'Gde smo', p: 'Formalna aplikacija 14. decembra 2022. Mišljenje Komisije se čeka — bez njega pregovori ne mogu početi.' },
      { h: 'Sledeći koraci', p: 'Proces se nastavlja samo uz konsenzus svih 27 država. Pet država još nije priznalo Kosovo.', list: ['Mišljenje Evropske komisije', 'Status kandidata (odluka Saveta)', 'Otvaranje pregovaračkih klastera', 'Zatvaranje poglavlja u 6 klastera'] },
      { h: 'Šta znači članstvo', p: 'Unutrašnje tržište, slobodno kretanje rada i kapitala, strukturni fondovi i učešće u evropskom odlučivanju.' },
    ],
  },
};

// ============================================================
// NEW: About Kosovo data
// ============================================================
const KOSOVO_TIMELINE = [
  { date: '17 shkurt 2008', date_en: '17 February 2008', date_sr: '17. februar 2008', y: 2008,
    title_sq: 'Shpallja e pavarësisë', title_en: 'Declaration of independence', title_sr: 'Proglašenje nezavisnosti',
    p_sq: 'Kuvendi miratoi njëzëri Deklaratën e Pavarësisë në Prishtinë.',
    p_en: 'Parliament unanimously adopted the Declaration of Independence in Pristina.',
    p_sr: 'Skupština je jednoglasno usvojila Deklaraciju o nezavisnosti u Prištini.',
    tag: 'pavarësia'
  },
  { date: '15 qershor 2008', date_en: '15 June 2008', date_sr: '15. jun 2008', y: 2008,
    title_sq: 'Kushtetuta hyn në fuqi', title_en: 'Constitution enters into force', title_sr: 'Ustav stupa na snagu',
    p_sq: 'Kushtetuta e Republikës së Kosovës, e miratuar më 9 prill 2008, hyn në fuqi.',
    p_en: 'The Constitution of the Republic of Kosovo, adopted on 9 April 2008, enters into force.',
    p_sr: 'Ustav Republike Kosovo, usvojen 9. aprila 2008, stupa na snagu.',
    tag: 'kushtetuta'
  },
  { date: '22 korrik 2010', date_en: '22 July 2010', date_sr: '22. jul 2010', y: 2010,
    title_sq: 'Mendimi i Gjykatës Ndërkombëtare', title_en: 'ICJ advisory opinion', title_sr: 'Mišljenje MSP',
    p_sq: 'Gjykata Ndërkombëtare e Drejtësisë konfirmon se shpallja e pavarësisë nuk është në kundërshtim me të drejtën ndërkombëtare.',
    p_en: 'The International Court of Justice confirms the declaration of independence is not in violation of international law.',
    p_sr: 'Međunarodni sud pravde potvrđuje da proglašenje nezavisnosti nije u suprotnosti sa međunarodnim pravom.',
    tag: 'drejtësia'
  },
  { date: '19 prill 2013', date_en: '19 April 2013', date_sr: '19. april 2013', y: 2013,
    title_sq: 'Marrëveshja e Brukselit', title_en: 'Brussels Agreement', title_sr: 'Briselski sporazum',
    p_sq: 'Marrëveshja e parë mes Kosovës dhe Serbisë për normalizimin e marrëdhënieve.',
    p_en: 'The first agreement between Kosovo and Serbia on the normalization of relations.',
    p_sr: 'Prvi sporazum između Kosova i Srbije o normalizaciji odnosa.',
    tag: 'dialog'
  },
  { date: '27 qershor 2015', date_en: '27 June 2015', date_sr: '27. jun 2015', y: 2015,
    title_sq: 'Anëtarësimi në Komitetin Olimpik', title_en: 'IOC membership', title_sr: 'Članstvo u MOK',
    p_sq: 'Kosova bëhet anëtare e Komitetit Olimpik Ndërkombëtar — prezencë e parë në Lojërat Olimpike.',
    p_en: 'Kosovo becomes a member of the International Olympic Committee — first appearance at the Olympic Games.',
    p_sr: 'Kosovo postaje član Međunarodnog olimpijskog komiteta — prvo učešće na Olimpijskim igrama.',
    tag: 'sport'
  },
  { date: '1 prill 2016', date_en: '1 April 2016', date_sr: '1. april 2016', y: 2016,
    title_sq: 'SAA hyn në fuqi', title_en: 'SAA enters into force', title_sr: 'SSP stupa na snagu',
    p_sq: 'Marrëveshja e Stabilizim-Asociimit, korniza e parë kontraktuale me BE-në.',
    p_en: 'The Stabilisation and Association Agreement, the first contractual framework with the EU.',
    p_sr: 'Sporazum o stabilizaciji i pridruživanju, prvi ugovorni okvir sa EU.',
    tag: 'BE'
  },
  { date: '14 dhjetor 2022', date_en: '14 December 2022', date_sr: '14. decembar 2022', y: 2022,
    title_sq: 'Aplikim për anëtarësim në BE', title_en: 'Application for EU membership', title_sr: 'Aplikacija za članstvo u EU',
    p_sq: 'Kosova dorëzon zyrtarisht aplikimin për anëtarësim në Bashkimin Evropian.',
    p_en: 'Kosovo formally submits its application for EU membership.',
    p_sr: 'Kosovo zvanično podnosi aplikaciju za članstvo u Evropskoj uniji.',
    tag: 'BE'
  },
  { date: '1 janar 2024', date_en: '1 January 2024', date_sr: '1. januar 2024', y: 2024,
    title_sq: 'Liberalizimi i vizave', title_en: 'Visa liberalization', title_sr: 'Liberalizacija viza',
    p_sq: 'Qytetarët e Kosovës udhëtojnë në zonën Shengen pa vizë — 90 ditë në çdo 180-ditësh.',
    p_en: 'Citizens of Kosovo travel to the Schengen area visa-free — 90 days in every 180.',
    p_sr: 'Građani Kosova putuju u šengensku zonu bez vize — 90 dana u svakih 180.',
    tag: 'lëvizja'
  },
  { date: '11 maj 2024', date_en: '11 May 2024', date_sr: '11. maj 2024', y: 2024,
    title_sq: 'Anëtarësim në Këshillin e Evropës (vendim parlamentar)', title_en: 'Council of Europe membership (parliamentary vote)', title_sr: 'Članstvo u Savetu Evrope (parlamentarno glasanje)',
    p_sq: 'Procesi politik për anëtarësim avancon — vendim mes shteteve anëtare.',
    p_en: 'The political process for membership advances — decision among member states.',
    p_sr: 'Politički proces za članstvo napreduje — odluka među državama članicama.',
    tag: 'institucione'
  },
];

// Cumulative recognitions (approx; for chart)
const RECOGNITIONS = [
  { y: 2008, n: 53 }, { y: 2009, n: 64 }, { y: 2010, n: 72 }, { y: 2011, n: 85 },
  { y: 2012, n: 96 }, { y: 2013, n: 105 }, { y: 2014, n: 110 }, { y: 2015, n: 112 },
  { y: 2016, n: 114 }, { y: 2017, n: 116 }, { y: 2018, n: 116 }, { y: 2019, n: 117 },
  { y: 2020, n: 117 }, { y: 2021, n: 117 }, { y: 2022, n: 117 }, { y: 2023, n: 118 },
  { y: 2024, n: 118 }, { y: 2025, n: 118 },
];

// EU support polls (illustrative)
const EU_SUPPORT = [
  { y: 2018, support: 87, against: 5, undecided: 8 },
  { y: 2020, support: 90, against: 4, undecided: 6 },
  { y: 2022, support: 92, against: 3, undecided: 5 },
  { y: 2023, support: 88, against: 6, undecided: 6 },
  { y: 2024, support: 84, against: 9, undecided: 7 },
  { y: 2025, support: 81, against: 11, undecided: 8 },
];

// Services digitised over time
const SERVICES = [
  { y: 2017, n: 12 }, { y: 2018, n: 28 }, { y: 2019, n: 48 },
  { y: 2020, n: 95 }, { y: 2021, n: 142 }, { y: 2022, n: 220 },
  { y: 2023, n: 320 }, { y: 2024, n: 480 }, { y: 2025, n: 620 },
];

// Reporting channels share (2024)
const REPORT_CHANNELS = [
  { key: 'akk', label_sq: 'Agjencia kundër Korrupsionit', label_en: 'Anti-Corruption Agency', label_sr: 'Antikorupcijska agencija', value: 58, color: 'var(--rust)' },
  { key: 'prok', label_sq: 'Prokuroria Speciale', label_en: 'Special Prosecution', label_sr: 'Specijalno tužilaštvo', value: 22, color: 'var(--ink)' },
  { key: 'ombud', label_sq: 'Avokati i Popullit', label_en: 'Ombudsperson', label_sr: 'Ombudsman', value: 14, color: 'var(--blue)' },
  { key: 'media', label_sq: 'Media / OJQ', label_en: 'Media / NGOs', label_sr: 'Mediji / NVO', value: 6, color: 'var(--gold)' },
];

// Court caseload
const COURT_CASES = [
  { y: 2019, opened: 78, closed: 62 },
  { y: 2020, opened: 71, closed: 65 },
  { y: 2021, opened: 84, closed: 72 },
  { y: 2022, opened: 89, closed: 81 },
  { y: 2023, opened: 92, closed: 86 },
  { y: 2024, opened: 95, closed: 90 },
  { y: 2025, opened: 97, closed: 94 },
];

const KOSOVO_FACTS = {
  pop: '~1.6M',
  area: '10,887 km²',
  cap: { sq: 'Prishtinë', en: 'Pristina', sr: 'Priština' },
  curr: 'EUR (€)',
  lang: { sq: 'shqip, serbisht', en: 'Albanian, Serbian', sr: 'albanski, srpski' },
  phone: '+383',
  tld: '.xk / .com',
  tz: 'CET (UTC+1)',
  recog: '118',
  inst_pres: { sq: 'Vjosa Osmani', en: 'Vjosa Osmani', sr: 'Vjosa Osmani' },
  inst_pm: { sq: 'Albin Kurti', en: 'Albin Kurti', sr: 'Aljbin Kurti' },
  inst_speaker: { sq: 'Glauk Konjufca', en: 'Glauk Konjufca', sr: 'Glauk Konjufca' },
  inst_chief: { sq: 'Gresa Caka-Nimani', en: 'Gresa Caka-Nimani', sr: 'Gresa Caka-Nimani' },
};

// ---- sections.jsx ----
// Sections of the euguide-ks home page.
// Inline styles + small style helpers. No shared "styles" object name.

// ============================================================
// Section header — eyebrow + serif title + optional subtitle
// ============================================================
function SectionHead({ eyebrow, title, sub, align = 'left', kicker, num }) {
  return (
    <div style={{ marginBottom: 48, textAlign: align, maxWidth: align === 'center' ? 720 : 880 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18, justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
        {num && <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>§ {num}</span>}
        <span className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-2)', borderTop: '1px solid var(--ink-2)', paddingTop: 6 }}>
          {eyebrow}
        </span>
      </div>
      <h2 className="serif" style={{ fontSize: 'clamp(34px, 5vw, 56px)', lineHeight: 1.04, color: 'var(--ink)' }}>
        {title}
      </h2>
      {sub && <p style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 620, marginTop: 18, lineHeight: 1.5 }}>{sub}</p>}
      {kicker}
    </div>
  );
};

// ============================================================
// Topics — 4 cards in asymmetric grid
// ============================================================
function Topics({ lang, t }) {
  const [hovered, setHovered] = useState(null);
  return (
    <section style={{ padding: '120px 0 100px', borderTop: '1px solid var(--line)' }}>
      <div className="container">
        <SectionHead eyebrow={t.topics.eyebrow} title={<>{t.topics.title}</>} num="01" />
        <div className="topics-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          background: 'var(--line)',
          border: '1px solid var(--line)',
        }}>
          {TOPICS.map((topic, i) => {
            const title = topic['title_' + lang] || topic.title_sq;
            const blurb = topic['blurb_' + lang] || topic.blurb_sq;
            const metricLabel = topic['metric_label_' + lang] || topic.metric_label_sq;
            const isHover = hovered === i;
            return (
              <a key={topic.key} href={'#/' + topic.key}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                style={{
                  background: isHover ? topic.accent_soft : 'var(--paper)',
                  padding: '32px 28px 28px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: 360,
                  transition: 'background 240ms ease',
                  cursor: 'pointer',
                  position: 'relative',
                }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{topic.num} / 04</span>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: topic.accent, transform: isHover ? 'scale(1.6)' : 'scale(1)', transition: 'transform 240ms ease' }} />
                  </div>
                  <h3 className="serif" style={{ fontSize: 34, lineHeight: 0.98, color: 'var(--ink)', marginBottom: 22, whiteSpace: 'pre-line' }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 0 }}>
                    {blurb}
                  </p>
                </div>
                <div style={{ paddingTop: 24, borderTop: '1px dashed var(--line)', marginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span className="serif" style={{ fontSize: 36, color: topic.accent, lineHeight: 1 }}>{topic.metric}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, letterSpacing: '0.04em' }}>{metricLabel}</div>
                </div>
                <div style={{
                  position: 'absolute', right: 16, bottom: 16,
                  width: 28, height: 28, borderRadius: '50%',
                  border: '1px solid var(--ink-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isHover ? 'var(--ink)' : 'transparent',
                  color: isHover ? 'var(--paper)' : 'var(--ink)',
                  transition: 'all 240ms ease',
                }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 10 L10 2 M10 2 H4 M10 2 V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" /></svg>
                </div>
              </a>
            );
          })}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .topics-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .topics-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
};

// ============================================================
// Region — horizontal bar comparison
// ============================================================
function RegionChart({ lang, t }) {
  const data = REGION;
  const max = 100;
  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 64 }} className="region-grid">
          <div>
            <SectionHead eyebrow={t.progress.eyebrow} title={t.progress.title} sub={t.progress.sub} num="02" />
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <LegendDot color="var(--sage)" label={lang === 'sq' ? 'Në negociata' : lang === 'en' ? 'Negotiating' : 'U pregovorima'} />
              <LegendDot color="var(--gold)" label={lang === 'sq' ? 'Kandidat' : lang === 'en' ? 'Candidate' : 'Kandidat'} />
              <LegendDot color="var(--rust)" label={lang === 'sq' ? 'Aplikim në pritje' : lang === 'en' ? 'Application pending' : 'Aplikacija na čekanju'} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {data.map((c, i) => {
                const color = c.status === 'negotiating' ? 'var(--sage)' : c.status === 'candidate' ? 'var(--gold)' : 'var(--rust)';
                const isKosova = c.code === 'XK';
                return (
                  <div key={c.code} style={{
                    display: 'grid',
                    gridTemplateColumns: '52px 130px 1fr 90px',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 0',
                    borderBottom: '1px solid var(--line)',
                    background: isKosova ? 'var(--paper-2)' : 'transparent',
                    margin: isKosova ? '0 -16px' : 0,
                    paddingLeft: isKosova ? 16 : 0,
                    paddingRight: isKosova ? 16 : 0,
                  }} className="region-row">
                    <span className="mono" style={{ fontSize: 18, color: 'var(--ink)', fontWeight: 500 }}>{c.code}</span>
                    <span className="serif" style={{ fontSize: 22, color: 'var(--ink)' }}>
                      {c.name}
                      {isKosova && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--rust)', verticalAlign: 'super' }} className="mono">★</span>}
                    </span>
                    <div style={{ height: 18, background: 'var(--paper-3)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{
                        position: 'absolute', top: 0, left: 0, bottom: 0,
                        width: c.progress + '%',
                        background: color,
                        transition: 'width 800ms cubic-bezier(.2,.7,.2,1)',
                      }} />
                      {[20, 40, 60, 80].map(p => (
                        <div key={p} style={{ position: 'absolute', left: p + '%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.4)' }} />
                      ))}
                    </div>
                    <span className="mono" style={{ fontSize: 14, color: 'var(--ink)', textAlign: 'right' }}>{c.progress}<span style={{ color: 'var(--ink-3)' }}>/100</span></span>
                  </div>
                );
              })}
            </div>
            <div className="mono" style={{ marginTop: 18, fontSize: 11, color: 'var(--ink-3)' }}>
              ← {lang === 'sq' ? 'progres i përbërë (kapituj + raporte)' : lang === 'en' ? 'composite progress (chapters + reports)' : 'kompozitni napredak'}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .region-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .region-row { grid-template-columns: 36px 100px 1fr 70px !important; gap: 10px !important; }
        }
        @media (max-width: 520px) {
          .region-row { grid-template-columns: 30px 1fr 60px !important; }
          .region-row > :nth-child(3) { display: none; }
        }
      `}</style>
    </section>
  );
};

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 12, height: 12, background: color, borderRadius: 2 }} />
      <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{label}</span>
    </div>
  );
}

// ============================================================
// CPI Chart — area chart over time
// ============================================================
function CPIChart({ lang, t }) {
  const data = CPI;
  const [hover, setHover] = useState(null);
  const W = 800, H = 320, P = { l: 50, r: 30, t: 30, b: 40 };
  const minY = 25, maxY = 50;
  const xScale = i => P.l + (i / (data.length - 1)) * (W - P.l - P.r);
  const yScale = v => P.t + (1 - (v - minY) / (maxY - minY)) * (H - P.t - P.b);

  const linePath = data.map((d, i) => (i === 0 ? 'M' : 'L') + xScale(i) + ' ' + yScale(d.score)).join(' ');
  const areaPath = linePath + ` L ${xScale(data.length - 1)} ${H - P.b} L ${xScale(0)} ${H - P.b} Z`;

  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)' }}>
      <div className="container">
        <SectionHead eyebrow={t.chart1.eyebrow} title={t.chart1.title} sub={t.chart1.sub} num="03" />
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 56 }} className="cpi-grid">
          <div style={{ background: 'var(--paper-2)', padding: '32px 24px 24px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>CPI · 0–100</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>2015 → 2025</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseLeave={() => setHover(null)}>
              {/* horizontal grid */}
              {[25, 30, 35, 40, 45, 50].map(v => (
                <g key={v}>
                  <line x1={P.l} y1={yScale(v)} x2={W - P.r} y2={yScale(v)} stroke="var(--line)" strokeDasharray={v === 50 ? '0' : '2 4'} strokeWidth="1" />
                  <text x={P.l - 8} y={yScale(v) + 4} className="mono" style={{ fontSize: 10, fill: 'var(--ink-3)', textAnchor: 'end' }}>{v}</text>
                </g>
              ))}
              {/* x labels */}
              {data.map((d, i) => i % 2 === 0 && (
                <text key={d.year} x={xScale(i)} y={H - P.b + 18} className="mono" style={{ fontSize: 10, fill: 'var(--ink-3)', textAnchor: 'middle' }}>{d.year}</text>
              ))}
              {/* area */}
              <path d={areaPath} fill="var(--rust)" opacity="0.12" />
              {/* line */}
              <path d={linePath} fill="none" stroke="var(--rust)" strokeWidth="2" />
              {/* points */}
              {data.map((d, i) => (
                <g key={d.year}>
                  <circle cx={xScale(i)} cy={yScale(d.score)} r={hover === i ? 6 : 3} fill="var(--paper)" stroke="var(--rust)" strokeWidth="2" style={{ transition: 'r 160ms' }} />
                  <rect x={xScale(i) - 18} y="0" width="36" height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
                </g>
              ))}
              {/* hover tooltip */}
              {hover !== null && (
                <g>
                  <line x1={xScale(hover)} y1={P.t} x2={xScale(hover)} y2={H - P.b} stroke="var(--ink-2)" strokeDasharray="2 3" strokeWidth="1" />
                  <rect x={xScale(hover) - 38} y={yScale(data[hover].score) - 36} width="76" height="26" fill="var(--ink)" />
                  <text x={xScale(hover)} y={yScale(data[hover].score) - 19} className="mono" style={{ fontSize: 11, fill: 'var(--paper)', textAnchor: 'middle' }}>
                    {data[hover].year} · {data[hover].score}
                  </text>
                </g>
              )}
              {/* annotation: visa liberalization */}
              <g>
                <line x1={xScale(8)} y1={yScale(data[8].score)} x2={xScale(8)} y2={P.t + 12} stroke="var(--ink-2)" strokeWidth="1" />
                <text x={xScale(8) + 6} y={P.t + 16} className="mono" style={{ fontSize: 10, fill: 'var(--ink-2)' }}>liberalizimi i vizave</text>
              </g>
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <Stat big="41" suffix="/100" label_sq="CPI 2025" label_en="CPI 2025" label_sr="CPI 2025" delta="+8" lang={lang} note_sq="vs 2015" note_en="vs 2015" note_sr="vs 2015" />
              <Stat big="83" suffix="" label_sq="vendi në renditjen globale" label_en="global ranking" label_sr="globalni rang" delta="↑" lang={lang} note_sq="180 shtete të vlerësuara" note_en="180 countries assessed" note_sr="180 zemalja u rangu" />
              <Stat big="6.2" suffix="%" label_sq="bizneset që raportojnë ryshfet" label_en="businesses reporting bribery" label_sr="biznisi koji prijavljuju mito" delta="−" lang={lang} note_sq="World Bank, 2024" note_en="World Bank, 2024" note_sr="World Bank, 2024" />
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .cpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
};

function Stat({ big, suffix, label_sq, label_en, label_sr, delta, note_sq, note_en, note_sr, lang }) {
  const label = lang === 'en' ? label_en : lang === 'sr' ? label_sr : label_sq;
  const note = lang === 'en' ? note_en : lang === 'sr' ? note_sr : note_sq;
  return (
    <div style={{ borderTop: '1px solid var(--ink-2)', paddingTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span className="serif" style={{ fontSize: 56, lineHeight: 0.9, color: 'var(--ink)' }}>{big}</span>
        <span className="serif" style={{ fontSize: 22, color: 'var(--ink-2)' }}>{suffix}</span>
        {delta && <span className="mono" style={{ fontSize: 12, color: 'var(--sage)', marginLeft: 'auto' }}>{delta}</span>}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>{label}</div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{note}</div>
    </div>
  );
}

// ============================================================
// Clusters — donut + reform progress bars
// ============================================================
function Clusters({ lang, t }) {
  const data = CLUSTERS;
  const total = data.reduce((s, c) => s + c.weight, 0);
  const R = 110, IR = 70, CX = 150, CY = 150;
  let acc = 0;
  const slices = data.map(c => {
    const a0 = (acc / total) * 2 * Math.PI;
    acc += c.weight;
    const a1 = (acc / total) * 2 * Math.PI;
    return { ...c, a0: a0 - Math.PI / 2, a1: a1 - Math.PI / 2 };
  });

  const [active, setActive] = useState(0);
  const cur = data[active];

  const arcPath = (a0, a1, r, ir) => {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = CX + r * Math.cos(a0), y0 = CY + r * Math.sin(a0);
    const x1 = CX + r * Math.cos(a1), y1 = CY + r * Math.sin(a1);
    const x2 = CX + ir * Math.cos(a1), y2 = CY + ir * Math.sin(a1);
    const x3 = CX + ir * Math.cos(a0), y3 = CY + ir * Math.sin(a0);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${ir} ${ir} 0 ${large} 0 ${x3} ${y3} Z`;
  };

  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container">
        <SectionHead eyebrow={t.cluster.eyebrow} title={t.cluster.title} sub={t.cluster.sub} num="04" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }} className="cluster-grid">
          <div style={{ position: 'relative' }}>
            <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 440, display: 'block', margin: '0 auto' }}>
              {slices.map((s, i) => (
                <path key={i} d={arcPath(s.a0, s.a1, i === active ? R + 8 : R, IR)} fill={s.color}
                  opacity={i === active ? 1 : 0.85}
                  onMouseEnter={() => setActive(i)}
                  style={{ cursor: 'pointer', transition: 'd 240ms' }} />
              ))}
              <text x={CX} y={CY - 6} className="mono" style={{ fontSize: 10, fill: 'var(--ink-3)', textAnchor: 'middle', letterSpacing: '0.1em' }}>KLASTERI</text>
              <text x={CX} y={CY + 18} className="serif" style={{ fontSize: 36, fill: 'var(--ink)', textAnchor: 'middle' }}>{cur.code}</text>
              <text x={CX} y={CY + 38} className="mono" style={{ fontSize: 10, fill: 'var(--ink-3)', textAnchor: 'middle' }}>{cur.chapters} kapituj</text>
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.map((c, i) => {
                const name = c['name_' + lang] || c.name_sq;
                const isActive = i === active;
                return (
                  <button key={c.code} onMouseEnter={() => setActive(i)}
                    style={{
                      background: isActive ? 'var(--paper)' : 'transparent',
                      border: 'none', textAlign: 'left',
                      padding: '14px 16px',
                      display: 'grid', gridTemplateColumns: '32px 1fr 60px 40px', gap: 12, alignItems: 'center',
                      borderLeft: `3px solid ${isActive ? c.color : 'transparent'}`,
                      transition: 'all 200ms',
                    }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>0{c.code}</span>
                    <span className="serif" style={{ fontSize: 22, color: 'var(--ink)' }}>{name}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{c.chapters} kap.</span>
                    <span style={{ width: 10, height: 10, background: c.color, borderRadius: 2, justifySelf: 'end' }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reform progress bars below */}
        <div style={{ marginTop: 80, paddingTop: 48, borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
            <h3 className="serif" style={{ fontSize: 28, color: 'var(--ink)' }}>
              {lang === 'sq' ? 'Progresi i përafrimit me acquis-në' : lang === 'en' ? 'Progress aligning with the acquis' : 'Napredak usaglašavanja sa acquis'}
            </h3>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>vlerësim 2025 · %</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px 56px' }} className="reform-grid">
            {REFORM.map(r => {
              const label = r['label_' + lang] || r.label_sq;
              return (
                <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 40px', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)' }}>{label}</span>
                  <div style={{ height: 6, background: 'var(--paper-3)', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, width: r.value + '%', background: 'var(--ink)', transition: 'width 1s cubic-bezier(.2,.7,.2,1)' }} />
                  </div>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right' }}>{r.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .cluster-grid { grid-template-columns: 1fr !important; }
          .reform-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
};

// ---- sections2.jsx ----
// More sections: Objectives, Infographics, FAQ, Footer, ChatWidget

// ============================================================
// Objectives — interactive list with status & cluster filter
// ============================================================
function Objectives({ lang, t }) {
  const [filter, setFilter] = useState('all');
  const [cluster, setCluster] = useState('all');
  const [open, setOpen] = useState(null);
  const objs = OBJECTIVES;

  const filtered = objs.filter(o => {
    if (filter === 'completed' && !o.completed) return false;
    if (filter === 'pending' && o.completed) return false;
    if (cluster !== 'all' && o.cluster !== cluster) return false;
    return true;
  });

  const totalCompleted = objs.filter(o => o.completed).length;
  const globalProgress = Math.round(objs.reduce((s, o) => s + (o.completed ? 100 : o.progress), 0) / objs.length);

  const labels = {
    all: t.common.all,
    completed: t.common.completed,
    pending: t.common.pending,
  };

  return (
    <section style={{ padding: '120px 0 100px', borderTop: '1px solid var(--line)', background: 'var(--ink)', color: 'var(--paper)' }}>
      <div className="container">
        <div style={{ marginBottom: 48, maxWidth: 920 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18 }}>
            <span className="mono" style={{ fontSize: 12, color: 'rgba(242,239,232,0.5)', letterSpacing: '0.06em' }}>§ 05</span>
            <span className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--paper)', borderTop: '1px solid var(--paper)', paddingTop: 6 }}>{t.objectives.eyebrow}</span>
          </div>
          <h2 className="serif" style={{ fontSize: 'clamp(34px, 5vw, 56px)', lineHeight: 1.04, color: 'var(--paper)' }}>{t.objectives.title}</h2>
          <p style={{ fontSize: 17, color: 'rgba(242,239,232,0.7)', maxWidth: 620, marginTop: 18 }}>{t.objectives.sub}</p>
        </div>

        {/* Global progress bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, marginBottom: 48, paddingBottom: 32, borderBottom: '1px solid rgba(242,239,232,0.15)' }} className="obj-stats">
          <div>
            <div className="mono" style={{ fontSize: 11, color: 'rgba(242,239,232,0.5)', letterSpacing: '0.1em', marginBottom: 12 }}>{t.common.progress_global.toUpperCase()}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span className="serif" style={{ fontSize: 64, lineHeight: 0.9 }}>{globalProgress}</span>
              <span className="serif" style={{ fontSize: 28, color: 'rgba(242,239,232,0.5)' }}>%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(242,239,232,0.15)', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: globalProgress + '%', background: 'var(--gold)' }} />
            </div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(242,239,232,0.15)', paddingLeft: 32 }}>
            <div className="mono" style={{ fontSize: 11, color: 'rgba(242,239,232,0.5)', letterSpacing: '0.1em', marginBottom: 12 }}>{t.common.completed_caps.toUpperCase()}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="serif" style={{ fontSize: 64, lineHeight: 0.9 }}>{totalCompleted}</span>
              <span className="serif" style={{ fontSize: 28, color: 'rgba(242,239,232,0.5)' }}>/ {objs.length}</span>
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'rgba(242,239,232,0.5)', marginTop: 8 }}>{t.common.from_main_objectives}</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(242,239,232,0.15)', paddingLeft: 32 }}>
            <div className="mono" style={{ fontSize: 11, color: 'rgba(242,239,232,0.5)', letterSpacing: '0.1em', marginBottom: 12 }}>{t.common.next_step.toUpperCase()}</div>
            <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, marginBottom: 6 }}>{t.common.candidate_status}</div>
            <div className="mono" style={{ fontSize: 11, color: 'rgba(242,239,232,0.5)' }}>{t.common.expected} 2026–2027</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 32 }} className="obj-filters">
          <div style={{ display: 'flex', gap: 0, border: '1px solid rgba(242,239,232,0.3)' }}>
            {['all', 'completed', 'pending'].map(k => (
              <button key={k} onClick={() => setFilter(k)}
                style={{
                  background: filter === k ? 'var(--paper)' : 'transparent',
                  color: filter === k ? 'var(--ink)' : 'var(--paper)',
                  border: 'none', padding: '10px 18px', fontSize: 13, transition: 'all 160ms',
                }} className="mono">
                {labels[k]} {k === 'completed' && '✓'} {k === 'pending' && '○'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="mono" style={{ fontSize: 11, color: 'rgba(242,239,232,0.5)' }}>{t.common.cluster.toUpperCase()}:</span>
            <select value={cluster} onChange={e => setCluster(e.target.value)}
              style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid rgba(242,239,232,0.3)', padding: '8px 12px', fontSize: 13, fontFamily: 'inherit' }} className="mono">
              <option value="all" style={{ color: 'var(--ink)' }}>{t.common.all.toLowerCase()}</option>
              {Object.entries(CLUSTER_LABELS).map(([k, v]) => (
                <option key={k} value={k} style={{ color: 'var(--ink)' }}>{v[lang] || v.sq}</option>
              ))}
            </select>
          </div>
          <div style={{ marginLeft: 'auto' }} className="mono">
            <span style={{ fontSize: 11, color: 'rgba(242,239,232,0.5)' }}>{filtered.length} / {objs.length}</span>
          </div>
        </div>

        {/* Objectives list */}
        <div>
          {filtered.map(o => {
            const cl = CLUSTER_LABELS[o.cluster] || CLUSTER_LABELS.other;
            const isOpen = open === o.id;
            const name = tr(o, 'name', lang);
            const desc = tr(o, 'desc', lang);
            const cond = tr(o, 'cond', lang);
            return (
              <div key={o.id} style={{ borderTop: '1px solid rgba(242,239,232,0.15)' }}>
                <button onClick={() => setOpen(isOpen ? null : o.id)}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', color: 'var(--paper)',
                    padding: '22px 0', display: 'grid',
                    gridTemplateColumns: '40px 1fr 180px 100px 30px',
                    gap: 20, alignItems: 'center', textAlign: 'left',
                  }} className="obj-row">
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%',
                    border: `1.5px solid ${o.completed ? 'var(--sage)' : 'rgba(242,239,232,0.4)'}`,
                    background: o.completed ? 'var(--sage)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: o.completed ? 'var(--ink)' : 'rgba(242,239,232,0.4)',
                    fontSize: 12, fontWeight: 700,
                  }}>{o.completed ? '✓' : ''}</span>
                  <span className="serif" style={{ fontSize: 24, lineHeight: 1.15, color: 'var(--paper)' }}>{name}</span>
                  <span style={{
                    display: 'inline-flex', padding: '4px 10px',
                    background: 'rgba(242,239,232,0.08)',
                    color: cl.color, fontSize: 11, letterSpacing: '0.05em',
                    border: `1px solid ${cl.color}`,
                    justifySelf: 'start',
                  }} className="mono">{cl[lang] || cl.sq}</span>
                  <div>
                    <div style={{ height: 4, background: 'rgba(242,239,232,0.15)', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, width: (o.completed ? 100 : o.progress) + '%', background: o.completed ? 'var(--sage)' : 'var(--gold)' }} />
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'rgba(242,239,232,0.5)', marginTop: 4 }}>{o.completed ? 100 : o.progress}%</div>
                  </div>
                  <span style={{ fontSize: 20, color: 'rgba(242,239,232,0.5)', textAlign: 'center', transform: isOpen ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 200ms' }}>+</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 0 28px 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }} className="obj-detail">
                    <div>
                      <div className="mono" style={{ fontSize: 10, color: 'rgba(242,239,232,0.5)', letterSpacing: '0.1em', marginBottom: 8 }}>{t.common.description.toUpperCase()}</div>
                      <p style={{ fontSize: 15, color: 'rgba(242,239,232,0.85)', lineHeight: 1.55, margin: 0 }}>{desc}</p>
                    </div>
                    <div>
                      <div className="mono" style={{ fontSize: 10, color: 'rgba(242,239,232,0.5)', letterSpacing: '0.1em', marginBottom: 8 }}>{t.common.conditions.toUpperCase()}</div>
                      <p style={{ fontSize: 15, color: 'rgba(242,239,232,0.85)', lineHeight: 1.55, margin: 0 }}>{cond}</p>
                      {o.completed_at && (
                        <div className="mono" style={{ fontSize: 11, color: 'var(--sage)', marginTop: 12 }}>✓ {t.common.completed_at} · {o.completed_at}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ borderTop: '1px solid rgba(242,239,232,0.15)' }} />
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .obj-stats { grid-template-columns: 1fr !important; }
          .obj-stats > div { border-left: 0 !important; padding-left: 0 !important; padding-top: 24px; border-top: 1px solid rgba(242,239,232,0.15); }
          .obj-stats > div:first-child { border-top: 0; padding-top: 0; }
          .obj-row { grid-template-columns: 28px 1fr 24px !important; gap: 12px !important; }
          .obj-row > :nth-child(3), .obj-row > :nth-child(4) { display: none; }
          .obj-detail { grid-template-columns: 1fr !important; padding-left: 40px !important; }
        }
      `}</style>
    </section>
  );
};

// ============================================================
// Infographics — gallery with SVG placeholders
// ============================================================
function Infographics({ lang, t }) {
  const items = INFOGRAPHICS;
  return (
    <section style={{ padding: '120px 0 100px', borderTop: '1px solid var(--line)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 24, marginBottom: 48 }}>
          <SectionHead eyebrow={lang === 'sq' ? 'Infografika' : lang === 'en' ? 'Infographics' : 'Infografike'}
            title={lang === 'sq' ? 'Të shpjeguara në një faqe.' : lang === 'en' ? 'Explained on a single page.' : 'Objašnjeno na jednoj stranici.'} num="06" />
          <a href="#" className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', borderBottom: '1px solid var(--ink-2)', paddingBottom: 4 }}>
            {lang === 'sq' ? 'shih të gjitha →' : lang === 'en' ? 'see all →' : 'pogledaj sve →'}
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }} className="info-grid">
          {items.map((it, i) => <InfoCard key={i} it={it} idx={i} />)}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) { .info-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 520px) { .info-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
};

function InfoCard({ it, idx }) {
  return (
    <div style={{ background: 'var(--paper)', padding: 20, minHeight: 280, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 160, background: 'var(--paper-2)', border: '1px solid var(--line)', position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
        <InfoSketch shape={it.shape} />
        <span className="mono" style={{ position: 'absolute', top: 8, left: 10, fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>FIG. {String(idx + 1).padStart(2, '0')}</span>
      </div>
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{it.tag}</span>
      <h4 className="serif" style={{ fontSize: 22, lineHeight: 1.15, color: 'var(--ink)' }}>{it.title_sq}</h4>
    </div>
  );
}

function InfoSketch({ shape }) {
  // Tiny SVG illustrations — abstract, schematic, not slop
  const wrap = { width: '100%', height: '100%', display: 'block' };
  if (shape === 'flow') return (
    <svg viewBox="0 0 200 120" style={wrap}>
      {[20, 70, 120, 170].map((x, i) => (
        <g key={i}>
          <rect x={x - 14} y={50} width="28" height="20" fill="none" stroke="var(--ink-2)" strokeWidth="1" />
          <text x={x} y={64} className="mono" style={{ fontSize: 8, fill: 'var(--ink-2)', textAnchor: 'middle' }}>{i + 1}</text>
          {i < 3 && <line x1={x + 16} y1={60} x2={x + 33} y2={60} stroke="var(--ink-2)" markerEnd="url(#a)" />}
        </g>
      ))}
      <defs><marker id="a" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="var(--ink-2)" /></marker></defs>
    </svg>
  );
  if (shape === 'cluster') return (
    <svg viewBox="0 0 200 120" style={wrap}>
      {[0,1,2,3,4,5].map(i => {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={100 + 30 * Math.cos(a)} cy={60 + 30 * Math.sin(a)} r="14" fill="none" stroke="var(--ink-2)" />;
      })}
      <circle cx="100" cy="60" r="6" fill="var(--ink)" />
    </svg>
  );
  if (shape === 'steps') return (
    <svg viewBox="0 0 200 120" style={wrap}>
      {[0,1,2,3].map(i => (
        <g key={i}>
          <rect x={20 + i * 40} y={90 - i * 18} width="34" height={20 + i * 18} fill="var(--paper-3)" stroke="var(--ink-2)" />
          <text x={37 + i * 40} y={110} className="mono" style={{ fontSize: 9, fill: 'var(--ink)', textAnchor: 'middle' }}>{i + 1}</text>
        </g>
      ))}
    </svg>
  );
  if (shape === 'rights') return (
    <svg viewBox="0 0 200 120" style={wrap}>
      <rect x="40" y="20" width="120" height="80" fill="none" stroke="var(--ink-2)" />
      {[0,1,2,3,4].map(i => (
        <line key={i} x1="50" y1={32 + i * 14} x2={50 + (i % 2 ? 80 : 60)} y2={32 + i * 14} stroke="var(--ink-2)" strokeWidth="1.5" />
      ))}
    </svg>
  );
  if (shape === 'grid') return (
    <svg viewBox="0 0 200 120" style={wrap}>
      {[0,1,2,3].map(r => [0,1,2,3,4,5].map(c => (
        <rect key={r+'-'+c} x={20 + c * 28} y={20 + r * 22} width="22" height="16"
          fill={((r + c) % 3 === 0) ? 'var(--ink)' : 'transparent'}
          stroke="var(--ink-2)" />
      )))}
    </svg>
  );
  if (shape === 'timeline') return (
    <svg viewBox="0 0 200 120" style={wrap}>
      <line x1="20" y1="60" x2="180" y2="60" stroke="var(--ink-2)" />
      {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
        <g key={i}>
          <line x1={20 + i * 16} y1={56} x2={20 + i * 16} y2={64} stroke="var(--ink-2)" />
          {i % 2 === 0 && <circle cx={20 + i * 16} cy={40 + (i % 3) * 5} r="3" fill="var(--rust)" />}
        </g>
      ))}
    </svg>
  );
  return null;
}

// ============================================================
// FAQ — accordion
// ============================================================
function FAQ({ lang, t }) {
  const [open, setOpen] = useState(0);
  const [cat, setCat] = useState('all');
  const list = FAQ_DATA.filter(f => cat === 'all' || f.cat === cat);

  return (
    <section style={{ padding: '120px 0 100px', borderTop: '1px solid var(--line)' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64 }}>
        <div className="faq-side">
          <SectionHead eyebrow={t.faq.eyebrow} title={t.faq.title} num="07" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 24 }}>
            {['all', 'reforma', 'sundimi', 'korrupsioni', 'be'].map((k, idx) => (
              <button key={k} onClick={() => setCat(k)}
                style={{
                  background: cat === k ? 'var(--ink)' : 'transparent',
                  color: cat === k ? 'var(--paper)' : 'var(--ink-2)',
                  border: 'none', padding: '8px 12px', textAlign: 'left',
                  fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                }}>
                <span className="mono" style={{ fontSize: 10, marginRight: 8, opacity: 0.6 }}>{'0' + idx}</span>
                {k === 'all' ? (lang === 'sq' ? 'Të gjitha' : lang === 'en' ? 'All' : 'Sve') : t.nav[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="faq-list">
          {list.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ borderTop: '1px solid var(--line)' }}>
                <button onClick={() => setOpen(isOpen ? -1 : i)}
                  style={{ width: '100%', background: 'transparent', border: 'none', padding: '22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, textAlign: 'left' }}>
                  <span className="serif" style={{ fontSize: 24, lineHeight: 1.2, color: 'var(--ink)' }}>{f.q_sq}</span>
                  <span style={{ fontSize: 24, color: 'var(--ink-2)', transform: isOpen ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 200ms', flexShrink: 0, lineHeight: 1 }}>+</span>
                </button>
                {isOpen && (
                  <div style={{ paddingBottom: 28, paddingRight: 60 }}>
                    <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{f.a_sq}</p>
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ borderTop: '1px solid var(--line)' }} />
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .container > .faq-side ~ .faq-list, .container:has(.faq-side) { display: block; }
        }
        @media (max-width: 900px) {
          section .container[style*="grid-template-columns"]:has(.faq-side) { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </section>
  );
};



// ---- app.jsx ----
// Main app: Navbar, Hero, Footer, ChatWidget, App.
// Mounts the React tree.

// ============================================================
// Router — hash-based
// ============================================================
function useRoute() {
  const parse = () => {
    if (typeof window === 'undefined') return 'home';
    const path = location.pathname.replace(/^\/+/, '').split('/')[0];
    if (path) return path;
    const h = location.hash.replace(/^#\/?/, '');
    return h || 'home';
  };
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onHash = () => {
      setRoute(parse());
      scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  return [route, (r) => {
    if (typeof window !== 'undefined') location.hash = '#/' + (r === 'home' ? '' : r);
  }];
}

// ============================================================
// Navbar — sticky, with language switcher
// ============================================================
function Navbar({ lang, setLang, t, route, onChat }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 40);
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { key: 'reforma', href: '#/reforma' },
    { key: 'sundimi', href: '#/sundimi' },
    { key: 'korrupsioni', href: '#/korrupsioni' },
    { key: 'be', href: '#/be' },
    { key: 'objektivat', href: '#/objektivat' },
    { key: 'faq', href: '#/faq' },
  ];

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: scrolled ? 'rgba(242,239,232,0.92)' : 'var(--paper)',
      backdropFilter: scrolled ? 'blur(8px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
      transition: 'all 240ms ease',
    }}>
      <div className="container nav-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 32px' }}>
        <a href="#/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo />
          <div className="brand-copy" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span className="serif" style={{ fontSize: 22, color: 'var(--ink)' }}>euguide<span style={{ color: 'var(--ink-3)' }}>-ks</span></span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', marginTop: 2 }}>UDHËZUES QYTETAR · v2.1</span>
          </div>
        </a>

        <nav className="nav-links" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {links.map(l => {
            const active = route === l.key;
            return (
              <a key={l.key} href={l.href} style={{
                fontSize: 14, color: active ? 'var(--ink)' : 'var(--ink-2)',
                paddingBottom: 4,
                borderBottom: active ? '2px solid var(--ink)' : '2px solid transparent',
              }}>
                {t.nav[l.key]}
              </a>
            );
          })}
        </nav>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="#/kosova" className="kosova-link" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            border: route === 'kosova' ? '1px solid var(--ink)' : '1px solid var(--line)',
            background: route === 'kosova' ? 'var(--ink)' : 'transparent',
            color: route === 'kosova' ? 'var(--paper)' : 'var(--ink-2)',
            padding: '7px 11px',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: route === 'kosova' ? 'var(--gold)' : 'var(--rust)' }} />
            {t.nav.kosova}
          </a>
          <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 0 }} className="lang-switch">
            {['sq', 'en', 'sr'].map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{
                  background: lang === l ? 'var(--ink)' : 'transparent',
                  color: lang === l ? 'var(--paper)' : 'var(--ink-2)',
                  border: 'none', padding: '6px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>{l}</button>
            ))}
          </div>
          <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} style={{ display: 'none', background: 'transparent', border: '1px solid var(--line)', padding: '8px 10px' }}>
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none"><path d="M0 1 H16 M0 7 H16 M0 13 H16" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '12px 20px 18px', background: 'var(--paper)' }} className="mobile-menu">
          <button
            className="mobile-chat-link"
            onClick={() => {
              setMobileOpen(false);
              onChat?.();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              padding: '14px 0',
              border: 'none',
              borderBottom: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--ink)',
              textAlign: 'left',
            }}
          >
            <span>
              <span className="mono" style={{ display: 'block', fontSize: 10, color: 'var(--rust)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Assistant
              </span>
              <span className="serif" style={{ display: 'block', fontSize: 24, lineHeight: 1.05, marginTop: 4 }}>
                {t.chat.title}
              </span>
            </span>
            <span style={{ display: 'inline-flex', width: 34, height: 34, alignItems: 'center', justifyContent: 'center', border: '1px solid var(--ink)', borderRadius: '50%', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 5 H21 V17 H13 L8 21 V17 H3 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <circle cx="9" cy="11" r="1" fill="currentColor" />
                <circle cx="12" cy="11" r="1" fill="currentColor" />
                <circle cx="15" cy="11" r="1" fill="currentColor" />
              </svg>
            </span>
          </button>
          <a href="#/kosova" onClick={() => setMobileOpen(false)} style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid var(--line)', fontSize: 16, color: route === 'kosova' ? 'var(--ink)' : 'var(--ink-2)', fontWeight: route === 'kosova' ? 500 : 400 }}>{t.nav.kosova}</a>
          {links.map(l => {
            const active = route === l.key;
            return (
              <a key={l.key} href={l.href} onClick={() => setMobileOpen(false)} style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid var(--line)', fontSize: 16, color: active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: active ? 500 : 400 }}>{t.nav[l.key]}</a>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 980px) {
          .nav-links { display: none !important; }
          .mobile-toggle { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}

function Logo() {
  return (
    <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
      <rect x="0.5" y="0.5" width="39" height="39" fill="var(--ink)" />
      {/* 12 stars of EU in a circle */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const r = 13;
        const cx = 20 + r * Math.cos(a);
        const cy = 20 + r * Math.sin(a);
        return <circle key={i} cx={cx} cy={cy} r="1.4" fill="var(--gold)" />;
      })}
      <text x="20" y="24" className="serif" style={{ fontSize: 13, fill: 'var(--paper)', textAnchor: 'middle' }}>k</text>
    </svg>
  );
}

// ============================================================
// Hero
// ============================================================
function Hero({ lang, t, onChat }) {
  const initialNow = new Date('2026-05-13T00:00:00Z').getTime();
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Days since application
  const applyDate = new Date('2022-12-14').getTime();
  const days = Math.floor((now - applyDate) / (1000 * 60 * 60 * 24));

  return (
    <section style={{ padding: '32px 0 80px', position: 'relative', overflow: 'hidden' }}>
      <div className="container">
        {/* tag */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 56, flexWrap: 'wrap', gap: 16 }} className="hero-tag-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--rust)', animation: 'pulse 2s ease infinite' }} />
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t.hero.tag}</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
            Prishtinë · Bruxelles · 41°N 21°E
          </div>
        </div>

        {/* Title — big editorial */}
        <h1 className="serif" style={{
          fontSize: 'clamp(38px, 6.6vw, 96px)',
          lineHeight: 0.96,
          color: 'var(--ink)',
          letterSpacing: '-0.018em',
          marginBottom: 30,
        }}>
          {t.hero.title_a}
          <span style={{ fontStyle: 'italic', color: 'var(--blue)' }}>{t.hero.title_b}</span>
          {t.hero.title_c}
        </h1>

        {/* Hero grid: blurb + meta panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 64, marginTop: 56 }} className="hero-grid">
          <div>
            <p style={{ fontSize: 20, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 560, marginTop: 0 }}>
              {t.hero.sub}
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 32, flexWrap: 'wrap' }}>
              <a href="#/reforma" style={{
                background: 'var(--ink)', color: 'var(--paper)',
                padding: '14px 22px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 10,
              }}>
                {t.hero.cta1}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7 H13 M8 2 L13 7 L8 12" stroke="currentColor" strokeWidth="1.3" fill="none" /></svg>
              </a>
              <button onClick={onChat} style={{
                background: 'transparent', color: 'var(--ink)',
                padding: '14px 22px', fontSize: 14, border: '1px solid var(--ink)',
                display: 'inline-flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sage)' }} />
                {t.hero.cta2}
              </button>
            </div>
          </div>

          {/* meta panel — the journey ticker */}
          <div style={{
            background: 'var(--paper-2)', border: '1px solid var(--line)',
            padding: 28,
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: -10, left: 20, background: 'var(--paper-2)', padding: '0 10px', borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)' }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.18em' }}>STATUS · LIVE</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px dashed var(--line)', paddingBottom: 12, marginBottom: 16 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{t.hero.meta_a.toUpperCase()}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink)' }}>{t.hero.meta_b}</span>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em', marginBottom: 6 }}>DITË QË NGA APLIKIMI</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="serif" style={{ fontSize: 72, lineHeight: 0.9, color: 'var(--ink)' }}>{days.toLocaleString('sq-AL')}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{(now / 1000) % 2 < 1 ? '▍' : ' '}</span>
              </div>
            </div>

            {/* mini timeline */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', position: 'relative', height: 50 }}>
                {[
                  { y: '2016', label: 'SAA', filled: true },
                  { y: '2022', label: 'aplikoi', filled: true },
                  { y: '2024', label: 'viza', filled: true },
                  { y: '2026', label: 'sot', filled: true, current: true },
                  { y: '2027', label: 'kandidat?', filled: false },
                  { y: '20?', label: 'anëtarësia', filled: false },
                ].map((step, i, arr) => (
                  <div key={i} style={{ flex: 1, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 6, left: 0, right: i === arr.length - 1 ? '50%' : 0, height: 2, background: step.filled && arr[i + 1] && arr[i + 1].filled ? 'var(--ink)' : (step.filled ? 'linear-gradient(to right, var(--ink), var(--paper-3))' : 'var(--paper-3)') }} />
                    <div style={{ position: 'relative', width: 14, height: 14, borderRadius: '50%', background: step.filled ? (step.current ? 'var(--rust)' : 'var(--ink)') : 'var(--paper)', border: '2px solid var(--ink)', margin: '0 auto', zIndex: 2 }} />
                    <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', textAlign: 'center', marginTop: 6, letterSpacing: '0.05em' }}>{step.y}</div>
                    <div className="mono" style={{ fontSize: 9, color: step.current ? 'var(--rust)' : 'var(--ink-2)', textAlign: 'center', marginTop: 2 }}>{step.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px dashed var(--line)', paddingTop: 14, marginTop: 24 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{t.hero.meta_c.toUpperCase()}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--rust)' }}>● {t.hero.meta_d}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </section>
  );
}

// ============================================================
// CTA Band — between sections, large
// ============================================================
function CTABand({ lang, onChat }) {
  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container cta-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 64, alignItems: 'center' }}>
        <div>
          <h2 className="serif" style={{ fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.02, color: 'var(--ink)', maxWidth: 700 }}>
            <span style={{ fontStyle: 'italic', color: 'var(--blue)' }}>Pyet</span>, dhe asistenti përgjigjet në shqip, anglisht ose serbisht — me referencë te dokumenti origjinal.
          </h2>
          <p style={{ fontSize: 17, color: 'var(--ink-2)', marginTop: 24, maxWidth: 560 }}>
            I trajnuar mbi raportet e Komisionit Evropian, ligjet vendore dhe analizat e shoqërisë civile. I përdorshëm me tekst ose me zë.
          </p>
        </div>
        <div>
          <button onClick={onChat} style={{
            background: 'var(--ink)', color: 'var(--paper)',
            border: 'none', width: '100%', padding: '28px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
            textAlign: 'left',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em' }}>ASISTENT · SQ/EN/SR</span>
              <span style={{ display: 'inline-flex', width: 28, height: 28, alignItems: 'center', justifyContent: 'center', border: '1px solid var(--paper)', borderRadius: '50%' }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 10 L10 2 M10 2 H4 M10 2 V8" stroke="currentColor" strokeWidth="1.2" /></svg>
              </span>
            </div>
            <span className="serif" style={{ fontSize: 32, lineHeight: 1, marginTop: 24 }}>Shkruaj pyetjen</span>
            <span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>↩ enter për të dërguar</span>
          </button>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) { .cta-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }
      `}</style>
    </section>
  );
}

// ============================================================
// Footer
// ============================================================
function Footer({ lang, t }) {
  return (
    <footer style={{ padding: '80px 0 40px', borderTop: '1px solid var(--line)', background: 'var(--ink)', color: 'var(--paper)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 48 }} className="foot-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <Logo />
              <span className="serif" style={{ fontSize: 26 }}>euguide<span style={{ color: 'rgba(242,239,232,0.4)' }}>-ks</span></span>
            </div>
            <p style={{ fontSize: 15, color: 'rgba(242,239,232,0.7)', maxWidth: 360, lineHeight: 1.5 }}>{t.footer.tagline}</p>
            <div className="mono" style={{ fontSize: 11, color: 'rgba(242,239,232,0.4)', marginTop: 24, letterSpacing: '0.1em' }}>
              © 2026 · MIT-licensed open data · Hackathon Edition
            </div>
          </div>
          <FootCol title={t.footer.cols.temat} items={[t.nav.reforma, t.nav.sundimi, t.nav.korrupsioni, t.nav.be]} />
          <FootCol title={t.footer.cols.burimet} items={['Raportet EC', 'SAA', 'TI-CPI', 'OSBE / OSCE', 'Avokati i Popullit']} />
          <FootCol title={t.footer.cols.platforma} items={['Infografika', t.nav.faq, 'Objektivat', 'API e hapur', 'GitHub']} />
        </div>
        <div style={{ marginTop: 64, paddingTop: 28, borderTop: '1px solid rgba(242,239,232,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }} className="mono">
          <span style={{ fontSize: 11, color: 'rgba(242,239,232,0.5)', letterSpacing: '0.1em' }}>euguide-ks.info · built for Kosovo · Hackathon May 2026</span>
          <span style={{ fontSize: 11, color: 'rgba(242,239,232,0.5)', letterSpacing: '0.1em' }}>★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★</span>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) { .foot-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 520px) { .foot-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}

function FootCol({ title, items }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, color: 'rgba(242,239,232,0.5)', letterSpacing: '0.18em', marginBottom: 18, textTransform: 'uppercase' }}>{title}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(it => <li key={it}><a href="#" style={{ fontSize: 14, color: 'var(--paper)', opacity: 0.85 }}>{it}</a></li>)}
      </ul>
    </div>
  );
}

// ============================================================
// Chat Widget
// ============================================================
function ChatWidget({ lang, t, open, setOpen }) {
  const [msgs, setMsgs] = useState([{ role: 'assistant', text: t.chat.greeting }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [user, setUser] = useState(null);
  const scrollRef = useRef(null);

  // Check auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUser(data.user); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // re-greet when language changes
  useEffect(() => {
    setMsgs([{ role: 'assistant', text: t.chat.greeting }]);
  }, [lang]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, typing, open]);

  const appendAssistantDelta = (delta) => {
    setMsgs(m => {
      const next = [...m];
      const last = next[next.length - 1];
      if (last?.role === 'assistant') {
        next[next.length - 1] = { ...last, text: `${last.text || ''}${delta}` };
      } else {
        next.push({ role: 'assistant', text: delta });
      }
      return next;
    });
  };

  const replaceEmptyAssistant = (text) => {
    setMsgs(m => {
      const next = [...m];
      const last = next[next.length - 1];
      if (last?.role === 'assistant' && !last.text) {
        next[next.length - 1] = { ...last, text };
        return next;
      }
      return [...next, { role: 'assistant', text }];
    });
  };

  const fallbackText = () => {
    if (lang === 'en') return 'I could not connect to the assistant right now. Please check the OpenAI API key and try again.';
    if (lang === 'sr') return 'Trenutno ne mogu da se povezem sa asistentom. Proverite OpenAI API kljuc i pokusajte ponovo.';
    return 'Nuk munda të lidhem me asistentin tani. Kontrollo OpenAI API key dhe provo përsëri.';
  };

  const send = async (text) => {
    const message = (text || input).trim();
    if (!message) return;
    setMsgs(m => [...m, { role: 'user', text: message }, { role: 'assistant', text: '' }]);
    setInput('');
    setTyping(true);

    try {
      const res = await chatStream(message, getSession(), lang);
      if (!res.ok || !res.body) throw new Error('Chat stream failed');

      setTyping(false);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let received = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const line = event.split('\n').find(part => part.startsWith('data:'));
          if (!line) continue;
          const payload = line.replace(/^data:\s*/, '');
          if (payload === '[DONE]') continue;

          try {
            const data = JSON.parse(payload);
            if (data.delta) {
              received = true;
              appendAssistantDelta(data.delta);
            }
            if (data.done) {
              break;
            }
          } catch {
            // Ignore malformed chunks so one bad packet does not break the chat.
          }
        }
      }

      if (!received) replaceEmptyAssistant(fallbackText());
    } catch {
      setTyping(false);
      replaceEmptyAssistant(fallbackText());
    }
  };

  return (
    <>
      {/* Floating button */}
      <button className="chat-fab" onClick={() => setOpen(!open)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 60,
        width: 60, height: 60, borderRadius: '50%',
        background: 'var(--ink)', color: 'var(--paper)',
        border: '2px solid var(--gold)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(14,27,44,0.2)',
        transition: 'transform 200ms',
        transform: open ? 'scale(0)' : 'scale(1)',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 5 H21 V17 H13 L8 21 V17 H3 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="9" cy="11" r="1" fill="currentColor" />
          <circle cx="12" cy="11" r="1" fill="currentColor" />
          <circle cx="15" cy="11" r="1" fill="currentColor" />
        </svg>
      </button>

      {/* Drawer */}
      <div className="chat-drawer" style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 60,
        width: 'min(420px, calc(100vw - 32px))',
        height: 'min(640px, calc(100vh - 64px))',
        background: 'var(--paper)',
        border: '1px solid var(--ink)',
        boxShadow: '0 16px 40px rgba(14,27,44,0.25)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'all 240ms cubic-bezier(.2,.7,.2,1)',
        transformOrigin: 'bottom right',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink)', color: 'var(--paper)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sage)' }} />
              <span className="serif" style={{ fontSize: 22 }}>{t.chat.title}</span>
              <span className="mono" style={{ fontSize: 10, color: 'rgba(242,239,232,0.5)', marginLeft: 6 }}>· {lang.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(242,239,232,0.6)', marginTop: 2 }}>{t.chat.sub}</div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: '1px solid rgba(242,239,232,0.3)', color: 'var(--paper)', width: 28, height: 28, fontSize: 14, lineHeight: 1 }}>×</button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '82%',
                background: m.role === 'user' ? 'var(--ink)' : 'var(--paper-2)',
                color: m.role === 'user' ? 'var(--paper)' : 'var(--ink)',
                padding: '12px 14px',
                fontSize: 14, lineHeight: 1.5,
                border: m.role === 'user' ? 'none' : '1px solid var(--line)',
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: 'var(--paper-2)', padding: '12px 14px', border: '1px solid var(--line)', display: 'flex', gap: 4 }}>
                <Dot d={0} /><Dot d={150} /><Dot d={300} />
              </div>
            </div>
          )}
        </div>

        {/* Sample chips */}
        {msgs.length <= 1 && (
          <div style={{ padding: '0 20px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {t.chat.sample.map(s => (
              <button key={s} onClick={() => send(s)} style={{ background: 'transparent', border: '1px solid var(--line)', padding: '6px 10px', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="chat-input-row" style={{ padding: 14, borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={t.chat.placeholder}
            style={{ flex: 1, border: '1px solid var(--line)', padding: '10px 12px', background: 'var(--paper)', fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)', outline: 'none' }} />
          <button onClick={() => send()} style={{ background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '0 16px', fontSize: 13 }}>{t.chat.send}</button>
          <button title="Voice" style={{ background: 'transparent', border: '1px solid var(--line)', padding: '0 12px' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="6" y="2" width="4" height="9" rx="2" stroke="currentColor" strokeWidth="1.3" /><path d="M3 7 V8 a5 5 0 0 0 10 0 V7 M8 13 V15" stroke="currentColor" strokeWidth="1.3" fill="none" /></svg>
          </button>
        </div>

        {/* Auth hint */}
<<<<<<< HEAD
        <div style={{ padding: '8px 14px 12px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-2)' }}>
          {user ? (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {user.user_metadata?.avatar_url && (
                  <img src={user.user_metadata.avatar_url} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                )}
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)' }}>{user.user_metadata?.full_name || user.email}</span>
              </span>
              <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid var(--line)', padding: '4px 10px', fontSize: 10, color: 'var(--ink-3)', cursor: 'pointer' }}>
                Dil
              </button>
            </>
          ) : (
            <>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{t.chat.auth}</span>
              <button onClick={handleGoogleLogin} style={{ background: 'transparent', border: '1px solid var(--ink-2)', padding: '4px 10px', fontSize: 11, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </>
          )}
=======
        <div className="chat-auth-row" style={{ padding: '8px 14px 12px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-2)' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{t.chat.auth}</span>
          <button style={{ background: 'transparent', border: '1px solid var(--ink-2)', padding: '4px 10px', fontSize: 11, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: 'conic-gradient(from 0deg, #EA4335, #FBBC05, #34A853, #4285F4)', borderRadius: '50%' }} />
            Google
          </button>
>>>>>>> fdc434aba37ecce8621fa01871758a5253feb5e7
        </div>
      </div>
    </>
  );
}

function Dot({ d }) {
  return <span style={{
    width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-3)',
    animation: 'bounce 1s infinite', animationDelay: d + 'ms',
  }} />;
}

function canned(q, lang) {
  const lq = q.toLowerCase();
  if (lq.includes('saa') || lq.includes('ssp') || lq.includes('stabili')) {
    return 'SAA (Marrëveshja e Stabilizim-Asociimit) është korniza e parë kontraktuale mes Kosovës dhe BE-së, në fuqi që nga 1 prilli 2016. Ajo përcakton një treg të lirë gradual dhe përafrim të legjislacionit me acquis-në.';
  }
  if (lq.includes('vizë') || lq.includes('vize') || lq.includes('visa') || lq.includes('viza')) {
    return 'Liberalizimi i vizave për qytetarët e Kosovës hyri në fuqi më 1 janar 2024. Mund të udhëtoni në zonën Shengen pa vizë për 90 ditë në çdo periudhë 180-ditore me një pasaportë biometrike të vlefshme.';
  }
  if (lq.includes('korrups') || lq.includes('rapor')) {
    return 'Korrupsioni mund të raportohet në tre kanale kryesore: 1) Agjencia kundër Korrupsionit (online + linjë), 2) Prokuroria Speciale për krim të organizuar, 3) Avokati i Popullit për keqpërdorim të pushtetit. Identifikimi nuk është i detyrueshëm.';
  }
  if (lq.includes('kandidat') || lq.includes('anëtarës') || lq.includes('member')) {
    return 'Për t\'u bërë anëtare e BE-së, Kosova duhet të kalojë: opinion i Komisionit → status kandidati (vendos Këshilli) → hapje e negociatave → mbyllje e 6 klasterëve → marrëveshje e anëtarësimit → ratifikim nga 27 shtetet. Kërkohet konsensus.';
  }
  if (lang === 'en') return 'Good question. I would normally consult the EC reports and the SAA database for the most accurate answer. Try a more specific question on reforms, rule of law, corruption or the EU process.';
  if (lang === 'sr') return 'Dobro pitanje. Obično konsultujem izveštaje EK i SSP bazu. Pokušajte sa konkretnijim pitanjem o reformama, vladavini prava, korupciji ili EU procesu.';
  return 'Pyetje e mirë. Zakonisht konsultoj raportet e Komisionit Evropian dhe bazën e të dhënave të SAA. Provo një pyetje më specifike rreth reformave, sundimit të ligjit, korrupsionit ose procesit të BE-së.';
}

// ============================================================
// Topic deep-dive — a section per topic with linked content
// ============================================================
function TopicSection({ topic, lang, idx }) {
  const title = topic['title_' + lang] || topic.title_sq;
  const blurb = topic['blurb_' + lang] || topic.blurb_sq;

  const topicContent = TOPIC_CONTENT[topic.key] || {};
  const content = topicContent[lang] || topicContent.sq || [];

  return (
    <section id={topic.key} style={{ padding: '120px 0', borderTop: '1px solid var(--line)', background: idx % 2 === 0 ? 'var(--paper)' : 'var(--paper-2)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80 }} className="topic-deep">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <span className="serif ital" style={{ fontSize: 64, color: topic.accent, lineHeight: 1 }}>{topic.num}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>shtylla {topic.num}</span>
            </div>
            <h2 className="serif" style={{ fontSize: 'clamp(40px, 5.5vw, 72px)', lineHeight: 0.98, color: 'var(--ink)', whiteSpace: 'pre-line', marginBottom: 24 }}>{title}</h2>
            <p style={{ fontSize: 18, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 420 }}>{blurb}</p>
            <div style={{ marginTop: 32, borderTop: '1px solid var(--line)', paddingTop: 20 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em', marginBottom: 10 }}>METRIKË KYÇE</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span className="serif" style={{ fontSize: 64, color: topic.accent, lineHeight: 0.9 }}>{topic.metric}</span>
                <span style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 180 }}>{topic['metric_label_' + lang] || topic.metric_label_sq}</span>
              </div>
            </div>
          </div>
          <div>
            {content && content.map((sec, i) => (
              <div key={i} style={{ paddingBottom: 28, marginBottom: 28, borderBottom: i === content.length - 1 ? 'none' : '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                  <span className="mono" style={{ fontSize: 10, color: topic.accent, letterSpacing: '0.1em' }}>0{i + 1}</span>
                  <h3 className="serif" style={{ fontSize: 26, color: 'var(--ink)' }}>{sec.h}</h3>
                </div>
                <p style={{ fontSize: 15.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0, paddingLeft: 24 }}>{sec.p}</p>
                {sec.list && (
                  <ul style={{ paddingLeft: 40, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sec.list.map((li, j) => (
                      <li key={j} style={{ fontSize: 14, color: 'var(--ink-2)', listStyle: 'none', position: 'relative' }}>
                        <span className="mono" style={{ position: 'absolute', left: -18, color: topic.accent, fontSize: 11 }}>→</span>
                        {li}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) { .topic-deep { grid-template-columns: 1fr !important; gap: 40px !important; } }
      `}</style>
    </section>
  );
}

const TOPIC_DEEP_CONTENT = {
  reforma: {
    sq: [
      { h: 'Administrata si shërbim, jo si pengesë', p: 'Qëllimi i reformës është që qytetari të mos ketë nevojë të njohë zyrën, sportelin apo formularin e saktë. Sistemi duhet ta drejtojë vetë kërkesën, ta masë afatin dhe ta njoftojë qytetarin kur ka vonesë.' },
      { h: 'Çfarë matet realisht', p: 'Matet koha mesatare e shërbimit, numri i dokumenteve që kërkohen nga qytetari, shkalla e ankesave dhe sa shërbime kryhen plotësisht online pa vizitë fizike.' },
      { h: 'Pse lidhet me BE-në', p: 'BE-ja kërkon administratë profesionale, të qëndrueshme dhe të depolitizuar, sepse pa të nuk zbatohen dot ligjet, fondet publike dhe standardet e tregut të brendshëm.' },
    ],
    en: [
      { h: 'Administration as a service, not an obstacle', p: 'The reform should make public services understandable without knowing the right office, counter or form. The system should route requests, measure deadlines and notify citizens when delays occur.' },
      { h: 'What is actually measured', p: 'Average service time, number of documents requested from citizens, complaint rates and how many services can be completed online without a physical visit.' },
      { h: 'Why it matters for the EU', p: 'The EU requires a professional, stable and depoliticised administration because laws, public funds and single-market standards cannot function without it.' },
    ],
    sr: [
      { h: 'Administracija kao usluga, ne prepreka', p: 'Reforma treba da omogući javne usluge bez poznavanja tačne kancelarije, šaltera ili formulara. Sistem treba sam da usmeri zahtev, meri rokove i obavesti građanina o kašnjenju.' },
      { h: 'Šta se zaista meri', p: 'Prosečno vreme usluge, broj dokumenata koje građanin mora da dostavi, stopa žalbi i broj usluga koje se završavaju potpuno online.' },
      { h: 'Zašto je važno za EU', p: 'EU traži profesionalnu, stabilnu i depolitizovanu administraciju, jer se bez nje zakoni, javna sredstva i standardi unutrašnjeg tržišta ne mogu sprovoditi.' },
    ],
  },
  sundimi: {
    sq: [
      { h: 'Barazia para ligjit në praktikë', p: 'Sundimi i ligjit nuk është vetëm gjykatë. Është edhe e drejta për informim, procedurë të drejtë, vendim të arsyetuar dhe mundësi reale ankese kur institucioni gabon.' },
      { h: 'Pavarësia dhe llogaridhënia', p: 'Gjyqtarët dhe prokurorët duhet të jenë të mbrojtur nga presioni politik, por njëkohësisht të përgjegjshëm për vonesa, konflikt interesi dhe vendime të paarsyetuara.' },
      { h: 'Pika që shikon BE-ja', p: 'Raportet e Komisionit vlerësojnë efikasitetin e gjykatave, luftimin e krimit të organizuar, mbrojtjen e të drejtave themelore dhe zbatimin e vendimeve.' },
    ],
    en: [
      { h: 'Equality before the law in practice', p: 'Rule of law is not only about courts. It is also the right to information, fair procedure, reasoned decisions and a real appeal path when an institution makes a mistake.' },
      { h: 'Independence and accountability', p: 'Judges and prosecutors must be protected from political pressure while remaining accountable for delays, conflicts of interest and poorly reasoned decisions.' },
      { h: 'What the EU watches', p: 'Commission reports assess court efficiency, organised-crime cases, fundamental-rights protection and the implementation of decisions.' },
    ],
    sr: [
      { h: 'Jednakost pred zakonom u praksi', p: 'Vladavina prava nije samo sud. To je i pravo na informacije, pravičan postupak, obrazloženu odluku i stvarnu žalbu kada institucija pogreši.' },
      { h: 'Nezavisnost i odgovornost', p: 'Sudije i tužioci moraju biti zaštićeni od političkog pritiska, ali odgovorni za kašnjenja, sukob interesa i loše obrazložene odluke.' },
      { h: 'Šta EU prati', p: 'Izveštaji Komisije prate efikasnost sudova, slučajeve organizovanog kriminala, zaštitu osnovnih prava i sprovođenje odluka.' },
    ],
  },
  korrupsioni: {
    sq: [
      { h: 'Korrupsioni i vogël dhe ai sistemik', p: 'Ryshfeti në shërbime të përditshme dëmton besimin, ndërsa kapja e prokurimit, punësimit publik dhe licencave e pengon zhvillimin ekonomik.' },
      { h: 'Çfarë e bën raportimin të besueshëm', p: 'Raportimi funksionon kur ka kanal të sigurt, mbrojtje të sinjalizuesit, afat për trajtim dhe kthim informacioni për qytetarin që raporton.' },
      { h: 'Nga ndëshkimi te parandalimi', p: 'Standardi evropian nuk mat vetëm arrestime. Mat transparencën e kontratave, deklarimin e pasurisë, auditimin dhe menaxhimin e konfliktit të interesit.' },
    ],
    en: [
      { h: 'Petty and systemic corruption', p: 'Bribery in daily services damages trust, while capture of procurement, public hiring and licensing blocks economic development.' },
      { h: 'What makes reporting credible', p: 'Reporting works when there is a safe channel, whistleblower protection, a treatment deadline and feedback for the citizen who reports.' },
      { h: 'From punishment to prevention', p: 'European standards do not only count arrests. They measure contract transparency, asset declarations, audits and conflict-of-interest management.' },
    ],
    sr: [
      { h: 'Sitna i sistemska korupcija', p: 'Mito u svakodnevnim uslugama ruši poverenje, dok kontrola nabavki, javnog zapošljavanja i licenci koči ekonomski razvoj.' },
      { h: 'Šta prijavu čini verodostojnom', p: 'Prijavljivanje funkcioniše kada postoje bezbedan kanal, zaštita zviždača, rok za obradu i povratna informacija građaninu.' },
      { h: 'Od kažnjavanja ka prevenciji', p: 'Evropski standard ne meri samo hapšenja. Meri transparentnost ugovora, prijavu imovine, revizije i upravljanje sukobom interesa.' },
    ],
  },
  be: {
    sq: [
      { h: 'Proces politik dhe teknik', p: 'Anëtarësimi në BE është njëkohësisht vendim politik i 27 shteteve dhe proces teknik i harmonizimit të ligjeve, institucioneve dhe tregut me standardet evropiane.' },
      { h: 'Pse statusi nuk mjafton', p: 'Statusi kandidat hap derën, por negociatat kërkojnë rezultate të matshme: reforma në drejtësi, ekonomi funksionale, administratë profesionale dhe mbrojtje të të drejtave.' },
      { h: 'Çfarë fiton qytetari', p: 'Në fund, procesi nuk është vetëm flamur në Bruksel. Është siguri juridike, shërbime më të mira, konkurrencë më e drejtë dhe mundësi më të mëdha për të rinjtë.' },
    ],
    en: [
      { h: 'A political and technical process', p: 'EU membership is both a political decision by 27 states and a technical process of aligning laws, institutions and markets with European standards.' },
      { h: 'Why status is not enough', p: 'Candidate status opens the door, but negotiations require measurable results: justice reform, a functioning economy, professional administration and rights protection.' },
      { h: 'What citizens gain', p: 'In the end, the process is not only a flag in Brussels. It means legal certainty, better services, fairer competition and greater opportunities for young people.' },
    ],
    sr: [
      { h: 'Politički i tehnički proces', p: 'Članstvo u EU je istovremeno politička odluka 27 država i tehnički proces usklađivanja zakona, institucija i tržišta sa evropskim standardima.' },
      { h: 'Zašto status nije dovoljan', p: 'Status kandidata otvara vrata, ali pregovori traže merljive rezultate: reformu pravosuđa, funkcionalnu ekonomiju, profesionalnu administraciju i zaštitu prava.' },
      { h: 'Šta građanin dobija', p: 'Na kraju, proces nije samo zastava u Briselu. To su pravna sigurnost, bolje usluge, poštenija konkurencija i veće mogućnosti za mlade.' },
    ],
  },
};

function DeepReadingSection({ topicKey, lang }) {
  const blocks = TOPIC_DEEP_CONTENT[topicKey]?.[lang] || TOPIC_DEEP_CONTENT[topicKey]?.sq || [];
  if (!blocks.length) return null;
  return (
    <section style={{ padding: '88px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container">
        <SectionHead
          eyebrow={lang === 'sq' ? 'Lexim i thelluar' : lang === 'en' ? 'Deep reading' : 'Detaljnije'}
          title={lang === 'sq' ? 'Çfarë duhet kuptuar përtej titullit' : lang === 'en' ? 'What to understand beyond the headline' : 'Šta treba razumeti iza naslova'}
          num="04"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }} className="deep-grid">
          {blocks.map((b, i) => (
            <article key={b.h} style={{ background: 'var(--paper)', padding: '28px 26px', minHeight: 250 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.16em' }}>{String(i + 1).padStart(2, '0')}</span>
              <h3 className="serif" style={{ fontSize: 28, lineHeight: 1.05, marginTop: 18, color: 'var(--ink)' }}>{b.h}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.62, color: 'var(--ink-2)', marginTop: 16 }}>{b.p}</p>
            </article>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) { .deep-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}


// ============================================================
// Home summary previews (short versions linking to detail pages)
// ============================================================
function PreviewBlock({ eyebrow, title, sub, num, to, ctaLabel, children }) {
  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24, marginBottom: 40 }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18 }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>§ {num}</span>
              <span className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-2)', borderTop: '1px solid var(--ink-2)', paddingTop: 6 }}>{eyebrow}</span>
            </div>
            <h2 className="serif" style={{ fontSize: 'clamp(30px, 4.4vw, 48px)', lineHeight: 1.04, color: 'var(--ink)' }}>{title}</h2>
            {sub && <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 600, marginTop: 14 }}>{sub}</p>}
          </div>
          <a href={'#/' + to} style={{
            background: 'transparent', color: 'var(--ink)',
            border: '1px solid var(--ink)', padding: '12px 18px',
            fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 10,
          }} className="mono">
            {ctaLabel}
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 7 H13 M8 2 L13 7 L8 12" stroke="currentColor" strokeWidth="1.3" /></svg>
          </a>
        </div>
        {children}
      </div>
    </section>
  );
}

// ============================================================
// Home Page
// ============================================================
function HomePage({ lang, t, onChat }) {
  // Mini regional bars (top 4)
  const top = REGION;
  // Mini objectives preview
  const objsPreview = OBJECTIVES.slice(0, 4);
  const totalCompleted = OBJECTIVES.filter(o => o.completed).length;
  const globalProgress = Math.round(OBJECTIVES.reduce((s, o) => s + (o.completed ? 100 : o.progress), 0) / OBJECTIVES.length);
  // Mini FAQ
  const faqPreview = FAQ_DATA.slice(0, 3);

  return (
    <>
      <Hero lang={lang} t={t} onChat={onChat} />
      <Topics lang={lang} t={t} />

      {/* Regional preview */}
      <PreviewBlock
        eyebrow={t.progress.eyebrow}
        title={t.progress.title}
        sub={t.progress.sub}
        num="02"
        to="be"
        ctaLabel={lang === 'sq' ? 'Më shumë për BE-në →' : lang === 'en' ? 'More on EU →' : 'Više o EU →'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {top.map(c => {
            const color = c.status === 'negotiating' ? 'var(--sage)' : c.status === 'candidate' ? 'var(--gold)' : 'var(--rust)';
            const isKosova = c.code === 'XK';
            return (
              <div key={c.code} style={{
                display: 'grid', gridTemplateColumns: '52px 130px 1fr 80px',
                alignItems: 'center', gap: 16, padding: '10px 0',
                borderBottom: '1px solid var(--line)',
                background: isKosova ? 'var(--paper-2)' : 'transparent',
                margin: isKosova ? '0 -16px' : 0,
                paddingLeft: isKosova ? 16 : 0, paddingRight: isKosova ? 16 : 0,
              }} className="region-row">
                <span className="mono" style={{ fontSize: 16, color: 'var(--ink)' }}>{c.code}</span>
                <span className="serif" style={{ fontSize: 20, color: 'var(--ink)' }}>{c.name}{isKosova && <span style={{ color: 'var(--rust)', marginLeft: 6 }}>★</span>}</span>
                <div style={{ height: 14, background: 'var(--paper-3)', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: c.progress + '%', background: color }} />
                </div>
                <span className="mono" style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'right' }}>{c.progress}/100</span>
              </div>
            );
          })}
        </div>
      </PreviewBlock>

      {/* Stats strip */}
      <section style={{ padding: '80px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, border: '1px solid var(--line)' }} className="stats-strip">
            <BigStat top="1247" label_sq="ditë qysh nga aplikimi për anëtarësim" label_en="days since membership application" label_sr="dana od aplikacije" lang={lang} accent="var(--ink)" />
            <BigStat top="41" suffix="/100" label_sq="CPI 2025, +8 në 10 vjet" label_en="CPI 2025, +8 in 10 years" label_sr="CPI 2025, +8 za 10 godina" lang={lang} accent="var(--rust)" border />
            <BigStat top="6" suffix="/12" label_sq="klasterë të hapur në negociata (objektiv)" label_en="open negotiation clusters (target)" label_sr="otvorenih klastera (cilj)" lang={lang} accent="var(--blue)" border />
            <BigStat top="0" label_sq="anëtarësime në BE që nga 2013" label_en="EU memberships since 2013" label_sr="EU pristupanja od 2013" lang={lang} accent="var(--gold)" border />
          </div>
        </div>
      </section>

      {/* Objectives preview */}
      <PreviewBlock
        eyebrow={t.objectives.eyebrow}
        title={t.objectives.title}
        sub={t.objectives.sub}
        num="03"
        to="objektivat"
        ctaLabel={lang === 'sq' ? 'Të gjitha objektivat →' : lang === 'en' ? 'All objectives →' : 'Svi ciljevi →'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 56, alignItems: 'start' }} className="cluster-grid">
          <div style={{ padding: 24, border: '1px solid var(--ink)', background: 'var(--paper)' }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em', marginBottom: 16 }}>PROGRES I PËRGJITHSHËM</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
              <span className="serif" style={{ fontSize: 88, lineHeight: 0.85, color: 'var(--ink)' }}>{globalProgress}</span>
              <span className="serif" style={{ fontSize: 36, color: 'var(--ink-2)' }}>%</span>
            </div>
            <div style={{ height: 6, background: 'var(--paper-3)', position: 'relative', marginBottom: 18 }}>
              <div style={{ position: 'absolute', inset: 0, width: globalProgress + '%', background: 'var(--gold)' }} />
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 12 }}>{totalCompleted} të plotësuara nga {OBJECTIVES.length}</div>
          </div>
          <div>
            {objsPreview.map(o => {
              const cl = CLUSTER_LABELS[o.cluster] || CLUSTER_LABELS.other;
              return (
                <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 120px 80px', alignItems: 'center', gap: 16, padding: '16px 0', borderTop: '1px solid var(--line)' }} className="obj-preview-row">
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `1.5px solid ${o.completed ? 'var(--sage)' : 'var(--ink-3)'}`,
                    background: o.completed ? 'var(--sage)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--paper)', fontSize: 11, fontWeight: 700,
                  }}>{o.completed ? '✓' : ''}</span>
                  <span className="serif" style={{ fontSize: 20, color: 'var(--ink)', lineHeight: 1.2 }}>{o.name_sq}</span>
                  <span className="mono" style={{ fontSize: 10, padding: '3px 8px', border: `1px solid ${cl.color}`, color: cl.color, justifySelf: 'start' }}>{cl[lang] || cl.sq}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right' }}>{o.completed ? 100 : o.progress}%</span>
                </div>
              );
            })}
            <div style={{ borderTop: '1px solid var(--line)' }} />
          </div>
        </div>
      </PreviewBlock>

      {/* FAQ preview */}
      <PreviewBlock
        eyebrow={t.faq.eyebrow}
        title={t.faq.title}
        num="04"
        to="faq"
        ctaLabel={lang === 'sq' ? 'Të gjitha pyetjet →' : lang === 'en' ? 'All questions →' : 'Sva pitanja →'}>
        <div>
          {faqPreview.map((f, i) => (
            <details key={i} style={{ borderTop: '1px solid var(--line)' }}>
              <summary style={{ padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, cursor: 'pointer', listStyle: 'none' }}>
                <span className="serif" style={{ fontSize: 22, lineHeight: 1.2, color: 'var(--ink)' }}>{f.q_sq}</span>
                <span style={{ fontSize: 22, color: 'var(--ink-2)', flexShrink: 0 }}>+</span>
              </summary>
              <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0, padding: '0 60px 24px 0' }}>{f.a_sq}</p>
            </details>
          ))}
          <div style={{ borderTop: '1px solid var(--line)' }} />
        </div>
      </PreviewBlock>

      <CTABand lang={lang} onChat={onChat} />
    </>
  );
}

function BigStat({ top, suffix, label_sq, label_en, label_sr, lang, accent, border }) {
  const label = lang === 'en' ? label_en : lang === 'sr' ? label_sr : label_sq;
  return (
    <div style={{ padding: '32px 24px', background: 'var(--paper)', borderLeft: border ? '1px solid var(--line)' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
        <span className="serif" style={{ fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.85, color: accent }}>{top}</span>
        {suffix && <span className="serif" style={{ fontSize: 24, color: 'var(--ink-3)' }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4, maxWidth: 180 }}>{label}</div>
    </div>
  );
}

// ============================================================
// Page wrapper — heading + breadcrumb
// ============================================================
function PageHeader({ kicker, title, sub, accent = 'var(--ink)' }) {
  return (
    <section className="page-header" style={{ padding: '40px 0 64px', borderBottom: '1px solid var(--line)' }}>
      <div className="container">
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.18em', marginBottom: 24 }}>
          <a href="#/" style={{ color: 'var(--ink-3)' }}>HOME</a> / {kicker.toUpperCase()}
        </div>
        <h1 className="serif" style={{ fontSize: 'clamp(48px, 7.5vw, 104px)', lineHeight: 0.94, color: accent, letterSpacing: '-0.02em' }}>{title}</h1>
        {sub && <p style={{ fontSize: 20, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 720, marginTop: 24 }}>{sub}</p>}
      </div>
    </section>
  );
}

// ============================================================
// Detail pages
// ============================================================
function TopicPage({ topicKey, lang, t, onChat }) {
  const topic = TOPICS.find(t => t.key === topicKey);
  const title = topic['title_' + lang] || topic.title_sq;
  const blurb = topic['blurb_' + lang] || topic.blurb_sq;
  return (
    <>
      <PageHeader
        kicker={t.nav[topicKey]}
        title={<span style={{ whiteSpace: 'pre-line' }}>{title}</span>}
        sub={blurb}
        accent={topic.accent}
      />
      <TopicSection topic={topic} lang={lang} idx={0} />
      {/* Show context-relevant detail per topic */}
      {topicKey === 'be' && <RegionChart lang={lang} t={t} />}
      {topicKey === 'be' && <Clusters lang={lang} t={t} />}
      {topicKey === 'korrupsioni' && <CPIChart lang={lang} t={t} />}
      {(topicKey === 'reforma' || topicKey === 'sundimi') && (
        <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
          <div className="container">
            <SectionHead eyebrow={lang === 'sq' ? 'Progres' : lang === 'en' ? 'Progress' : 'Napredak'} title={lang === 'sq' ? 'Përafrimi me acquis-në' : lang === 'en' ? 'Alignment with the acquis' : 'Usaglašavanje sa acquis'} num="03" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px 56px' }} className="reform-grid">
              {REFORM.map(r => {
                const label = r['label_' + lang] || r.label_sq;
                return (
                  <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 40px', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 14, color: 'var(--ink)' }}>{label}</span>
                    <div style={{ height: 6, background: 'var(--paper-3)', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, width: r.value + '%', background: topic.accent }} />
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right' }}>{r.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
      <DeepReadingSection topicKey={topicKey} lang={lang} />
      <NextTopicNav current={topicKey} lang={lang} t={t} />
    </>
  );
}

function NextTopicNav({ current, lang, t }) {
  const keys = TOPICS.map(x => x.key);
  const idx = keys.indexOf(current);
  const next = TOPICS[(idx + 1) % keys.length];
  const prev = TOPICS[(idx - 1 + keys.length) % keys.length];
  return (
    <section style={{ padding: '60px 0', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <a href={'#/' + prev.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--ink)' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.15em' }}>← {lang === 'sq' ? 'Më parë' : lang === 'en' ? 'Previous' : 'Prethodno'}</span>
          <span className="serif" style={{ fontSize: 26 }}>{(prev['title_' + lang] || prev.title_sq).replace('\n', ' ')}</span>
        </a>
        <a href={'#/' + next.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--ink)', textAlign: 'right' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.15em' }}>{lang === 'sq' ? 'Më pas' : lang === 'en' ? 'Next' : 'Sledeće'} →</span>
          <span className="serif" style={{ fontSize: 26 }}>{(next['title_' + lang] || next.title_sq).replace('\n', ' ')}</span>
        </a>
      </div>
    </section>
  );
}

function ObjectivesPage({ lang, t }) {
  return (
    <>
      <PageHeader kicker={t.nav.objektivat} title={t.objectives.title} sub={t.objectives.sub} />
      <Objectives lang={lang} t={t} />
      <ObjectiveContext lang={lang} />
    </>
  );
}

function FAQPage({ lang, t, onChat }) {
  return (
    <>
      <PageHeader kicker={t.nav.faq} title={t.faq.title} sub={lang === 'sq' ? 'Përgjigjet janë të shkurtra dhe me referencë te dokumenti origjinal.' : lang === 'en' ? 'Answers are short and reference the source document.' : 'Odgovori su kratki sa referencom na izvor.'} />
      <FAQ lang={lang} t={t} />
      <FAQGuide lang={lang} onChat={onChat} />
    </>
  );
}

function InfoPage({ lang, t }) {
  return (
    <>
      <PageHeader kicker={lang === 'sq' ? 'Infografika' : lang === 'en' ? 'Infographics' : 'Infografike'} title={lang === 'sq' ? 'Çdo gjë në një faqe.' : lang === 'en' ? 'Everything on a single page.' : 'Sve na jednoj stranici.'} />
      <Infographics lang={lang} t={t} />
      <InfographicsGuide lang={lang} />
    </>
  );
}

const KOSOVO_STORY = {
  sq: [
    { k: 'I. Pesha e historisë', h: 'Një popull që refuzoi të zhduket.', p: 'Nga plagët e luftës dhe zhvendosja masive, Kosova e ndërtoi një shtet të ri me kujtesë të gjallë dhe me orientim të qartë drejt paqes.' },
    { k: 'II. Rindërtimi', h: 'Nga rrënojat, u ndërtua një republikë.', p: 'Pas vitit 1999 u rindërtuan shkolla, spitale, rrugë, institucione dhe besimi se jeta publike mund të fillonte nga e para.' },
    { k: 'III. Njerëzit', h: 'Një nga shoqëritë më të reja në Evropë.', p: 'Rinia, diaspora, arsimi dhe ambicia e përditshme e mbajnë Kosovën të lidhur me Evropën edhe para anëtarësimit formal.' },
    { k: 'IV. Toka', h: 'Male, qytete dhe kujtesë kulturore.', p: 'Nga Rugova te Prizreni, nga Prishtina moderne te trashëgimia historike, vendi ka një identitet që është njëkohësisht i lashtë dhe bashkëkohor.' },
    { k: 'V. E ardhmja evropiane', h: 'Anëtarësimi si kthim në shtëpi.', p: 'Narrativa e `kosova.jsx` e sheh Evropën jo si destinacion të largët, por si hapësirë politike, kulturore dhe morale ku Kosova tashmë e ndien veten.' },
  ],
  en: [
    { k: 'I. The weight of history', h: 'A people who refused to disappear.', p: 'From the wounds of war and mass displacement, Kosovo built a new state with living memory and a clear orientation toward peace.' },
    { k: 'II. The rebuilding', h: 'From ruins, a republic was built.', p: 'After 1999, schools, hospitals, roads, institutions and the belief that public life could begin again were rebuilt.' },
    { k: 'III. The people', h: 'One of Europe’s youngest societies.', p: 'Youth, diaspora, education and everyday ambition keep Kosovo connected to Europe even before formal membership.' },
    { k: 'IV. The land', h: 'Mountains, cities and cultural memory.', p: 'From Rugova to Prizren, from modern Pristina to historical heritage, the country carries an identity that is ancient and contemporary at once.' },
    { k: 'V. The European future', h: 'Membership as a homecoming.', p: 'The narrative of `kosova.jsx` frames Europe not as a distant destination, but as a political, cultural and moral space where Kosovo already sees itself.' },
  ],
  sr: [
    { k: 'I. Težina istorije', h: 'Narod koji je odbio da nestane.', p: 'Iz rana rata i masovnog raseljavanja Kosovo je izgradilo novu državu sa živim sećanjem i jasnim okretanjem ka miru.' },
    { k: 'II. Obnova', h: 'Iz ruševina je izgrađena republika.', p: 'Posle 1999. obnavljane su škole, bolnice, putevi, institucije i vera da javni život može početi iznova.' },
    { k: 'III. Ljudi', h: 'Jedno od najmlađih društava Evrope.', p: 'Mladi, dijaspora, obrazovanje i svakodnevna ambicija povezuju Kosovo sa Evropom i pre formalnog članstva.' },
    { k: 'IV. Zemlja', h: 'Planine, gradovi i kulturno pamćenje.', p: 'Od Rugove do Prizrena, od moderne Prištine do istorijskog nasleđa, zemlja nosi identitet koji je istovremeno drevan i savremen.' },
    { k: 'V. Evropska budućnost', h: 'Članstvo kao povratak kući.', p: 'Narativ iz `kosova.jsx` vidi Evropu ne kao daleku destinaciju, već kao politički, kulturni i moralni prostor u kome Kosovo već vidi sebe.' },
  ],
};

function KosovaPage({ lang, t }) {
  const s = t.kosova;
  const copyByLang = {
    sq: {
      eyebrow: 'Një histori mbijetese dhe formimi',
      hero: ['Kosova.', 'Zemra e re', 'e Evropës.'],
      heroSub: 'Nga hiri i luftës te agimi i një kapitulli të ri - një komb me dy milionë zëra që shkon drejt një të ardhmeje të përbashkët evropiane.',
      historyLabel: 'I. Pesha e historisë',
      historyTitle: ['Një popull', 'që refuzoi', 'të zhdukej.'],
      historyP1: 'Në vitin 1999, Kosova përjetoi një nga kapitujt më të errët të Evropës: zhvendosje, shkatërrim dhe përpjekje për fshirjen e një mënyre jetese. Mbi 1.3 milion njerëz u detyruan të largohen nga shtëpitë e tyre. Qytete të tëra mbetën rrënoja.',
      historyP2: 'Megjithatë nga ajo heshtje, Kosova u ngrit. Jo ngadalë, por me urgjencën e një populli që kishte gjithçka për të rindërtuar.',
      quote: 'Kujtesa nuk na mban peng - ajo na mëson vlerën e paqes.',
      quoteBy: 'NJË I MBIJETUAR NGA PRISHTINA, 1999',
      woundStats: [['1.3M', 'Të zhvendosur'], ['13,500+', 'Jetë të humbura'], ['25', 'Vite rindërtim']],
      rebuildLabel: 'II. Rindërtimi',
      rebuildTitleA: 'Nga rrënojat, u ndërtua një ',
      rebuildTitleB: 'komb.',
      timeline: [
        { year: '1999', text: 'Çlirimi dhe fillimi i mbështetjes ndërkombëtare. Ndërhyrja e NATO-s i dha fund konfliktit.' },
        { year: '2000', text: 'Fillon administrimi i OKB-së. Uji, energjia dhe spitalet rindërtohen pothuajse nga e para.' },
        { year: '2008', text: 'Kosova shpall pavarësinë. Kushtetutë e re. Flamur i ri. Ëndërr e re.' },
        { year: '2015', text: 'Kosova bëhet anëtare e UEFA-s dhe FIFA-s. Sporti kthehet në simbol njohjeje.' },
        { year: '2024', text: 'Hyn në fuqi liberalizimi i vizave me BE-në. Për herë të parë qytetarët udhëtojnë lirshëm në Evropë.' },
      ],
      peopleLabel: 'III. Njerëzit',
      peopleTitle: <>Kombi më i ri në <span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>Evropë</span> - dhe ndër më shpresëplotët.</>,
      peopleText: 'Mbi 50% e popullsisë së Kosovës është nën moshën 30 vjeç. Një brez që nuk i pranoi kufijtë. I arsimuar, ambicioz, shumëgjuhësh - ky brez e mban Evropën tashmë në zemër.',
      facts: [['Popullsia', '1.8M'], ['Nën moshën 30', '50%'], ['Pro BE-së në sondazhe', '92%'], ['Gjuhë të folura', '4']],
      valuesLabel: 'IV. Pse Evropa',
      valuesTitle: <>Kosova nuk dëshiron vetëm t’i bashkohet Evropës. Ajo tashmë <span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>i jeton vlerat e saj.</span></>,
      pillars: [
        { icon: '01', title: 'Sundimi i ligjit', text: 'Një demokraci e re kushtetuese me shoqëri civile aktive që kërkon transparencë, drejtësi dhe llogaridhënie.' },
        { icon: '02', title: 'Mikpritje pa kufij', text: 'Në Kosovë, i huaji bëhet mysafir brenda pak minutash. Mikpritja nuk është vetëm traditë - është mënyrë jetese.' },
        { icon: '03', title: 'Natyrë e paprekur', text: 'Alpet shqiptare, Gryka e Rugovës dhe trashëgimia mesjetare bashkëjetojnë në një peizazh ende larg turizmit masiv.' },
        { icon: '04', title: 'Arsim dhe ambicie', text: 'Mijëra studentë kosovarë studiojnë në Evropë dhe kthehen me aftësi, gjuhë dhe vizion për vendin.' },
        { icon: '05', title: 'Kulturë në lulëzim', text: 'Nga skena artistike e Prishtinës te zanatet shekullore - identiteti i Kosovës është i lashtë dhe bashkëkohor njëkohësisht.' },
        { icon: '06', title: 'Qëndresa si karakter', text: 'Një popull që rindërtoi një vend të tërë brenda një brezi di diçka për vendosmërinë që nuk mësohet në libra.' },
      ],
      landLabel: 'V. Toka',
      landQuote: <>Mes këtyre maleve,<br />çdo gur mban një histori -<br /><span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>dhe çdo agim, një premtim.</span></>,
      euLabel: 'VI. E ardhmja evropiane',
      euTitle: <>Rruga e Kosovës drejt Evropës<br />nuk është <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>kërkesë</span>.<br />Është <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>kthim në shtëpi</span>.</>,
      euText: 'Gjeografikisht, kulturalisht dhe shpirtërisht, Kosova ka qenë gjithmonë pjesë e historisë evropiane. Anëtarësimi në BE nuk është vetëm qëllim politik; është ëndrra e dy milionë njerëzve që e kanë fituar me sakrificë të jashtëzakonshme.',
      milestones: [['2008', 'Pavarësia u shpall'], ['2016', 'SAA me BE-në hyri në fuqi'], ['2024', 'Filloi udhëtimi pa viza']],
      euQuote: 'Një Evropë që harron Kosovën harron një pjesë të vetes.',
      voices: 'KOSOVA · DY MILIONË ZËRA',
      finalLabel: 'Eja, shih, kupto',
      finalTitle: <>Kosova nuk është vetëm një vend që pret të <span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>zbulohet</span>. Është një histori që pret të <span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>dëshmohet</span>.</>,
      cta: 'Fillo udhëtimin',
    },
    en: {
      eyebrow: 'A Story of Survival and Becoming',
      hero: ['Kosovo.', "Europe's", 'Young Heart.'],
      heroSub: 'From the ashes of war to the dawn of a new chapter - a nation of two million souls reaching toward a shared European future.',
      historyLabel: 'I. The Weight of History',
      historyTitle: ['A people', 'who refused', 'to disappear.'],
      historyP1: "In 1999, Kosovo endured one of Europe's darkest chapters - displacement, destruction, and the erasure of a way of life. Over 1.3 million people were forced from their homes. Cities reduced to rubble.",
      historyP2: 'Yet from that silence, Kosovo rose. Not slowly - but with the urgency of a people who had everything to rebuild.',
      quote: 'Memory does not trap us - it teaches us the value of peace.',
      quoteBy: 'A SURVIVOR OF PRISTINA, 1999',
      woundStats: [['1.3M', 'Displaced'], ['13,500+', 'Lives Lost'], ['25', 'Years of Rebuilding']],
      rebuildLabel: 'II. The Rebuilding',
      rebuildTitleA: 'From ruins, a ',
      rebuildTitleB: 'nation was built.',
      timeline: [
        { year: '1999', text: 'Liberation and the beginning of international support. NATO intervention ends the conflict.' },
        { year: '2000', text: 'UN administration begins. Water, electricity, and hospitals are rebuilt from scratch.' },
        { year: '2008', text: 'Kosovo declares independence. A new constitution. A new flag. A new dream.' },
        { year: '2015', text: 'Kosovo becomes a member of UEFA and FIFA. Sports as a symbol of recognition.' },
        { year: '2024', text: 'Visa liberalization with the EU. For the first time, Kosovars travel freely across Europe.' },
      ],
      peopleLabel: 'III. The People',
      peopleTitle: <>The youngest nation in <span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>Europe</span> - and its most hopeful.</>,
      peopleText: "Over 50% of Kosovo's population is under 30. A generation that never accepted limits. Educated, ambitious, multilingual - they carry Europe already in their hearts.",
      facts: [['Population', '1.8M'], ['Under Age 30', '50%'], ['Pro-EU in polls', '92%'], ['Languages Spoken', '4']],
      valuesLabel: 'IV. Why Europe',
      valuesTitle: <>Kosovo doesn&apos;t just want to join Europe. It already <span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>lives its values.</span></>,
      pillars: [
        { icon: '01', title: 'Rule of Law', text: 'A young constitutional democracy with an active civil society pushing for transparency, justice, and accountability.' },
        { icon: '02', title: 'Hospitality Without Borders', text: 'In Kosovo, strangers become guests within minutes. Hospitality is not a tradition - it is a way of being.' },
        { icon: '03', title: 'Untouched Nature', text: 'The Albanian Alps, Rugova Canyon, and medieval monasteries coexist in a landscape still free from mass tourism.' },
        { icon: '04', title: 'Education & Ambition', text: 'Thousands of Kosovar students study across Europe. They return with skills, languages, and a vision for their country.' },
        { icon: '05', title: 'Culture in Bloom', text: "From Pristina's vibrant art scene to centuries-old crafts - Kosovo's identity is both ancient and radically contemporary." },
        { icon: '06', title: 'Resilience as Character', text: 'A people who rebuilt an entire country in a generation know something about determination that textbooks cannot teach.' },
      ],
      landLabel: 'V. The Land',
      landQuote: <>Between these mountains,<br />every stone holds a story -<br /><span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>and every sunrise, a promise.</span></>,
      euLabel: 'VI. The European Future',
      euTitle: <>Kosovo&apos;s path to Europe<br />is not a <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>request</span>.<br />It is a <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>homecoming</span>.</>,
      euText: 'Geographically, culturally, and in spirit - Kosovo has always been part of the European story. EU membership is not the goal of politicians. It is the dream of two million people who earned it through extraordinary sacrifice.',
      milestones: [['2008', 'Independence Declared'], ['2016', 'SAA with EU Signed'], ['2024', 'Visa-Free Travel Begins']],
      euQuote: 'A Europe that forgets Kosovo forgets a part of itself.',
      voices: 'KOSOVO · TWO MILLION VOICES',
      finalLabel: 'Come, See, Understand',
      finalTitle: <>Kosovo is not just a country waiting to be <span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>discovered</span>. It is a story waiting to be <span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>witnessed</span>.</>,
      cta: 'Begin the Journey',
    },
    sr: {
      eyebrow: 'Priča o opstanku i postajanju',
      hero: ['Kosovo.', 'Mlado srce', 'Evrope.'],
      heroSub: 'Iz pepela rata ka početku novog poglavlja - narod od dva miliona glasova okrenut zajedničkoj evropskoj budućnosti.',
      historyLabel: 'I. Težina istorije',
      historyTitle: ['Narod', 'koji je odbio', 'da nestane.'],
      historyP1: 'Godine 1999. Kosovo je preživelo jedno od najmračnijih poglavlja Evrope: raseljavanje, razaranje i pokušaj brisanja jednog načina života. Više od 1.3 miliona ljudi bilo je primorano da napusti svoje domove. Gradovi su ostali u ruševinama.',
      historyP2: 'Ipak, iz te tišine Kosovo se podiglo. Ne polako, već hitnošću naroda koji je morao sve da obnovi.',
      quote: 'Sećanje nas ne zarobljava - ono nas uči vrednosti mira.',
      quoteBy: 'PREŽIVELI IZ PRIŠTINE, 1999',
      woundStats: [['1.3M', 'Raseljeno'], ['13,500+', 'Izgubljenih života'], ['25', 'Godina obnove']],
      rebuildLabel: 'II. Obnova',
      rebuildTitleA: 'Iz ruševina je izgrađena ',
      rebuildTitleB: 'nacija.',
      timeline: [
        { year: '1999', text: 'Oslobođenje i početak međunarodne podrške. Intervencija NATO-a okončava sukob.' },
        { year: '2000', text: 'Počinje administracija UN-a. Voda, struja i bolnice obnavljaju se gotovo od nule.' },
        { year: '2008', text: 'Kosovo proglašava nezavisnost. Novi ustav. Nova zastava. Novi san.' },
        { year: '2015', text: 'Kosovo postaje član UEFA-e i FIFA-e. Sport postaje simbol priznanja.' },
        { year: '2024', text: 'Stupa na snagu vizna liberalizacija sa EU. Građani prvi put slobodno putuju Evropom.' },
      ],
      peopleLabel: 'III. Ljudi',
      peopleTitle: <>Najmlađa nacija u <span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>Evropi</span> - i jedna od najpunijih nade.</>,
      peopleText: 'Više od 50% stanovništva Kosova mlađe je od 30 godina. Generacija koja nikada nije prihvatila granice. Obrazovana, ambiciozna, višejezična - Evropu već nosi u srcu.',
      facts: [['Stanovništvo', '1.8M'], ['Mlađi od 30', '50%'], ['Pro-EU u anketama', '92%'], ['Jezika u upotrebi', '4']],
      valuesLabel: 'IV. Zašto Evropa',
      valuesTitle: <>Kosovo ne želi samo da se pridruži Evropi. Ono već <span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>živi njene vrednosti.</span></>,
      pillars: [
        { icon: '01', title: 'Vladavina prava', text: 'Mlada ustavna demokratija sa aktivnim civilnim društvom koje traži transparentnost, pravdu i odgovornost.' },
        { icon: '02', title: 'Gostoprimstvo bez granica', text: 'Na Kosovu stranac za nekoliko minuta postaje gost. Gostoprimstvo nije samo tradicija - to je način života.' },
        { icon: '03', title: 'Netaknuta priroda', text: 'Albanski Alpi, kanjon Rugove i srednjovekovno nasleđe koegzistiraju u pejzažu koji je još daleko od masovnog turizma.' },
        { icon: '04', title: 'Obrazovanje i ambicija', text: 'Hiljade kosovskih studenata uče širom Evrope i vraćaju se sa veštinama, jezicima i vizijom za zemlju.' },
        { icon: '05', title: 'Kultura u procvatu', text: 'Od umetničke scene Prištine do vekovnih zanata - identitet Kosova je istovremeno drevan i savremen.' },
        { icon: '06', title: 'Otpornost kao karakter', text: 'Narod koji je obnovio celu zemlju u jednoj generaciji zna nešto o odlučnosti što se ne uči iz udžbenika.' },
      ],
      landLabel: 'V. Zemlja',
      landQuote: <>Među ovim planinama,<br />svaki kamen nosi priču -<br /><span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>a svako svitanje, obećanje.</span></>,
      euLabel: 'VI. Evropska budućnost',
      euTitle: <>Put Kosova ka Evropi<br />nije <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>molba</span>.<br />To je <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>povratak kući</span>.</>,
      euText: 'Geografski, kulturno i duhovno, Kosovo je oduvek deo evropske priče. Članstvo u EU nije samo politički cilj; to je san dva miliona ljudi koji su ga zaslužili izuzetnom žrtvom.',
      milestones: [['2008', 'Proglašena nezavisnost'], ['2016', 'SSP sa EU stupio na snagu'], ['2024', 'Počelo putovanje bez viza']],
      euQuote: 'Evropa koja zaboravi Kosovo zaboravlja deo sebe.',
      voices: 'KOSOVO · DVA MILIONA GLASOVA',
      finalLabel: 'Dođi, vidi, razumi',
      finalTitle: <>Kosovo nije samo zemlja koja čeka da bude <span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>otkrivena</span>. To je priča koja čeka da bude <span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>posvedočena</span>.</>,
      cta: 'Započni putovanje',
    },
  };
  const copy = copyByLang[lang] || copyByLang.sq;

  return (
    <>
      <section style={{ padding: '52px 0 82px', borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div className="container">
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.18em', marginBottom: 28 }}>
            <a href="#/" style={{ color: 'var(--ink-3)' }}>HOME</a> / {s.eyebrow.toUpperCase()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 54, alignItems: 'end' }} className="kosova-hero-grid">
            <div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--rust)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 22 }}>
                {copy.eyebrow}
              </div>
              <h1 className="serif" style={{ fontSize: 'clamp(56px, 8vw, 112px)', lineHeight: 0.95, color: 'var(--ink)' }}>
                {copy.hero[0]}<br /><span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>{copy.hero[1]}</span><br />{copy.hero[2]}
              </h1>
              <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 560, marginTop: 28 }}>{copy.heroSub}</p>
            </div>
            <aside style={{ border: '1px solid var(--line)', background: 'var(--paper-2)', padding: 28 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.18em', marginBottom: 20 }}>{s.kf.toUpperCase()}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
                {[
                  [s.kf_pop, KOSOVO_FACTS.pop],
                  [s.kf_cap, KOSOVO_FACTS.cap[lang] || KOSOVO_FACTS.cap.sq],
                  [s.kf_curr, KOSOVO_FACTS.curr],
                  [s.kf_recog, KOSOVO_FACTS.recog],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: 'var(--paper)', padding: 18 }}>
                    <div className="serif" style={{ fontSize: 30, color: 'var(--ink)' }}>{value}</div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 6 }}>{label}</div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) { .kosova-hero-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </section>

      <section style={{ padding: '96px 0', borderTop: '1px solid var(--line)' }}>
        <div className="container kosova-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--rust)', textTransform: 'uppercase' }}>{copy.historyLabel}</span>
            <h2 className="serif" style={{ fontSize: 'clamp(38px, 5vw, 68px)', lineHeight: 1.02, marginTop: 20 }}>
              {copy.historyTitle[0]}<br />{copy.historyTitle[1]}<br /><span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>{copy.historyTitle[2]}</span>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.75, maxWidth: 520, marginTop: 24 }}>
              {copy.historyP1}
            </p>
            <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.75, maxWidth: 520, marginTop: 14 }}>
              {copy.historyP2}
            </p>
            <div style={{ marginTop: 28, paddingLeft: 22, borderLeft: '2px solid var(--gold)' }}>
              <p className="serif" style={{ fontSize: 26, lineHeight: 1.35, margin: 0, color: 'var(--ink)' }}>&quot;{copy.quote}&quot;</p>
              <div className="mono" style={{ fontSize: 10, color: 'var(--rust)', letterSpacing: '0.12em', marginTop: 10 }}>{copy.quoteBy}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            {copy.woundStats.map(([n, l]) => (
              <div key={l} style={{ background: 'var(--paper-2)', padding: '34px 22px', minHeight: 190 }}>
                <div className="serif" style={{ fontSize: 48, color: 'var(--rust)', lineHeight: 0.95 }}>{n}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 16 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) { .kosova-two-col { grid-template-columns: 1fr !important; } }
        `}</style>
      </section>

      <section style={{ padding: '96px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
        <div className="container">
          <SectionHead eyebrow={copy.rebuildLabel} title={<><span>{copy.rebuildTitleA}</span><span style={{ color: 'var(--blue)', fontStyle: 'italic' }}>{copy.rebuildTitleB}</span></>} num="02" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }} className="kosova-source-timeline">
            {copy.timeline.map((item) => (
              <article key={item.year} style={{ background: 'var(--paper)', padding: '28px 24px', minHeight: 270 }}>
                <div className="serif" style={{ fontSize: 46, color: item.year === '2024' ? 'var(--rust)' : 'var(--blue)', lineHeight: 0.9 }}>{item.year}</div>
                <p style={{ fontSize: 14.5, lineHeight: 1.62, color: 'var(--ink-2)', marginTop: 24 }}>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 1100px) { .kosova-source-timeline { grid-template-columns: repeat(2, 1fr) !important; } }
          @media (max-width: 620px) { .kosova-source-timeline { grid-template-columns: 1fr !important; } }
        `}</style>
      </section>

      <section id="people" style={{ padding: '96px 0', borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <SectionHead eyebrow={copy.peopleLabel} title={copy.peopleTitle} num="03" />
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 56, alignItems: 'start' }} className="kosova-people-grid">
            <p style={{ fontSize: 18, color: 'var(--ink-2)', lineHeight: 1.75, margin: 0, maxWidth: 620 }}>
              {copy.peopleText}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
              {copy.facts.map(([label, value]) => (
                <div key={label} style={{ background: 'var(--paper)', padding: 24 }}>
                  <span className="serif" style={{ fontSize: 44, color: 'var(--gold)', lineHeight: 0.95 }}>{value}</span>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 12 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) { .kosova-people-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </section>

      <section style={{ padding: '96px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
        <div className="container">
          <SectionHead eyebrow={copy.valuesLabel} title={copy.valuesTitle} num="04" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }} className="pillar-grid">
            {copy.pillars.map((p) => (
              <article key={p.title} style={{ background: 'var(--paper)', padding: '28px 26px', minHeight: 260 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--rust)', letterSpacing: '0.14em' }}>{p.icon}</span>
                <h3 className="serif" style={{ fontSize: 28, lineHeight: 1.05, marginTop: 20 }}>{p.title}</h3>
                <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.62, marginTop: 14 }}>{p.text}</p>
              </article>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) { .pillar-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </section>

      <section style={{ padding: '110px 0', borderTop: '1px solid var(--line)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--rust)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 22 }}>{copy.landLabel}</div>
          <p className="serif" style={{ fontSize: 'clamp(34px, 5vw, 62px)', lineHeight: 1.18, maxWidth: 900, margin: '0 auto', color: 'var(--ink)' }}>
            &quot;{copy.landQuote}&quot;
          </p>
        </div>
      </section>

      <section style={{ padding: '96px 0', borderTop: '1px solid var(--line)', background: 'var(--ink)', color: 'var(--paper)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 22 }}>
            {Array.from({ length: 12 }).map((_, i) => <span key={i} style={{ color: 'var(--gold)', margin: '0 3px' }}>★</span>)}
          </div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(242,239,232,0.55)', marginBottom: 22 }}>{copy.euLabel}</div>
          <h2 className="serif" style={{ fontSize: 'clamp(40px, 5.8vw, 72px)', lineHeight: 1.08, maxWidth: 900, margin: '0 auto' }}>
            {copy.euTitle}
          </h2>
          <p style={{ color: 'rgba(242,239,232,0.68)', lineHeight: 1.75, fontSize: 16, maxWidth: 700, margin: '28px auto 0' }}>
            {copy.euText}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(242,239,232,0.16)', border: '1px solid rgba(242,239,232,0.16)', marginTop: 44 }} className="eu-milestones">
            {copy.milestones.map(([year, text]) => (
              <div key={year} style={{ background: 'var(--ink)', padding: 28 }}>
                <div className="serif" style={{ fontSize: 42, color: 'var(--gold)' }}>{year}</div>
                <div className="mono" style={{ fontSize: 10, color: 'rgba(242,239,232,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 8 }}>{text}</div>
              </div>
            ))}
          </div>
          <div style={{ border: '1px solid rgba(242,239,232,0.18)', padding: '30px 36px', marginTop: 44 }}>
            <p className="serif" style={{ fontSize: 30, fontStyle: 'italic', lineHeight: 1.45, margin: 0 }}>&quot;{copy.euQuote}&quot;</p>
            <div className="mono" style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 18 }}>{copy.voices}</div>
          </div>
        </div>
        <style>{`
          @media (max-width: 760px) { .eu-milestones { grid-template-columns: 1fr !important; } }
        `}</style>
      </section>

      <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 54, alignItems: 'center' }} className="kosova-final-grid">
            <div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--rust)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{copy.finalLabel}</div>
              <h2 className="serif" style={{ fontSize: 'clamp(40px, 5.8vw, 72px)', lineHeight: 1.05, marginTop: 22 }}>
                {copy.finalTitle}
              </h2>
            </div>
            <a href="#/kosova" style={{ justifySelf: 'start', border: '1px solid var(--ink)', padding: '18px 26px', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase' }} className="mono">
              {copy.cta}
            </a>
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) { .kosova-final-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </section>
    </>
  );
}

function ObjectiveContext({ lang }) {
  return (
    <section style={{ padding: '84px 0', borderTop: '1px solid var(--line)' }}>
      <div className="container objective-context" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
        {[
          {
            h: lang === 'sq' ? 'Si lexohen objektivat' : lang === 'en' ? 'How to read objectives' : 'Kako čitati ciljeve',
            p: lang === 'sq' ? 'Objektivat janë ura mes reformave vendore dhe kërkesave të BE-së: secili duhet të ketë status, kusht, burim dhe indikator të matshëm.' : lang === 'en' ? 'Objectives connect domestic reforms with EU requirements: each needs a status, condition, source and measurable indicator.' : 'Ciljevi povezuju domaće reforme sa zahtevima EU: svaki treba status, uslov, izvor i merljiv indikator.'
          },
          {
            h: lang === 'sq' ? 'Çfarë do të thotë progresi' : lang === 'en' ? 'What progress means' : 'Šta znači napredak',
            p: lang === 'sq' ? 'Progresi nuk është vetëm miratim ligji. Ai kërkon zbatim, buxhet, institucion përgjegjës dhe rezultat që qytetari mund ta ndiejë.' : lang === 'en' ? 'Progress is not only adopting a law. It requires implementation, budget, responsible institutions and an outcome citizens can feel.' : 'Napredak nije samo usvajanje zakona. Potrebni su sprovođenje, budžet, odgovorna institucija i rezultat koji građanin oseća.'
          },
          {
            h: lang === 'sq' ? 'Pse disa mbeten hapur' : lang === 'en' ? 'Why some stay open' : 'Zašto neki ostaju otvoreni',
            p: lang === 'sq' ? 'Disa objektiva varen nga konsensusi politik, disa nga kapaciteti administrativ dhe disa nga vendimet e shteteve anëtare të BE-së.' : lang === 'en' ? 'Some objectives depend on political consensus, some on administrative capacity and some on decisions by EU member states.' : 'Neki ciljevi zavise od političkog konsenzusa, neki od administrativnog kapaciteta, a neki od odluka država članica EU.'
          },
        ].map((b, i) => (
          <article key={b.h} style={{ background: 'var(--paper)', padding: 28, minHeight: 210 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>0{i + 1}</span>
            <h3 className="serif" style={{ fontSize: 28, lineHeight: 1.05, marginTop: 16 }}>{b.h}</h3>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 14 }}>{b.p}</p>
          </article>
        ))}
      </div>
      <style>{`
        @media (max-width: 900px) { .objective-context { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function FAQGuide({ lang, onChat }) {
  return (
    <section style={{ padding: '84px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container faq-guide" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 48, alignItems: 'center' }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>{lang === 'sq' ? 'Si ta përdorësh FAQ' : lang === 'en' ? 'How to use the FAQ' : 'Kako koristiti FAQ'}</div>
          <h2 className="serif" style={{ fontSize: 'clamp(34px, 4.8vw, 56px)', lineHeight: 1.04, marginTop: 18 }}>
            {lang === 'sq' ? 'Pyetjet janë hyrje, jo fundi i kërkimit.' : lang === 'en' ? 'Questions are an entry point, not the end of inquiry.' : 'Pitanja su ulaz, ne kraj istraživanja.'}
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--ink-2)', maxWidth: 640, marginTop: 18 }}>
            {lang === 'sq' ? 'Nëse përgjigjja është e shkurtër, përdore si orientim: hap temën përkatëse, shiko objektivat dhe pyet asistentin për shembuj konkretë.' : lang === 'en' ? 'If an answer is short, use it as orientation: open the related topic, check the objectives and ask the assistant for concrete examples.' : 'Ako je odgovor kratak, koristi ga kao orijentaciju: otvori povezanu temu, pogledaj ciljeve i pitaj asistenta za konkretne primere.'}
          </p>
        </div>
        <button onClick={onChat} style={{ background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '24px 28px', textAlign: 'left' }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em' }}>ASSISTANT</span>
          <span className="serif" style={{ display: 'block', fontSize: 34, marginTop: 20 }}>{lang === 'sq' ? 'Pyet për një rast' : lang === 'en' ? 'Ask about a case' : 'Pitaj za slučaj'}</span>
        </button>
      </div>
      <style>{`
        @media (max-width: 900px) { .faq-guide { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function InfographicsGuide({ lang }) {
  return (
    <section style={{ padding: '84px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container">
        <SectionHead
          eyebrow={lang === 'sq' ? 'Metodologjia' : lang === 'en' ? 'Method' : 'Metodologija'}
          title={lang === 'sq' ? 'Çdo infografikë duhet të tregojë një vendim, jo vetëm një ilustrim.' : lang === 'en' ? 'Every infographic should show a decision, not just an illustration.' : 'Svaka infografika treba da pokaže odluku, ne samo ilustraciju.'}
          num="08"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }} className="info-method-grid">
          {[
            ['01', lang === 'sq' ? 'Pyetja' : lang === 'en' ? 'Question' : 'Pitanje'],
            ['02', lang === 'sq' ? 'Burimi' : lang === 'en' ? 'Source' : 'Izvor'],
            ['03', lang === 'sq' ? 'Treguesi' : lang === 'en' ? 'Indicator' : 'Pokazatelj'],
            ['04', lang === 'sq' ? 'Veprimi' : lang === 'en' ? 'Action' : 'Akcija'],
          ].map(([n, label]) => (
            <div key={n} style={{ background: 'var(--paper)', padding: 26 }}>
              <span className="serif" style={{ fontSize: 46, color: 'var(--blue)' }}>{n}</span>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--ink-3)', marginTop: 12 }}>{label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 760px) { .info-method-grid { grid-template-columns: 1fr 1fr !important; } }
      `}</style>
    </section>
  );
}

// ============================================================
// App
// ============================================================
function App() {
  const [lang, setLang] = useState('sq');
  const [chatOpen, setChatOpen] = useState(false);
  const [route, setRoute] = useRoute();
  const t = STRINGS[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  let page;
  if (['reforma', 'sundimi', 'korrupsioni', 'be'].includes(route)) {
    page = <TopicPage topicKey={route} lang={lang} t={t} onChat={() => setChatOpen(true)} />;
  } else if (route === 'objektivat') {
    page = <ObjectivesPage lang={lang} t={t} />;
  } else if (route === 'faq') {
    page = <FAQPage lang={lang} t={t} onChat={() => setChatOpen(true)} />;
  } else if (route === 'infografika') {
    page = <InfoPage lang={lang} t={t} />;
  } else if (route === 'kosova') {
    page = <KosovaPage lang={lang} t={t} />;
  } else {
    page = <HomePage lang={lang} t={t} onChat={() => setChatOpen(true)} />;
  }

  return (
    <>
      <div className="euguide-zoom">
      <Navbar lang={lang} setLang={setLang} t={t} route={route} onChat={() => setChatOpen(true)} />
        <main key={route}>{page}</main>
        <Footer lang={lang} t={t} />
      </div>
      <ChatWidget lang={lang} t={t} open={chatOpen} setOpen={setChatOpen} />
      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-3px); opacity: 1; } }
        html { scroll-behavior: auto; }
        main { animation: fadeIn 280ms ease both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}

export default App;

