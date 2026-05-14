'use client';

import React, { Fragment, useEffect, useRef, useState, useCallback } from 'react';
import { chatStream, getSession } from '@/lib/ai';
import { supabasePublic as supabase } from '@/lib/supabase';
import VoiceOverlay from './VoiceOverlay';


// ---- data.js ----
// All data + translations for euguide-ks.
// Every textual field exists in sq/en/sr. A helper `tr(obj, field, lang)` falls back to sq.

function tr(obj, field, lang) {
  if (!obj) return '';
  return obj[field + '_' + lang] || obj[field + '_sq'] || obj[field] || '';
};

function stableNum(value) {
  return Number(value.toFixed(4)).toString();
}

const CmsContext = React.createContext({
  settings: {},
  collections: {},
});

function deepMerge(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return base;
  const next = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base?.[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      next[key] = deepMerge(base[key], value);
    } else if (value !== undefined && value !== null) {
      next[key] = value;
    }
  }
  return next;
}

function useCmsArray(key, fallback) {
  const cms = React.useContext(CmsContext);
  const value = cms.collections?.[key];
  return Array.isArray(value) && value.length ? value : fallback;
}

function useCmsObject(key, fallback) {
  const cms = React.useContext(CmsContext);
  const value = cms.collections?.[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

// ============================================================
// Motion helpers — scroll reveal + count-up + reduced-motion guard
// ============================================================
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function useInView(options) {
  const ref = React.useRef(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    if (prefersReducedMotion()) { setInView(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px', ...(options || {}) });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

function Reveal({ children, delay = 0, distance = 18, as: Tag = 'div', className, style, ...rest }) {
  const [ref, inView] = useInView();
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : `translateY(${distance}px)`,
        transition: `opacity 620ms ease ${delay}ms, transform 620ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
        willChange: 'opacity, transform',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function CountUp({ value, duration = 1100, suffix = '', prefix = '' }) {
  const [ref, inView] = useInView({ threshold: 0.4 });
  const [display, setDisplay] = React.useState(typeof value === 'number' ? 0 : value);
  React.useEffect(() => {
    if (typeof value !== 'number') { setDisplay(value); return; }
    if (!inView) return;
    if (prefersReducedMotion()) { setDisplay(value); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

function mapObjective(row) {
  return {
    id: row.slug || row.id,
    name_sq: row.name_sq || '',
    name_en: row.name_en || row.name_sq || '',
    name_sr: row.name_sr || row.name_sq || '',
    desc_sq: row.description_sq || row.conditions_sq || '',
    desc_en: row.description_en || row.conditions_en || row.description_sq || '',
    desc_sr: row.description_sr || row.conditions_sr || row.description_sq || '',
    conditions_sq: row.conditions_sq || '',
    conditions_en: row.conditions_en || '',
    conditions_sr: row.conditions_sr || '',
    cluster: row.cluster || 'other',
    completed: !!row.completed,
    progress: row.completed ? 100 : (row.progress_percent ?? 0),
    source: row.source_url || '',
  };
}

function mapFaq(row) {
  return {
    cat: row.category || row.cat || 'be',
    q_sq: row.question_sq || '',
    q_en: row.question_en || row.question_sq || '',
    q_sr: row.question_sr || row.question_sq || '',
    a_sq: row.answer_sq || '',
    a_en: row.answer_en || row.answer_sq || '',
    a_sr: row.answer_sr || row.answer_sq || '',
  };
}

function mapInfographic(row) {
  return {
    tag: row.category || 'INFO',
    title_sq: row.title_sq || '',
    title_en: row.title_en || row.title_sq || '',
    title_sr: row.title_sr || row.title_sq || '',
    description_sq: row.description_sq || '',
    description_en: row.description_en || row.description_sq || '',
    description_sr: row.description_sr || row.description_sq || '',
    image_url: row.image_url || '',
    shape: row.shape || 'grid',
  };
}

function buildCmsPayload({ settingsRows = [], blockRows = [], chartRows = [], faqRows = [], objectiveRows = [], infographicRows = [] }) {
  const settings = {};
  const collections = {};

  for (const row of settingsRows) settings[row.key] = row.value;
  for (const row of chartRows) collections[row.key] = row.data;
  for (const row of blockRows) {
    if (row.type === 'collection' && row.content?.key && Array.isArray(row.content?.items)) {
      collections[row.content.key] = row.content.items;
    } else if (row.type === 'collection' && row.content?.key && row.content?.value && typeof row.content.value === 'object') {
      collections[row.content.key] = deepMerge(collections[row.content.key] || {}, row.content.value);
    }
  }
  if (faqRows.length) collections.faq = faqRows.map(mapFaq);
  if (objectiveRows.length) collections.objectives = objectiveRows.map(mapObjective);
  if (infographicRows.length) collections.infographics = infographicRows.map(mapInfographic);

  return { settings, collections };
}

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
      cta1: 'Fillo nga këtu', cta2: 'Pyet EU Agent',
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
    cta: { title_a: 'Pyet', title_b: ', dhe EU Agent përgjigjet në shqip, anglisht ose serbisht — me referencë te dokumenti origjinal.', sub: 'I trajnuar mbi raportet e Komisionit Evropian, ligjet vendore dhe analizat e shoqërisë civile. I përdorshëm me tekst ose me zë.', card_top: 'EU AGENT · SQ/EN/SR', card_action: 'Shkruaj pyetjen', card_hint: '↩ enter për të dërguar' },
    chat: { title: 'EU Agent', sub: 'Pyet diçka për reformat ose BE-në', greeting: 'Përshëndetje. Mund të të ndihmoj me reformën në administratë, sundimin e ligjit, luftën kundër korrupsionit dhe procesin e BE-së. Çfarë do të dije?', placeholder: 'Shkruaj pyetjen tënde…', send: 'Dërgo', sample: ['Çfarë është SAA?', 'Si raportohet korrupsioni?', 'Cilat janë kushtet për anëtarësim?'], auth: 'Vazhdo me Google për të ruajtur historinë' },
    footer: { tagline: 'Platformë informative dhe edukative për vizualizimin, analizën dhe kuptimin e procesit të integrimit europian të Kosovës.', about: 'euguide-ks është një iniciativë edukative e zhvilluar për të rritur qasjen në të dhëna dhe për të nxitur transparencën në procesin e integrimit europian përmes teknologjisë dhe të dhënave të hapura.', funded: 'Projekti u financua nga:', cols: { temat: 'Temat', burimet: 'Burimet', rreth: 'Rreth projektit' }, copy: '© 2026 · MIT-licensed open data · Hackathon Edition', built: 'euguide-ks.info · built for Kosovo · Hackathon May 2026' },
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
      cta1: 'Start here', cta2: 'Ask EU Agent',
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
    cta: { title_a: 'Ask', title_b: ', and EU Agent answers in Albanian, English or Serbian — with reference to the source document.', sub: 'Trained on EC reports, domestic laws and civil-society analysis. Works with text or voice.', card_top: 'EU AGENT · SQ/EN/SR', card_action: 'Type your question', card_hint: '↩ enter to send' },
    chat: { title: 'EU Agent', sub: 'Ask anything about reforms or the EU', greeting: 'Hello. I can help with public administration reform, rule of law, anti-corruption and the EU process. What would you like to know?', placeholder: 'Type your question…', send: 'Send', sample: ['What is the SAA?', 'How do I report corruption?', 'What are the membership conditions?'], auth: 'Continue with Google to save history' },
    footer: { tagline: 'An informative and educational platform for visualising, analysing and understanding Kosovo’s European integration process.', about: 'euguide-ks is an educational initiative developed to increase access to data and encourage transparency in the European integration process through technology and open data.', funded: 'Project funded by:', cols: { temat: 'Topics', burimet: 'Sources', rreth: 'About project' }, copy: '© 2026 · MIT-licensed open data · Hackathon Edition', built: 'euguide-ks.info · built for Kosovo · Hackathon May 2026' },
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
      cta1: 'Počni odavde', cta2: 'Pitaj EU Agent',
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
    cta: { title_a: 'Pitaj', title_b: ', a EU Agent odgovara na albanskom, engleskom ili srpskom — sa referencom na izvor.', sub: 'Obučen na izveštajima EK, domaćim zakonima i analizama civilnog društva. Radi sa tekstom ili glasom.', card_top: 'EU AGENT · SQ/EN/SR', card_action: 'Upiši pitanje', card_hint: '↩ enter za slanje' },
    chat: { title: 'EU Agent', sub: 'Pitaj bilo šta o reformama ili EU', greeting: 'Zdravo. Mogu vam pomoći sa reformom uprave, vladavinom prava, antikorupcijom i procesom EU. Šta želite da znate?', placeholder: 'Upišite pitanje…', send: 'Pošalji', sample: ['Šta je SSP?', 'Kako se prijavljuje korupcija?', 'Koji su uslovi za članstvo?'], auth: 'Nastavi sa Google nalogom da sačuvaš istoriju' },
    footer: { tagline: 'Informativna i edukativna platforma za vizualizaciju, analizu i razumevanje procesa evropskih integracija Kosova.', about: 'euguide-ks je edukativna inicijativa razvijena radi povećanja pristupa podacima i podsticanja transparentnosti u procesu evropskih integracija kroz tehnologiju i otvorene podatke.', funded: 'Projekat je finansiran od:', cols: { temat: 'Teme', burimet: 'Izvori', rreth: 'O projektu' }, copy: '© 2026 · MIT licencirani otvoreni podaci · Hackathon Edition', built: 'euguide-ks.info · napravljeno za Kosovo · Hackathon Maj 2026' },
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

const HOME_STATS = [
  { top: '1247', suffix: '', label_sq: 'ditë qysh nga aplikimi për anëtarësim', label_en: 'days since membership application', label_sr: 'dana od aplikacije', accent: 'var(--ink)' },
  { top: '43', suffix: '/100', label_sq: 'CPI 2025, +10 në 10 vjet', label_en: 'CPI 2025, +10 in 10 years', label_sr: 'CPI 2025, +10 za 10 godina', accent: 'var(--rust)' },
  { top: '6', suffix: '/12', label_sq: 'klasterë të hapur në negociata (objektiv)', label_en: 'open negotiation clusters (target)', label_sr: 'otvorenih klastera (cilj)', accent: 'var(--blue)' },
  { top: '0', suffix: '', label_sq: 'anëtarësime në BE që nga 2013', label_en: 'EU memberships since 2013', label_sr: 'EU pristupanja od 2013', accent: 'var(--gold)' },
];

const CPI = [
  { year: 2015, score: 33 }, { year: 2016, score: 36 }, { year: 2017, score: 39 },
  { year: 2018, score: 37 }, { year: 2019, score: 36 }, { year: 2020, score: 36 },
  { year: 2021, score: 39 }, { year: 2022, score: 41 }, { year: 2023, score: 41 },
  { year: 2024, score: 40 }, { year: 2025, score: 41 },
];

const REFORM = [
  { key: 'admin', label_sq: 'Administratë', label_en: 'Administration', label_sr: 'Uprava', value: 51, prev: 47 },
  { key: 'judiciary', label_sq: 'Drejtësi', label_en: 'Judiciary', label_sr: 'Pravosuđe', value: 35, prev: 31 },
  { key: 'anti_corr', label_sq: 'Antikorrupsion', label_en: 'Anti-corruption', label_sr: 'Antikorupcija', value: 30, prev: 26 },
  { key: 'economy', label_sq: 'Ekonomi', label_en: 'Economy', label_sr: 'Ekonomija', value: 57, prev: 54 },
  { key: 'rights', label_sq: 'Të drejta themelore', label_en: 'Fundamental rights', label_sr: 'Osnovna prava', value: 52, prev: 49 },
  { key: 'media', label_sq: 'Liria e medias', label_en: 'Media freedom', label_sr: 'Sloboda medija', value: 60, prev: 58 },
];

const CLUSTERS = [
  {
    code: 1, name_sq: 'Themelet', name_en: 'Fundamentals', name_sr: 'Osnove',
    color: 'var(--ink)', chapters: 7, weight: 22,
    desc_sq: 'Klasteri më i vështirë dhe më vendimtari. Hapet i pari në negociata dhe mbyllet i fundit. Nëse Kosova nuk shënon progres këtu, klasterët e tjerë mbeten të bllokuar.',
    desc_en: 'The hardest and most decisive cluster. Opens first in negotiations and closes last. Without progress here, the other clusters stay locked.',
    desc_sr: 'Najteži i odlučujući klaster. Prvi se otvara u pregovorima i poslednji se zatvara. Bez napretka ovde, ostali klasteri ostaju zaključani.',
    chapters_list_sq: ['Drejtësia dhe të drejtat themelore (Kap. 23)', 'Drejtësia, liria dhe siguria (Kap. 24)', 'Prokurimi publik (Kap. 5)', 'Statistikat (Kap. 18)', 'Kontrolli financiar (Kap. 32)', 'Funksionimi i institucioneve demokratike', 'Reforma e administratës publike'],
    chapters_list_en: ['Judiciary & fundamental rights (Ch. 23)', 'Justice, freedom & security (Ch. 24)', 'Public procurement (Ch. 5)', 'Statistics (Ch. 18)', 'Financial control (Ch. 32)', 'Functioning of democratic institutions', 'Public administration reform'],
    chapters_list_sr: ['Pravosuđe i osnovna prava (Pog. 23)', 'Pravda, sloboda i bezbednost (Pog. 24)', 'Javne nabavke (Pog. 5)', 'Statistika (Pog. 18)', 'Finansijska kontrola (Pog. 32)', 'Funkcionisanje demokratskih institucija', 'Reforma javne uprave'],
    status_sq: 'Ende i hapur · pa progres formal për Kosovën',
    status_en: 'Not yet opened · no formal progress for Kosovo',
    status_sr: 'Još nije otvoren · bez formalnog napretka za Kosovo',
  },
  {
    code: 2, name_sq: 'Tregu i brendshëm', name_en: 'Internal market', name_sr: 'Unutrašnje tržište',
    color: 'var(--blue)', chapters: 6, weight: 20,
    desc_sq: 'Liria për punë, mallra, kapital dhe shërbime mes shteteve të BE-së. Çdo qytetar i një anëtari mund të punojë e të bëjë biznes pa pengesa në 27 vende.',
    desc_en: 'Free movement of work, goods, capital and services across the EU. Any citizen of a member state can work and do business freely in 27 countries.',
    desc_sr: 'Sloboda rada, robe, kapitala i usluga širom EU. Svaki građanin članice može slobodno raditi i poslovati u 27 zemalja.',
    chapters_list_sq: ['Lëvizja e lirë e mallrave (Kap. 1)', 'Lëvizja e lirë e punëtorëve (Kap. 2)', 'E drejta e themelimit & shërbimet (Kap. 3)', 'Lëvizja e lirë e kapitalit (Kap. 4)', 'Ligji i shoqërive tregtare (Kap. 6)', 'Pronësia intelektuale (Kap. 7)'],
    chapters_list_en: ['Free movement of goods (Ch. 1)', 'Free movement of workers (Ch. 2)', 'Right of establishment & services (Ch. 3)', 'Free movement of capital (Ch. 4)', 'Company law (Ch. 6)', 'Intellectual property (Ch. 7)'],
    chapters_list_sr: ['Slobodno kretanje robe (Pog. 1)', 'Slobodno kretanje radnika (Pog. 2)', 'Pravo osnivanja i usluga (Pog. 3)', 'Slobodno kretanje kapitala (Pog. 4)', 'Pravo privrednih društava (Pog. 6)', 'Intelektualna svojina (Pog. 7)'],
    status_sq: 'I bllokuar derisa të hapen Themelet',
    status_en: 'Blocked until Fundamentals opens',
    status_sr: 'Blokiran dok se ne otvore Osnove',
  },
  {
    code: 3, name_sq: 'Konkurrueshmëria & rritja', name_en: 'Competitiveness & growth', name_sr: 'Konkurentnost i rast',
    color: 'var(--gold)', chapters: 8, weight: 18,
    desc_sq: 'Rregullat ekonomike: konkurrenca e drejtë, tatimet, politika e punësimit, arsimi, shkenca dhe shoqëria dixhitale. Pjesa që ndikon më shumë në paga e mundësi.',
    desc_en: 'Economic rules: fair competition, taxation, employment policy, education, science and the digital society. The part that affects wages and opportunities most.',
    desc_sr: 'Ekonomska pravila: poštena konkurencija, oporezivanje, politika zapošljavanja, obrazovanje, nauka i digitalno društvo. Deo koji najviše utiče na plate i prilike.',
    chapters_list_sq: ['Shoqëria e informacionit & media (Kap. 10)', 'Tatimi (Kap. 16)', 'Politika ekonomike & monetare (Kap. 17)', 'Politika sociale & punësimi (Kap. 19)', 'Politika industriale (Kap. 20)', 'Shkenca & kërkimi (Kap. 25)', 'Arsimi & kultura (Kap. 26)', 'Bashkimi doganor (Kap. 29)'],
    chapters_list_en: ['Information society & media (Ch. 10)', 'Taxation (Ch. 16)', 'Economic & monetary policy (Ch. 17)', 'Social policy & employment (Ch. 19)', 'Industrial policy (Ch. 20)', 'Science & research (Ch. 25)', 'Education & culture (Ch. 26)', 'Customs union (Ch. 29)'],
    chapters_list_sr: ['Informaciono društvo i mediji (Pog. 10)', 'Oporezivanje (Pog. 16)', 'Ekonomska i monetarna politika (Pog. 17)', 'Socijalna politika i zapošljavanje (Pog. 19)', 'Industrijska politika (Pog. 20)', 'Nauka i istraživanje (Pog. 25)', 'Obrazovanje i kultura (Pog. 26)', 'Carinska unija (Pog. 29)'],
    status_sq: 'Përgatitje teknike · pritet hapja pas statusit kandidat',
    status_en: 'Technical preparation · opening expected after candidate status',
    status_sr: 'Tehnička priprema · otvaranje očekivano nakon statusa kandidata',
  },
  {
    code: 4, name_sq: 'Agjenda e gjelbër', name_en: 'Green agenda', name_sr: 'Zelena agenda',
    color: 'var(--sage)', chapters: 5, weight: 14,
    desc_sq: 'Tranzicioni i Kosovës nga thëngjilli te energjia e ripërtëritshme, transporti i pastër dhe ujërat e mbeturinat sipas standardeve evropiane.',
    desc_en: 'Kosovo\'s transition from coal to renewable energy, clean transport and EU-standard water and waste management.',
    desc_sr: 'Tranzicija Kosova sa uglja na obnovljivu energiju, čisti transport i upravljanje vodama i otpadom po standardima EU.',
    chapters_list_sq: ['Transporti (Kap. 14)', 'Energjia (Kap. 15)', 'Rrjeti trans-evropian (Kap. 21)', 'Mjedisi dhe ndryshimet klimatike (Kap. 27)', 'Mbrojtja e konsumatorit & shëndeti (Kap. 28)'],
    chapters_list_en: ['Transport (Ch. 14)', 'Energy (Ch. 15)', 'Trans-European networks (Ch. 21)', 'Environment & climate change (Ch. 27)', 'Consumer & health protection (Ch. 28)'],
    chapters_list_sr: ['Transport (Pog. 14)', 'Energija (Pog. 15)', 'Trans-evropske mreže (Pog. 21)', 'Životna sredina i klimatske promene (Pog. 27)', 'Zaštita potrošača i zdravlje (Pog. 28)'],
    status_sq: 'Strategjia Energjetike 2022–2031 në zbatim',
    status_en: 'Energy Strategy 2022–2031 being implemented',
    status_sr: 'Energetska strategija 2022–2031 u sprovođenju',
  },
  {
    code: 5, name_sq: 'Burimet & bujqësia', name_en: 'Resources & agriculture', name_sr: 'Resursi i poljoprivreda',
    color: 'var(--rust)', chapters: 5, weight: 14,
    desc_sq: 'Bujqësia, peshkimi, zhvillimi rural dhe politika rajonale. Fondet strukturore të BE-së vijnë në sektorin më kompleks për të menaxhuar.',
    desc_en: 'Agriculture, fisheries, rural development and regional policy. EU structural funds flow into the sector that is hardest to administer.',
    desc_sr: 'Poljoprivreda, ribarstvo, ruralni razvoj i regionalna politika. Strukturni fondovi EU teku u sektor koji je najteže administrirati.',
    chapters_list_sq: ['Bujqësia & zhvillimi rural (Kap. 11)', 'Siguria ushqimore, veterinare & fitosanitare (Kap. 12)', 'Peshkimi (Kap. 13)', 'Politika rajonale & koordinimi i instrumenteve strukturore (Kap. 22)', 'Dispozita financiare e buxhetore (Kap. 33)'],
    chapters_list_en: ['Agriculture & rural development (Ch. 11)', 'Food safety, veterinary & phytosanitary (Ch. 12)', 'Fisheries (Ch. 13)', 'Regional policy & structural instruments (Ch. 22)', 'Financial & budgetary provisions (Ch. 33)'],
    chapters_list_sr: ['Poljoprivreda i ruralni razvoj (Pog. 11)', 'Bezbednost hrane, veterina i fitosanitarna (Pog. 12)', 'Ribarstvo (Pog. 13)', 'Regionalna politika i strukturni instrumenti (Pog. 22)', 'Finansijske i budžetske odredbe (Pog. 33)'],
    status_sq: 'IPARD III aktiv për fermerët kosovarë',
    status_en: 'IPARD III active for Kosovo farmers',
    status_sr: 'IPARD III aktivan za kosovske poljoprivrednike',
  },
  {
    code: 6, name_sq: 'Marrëdhënie të jashtme', name_en: 'External relations', name_sr: 'Spoljni odnosi',
    color: '#7A6D5A', chapters: 2, weight: 12,
    desc_sq: 'Përshtatja e politikës së jashtme dhe sigurisë me BE-në: sanksione të përbashkëta, marrëveshje tregtare dhe pjesëmarrje në misione paqeruajtëse.',
    desc_en: 'Aligning foreign and security policy with the EU: joint sanctions, trade agreements and participation in peacekeeping missions.',
    desc_sr: 'Usklađivanje spoljne i bezbednosne politike sa EU: zajedničke sankcije, trgovinski sporazumi i učešće u mirovnim misijama.',
    chapters_list_sq: ['Marrëdhënie të jashtme (Kap. 30)', 'Politika e jashtme, e sigurisë & e mbrojtjes (Kap. 31)'],
    chapters_list_en: ['External relations (Ch. 30)', 'Foreign, security & defence policy (Ch. 31)'],
    chapters_list_sr: ['Spoljni odnosi (Pog. 30)', 'Spoljna, bezbednosna i odbrambena politika (Pog. 31)'],
    status_sq: 'Përshtatje 90% me deklaratat e BE-së (raport EC 2024)',
    status_en: '90% alignment with EU declarations (EC 2024 report)',
    status_sr: '90% usklađenost sa izjavama EU (EK izveštaj 2024)',
  },
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
// Markdown renderer — converts links, bold, newlines in chat
// ============================================================
function renderMd(text) {
  if (!text) return null;
  // Split on markdown links [label](url) to process inline
  const parts = [];
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let last = 0;
  let m;
  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > last) parts.push(m.input.slice(last, m.index));
    parts.push({ label: m[1], url: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return parts.map((part, i) => {
    if (typeof part === 'object') {
      return (
        <a key={i} href={part.url} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--gold)', textDecoration: 'underline', wordBreak: 'break-word' }}>
          {part.label}
        </a>
      );
    }
    // Process **bold** and newlines in plain text segments
    return part.split(/(\*\*[^*]+\*\*|\n)/).map((seg, j) => {
      if (seg === '\n') return <br key={j} />;
      if (seg.startsWith('**') && seg.endsWith('**')) return <strong key={j}>{seg.slice(2, -2)}</strong>;
      return seg;
    });
  });
}

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
  const topics = useCmsArray('topics', TOPICS);
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
          {topics.map((topic, i) => {
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
  const data = useCmsArray('region', REGION);
  const max = 100;
  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
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
                  <Reveal key={c.code} delay={i * 70} distance={12} className="region-row" style={{
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
                  }}>
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
                  </Reveal>
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
  const data = useCmsArray('cpi', CPI);
  const [hover, setHover] = useState(null);
  const W = 800, H = 320, P = { l: 50, r: 30, t: 30, b: 40 };
  const minY = 25, maxY = 50;
  const xScale = i => P.l + (i / (data.length - 1)) * (W - P.l - P.r);
  const yScale = v => P.t + (1 - (v - minY) / (maxY - minY)) * (H - P.t - P.b);

  const linePath = data.map((d, i) => (i === 0 ? 'M' : 'L') + xScale(i) + ' ' + yScale(d.score)).join(' ');
  const areaPath = linePath + ` L ${xScale(data.length - 1)} ${H - P.b} L ${xScale(0)} ${H - P.b} Z`;

  // Horizontal wipe reveal on scroll-in
  const [chartRef, chartInView] = useInView({ threshold: 0.25 });
  const [clipW, setClipW] = React.useState(0);
  React.useEffect(() => {
    if (!chartInView) return;
    if (prefersReducedMotion()) { setClipW(W); return; }
    const start = performance.now();
    const duration = 1500;
    let raf = 0;
    const tick = (nowTs) => {
      const t = Math.min(1, (nowTs - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setClipW(W * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [chartInView, W]);

  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container">
        <SectionHead eyebrow={t.chart1.eyebrow} title={t.chart1.title} sub={t.chart1.sub} num="02" />
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 56 }} className="cpi-grid">
          <div style={{ background: 'var(--paper-2)', padding: '32px 24px 24px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>CPI · 0–100</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>2015 → 2025</span>
            </div>
            <svg ref={chartRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseLeave={() => setHover(null)}>
              <defs>
                <clipPath id="cpi-reveal-clip">
                  <rect x="0" y="0" width={clipW} height={H} />
                </clipPath>
              </defs>
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
              {/* clipped: area + line + points + annotation reveal left-to-right */}
              <g clipPath="url(#cpi-reveal-clip)">
                {/* area */}
                <path d={areaPath} fill="var(--rust)" opacity="0.12" />
                {/* line */}
                <path d={linePath} fill="none" stroke="var(--rust)" strokeWidth="2" />
                {/* points (visible circles) */}
                {data.map((d, i) => (
                  <circle key={d.year} cx={xScale(i)} cy={yScale(d.score)} r={hover === i ? 6 : 3} fill="var(--paper)" stroke="var(--rust)" strokeWidth="2" style={{ transition: 'r 160ms' }} />
                ))}
                {/* annotation: visa liberalization */}
                <g>
                  <line x1={xScale(8)} y1={yScale(data[8].score)} x2={xScale(8)} y2={P.t + 12} stroke="var(--ink-2)" strokeWidth="1" />
                  <text x={xScale(8) + 6} y={P.t + 16} className="mono" style={{ fontSize: 10, fill: 'var(--ink-2)' }}>liberalizimi i vizave</text>
                </g>
              </g>
              {/* hit-test rects + hover tooltip stay above the clip so hover keeps working */}
              {data.map((d, i) => (
                <rect key={`hit-${d.year}`} x={xScale(i) - 18} y="0" width="36" height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
              ))}
              {hover !== null && (
                <g>
                  <line x1={xScale(hover)} y1={P.t} x2={xScale(hover)} y2={H - P.b} stroke="var(--ink-2)" strokeDasharray="2 3" strokeWidth="1" />
                  <rect x={xScale(hover) - 38} y={yScale(data[hover].score) - 36} width="76" height="26" fill="var(--ink)" />
                  <text x={xScale(hover)} y={yScale(data[hover].score) - 19} className="mono" style={{ fontSize: 11, fill: 'var(--paper)', textAnchor: 'middle' }}>
                    {data[hover].year} · {data[hover].score}
                  </text>
                </g>
              )}
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
  const cmsClusters = useCmsArray('clusters', CLUSTERS);
  const data = cmsClusters.map((row, idx) => {
    const fallback = CLUSTERS.find(c => String(c.code) === String(row.code)) || CLUSTERS[idx] || {};
    const definedRow = Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    return {
      ...fallback,
      ...definedRow,
      desc_sq: row.desc_sq || row.description_sq || fallback.desc_sq,
      desc_en: row.desc_en || row.description_en || fallback.desc_en,
      desc_sr: row.desc_sr || row.description_sr || fallback.desc_sr,
      chapters_list_sq: row.chapters_list_sq || fallback.chapters_list_sq,
      chapters_list_en: row.chapters_list_en || fallback.chapters_list_en,
      chapters_list_sr: row.chapters_list_sr || fallback.chapters_list_sr,
      status_sq: row.status_sq || fallback.status_sq,
      status_en: row.status_en || fallback.status_en,
      status_sr: row.status_sr || fallback.status_sr,
    };
  });
  const total = data.reduce((s, c) => s + c.weight, 0);
  const totalChapters = data.reduce((s, c) => s + c.chapters, 0);
  /* Larger inner radius + centered label group so center copy stays inside the hole (no overlap on slices). */
  const R = 110, IR = 84, CX = 150, CY = 150;
  let acc = 0;
  const slices = data.map(c => {
    const a0 = (acc / total) * 2 * Math.PI;
    acc += c.weight;
    const a1 = (acc / total) * 2 * Math.PI;
    return { ...c, a0: a0 - Math.PI / 2, a1: a1 - Math.PI / 2 };
  });

  const [active, setActive] = useState(0);
  const cur = data[active];
  const curName = cur['name_' + lang] || cur.name_sq;
  const curDesc = cur['desc_' + lang] || cur.desc_sq;
  const curChapters = cur['chapters_list_' + lang] || cur.chapters_list_sq || [];
  const curStatus = cur['status_' + lang] || cur.status_sq;

  const labels = {
    sq: { intro: 'Klikoni një klaster për të parë çfarë përmban', whatInside: 'Çfarë përfshihet', kosStatus: 'Statusi për Kosovën', weight: 'pesha në negociata', chapters: 'kapituj' },
    en: { intro: 'Click a cluster to see what it contains', whatInside: 'What it covers', kosStatus: 'Status for Kosovo', weight: 'negotiation weight', chapters: 'chapters' },
    sr: { intro: 'Kliknite klaster da vidite šta sadrži', whatInside: 'Šta pokriva', kosStatus: 'Status za Kosovo', weight: 'pregovaračka težina', chapters: 'poglavlja' },
  }[lang] || {};

  const arcPath = (a0, a1, r, ir) => {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = CX + r * Math.cos(a0), y0 = CY + r * Math.sin(a0);
    const x1 = CX + r * Math.cos(a1), y1 = CY + r * Math.sin(a1);
    const x2 = CX + ir * Math.cos(a1), y2 = CY + ir * Math.sin(a1);
    const x3 = CX + ir * Math.cos(a0), y3 = CY + ir * Math.sin(a0);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${ir} ${ir} 0 ${large} 0 ${x3} ${y3} Z`;
  };

  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div className="container">
        <SectionHead eyebrow={t.cluster.eyebrow} title={t.cluster.title} sub={t.cluster.sub} num="03" />

        <div className="cluster-grid" style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 48, alignItems: 'start' }}>
          {/* LEFT — donut + total stats */}
          <div>
            <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 380, display: 'block', margin: '0 auto' }} aria-label={t.cluster.eyebrow}>
              {slices.map((s, i) => (
                <path key={i} d={arcPath(s.a0, s.a1, i === active ? R + 8 : R, IR)} fill={s.color}
                  opacity={i === active ? 1 : 0.78}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  tabIndex={0}
                  style={{ cursor: 'pointer', transition: 'd 200ms, opacity 200ms', outline: 'none' }} />
              ))}
              <circle cx={CX} cy={CY} r={IR - 1} fill="var(--paper)" pointerEvents="none" aria-hidden="true" />
              <g transform={`translate(${CX},${CY})`} style={{ pointerEvents: 'none' }}>
                <text textAnchor="middle" y={-40} className="mono" style={{ fontSize: 8, fill: 'var(--ink-3)', letterSpacing: '0.16em' }}>{(t.cluster && t.cluster.cluster_label) || 'KLASTERI'}</text>
                <text textAnchor="middle" dominantBaseline="central" y={-4} className="serif" style={{ fontSize: 44, fill: cur.color === 'var(--ink)' ? 'var(--ink)' : cur.color, fontStyle: 'italic' }}>{cur.code}</text>
                <text textAnchor="middle" y={22} className="mono" style={{ fontSize: 10, fill: 'var(--ink-3)' }}>{cur.chapters} {labels.chapters}</text>
                <text textAnchor="middle" y={34} className="mono" style={{ fontSize: 8, fill: 'var(--ink-3)', letterSpacing: '0.03em' }}>
                  <tspan x={0}>{cur.weight}%</tspan>
                  <tspan x={0} dy={12} style={{ fontSize: 7.5 }}>{labels.weight}</tspan>
                </text>
              </g>
            </svg>

            {/* Cluster list (compact tabs) */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
              {data.map((c, i) => {
                const name = c['name_' + lang] || c.name_sq;
                const isActive = i === active;
                return (
                  <button key={c.code}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => setActive(i)}
                    style={{
                      background: isActive ? 'var(--paper-2)' : 'var(--paper)',
                      border: 'none', textAlign: 'left', cursor: 'pointer',
                      padding: '12px 16px',
                      display: 'grid', gridTemplateColumns: '6px 24px 1fr 48px', gap: 12, alignItems: 'center',
                      transition: 'background 160ms',
                    }}>
                    <span style={{ width: 4, height: 24, background: isActive ? c.color : 'transparent', borderRadius: 2 }} />
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>0{c.code}</span>
                    <span className="serif" style={{ fontSize: 18, color: 'var(--ink)', lineHeight: 1.15 }}>{name}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'right' }}>{c.chapters} kap.</span>
                  </button>
                );
              })}
            </div>
            <div className="mono" style={{ marginTop: 14, fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textAlign: 'center' }}>
              {totalChapters} {labels.chapters} · {data.length} klasterë
            </div>
          </div>

          {/* RIGHT — detail panel for active cluster */}
          <article key={cur.code} className="cluster-detail" style={{
            background: 'var(--paper-2)', border: '1px solid var(--line)',
            padding: '32px 30px', position: 'relative', overflow: 'hidden',
          }}>
            <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: cur.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
              <div className="mono" style={{ fontSize: 11, color: cur.color === 'var(--ink)' ? 'var(--ink)' : cur.color, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Klaster 0{cur.code}
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>
                {cur.chapters} {labels.chapters} · {cur.weight}% {labels.weight}
              </div>
            </div>
            <h3 className="serif" style={{ fontSize: 'clamp(28px, 3.4vw, 40px)', lineHeight: 1.06, color: 'var(--ink)', marginBottom: 14 }}>{curName}</h3>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)', marginTop: 0, marginBottom: 24 }}>{curDesc}</p>

            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
              {labels.whatInside}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 18px' }}>
              {curChapters.map((ch, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.45 }}>
                  <span className="mono" style={{ color: cur.color, flexShrink: 0, fontSize: 11, marginTop: 2 }}>→</span>
                  <span>{ch}</span>
                </li>
              ))}
            </ul>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                {labels.kosStatus}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--paper)', border: `1px solid ${cur.color}`, padding: '8px 14px' }}>
                <span style={{ width: 8, height: 8, background: cur.color, borderRadius: '50%' }} />
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>{curStatus}</span>
              </div>
            </div>
          </article>
        </div>

        <div className="mono" style={{ marginTop: 28, fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em', textAlign: 'center' }}>
          {labels.intro}
        </div>
      </div>
      <style>{`
        @media (max-width: 980px) {
          .cluster-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .cluster-detail ul { grid-template-columns: 1fr !important; }
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
  const objs = useCmsArray('objectives', OBJECTIVES);

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
  const items = useCmsArray('infographics', INFOGRAPHICS);
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
  const faqData = useCmsArray('faq', FAQ_DATA);
  const list = faqData.filter(f => cat === 'all' || f.cat === cat);

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
    const h = location.hash.replace(/^#\/?/, '');
    if (h) return h;
    const path = location.pathname.replace(/^\/+/, '').split('/')[0];
    return path || 'home';
  };
  // Always start with 'home' for SSR hydration, then sync in useEffect
  const [route, setRoute] = useState('home');
  useEffect(() => {
    setRoute(parse());
    const onHash = () => {
      setRoute(parse());
      scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    };
    addEventListener('hashchange', onHash);
    addEventListener('popstate', onHash);
    return () => {
      removeEventListener('hashchange', onHash);
      removeEventListener('popstate', onHash);
    };
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
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let lastY = typeof window !== 'undefined' ? window.scrollY : 0;
    let ticking = false;
    const handle = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      // Always show near the top
      if (y < 80) {
        setHidden(false);
        lastY = y;
      } else {
        const delta = y - lastY;
        // Only update lastY when we actually cross a threshold,
        // so slow scrolls accumulate into a direction change.
        if (delta > 6) {
          setHidden(true);
          lastY = y;
        } else if (delta < -6) {
          setHidden(false);
          lastY = y;
        }
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(handle);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { key: 'reforma', href: '#/reforma' },
    { key: 'sundimi', href: '#/sundimi' },
    { key: 'korrupsioni', href: '#/korrupsioni' },
    { key: 'be', href: '#/be' },
    { key: 'faq', href: '#/faq' },
  ];

  return (
    <header className="site-header" data-hidden={hidden ? 'true' : 'false'} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: scrolled ? 'rgba(242,239,232,0.92)' : 'var(--paper)',
      backdropFilter: scrolled ? 'blur(8px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
      transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
      transition: 'transform 260ms cubic-bezier(.2,.7,.2,1), background 240ms ease, border-color 240ms ease, backdrop-filter 240ms ease',
      willChange: 'transform',
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
                EU Agent
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

function getBreadcrumbItems(route, t, lang) {
  const copy = {
    sq: {
      home: 'HOME',
      standards: 'Standardet',
      objectives: 'Objektivat e integrimit',
      constitution: 'Kushtetuta',
      fundamental: 'Ligjet themelore',
      catalog: 'Ligjet tjera',
      infographics: 'Infografika',
      privacy: 'Politika e privatësisë',
      terms: 'Kushtet e përdorimit',
      accessibility: 'Aksesueshmëria',
      sources: 'Standardi i burimeve',
    },
    en: {
      home: 'HOME',
      standards: 'Standards',
      objectives: 'Integration objectives',
      constitution: 'Constitution',
      fundamental: 'Fundamental laws',
      catalog: 'Other laws',
      infographics: 'Infographics',
      privacy: 'Privacy Policy',
      terms: 'Terms of Use',
      accessibility: 'Accessibility',
      sources: 'Sources standard',
    },
    sr: {
      home: 'POČETNA',
      standards: 'Standardi',
      objectives: 'Ciljevi integracije',
      constitution: 'Ustav',
      fundamental: 'Osnovni zakoni',
      catalog: 'Ostali zakoni',
      infographics: 'Infografike',
      privacy: 'Politika privatnosti',
      terms: 'Uslovi korišćenja',
      accessibility: 'Pristupačnost',
      sources: 'Standard izvora',
    },
  }[lang] || {};

  const topicLabels = {
    reforma: t.nav.reforma,
    sundimi: t.nav.sundimi,
    korrupsioni: t.nav.korrupsioni,
    be: t.nav.be,
    faq: t.nav.faq,
    kosova: t.nav.kosova,
  };
  const root = { label: copy.home || t.crumb_home || 'HOME', href: '#/' };
  const routes = {
    reforma: [root, { label: topicLabels.reforma, href: '#/reforma' }],
    sundimi: [root, { label: topicLabels.sundimi, href: '#/sundimi' }],
    korrupsioni: [root, { label: topicLabels.korrupsioni, href: '#/korrupsioni' }],
    be: [root, { label: topicLabels.be, href: '#/be' }],
    faq: [root, { label: topicLabels.faq, href: '#/faq' }],
    kosova: [root, { label: topicLabels.kosova, href: '#/kosova' }],
    infografika: [root, { label: copy.infographics || 'Infografika', href: '#/infografika' }],
    objektivat: [root, { label: topicLabels.be, href: '#/be' }, { label: copy.objectives || t.nav.objektivat, href: '#/objektivat' }],
    kushtetuta: [root, { label: topicLabels.sundimi, href: '#/sundimi' }, { label: copy.constitution || 'Kushtetuta', href: '#/kushtetuta' }],
    'ligjet-themelore': [root, { label: topicLabels.sundimi, href: '#/sundimi' }, { label: copy.fundamental || 'Ligjet themelore', href: '#/ligjet-themelore' }],
    'katalogu-materialeve': [root, { label: topicLabels.sundimi, href: '#/sundimi' }, { label: copy.catalog || 'Ligjet tjera', href: '#/katalogu-materialeve' }],
    privatesia: [root, { label: copy.standards || 'Standardet', href: '#/burimet' }, { label: copy.privacy || 'Politika e privatësisë', href: '#/privatesia' }],
    kushtet: [root, { label: copy.standards || 'Standardet', href: '#/burimet' }, { label: copy.terms || 'Kushtet e përdorimit', href: '#/kushtet' }],
    aksesueshmeria: [root, { label: copy.standards || 'Standardet', href: '#/burimet' }, { label: copy.accessibility || 'Aksesueshmëria', href: '#/aksesueshmeria' }],
    burimet: [root, { label: copy.standards || 'Standardet', href: '#/burimet' }, { label: copy.sources || 'Standardi i burimeve', href: '#/burimet' }],
  };
  return routes[route] || [];
}

function PageBreadcrumb({ route, t, lang }) {
  const items = getBreadcrumbItems(route, t, lang);
  if (!items.length || route === 'home') return null;
  return (
    <div style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
      <nav className="container page-breadcrumb mono" aria-label="Breadcrumb" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 42,
        padding: '0 32px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
      }}>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${item.href}-${i}`}>
              {i > 0 && <span style={{ color: 'var(--rust)', opacity: 0.75 }}>→</span>}
              <a href={item.href} aria-current={last ? 'page' : undefined} style={{
                color: last ? 'var(--ink)' : 'var(--ink-3)',
                pointerEvents: last ? 'none' : 'auto',
                fontWeight: last ? 700 : 500,
              }}>
                {item.label}
              </a>
            </Fragment>
          );
        })}
      </nav>
      <style>{`
        @media (max-width: 620px) {
          .page-breadcrumb { padding: 0 20px !important; min-height: 38px !important; font-size: 9px !important; }
        }
      `}</style>
    </div>
  );
}

function Logo() {
  return (
    <img
      src="/eu-kosovo-logo.png"
      alt="EU Guide Kosovo logo"
      width="44"
      height="41"
      style={{ display: 'block', objectFit: 'contain', flex: '0 0 auto' }}
    />
  );
}

// ============================================================
// Hero
// ============================================================
function Hero({ lang, t, onChat }) {
  const initialNow = new Date('2026-05-13T00:00:00Z').getTime();
  const [now, setNow] = useState(initialNow);
  const [timelineRef, timelineInView] = useInView({ threshold: 0.3 });
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
        <Reveal delay={0} distance={10} className="hero-tag-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 56, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--rust)', animation: 'pulse 2s ease infinite' }} />
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t.hero.tag}</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
            Prishtinë · Bruxelles · 41°N 21°E
          </div>
        </Reveal>

        {/* Title — big editorial */}
        <Reveal as="h1" delay={120} distance={16} className="serif" style={{
          fontSize: 'clamp(38px, 6.6vw, 96px)',
          lineHeight: 0.96,
          color: 'var(--ink)',
          letterSpacing: '-0.018em',
          marginBottom: 30,
        }}>
          {t.hero.title_a}
          <span style={{ fontStyle: 'italic', color: 'var(--blue)' }}>{t.hero.title_b}</span>
          {t.hero.title_c}
        </Reveal>

        {/* Hero grid: blurb + meta panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 64, marginTop: 56 }} className="hero-grid">
          <Reveal delay={240}>
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
          </Reveal>

          {/* meta panel — the journey ticker */}
          <Reveal delay={340} distance={22} style={{
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
                <span className="serif" style={{ fontSize: 72, lineHeight: 0.9, color: 'var(--ink)' }}>{days}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', animation: 'blink 1s step-end infinite' }}>▍</span>
              </div>
            </div>

            {/* mini timeline */}
            <div ref={timelineRef} style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', position: 'relative', height: 50 }}>
                {[
                  { y: '2016', label: 'SAA', filled: true },
                  { y: '2022', label: 'aplikoi', filled: true },
                  { y: '2024', label: 'viza', filled: true },
                  { y: '2026', label: 'sot', filled: true, current: true },
                  { y: '2027', label: 'kandidat?', filled: false },
                  { y: '20?', label: 'anëtarësia', filled: false },
                ].map((step, i, arr) => {
                  const stepDelay = i * 140;
                  return (
                  <div key={i} style={{ flex: 1, position: 'relative' }}>
                    <div style={{
                      position: 'absolute', top: 6, left: 0, right: i === arr.length - 1 ? '50%' : 0,
                      height: 2,
                      background: step.filled && arr[i + 1] && arr[i + 1].filled ? 'var(--ink)' : (step.filled ? 'linear-gradient(to right, var(--ink), var(--paper-3))' : 'var(--paper-3)'),
                      transform: timelineInView ? 'scaleX(1)' : 'scaleX(0)',
                      transformOrigin: 'left',
                      transition: `transform 380ms cubic-bezier(.2,.7,.2,1) ${stepDelay}ms`,
                    }} />
                    <div style={{
                      position: 'relative', width: 14, height: 14, borderRadius: '50%',
                      background: step.filled ? (step.current ? 'var(--rust)' : 'var(--ink)') : 'var(--paper)',
                      border: '2px solid var(--ink)', margin: '0 auto', zIndex: 2,
                      transform: timelineInView ? 'scale(1)' : 'scale(0)',
                      transition: `transform 360ms cubic-bezier(.2,.9,.3,1.3) ${stepDelay + 120}ms`,
                    }} />
                    <div className="mono" style={{
                      fontSize: 9, color: 'var(--ink-3)', textAlign: 'center', marginTop: 6, letterSpacing: '0.05em',
                      opacity: timelineInView ? 1 : 0,
                      transition: `opacity 300ms ease ${stepDelay + 220}ms`,
                    }}>{step.y}</div>
                    <div className="mono" style={{
                      fontSize: 9, color: step.current ? 'var(--rust)' : 'var(--ink-2)', textAlign: 'center', marginTop: 2,
                      opacity: timelineInView ? 1 : 0,
                      transition: `opacity 300ms ease ${stepDelay + 280}ms`,
                    }}>{step.label}</div>
                  </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px dashed var(--line)', paddingTop: 14, marginTop: 24 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{t.hero.meta_c.toUpperCase()}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--rust)' }}>● {t.hero.meta_d}</span>
            </div>
          </Reveal>
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
        <Reveal delay={0}>
          <h2 className="serif" style={{ fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.02, color: 'var(--ink)', maxWidth: 700 }}>
            <span style={{ fontStyle: 'italic', color: 'var(--blue)' }}>Pyet</span>, dhe EU Agent përgjigjet në shqip, anglisht ose serbisht — me referencë te dokumenti origjinal.
          </h2>
          <p style={{ fontSize: 17, color: 'var(--ink-2)', marginTop: 24, maxWidth: 560 }}>
            I trajnuar mbi raportet e Komisionit Evropian, ligjet vendore dhe analizat e shoqërisë civile. I përdorshëm me tekst ose me zë.
          </p>
        </Reveal>
        <Reveal delay={140} distance={22}>
          <button onClick={onChat} style={{
            background: 'var(--ink)', color: 'var(--paper)',
            border: 'none', width: '100%', padding: '28px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
            textAlign: 'left',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em' }}>EU AGENT · SQ/EN/SR</span>
              <span style={{ display: 'inline-flex', width: 28, height: 28, alignItems: 'center', justifyContent: 'center', border: '1px solid var(--paper)', borderRadius: '50%' }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 10 L10 2 M10 2 H4 M10 2 V8" stroke="currentColor" strokeWidth="1.2" /></svg>
              </span>
            </div>
            <span className="serif" style={{ fontSize: 32, lineHeight: 1, marginTop: 24 }}>Shkruaj pyetjen</span>
            <span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>↩ enter për të dërguar</span>
          </button>
        </Reveal>
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
  const topicItems = [
    { label: t.nav.reforma, href: '#/reforma' },
    { label: t.nav.sundimi, href: '#/sundimi' },
    { label: t.nav.korrupsioni, href: '#/korrupsioni' },
    { label: t.nav.be, href: '#/be' },
  ];
  const footerLegalCopy = {
    sq: {
      legalTitle: 'Standardet',
      ecReports: 'Raportet EC',
      ombudsperson: 'Avokati i Popullit',
      sources: 'Standardi i burimeve',
      privacy: 'Politika e privatësisë',
      terms: 'Kushtet e përdorimit',
      accessibility: 'Aksesueshmëria',
    },
    en: {
      legalTitle: 'Standards',
      ecReports: 'EC reports',
      ombudsperson: 'Ombudsperson',
      sources: 'Sources standard',
      privacy: 'Privacy Policy',
      terms: 'Terms of Use',
      accessibility: 'Accessibility',
    },
    sr: {
      legalTitle: 'Standardi',
      ecReports: 'Izveštaji EK',
      ombudsperson: 'Ombudsman',
      sources: 'Standard izvora',
      privacy: 'Politika privatnosti',
      terms: 'Uslovi korišćenja',
      accessibility: 'Pristupačnost',
    },
  }[lang] || {};
  const resourceItems = [
    { label: footerLegalCopy.ecReports || 'Raportet EC', url: 'https://neighbourhood-enlargement.ec.europa.eu/enlargement-policy/strategy-and-reports_en' },
    { label: 'SAA', url: 'https://mei-ks.net/sq/marreveshja-e-stabilizim-asociimit-msa' },
    { label: 'TI-CPI', url: 'https://www.transparency.org/en/countries/kosovo' },
    { label: 'OSBE / OSCE', url: 'https://www.osce.org/mission-in-kosovo' },
    { label: footerLegalCopy.ombudsperson || 'Avokati i Popullit', url: 'https://www.oik-ks.org/' },
  ];
  const legalItems = [
    { label: footerLegalCopy.sources || 'Standardi i burimeve', href: '#/burimet' },
    { label: footerLegalCopy.privacy || 'Politika e privatësisë', href: '#/privatesia' },
    { label: footerLegalCopy.terms || 'Kushtet e përdorimit', href: '#/kushtet' },
    { label: footerLegalCopy.accessibility || 'Aksesueshmëria', href: '#/aksesueshmeria' },
  ];

  return (
    <footer style={{ padding: '58px 0 0', borderTop: '1px solid rgba(242,239,232,0.12)', background: '#071421', color: 'var(--paper)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.8fr 1fr 1fr 1.05fr', gap: 44, alignItems: 'start' }} className="foot-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <Logo />
              <span className="serif" style={{ fontSize: 31, color: '#F6F0E6', lineHeight: 1 }}>euguide<span style={{ color: 'rgba(199,173,112,0.72)' }}>-ks</span></span>
            </div>
            <p style={{ fontSize: 14, color: 'rgba(242,239,232,0.62)', maxWidth: 310, lineHeight: 1.75, margin: 0 }}>{t.footer.tagline}</p>
          </div>
          <FootCol title={t.footer.cols.temat} items={topicItems} />
          <FootCol title={t.footer.cols.burimet} items={resourceItems} />
          <FootCol title={footerLegalCopy.legalTitle || 'Standardet'} items={legalItems} />
          <div>
            <FooterTitle>{t.footer.cols.rreth}</FooterTitle>
            <p style={{ fontSize: 14, color: 'rgba(242,239,232,0.62)', lineHeight: 1.75, margin: 0 }}>{t.footer.about}</p>
          </div>
        </div>

        <div style={{ marginTop: 42 }} className="mono">
          <span style={{ display: 'block', fontSize: 11, color: 'rgba(242,239,232,0.62)', letterSpacing: '0.08em' }}>
              {t.footer.copy}
          </span>
        </div>

        <div style={{ marginTop: 28, padding: '24px 0 28px', borderTop: '1px solid rgba(242,239,232,0.12)', textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 11, color: 'rgba(242,239,232,0.68)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18, fontWeight: 700 }}>
            {t.footer.funded}
          </div>
          <div className="funding-logos" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 34, flexWrap: 'wrap' }}>
            <FundingLogo type="eu" />
            <FundingDivider />
            <FundingLogo type="ko" />
            <FundingDivider />
            <FundingLogo type="aab" />
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .foot-grid { grid-template-columns: 1fr 1fr !important; gap: 36px !important; }
          .funding-logos { gap: 22px !important; }
        }
        @media (max-width: 620px) {
          .foot-grid { grid-template-columns: 1fr !important; }
          .footer-funding-divider { display: none !important; }
        }
      `}</style>
    </footer>
  );
}

function FooterTitle({ children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="mono" style={{ fontSize: 12, color: 'rgba(242,239,232,0.7)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>{children}</div>
      <div style={{ width: 24, height: 1, background: 'rgba(199,173,112,0.78)', marginTop: 10 }} />
    </div>
  );
}

function FootCol({ title, items }) {
  return (
    <div>
      <FooterTitle>{title}</FooterTitle>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map((it) => {
          const item = typeof it === 'string' ? { label: it } : it;
          const href = item.url || item.href;
          const isExternal = Boolean(item.url);
          return (
            <li key={item.label}>
              {href ? (
                <a href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noreferrer' : undefined} style={{ fontSize: 14, color: 'rgba(242,239,232,0.72)', textDecoration: 'none' }}>{item.label}</a>
              ) : (
                <span style={{ fontSize: 14, color: 'rgba(242,239,232,0.72)' }}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FundingDivider() {
  return <span className="footer-funding-divider" style={{ width: 1, height: 46, background: 'rgba(242,239,232,0.16)', display: 'inline-block' }} />;
}

function FundingLogo({ type }) {
  if (type === 'eu') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 174 }}>
        <div style={{ width: 64, height: 42, background: '#244C9A', border: '1px solid rgba(242,239,232,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="42" height="30" viewBox="0 0 42 30" fill="none" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
              const cx = stableNum(21 + 10 * Math.cos(a));
              const cy = stableNum(15 + 10 * Math.sin(a));
              return <circle key={i} cx={cx} cy={cy} r="1.2" fill="#F4D35E" />;
            })}
          </svg>
        </div>
        <div style={{ color: 'rgba(242,239,232,0.88)', fontSize: 12, lineHeight: 1.25, textAlign: 'left', fontWeight: 700 }}>
          Co-funded by<br />the European Union
        </div>
      </div>
    );
  }

  if (type === 'ko') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 188 }}>
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
          <circle cx="21" cy="21" r="18" stroke="rgba(242,239,232,0.92)" strokeWidth="4" />
          <path d="M5 21H37M21 3C15 8 12 14 12 21C12 28 15 34 21 39M21 3C27 8 30 14 30 21C30 28 27 34 21 39" stroke="rgba(242,239,232,0.92)" strokeWidth="2" />
        </svg>
        <div style={{ color: 'rgba(242,239,232,0.92)', textAlign: 'left', lineHeight: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>KO-in-EU</div>
          <div style={{ fontSize: 9, color: 'rgba(242,239,232,0.62)', marginTop: 4 }}>Shaping Kosovo's EU Future</div>
        </div>
      </div>
    );
  }

  return (
    <img
      src="/kolegji-aab-logo.png"
      alt="Kolegji AAB"
      width="300"
      height="70"
      style={{ display: 'block', width: 300, maxWidth: '70vw', height: 'auto', objectFit: 'contain' }}
    />
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

  // Vapi voice state
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('idle'); // idle | connecting | listening | speaking
  const [volumeLevel, setVolumeLevel] = useState(0);
  const vapiRef = useRef(null);

  // Initialize Vapi lazily
  const getVapi = useCallback(async () => {
    if (vapiRef.current) return vapiRef.current;
    const { default: Vapi } = await import('@vapi-ai/web');
    const token = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!token) {
      console.warn('NEXT_PUBLIC_VAPI_PUBLIC_KEY not set');
      return null;
    }
    const vapi = new Vapi(token);

    vapi.on('call-start', () => {
      setVoiceStatus('listening');
    });
    vapi.on('call-end', () => {
      setVoiceStatus('idle');
      setVoiceActive(false);
      setVolumeLevel(0);
    });
    vapi.on('speech-start', () => {
      setVoiceStatus('speaking');
    });
    vapi.on('speech-end', () => {
      setVoiceStatus('listening');
    });
    vapi.on('volume-level', (level) => {
      setVolumeLevel(level);
    });
    vapi.on('error', (err) => {
      console.error('Vapi error:', err);
      setVoiceStatus('idle');
      setVoiceActive(false);
      setVolumeLevel(0);
    });
    // Track partial transcripts to avoid duplicates
    let lastUserPartial = '';
    let lastBotPartial = '';

    // Capture all transcripts — both user and assistant
    vapi.on('message', (msg) => {
      // Final transcripts → add to chat
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        const text = (msg.transcript || '').trim();
        if (!text) return;
        if (msg.role === 'user') {
          // Remove partial if exists, add final
          setMsgs(m => {
            const filtered = m.filter(x => x._partialUser !== true);
            return [...filtered, { role: 'user', text }];
          });
          lastUserPartial = '';
        } else if (msg.role === 'assistant' || msg.role === 'bot') {
          setMsgs(m => {
            const filtered = m.filter(x => x._partialBot !== true);
            return [...filtered, { role: 'assistant', text }];
          });
          lastBotPartial = '';
        }
      }
      // Partial transcripts → show live typing
      if (msg.type === 'transcript' && msg.transcriptType === 'partial') {
        const text = (msg.transcript || '').trim();
        if (!text) return;
        if (msg.role === 'user' && text !== lastUserPartial) {
          lastUserPartial = text;
          setMsgs(m => {
            const filtered = m.filter(x => x._partialUser !== true);
            return [...filtered, { role: 'user', text, _partialUser: true }];
          });
        } else if ((msg.role === 'assistant' || msg.role === 'bot') && text !== lastBotPartial) {
          lastBotPartial = text;
          setMsgs(m => {
            const filtered = m.filter(x => x._partialBot !== true);
            return [...filtered, { role: 'assistant', text, _partialBot: true }];
          });
        }
      }
    });

    vapiRef.current = vapi;
    return vapi;
  }, []);

  const startVoice = useCallback(async () => {
    setVoiceActive(true);
    setVoiceStatus('connecting');
    try {
      const vapi = await getVapi();
      if (!vapi) {
        alert('Vapi nuk eshte konfiguruar. Vendos NEXT_PUBLIC_VAPI_PUBLIC_KEY.');
        setVoiceActive(false);
        setVoiceStatus('idle');
        return;
      }
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
      if (assistantId) {
        await vapi.start(assistantId, {
          metadata: { sessionId: getSession(), language: lang },
        });
      } else {
        // Fallback: use custom LLM config (server URL)
        const aiUrl = process.env.NEXT_PUBLIC_AI_URL || '';
        await vapi.start({
          model: {
            provider: 'custom-llm',
            url: `${aiUrl}/api/vapi`,
            model: 'gpt-4o-mini',
          },
          voice: {
            provider: '11labs',
            voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah
          },
          firstMessage: lang === 'en'
            ? 'Hello! I can help you with EU integration questions for Kosovo.'
            : lang === 'sr'
              ? 'Zdravo! Mogu da vam pomognem sa pitanjima o integraciji Kosova u EU.'
              : 'Pershendetje! Mund te te ndihmoj me pyetje per integrimin e Kosoves ne BE.',
          metadata: { sessionId: getSession(), language: lang },
        });
      }
    } catch (err) {
      console.error('Voice start error:', err);
      setVoiceActive(false);
      setVoiceStatus('idle');
    }
  }, [getVapi, lang]);

  const stopVoice = useCallback(async () => {
    try {
      const vapi = vapiRef.current;
      if (vapi) await vapi.stop();
    } catch {}
    setVoiceActive(false);
    setVoiceStatus('idle');
    setVolumeLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        try { vapiRef.current.stop(); } catch {}
      }
    };
  }, []);

  // Initialize session ID client-side only (avoids hydration mismatch)
  useEffect(() => {
    const existing = window.localStorage.getItem('euguide-session-id');
    if (existing) {
      setActiveSessionId(existing);
    } else {
      const next = crypto.randomUUID();
      window.localStorage.setItem('euguide-session-id', next);
      setActiveSessionId(next);
    }
  }, []);

  // Check auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUser(data.user); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    // Use popup so the main page (and open chat) doesn't reload
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true, // don't navigate main window
      },
    });
    if (error || !data?.url) return;

    const w = 480, h = 580;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
    window.open(data.url, 'euguide-google-auth',
      `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1`
    );
    // onAuthStateChange listener (set up in useEffect) will fire SIGNED_IN
    // once the popup stores the session in localStorage → setUser() updates automatically
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

  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousChatOpen = document.documentElement.dataset.chatOpen;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.dataset.chatOpen = 'true';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      if (previousChatOpen === undefined) {
        delete document.documentElement.dataset.chatOpen;
      } else {
        document.documentElement.dataset.chatOpen = previousChatOpen;
      }
    };
  }, [open]);

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
    // Count user messages before adding — if this is first, auto-title later
    const userMsgCount = msgs.filter(m => m.role === 'user').length;
    setMsgs(m => [...m, { role: 'user', text: message }, { role: 'assistant', text: '' }]);
    setInput('');
    setTyping(true);

    const sid = activeSessionId || getSession();
    const isFirstMsg = userMsgCount === 0;

    try {
      const res = await chatStream(message, sid, lang, user?.id ?? null);
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
            if (data.path) {
              console.log(`[euguide] chat path: ${data.path.toUpperCase()}`);
            }
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

      // After stream done — backend has saved the session by now
      if (isFirstMsg) {
        // Small delay to ensure DB write is committed
        setTimeout(() => {
          autoTitleSession(message, sid);
          if (sidebarOpen) refreshHistory();
        }, 800);
      }
    } catch {
      setTyping(false);
      replaceEmptyAssistant(fallbackText());
    }
  };

  // Chat history sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [editingTitle, setEditingTitle] = useState(null); // session id being edited
  const [editTitleValue, setEditTitleValue] = useState('');

  // Refresh history list
  const refreshHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('sessions')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30);
      setChatHistory(data || []);
    } catch {}
    setLoadingHistory(false);
  }, [user]);

  // Load chat history when sidebar opens
  useEffect(() => {
    if (sidebarOpen && user) refreshHistory();
  }, [sidebarOpen, user, refreshHistory]);

  // Load a past session
  const loadSession = async (sessionId) => {
    try {
      const { data } = await supabase
        .from('sessions')
        .select('messages')
        .eq('id', sessionId)
        .single();
      if (data?.messages) {
        const parsed = typeof data.messages === 'string' ? JSON.parse(data.messages) : data.messages;
        setMsgs(parsed.map(m => ({ role: m.role, text: m.content || m.text || '' })));
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('euguide-session-id', sessionId);
        }
        setActiveSessionId(sessionId);
      }
    } catch {}
  };

  // Delete a session
  const deleteSession = async (sessionId) => {
    try {
      await supabase.from('sessions').delete().eq('id', sessionId);
      setChatHistory(h => h.filter(s => s.id !== sessionId));
      if (sessionId === activeSessionId) {
        // Start a brand new chat if we deleted the active one
        const next = crypto.randomUUID();
        window.localStorage.setItem('euguide-session-id', next);
        setActiveSessionId(next);
        setMsgs([{ role: 'assistant', text: t.chat.greeting }]);
        setInput('');
        setTyping(false);
      }
    } catch {}
  };

  // New chat — create fresh session
  const newChat = () => {
    const next = crypto.randomUUID();
    window.localStorage.setItem('euguide-session-id', next);
    setActiveSessionId(next);
    setMsgs([{ role: 'assistant', text: t.chat.greeting }]);
    setInput('');
    setTyping(false);
  };

  // Rename a session title
  const saveTitle = async (sessionId) => {
    const newTitle = editTitleValue.trim();
    if (!newTitle) { setEditingTitle(null); return; }
    try {
      await supabase
        .from('sessions')
        .update({ title: newTitle })
        .eq('id', sessionId);
      setChatHistory(h => h.map(s => s.id === sessionId ? { ...s, title: newTitle } : s));
    } catch {}
    setEditingTitle(null);
  };

  // Auto-title: set title from first user message (only called once per new session)
  const autoTitleSession = useCallback(async (message, sid) => {
    if (!user || !sid) return;
    const title = message.length > 45 ? message.slice(0, 45).trimEnd() + '…' : message;
    try {
      await supabase.from('sessions').update({ title }).eq('id', sid).is('title', null);
      if (sidebarOpen) refreshHistory();
    } catch {}
  }, [user, sidebarOpen, refreshHistory]);

  const drawerWidth = 'min(420px, calc(100vw - 32px))';

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
        width: drawerWidth,
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
        overflow: 'hidden',
      }}>

        {/* ---- History Overlay (absolute, no layout shift) ---- */}
        {user && sidebarOpen && (
          <>
            {/* Backdrop */}
            <div onClick={() => setSidebarOpen(false)} style={{
              position: 'absolute', inset: 0, zIndex: 8,
              background: 'rgba(14,27,44,0.45)',
            }} />
            {/* Panel */}
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: 230, zIndex: 9,
              background: 'var(--ink)',
              borderRight: '1px solid rgba(242,239,232,0.1)',
              display: 'flex', flexDirection: 'column',
              animation: 'slideInLeft 200ms cubic-bezier(.2,.7,.2,1)',
            }}>
              {/* Panel header */}
              <div style={{ padding: '13px 12px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid rgba(242,239,232,0.07)' }}>
                <span className="serif" style={{ fontSize: 16, color: 'var(--paper)' }}>Bisedat</span>
                <button onClick={() => setSidebarOpen(false)} style={{
                  background: 'transparent', border: 'none', color: 'rgba(242,239,232,0.35)',
                  cursor: 'pointer', width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4, transition: 'color 150ms',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(242,239,232,0.8)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(242,239,232,0.35)'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* New chat button */}
              <div style={{ padding: '10px 10px 8px', flexShrink: 0 }}>
                <button onClick={newChat} style={{
                  width: '100%', padding: '8px 12px',
                  background: 'transparent',
                  border: '1px solid rgba(242,239,232,0.15)',
                  color: 'rgba(242,239,232,0.7)', fontSize: 12,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                  transition: 'border-color 150ms, color 150ms',
                  whiteSpace: 'nowrap',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(242,239,232,0.35)'; e.currentTarget.style.color = 'rgba(242,239,232,1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(242,239,232,0.15)'; e.currentTarget.style.color = 'rgba(242,239,232,0.7)'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  Bisede e re
                </button>
              </div>

              {/* History list */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 6px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {loadingHistory ? (
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <div style={{ width: 18, height: 18, border: '2px solid rgba(242,239,232,0.1)', borderTopColor: 'rgba(242,239,232,0.4)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                  </div>
                ) : chatHistory.length === 0 ? (
                  <div style={{ padding: '28px 12px', textAlign: 'center' }}>
                    <span style={{ fontSize: 11, color: 'rgba(242,239,232,0.2)', display: 'block' }}>Asnje bisede e ruajtur</span>
                  </div>
                ) : chatHistory.map(session => {
                  const isActive = session.id === activeSessionId;
                  const isEditing = editingTitle === session.id;
                  const d = new Date(session.updated_at);
                  const dateStr = `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
                  return (
                    <div key={session.id} style={{
                      width: '100%', padding: '8px 8px',
                      background: isActive ? 'rgba(242,239,232,0.08)' : 'transparent',
                      borderRadius: 4, marginBottom: 1,
                      transition: 'background 150ms',
                      cursor: 'pointer',
                      borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                      position: 'relative',
                    }}
                      onClick={() => !isEditing && loadSession(session.id)}
                      onDoubleClick={() => { setEditingTitle(session.id); setEditTitleValue(session.title || ''); }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(242,239,232,0.05)'; e.currentTarget.querySelector('.del-btn').style.opacity = '1'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.del-btn').style.opacity = '0'; }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editTitleValue}
                          onChange={e => setEditTitleValue(e.target.value)}
                          onBlur={() => saveTitle(session.id)}
                          onKeyDown={e => { if (e.key === 'Enter') saveTitle(session.id); if (e.key === 'Escape') setEditingTitle(null); }}
                          onClick={e => e.stopPropagation()}
                          style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(242,239,232,0.3)', padding: '2px 0', color: 'var(--paper)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                        />
                      ) : (
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: isActive ? 'var(--paper)' : 'rgba(242,239,232,0.55)', paddingRight: 22 }}>
                          {session.title || 'Bisede pa titull'}
                        </div>
                      )}
                      <div className="mono" style={{ fontSize: 9, color: 'rgba(242,239,232,0.2)', marginTop: 2 }}>{dateStr}</div>

                      {/* Trash delete button — shows on hover */}
                      <button
                        className="del-btn"
                        onClick={e => { e.stopPropagation(); deleteSession(session.id); }}
                        style={{ position: 'absolute', top: '50%', right: 4, transform: 'translateY(-50%)', opacity: 0, background: 'transparent', border: 'none', color: 'rgba(242,239,232,0.3)', cursor: 'pointer', padding: 4, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 150ms, color 150ms' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'rgba(239,68,68,0.9)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(242,239,232,0.3)'}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* User info at bottom */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(242,239,232,0.07)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(242,239,232,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'rgba(242,239,232,0.6)', flexShrink: 0 }}>
                    {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'rgba(242,239,232,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.user_metadata?.full_name || 'User'}
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: 'rgba(242,239,232,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ---- Main Chat Area ---- */}
        <div className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0, minHeight: 0 }}>
          {/* Header */}
          <div className="chat-header" style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink)', color: 'var(--paper)', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              {/* Sidebar toggle (only for logged-in users) */}
              {user && (
                <button onClick={() => setSidebarOpen(v => !v)} title="Bisedat" style={{
                  background: sidebarOpen ? 'rgba(242,239,232,0.12)' : 'transparent',
                  border: 'none', color: 'var(--paper)',
                  width: 28, height: 28, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4, transition: 'background 150ms',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M3 4h18M3 12h18M3 20h18"/>
                  </svg>
                </button>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sage)', flexShrink: 0 }} />
                  <span className="serif" style={{ fontSize: 20 }}>{t.chat.title}</span>
                  <span className="mono" style={{ fontSize: 9, color: 'rgba(242,239,232,0.5)' }}>· {lang.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(242,239,232,0.5)', marginTop: 1 }}>{t.chat.sub}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: '1px solid rgba(242,239,232,0.3)', color: 'var(--paper)', width: 26, height: 26, fontSize: 13, lineHeight: 1, flexShrink: 0, cursor: 'pointer' }}>×</button>
          </div>

          {/* Messages */}
          <div className="chat-messages" ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {msgs.map((m, i) => {
              if (m.role === 'assistant' && !String(m.text || '').trim()) return null;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '82%',
                    background: m.role === 'user' ? 'var(--ink)' : 'var(--paper-2)',
                    color: m.role === 'user' ? 'var(--paper)' : 'var(--ink)',
                    padding: '11px 13px',
                    fontSize: 13, lineHeight: 1.5,
                    border: m.role === 'user' ? 'none' : '1px solid var(--line)',
                  }}>
                    {renderMd(m.text)}
                  </div>
                </div>
              );
            })}
            {typing && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'var(--paper-2)', padding: '11px 13px', border: '1px solid var(--line)', display: 'flex', gap: 4, minWidth: 48, justifyContent: 'center' }}>
                  <Dot d={0} /><Dot d={150} /><Dot d={300} />
                </div>
              </div>
            )}
          </div>

          {/* Sample chips */}
          {msgs.length <= 1 && !voiceActive && (
            <div style={{ padding: '0 18px 12px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {t.chat.sample.map(s => (
                <button key={s} onClick={() => send(s)} style={{ background: 'transparent', border: '1px solid var(--line)', padding: '5px 9px', fontSize: 11, color: 'var(--ink-2)', cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chat-input-row" style={{ padding: 12, borderTop: '1px solid var(--line)', display: 'flex', gap: 6 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={t.chat.placeholder}
              style={{ flex: 1, border: '1px solid var(--line)', padding: '9px 11px', background: 'var(--paper)', fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)', outline: 'none', minWidth: 0 }} />
            <button onClick={() => send()} style={{ background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '0 14px', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>{t.chat.send}</button>
            <button title="Voice" onClick={startVoice} style={{ background: voiceActive ? 'var(--ink)' : 'transparent', border: '1px solid var(--line)', padding: '0 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, color: voiceActive ? 'var(--paper)' : 'inherit', transition: 'all 150ms' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v3" />
              </svg>
            </button>
          </div>

          {/* Auth hint */}
          <div className="chat-auth-row" style={{ padding: '7px 12px 10px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-2)' }}>
            {user ? (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {user.user_metadata?.avatar_url && (
                    <img src={user.user_metadata.avatar_url} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                  )}
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)' }}>{user.user_metadata?.full_name || user.email}</span>
                </span>
                <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid var(--line)', padding: '3px 8px', fontSize: 10, color: 'var(--ink-3)', cursor: 'pointer' }}>
                  Dil
                </button>
              </>
            ) : (
              <>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{t.chat.auth}</span>
                <button onClick={handleGoogleLogin} style={{ background: 'transparent', border: '1px solid var(--ink-2)', padding: '3px 8px', fontSize: 11, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
              </>
            )}
          </div>

          {/* Voice overlay — inside chat widget */}
          <VoiceOverlay
            active={voiceActive}
            onClose={stopVoice}
            status={voiceStatus}
            volumeLevel={volumeLevel}
          />
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .chat-sidebar div::-webkit-scrollbar { display: none; }
      `}</style>
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

  const cmsTopicContent = useCmsObject('topic_content', TOPIC_CONTENT);
  const topicContent = cmsTopicContent[topic.key] || TOPIC_CONTENT[topic.key] || {};
  const content = topicContent[lang] || topicContent.sq || [];

  return (
    <section id={topic.key} style={{ padding: '120px 0', borderTop: '1px solid var(--line)', background: idx % 2 === 0 ? 'var(--paper)' : 'var(--paper-2)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80 }} className="topic-deep">
          <Reveal delay={0}>
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
          </Reveal>
          <div>
            {content && content.map((sec, i) => (
              <Reveal key={i} delay={120 + i * 90} style={{ paddingBottom: 28, marginBottom: 28, borderBottom: i === content.length - 1 ? 'none' : '1px solid var(--line)' }}>
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
              </Reveal>
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
  const cmsTopicDeepContent = useCmsObject('topic_deep_content', TOPIC_DEEP_CONTENT);
  const blocks = cmsTopicDeepContent[topicKey]?.[lang] || cmsTopicDeepContent[topicKey]?.sq || TOPIC_DEEP_CONTENT[topicKey]?.[lang] || TOPIC_DEEP_CONTENT[topicKey]?.sq || [];
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
// Topic action (next-steps cards) — sundimi / korrupsioni / be
// ============================================================
const TOPIC_ACTION_CONTENT = {
  sundimi: {
    sq: {
      eyebrow: 'Udhëzues praktik',
      title: 'Sundimi i ligjit duhet të lexohet si rrugë qytetari',
      intro: 'Përmbajtja duhet ta ndihmojë përdoruesin të kuptojë ku shkon një rast, cilat janë afatet dhe çfarë të drejtash ka kur institucioni nuk përgjigjet.',
      cards: [
        { k: '01', h: 'Harta e institucioneve', p: 'Policia mbledh informacion, prokuroria heton, gjykata vendos, Avokati i Popullit trajton shkelje nga administrata.' },
        { k: '02', h: 'Afatet dhe ankesat', p: 'Afate tipike për ankesë administrative, padi, kërkesë urgjente dhe qasje në dokumente publike.' },
        { k: '03', h: 'Ndihma juridike', p: 'Si aplikohet për ndihmë juridike falas, cilat janë kriteret bazë dhe dokumentet e nevojshme.' },
      ],
    },
    en: {
      eyebrow: 'Practical guide',
      title: 'Rule of law should read as a citizen pathway',
      intro: 'Content should help users understand where a case goes, what deadlines apply and what rights they have when an institution does not answer.',
      cards: [
        { k: '01', h: 'Institution map', p: 'Police collect information, prosecution investigates, courts decide, the Ombudsperson handles administrative rights violations.' },
        { k: '02', h: 'Deadlines and appeals', p: 'Typical deadlines for administrative appeals, lawsuits, urgent requests and access to public documents.' },
        { k: '03', h: 'Legal aid', p: 'How to apply for free legal aid, basic eligibility criteria and required documents.' },
      ],
    },
    sr: {
      eyebrow: 'Praktični vodič',
      title: 'Vladavina prava treba da izgleda kao put građanina',
      intro: 'Sadržaj treba da pomogne korisniku da razume gde ide predmet, koji rokovi važe i koja prava ima kada institucija ne odgovori.',
      cards: [
        { k: '01', h: 'Mapa institucija', p: 'Policija prikuplja informacije, tužilaštvo istražuje, sud odlučuje, Ombudsman rešava povrede prava od administracije.' },
        { k: '02', h: 'Rokovi i žalbe', p: 'Tipični rokovi za administrativnu žalbu, tužbu, hitni zahtev i pristup javnim dokumentima.' },
        { k: '03', h: 'Pravna pomoć', p: 'Kako se aplicira za besplatnu pravnu pomoć, osnovni kriterijumi i potrebni dokumenti.' },
      ],
    },
  },
  korrupsioni: {
    sq: {
      eyebrow: 'Nga dyshimi te raportimi',
      title: 'Faqja duhet ta kthejë frikën në procedurë të qartë',
      intro: 'Përdoruesi duhet të dijë çfarë quhet korrupsion, cilat prova ruhen, ku raportohet dhe çfarë mbrojtjeje ekziston për sinjalizuesit.',
      cards: [
        { k: '01', h: 'Checklist provash', p: 'Datë, vend, emër institucioni, dokumente, foto, mesazhe, dëshmitarë dhe çfarë u kërkua apo u premtua.' },
        { k: '02', h: 'Kanale raportimi', p: 'Agjencia kundër Korrupsionit, Prokuroria Speciale, Policia, Avokati i Popullit dhe ALAC/KDI për këshillim të sigurt.' },
        { k: '03', h: 'Shenja paralajmëruese', p: 'Kontratë pa konkurrencë, konflikt interesi, tender me specifika të ngushta, punësim familjar dhe pasuri e pajustifikuar.' },
      ],
    },
    en: {
      eyebrow: 'From suspicion to reporting',
      title: 'Turn doubt into a clear procedure',
      intro: 'Users should know what counts as corruption, what evidence to keep, where to report and what protection exists for whistleblowers.',
      cards: [
        { k: '01', h: 'Evidence checklist', p: 'Date, place, institution name, documents, photos, messages, witnesses and what was requested or promised.' },
        { k: '02', h: 'Reporting channels', p: 'Anti-Corruption Agency, Special Prosecution, Police, Ombudsperson and ALAC/KDI for safe advice.' },
        { k: '03', h: 'Red flags', p: 'No-competition contracts, conflict of interest, narrow tender specs, family hiring and unexplained wealth.' },
      ],
    },
    sr: {
      eyebrow: 'Od sumnje do prijave',
      title: 'Pretvorite sumnju u jasnu proceduru',
      intro: 'Korisnik treba da zna šta je korupcija, koje dokaze čuva, gde prijavljuje i kakva zaštita postoji za zviždače.',
      cards: [
        { k: '01', h: 'Lista dokaza', p: 'Datum, mesto, naziv institucije, dokumenti, fotografije, poruke, svedoci i šta je traženo ili obećano.' },
        { k: '02', h: 'Kanali prijave', p: 'Antikorupcijska agencija, Specijalno tužilaštvo, Policija, Ombudsman i ALAC/KDI za bezbedan savet.' },
        { k: '03', h: 'Signali rizika', p: 'Ugovor bez konkurencije, sukob interesa, uske tenderske specifikacije, porodično zapošljavanje i neobjašnjiva imovina.' },
      ],
    },
  },
  be: {
    sq: {
      eyebrow: 'Rruga e anëtarësimit',
      title: 'Procesi i BE-së si një hartë e lexueshme',
      intro: 'Faqja ndan qartë statusin aktual, hapin tjetër, vendimin politik dhe punën teknike që Kosova duhet ta bëjë brenda vendit.',
      cards: [
        { k: '01', h: 'Statusi aktual', p: 'Kosova është kandidat potencial; aplikimi është dorëzuar, por pritet opinioni i Komisionit dhe vendimi i Këshillit.' },
        { k: '02', h: '5 mosnjohjet në BE', p: 'Spanja, Greqia, Qipro, Rumania dhe Sllovakia ndikojnë në konsensusin e Këshillit dhe shtyjnë vendimet kyçe.' },
        { k: '03', h: 'Çfarë janë klasterët', p: 'Për secilin klaster: kapitujt, shembuj reformash dhe çfarë përfiton qytetari kur ai kapitull mbyllet.' },
      ],
    },
    en: {
      eyebrow: 'Membership path',
      title: 'The EU process as a readable map',
      intro: 'The page clearly separates the current status, next step, political decision and technical work Kosovo must do domestically.',
      cards: [
        { k: '01', h: 'Current status', p: 'Kosovo is a potential candidate; the application is submitted, but the Commission opinion and Council decision are pending.' },
        { k: '02', h: '5 EU non-recognisers', p: 'Spain, Greece, Cyprus, Romania and Slovakia affect Council consensus and delay key decisions.' },
        { k: '03', h: 'What clusters are', p: 'For each cluster: chapters, example reforms and what citizens gain when that chapter closes.' },
      ],
    },
    sr: {
      eyebrow: 'Put članstva',
      title: 'Proces EU kao čitljiva mapa',
      intro: 'Stranica jasno razdvaja trenutni status, sledeći korak, političku odluku i tehnički posao koji Kosovo mora uraditi kod kuće.',
      cards: [
        { k: '01', h: 'Trenutni status', p: 'Kosovo je potencijalni kandidat; aplikacija je predata, ali se čekaju mišljenje Komisije i odluka Saveta.' },
        { k: '02', h: '5 nepriznanja u EU', p: 'Španija, Grčka, Kipar, Rumunija i Slovačka utiču na konsenzus Saveta i odlažu ključne odluke.' },
        { k: '03', h: 'Šta su klasteri', p: 'Za svaki klaster: poglavlja, primeri reformi i šta građani dobijaju kada se poglavlje zatvori.' },
      ],
    },
  },
};

function TopicActionSection({ topicKey, lang }) {
  const topics = useCmsArray('topics', TOPICS);
  const topic = topics.find(t => t.key === topicKey) || TOPICS.find(t => t.key === topicKey);
  const accent = topic?.accent || 'var(--blue)';
  const copy = TOPIC_ACTION_CONTENT[topicKey]?.[lang] || TOPIC_ACTION_CONTENT[topicKey]?.sq;
  if (!copy) return null;
  const numByTopic = { sundimi: '03', korrupsioni: '03', be: '05' };
  const num = numByTopic[topicKey] || '';
  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div className="container topic-action-grid" style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.4fr', gap: 60, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18 }}>
            {num && <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>§ {num}</span>}
            <span className="mono" style={{ fontSize: 11, color: 'var(--rust)', letterSpacing: '0.18em', textTransform: 'uppercase', borderTop: '1px solid var(--rust)', paddingTop: 6 }}>{copy.eyebrow}</span>
          </div>
          <h2 className="serif" style={{ fontSize: 'clamp(34px, 4.7vw, 58px)', lineHeight: 1.04, color: 'var(--ink)' }}>{copy.title}</h2>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--ink-2)', marginTop: 20, maxWidth: 520 }}>{copy.intro}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }} className="topic-action-cards">
          {copy.cards.map((card, ci) => (
            <Reveal as="article" key={card.k} delay={ci * 80} className="hover-lift" style={{ background: 'var(--paper-2)', padding: '26px 24px', minHeight: 240 }}>
              <span className="serif" style={{ fontSize: 42, color: accent, lineHeight: 0.9 }}>{card.k}</span>
              <h3 className="serif" style={{ fontSize: 24, lineHeight: 1.08, marginTop: 22, color: 'var(--ink)' }}>{card.h}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-2)', marginTop: 14 }}>{card.p}</p>
            </Reveal>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 980px) {
          .topic-action-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .topic-action-cards { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

// ============================================================
// Reforma — Shërbimet kryesore: para / pas dixhitalizimit
// Sources: eKosova platform, SIGMA Monitoring Report (OECD/EU) 2023,
// EC Kosovo Report 2024, Strategia e MAP 2022-2027, Ligji Nr. 06/L-113.
// ============================================================
const REFORMA_SERVICES = [
  {
    key: 'id',
    name_sq: 'Letërnjoftim biometrik',
    name_en: 'Biometric ID card',
    name_sr: 'Biometrijska lična karta',
    before: '14 ditë · 3 zyra · 4 dokumente fizike',
    before_en: '14 days · 3 offices · 4 paper documents',
    before_sr: '14 dana · 3 kancelarije · 4 papira',
    after: '~3 ditë me termin online (eKosova)',
    after_en: '~3 days with an online appointment (eKosova)',
    after_sr: '~3 dana sa online terminom (eKosova)',
    owner_sq: 'Agjencia e Regjistrimit Civil (ARC) · MPB',
    owner_en: 'Civil Registration Agency (ARC) · MIA',
    owner_sr: 'Agencija za civilnu registraciju · MUP',
  },
  {
    key: 'certs',
    name_sq: 'Certifikatë lindjeje / martese / vendbanimi',
    name_en: 'Birth / marriage / residence certificate',
    name_sr: 'Izvod iz matične knjige / prebivališta',
    before: 'Komunë e regjistrimit · paraqitje fizike',
    before_en: 'Municipality of registration · in-person',
    before_sr: 'Matična opština · lično',
    after: 'Shkarkim PDF i nënshkruar dixhitalisht në eKosova',
    after_en: 'Digitally signed PDF download via eKosova',
    after_sr: 'Digitalno potpisan PDF preuzimanje preko eKosova',
    owner_sq: 'ARC · komunat',
    owner_en: 'ARC · municipalities',
    owner_sr: 'ARC · opštine',
  },
  {
    key: 'tax',
    name_sq: 'Deklarim tatimor (pasqyra mujore TVSH/TAP)',
    name_en: 'Tax filing (monthly VAT/PIT)',
    name_sr: 'Poreska prijava (mesečna PDV/PDP)',
    before: 'Formularë fizikë · radhë në sportel',
    before_en: 'Paper forms · counter queues',
    before_sr: 'Papirni obrasci · šalterski redovi',
    after: 'EDI (Electronic Declaration) — 24/7, vërtetim automatik',
    after_en: 'EDI (Electronic Declaration) — 24/7, automatic receipt',
    after_sr: 'EDI (elektronska prijava) — 24/7, automatska potvrda',
    owner_sq: 'Administrata Tatimore e Kosovës (ATK)',
    owner_en: 'Tax Administration of Kosovo (TAK)',
    owner_sr: 'Poreska uprava Kosova (PUK)',
  },
  {
    key: 'biz',
    name_sq: 'Regjistrim biznesi (B.I., NUI)',
    name_en: 'Business registration (B.I., NUI)',
    name_sr: 'Registracija biznisa (B.I., NUI)',
    before: '5–10 ditë · One-Stop-Shop fizik',
    before_en: '5–10 days · physical One-Stop-Shop',
    before_sr: '5–10 dana · fizički One-Stop-Shop',
    after: '1 ditë online (ARBK) · certifikatë e nënshkruar elektronikisht',
    after_en: '1 day online (KBRA) · electronically signed certificate',
    after_sr: '1 dan online (ARBK) · elektronski potpisan sertifikat',
    owner_sq: 'Agjencia për Regjistrimin e Bizneseve (ARBK) · MINT',
    owner_en: 'Kosovo Business Registration Agency (KBRA) · MoITI',
    owner_sr: 'Agencija za registraciju biznisa (ARBK) · MINT',
  },
  {
    key: 'permit',
    name_sq: 'Leje ndërtimi (kategoria I–II)',
    name_en: 'Construction permit (cat. I–II)',
    name_sr: 'Građevinska dozvola (kat. I–II)',
    before: '90–180 ditë · komunë · disa zyra paralele',
    before_en: '90–180 days · municipality · parallel offices',
    before_sr: '90–180 dana · opština · paralelne kancelarije',
    after: 'Sistem e-Leje · afat ligjor 30 ditë (kat. I)',
    after_en: 'e-Permit system · 30-day legal limit (cat. I)',
    after_sr: 'e-Permit sistem · zakonski rok 30 dana (kat. I)',
    owner_sq: 'MMPHI · komunat',
    owner_en: 'MESPI · municipalities',
    owner_sr: 'MŽSPI · opštine',
  },
  {
    key: 'kadastra',
    name_sq: 'Certifikatë pronësie / kadastër',
    name_en: 'Property / cadastre certificate',
    name_sr: 'Izvod iz katastra',
    before: 'Drejtoria komunale · vërtetim fizik',
    before_en: 'Municipal directorate · physical certificate',
    before_sr: 'Opštinska direkcija · fizički sertifikat',
    after: 'Geoportal AKK · shkarkim online me eID',
    after_en: 'KCA Geoportal · online download with eID',
    after_sr: 'AKK Geoportal · online preuzimanje sa eID',
    owner_sq: 'Agjencia Kadastrale e Kosovës (AKK)',
    owner_en: 'Kosovo Cadastral Agency (KCA)',
    owner_sr: 'Kosovska katastarska agencija (AKK)',
  },
];

// ============================================================
// Reforma — Përafrimi me acquis-në (clearer version)
// ============================================================
const ACQUIS_NOTES = {
  admin: {
    chap_sq: 'Reforma e administratës publike (PAR)', chap_en: 'Public Administration Reform (PAR)', chap_sr: 'Reforma javne uprave (PAR)',
    note_sq: 'Aftësia e shtetit për të ofruar shërbime sipas standardeve të SIGMA-s — rekrutim me meritë, dixhitalizim, llogaridhënie.',
    note_en: 'The state\'s ability to deliver services to SIGMA standards — merit-based recruitment, digitalisation, accountability.',
    note_sr: 'Sposobnost države da pruža usluge prema standardima SIGMA — zapošljavanje na osnovu zasluga, digitalizacija, odgovornost.',
  },
  judiciary: {
    chap_sq: 'Kapitulli 23 · Drejtësia dhe të drejtat themelore', chap_en: 'Chapter 23 · Judiciary & fundamental rights', chap_sr: 'Poglavlje 23 · Pravosuđe i osnovna prava',
    note_sq: 'Pavarësia e gjyqësorit, llogaridhënia e prokurorisë dhe efektshmëria e procedurave.',
    note_en: 'Independence of the judiciary, prosecutorial accountability and procedural effectiveness.',
    note_sr: 'Nezavisnost pravosuđa, odgovornost tužilaštva i efikasnost postupaka.',
  },
  anti_corr: {
    chap_sq: 'Klasteri 1 · Sundimi i ligjit', chap_en: 'Cluster 1 · Rule of law', chap_sr: 'Klaster 1 · Vladavina prava',
    note_sq: 'Parandalimi i konfliktit të interesit, transparenca e pasurisë dhe mbrojtja e sinjalizuesve.',
    note_en: 'Conflict-of-interest prevention, asset transparency and whistleblower protection.',
    note_sr: 'Sprečavanje sukoba interesa, transparentnost imovine i zaštita zviždača.',
  },
  economy: {
    chap_sq: 'Klasteri 3 · Konkurrueshmëria dhe rritja', chap_en: 'Cluster 3 · Competitiveness & growth', chap_sr: 'Klaster 3 · Konkurentnost i rast',
    note_sq: 'Konkurrenca, ndihma shtetërore, prokurimi publik dhe tatimi në linjë me rregullat e tregut të brendshëm.',
    note_en: 'Competition, state aid, public procurement and taxation aligned with the internal market rules.',
    note_sr: 'Konkurencija, državna pomoć, javne nabavke i oporezivanje u skladu sa pravilima unutrašnjeg tržišta.',
  },
  rights: {
    chap_sq: 'Kapitulli 23 · Të drejtat themelore', chap_en: 'Chapter 23 · Fundamental rights', chap_sr: 'Poglavlje 23 · Osnovna prava',
    note_sq: 'Mbrojtja e të dhënave personale, mosdiskriminimi dhe të drejtat e grupeve të cenueshme.',
    note_en: 'Personal data protection, non-discrimination and the rights of vulnerable groups.',
    note_sr: 'Zaštita ličnih podataka, nediskriminacija i prava ranjivih grupa.',
  },
  media: {
    chap_sq: 'Kapitulli 10 · Shoqëria e informacionit dhe media', chap_en: 'Chapter 10 · Information society & media', chap_sr: 'Poglavlje 10 · Informaciono društvo i mediji',
    note_sq: 'Pluralizmi, financimi transparent dhe mbrojtja juridike e gazetarëve.',
    note_en: 'Pluralism, transparent funding and legal protection of journalists.',
    note_sr: 'Pluralizam, transparentno finansiranje i pravna zaštita novinara.',
  },
};

function acquisStatus(value, lang) {
  if (value < 35) return { sq: 'Fillestar', en: 'Early', sr: 'Početni' }[lang] || 'Fillestar';
  if (value < 65) return { sq: 'Mesatar', en: 'Moderate', sr: 'Srednji' }[lang] || 'Mesatar';
  return { sq: 'I avancuar', en: 'Advanced', sr: 'Napredan' }[lang] || 'I avancuar';
}

function AcquisProgressSection({ lang, accent }) {
  const reform = useCmsArray('reform', REFORM);
  const copy = {
    sq: {
      eyebrow: 'Progresi i përafrimit',
      title: 'Sa larg jemi nga rregullat e BE-së',
      sub: 'Acquis-ja është grumbulli i rregullave të Bashkimit Evropian që çdo vend i ardhshëm anëtar duhet t\'i përshtatë në ligj dhe në praktikë. Vlerësimi 0–100 tregon sa larg ka shkuar Kosova në secilën fushë, sipas Raportit të Komisionit Evropian 2025 dhe Monitoring Report-it të SIGMA-s 2024.',
      avg: 'Mesatarja e fushave',
      chap: 'Lidhja me acquis-në',
      what: 'Çfarë mat',
      legend: 'Si lexohet shkalla',
      l1: '0–34 · Fillestar — kornizë ligjore e mangët ose pa zbatim',
      l2: '35–64 · Mesatar — ligje në vend, zbatim i parregullt',
      l3: '65–100 · I avancuar — zbatim sistematik, afër standardit të BE-së',
      src: 'Burimi: Raporti EC Kosovo 2025 (tetor 2025) · SIGMA Monitoring Report 2024 · vlerësim 2025.',
    },
    en: {
      eyebrow: 'Alignment progress',
      title: 'How far we are from EU rules',
      sub: 'The acquis is the body of EU rules every future member state must transpose into law and practice. The 0–100 score shows how far Kosovo has progressed in each area, according to the European Commission 2025 Report and the SIGMA Monitoring Report 2024.',
      avg: 'Average across areas',
      chap: 'Link to the acquis',
      what: 'What it measures',
      legend: 'How to read the scale',
      l1: '0–34 · Early — weak legal framework or no enforcement',
      l2: '35–64 · Moderate — laws in place, uneven implementation',
      l3: '65–100 · Advanced — systematic implementation, close to EU standard',
      src: 'Source: EC Kosovo Report 2025 (Oct 2025) · SIGMA Monitoring Report 2024 · 2025 assessment.',
    },
    sr: {
      eyebrow: 'Napredak usaglašavanja',
      title: 'Koliko smo daleko od pravila EU',
      sub: 'Acquis je skup pravila EU koja svaka buduća članica mora preneti u zakon i praksu. Ocena 0–100 pokazuje koliko je Kosovo napredovalo u svakoj oblasti, prema Izveštaju EK 2025 i SIGMA Monitoring Report-u 2024.',
      avg: 'Prosek po oblastima',
      chap: 'Veza sa acquis-em',
      what: 'Šta meri',
      legend: 'Kako se čita skala',
      l1: '0–34 · Početni — slab pravni okvir ili bez sprovođenja',
      l2: '35–64 · Srednji — zakoni postoje, neujednačeno sprovođenje',
      l3: '65–100 · Napredan — sistematsko sprovođenje, blizu standarda EU',
      src: 'Izvor: EK Izveštaj o Kosovu 2025 (okt. 2025) · SIGMA Monitoring Report 2024 · procena 2025.',
    },
  }[lang] || null;
  const c = copy || {};
  const avg = Math.round(reform.reduce((s, r) => s + r.value, 0) / reform.length);
  const prevAvg = Math.round(reform.reduce((s, r) => s + (r.prev ?? r.value), 0) / reform.length);
  const avgDelta = avg - prevAvg;
  const deltaLabel = lang === 'en' ? 'vs 2024' : lang === 'sr' ? 'vs 2024.' : 'vs 2024';

  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container">
        <SectionHead eyebrow={c.eyebrow} title={c.title} sub={c.sub} num="04" />

        {/* Top: average + scale legend */}
        <div className="acquis-top" style={{
          display: 'grid', gridTemplateColumns: '0.7fr 1.6fr', gap: 1,
          background: 'var(--line)', border: '1px solid var(--line)',
          marginBottom: 40,
        }}>
          <div style={{ background: 'var(--paper)', padding: '28px 26px' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-3)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>{c.avg}</span>
              <span style={{ color: 'var(--ink-2)' }}>2025</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
              <span className="serif" style={{ fontSize: 72, lineHeight: 0.85, color: 'var(--ink)' }}><CountUp value={avg} /></span>
              <span className="serif" style={{ fontSize: 28, color: 'var(--ink-3)' }}>/100</span>
              {avgDelta !== 0 && (
                <span className="mono" style={{ fontSize: 12, color: avgDelta > 0 ? 'var(--sage)' : 'var(--rust)', marginLeft: 'auto', letterSpacing: '0.04em' }}>
                  {avgDelta > 0 ? '+' : ''}{avgDelta} {deltaLabel}
                </span>
              )}
            </div>
            <div className="mono" style={{ marginTop: 12, fontSize: 11, color: accent, letterSpacing: '0.05em' }}>{acquisStatus(avg, lang).toUpperCase()}</div>
          </div>
          <div style={{ background: 'var(--paper)', padding: '28px 26px' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 18 }}>{c.legend}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ScaleLine ink="var(--ink-3)" accent={accent} text={c.l1} pct={20} />
              <ScaleLine ink="var(--ink-3)" accent={accent} text={c.l2} pct={50} />
              <ScaleLine ink="var(--ink-3)" accent={accent} text={c.l3} pct={85} />
            </div>
          </div>
        </div>

        {/* Cards: one per area */}
        <div className="acquis-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1,
          background: 'var(--line)', border: '1px solid var(--line)',
        }}>
          {reform.map((r, i) => {
            const label = r['label_' + lang] || r.label_sq;
            const meta = ACQUIS_NOTES[r.key] || {};
            const chap = meta['chap_' + lang] || meta.chap_sq || '';
            const note = meta['note_' + lang] || meta.note_sq || '';
            const delta = r.prev != null ? r.value - r.prev : 0;
            return (
              <article key={r.key} style={{ background: 'var(--paper)', padding: '26px 28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>0{i + 1} / 0{reform.length}</span>
                  <span className="mono" style={{ fontSize: 10, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{acquisStatus(r.value, lang)}</span>
                </div>
                <h4 className="serif" style={{ fontSize: 26, lineHeight: 1.1, color: 'var(--ink)', marginBottom: 4 }}>{label}</h4>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', marginBottom: 16 }}>{chap}</div>

                {/* Bar with quartile ticks, prev marker and value tooltip */}
                <div style={{ position: 'relative', height: 10, background: 'var(--paper-3)', marginBottom: 12 }}>
                  <div style={{ position: 'absolute', inset: 0, width: r.value + '%', background: accent, transition: 'width 800ms cubic-bezier(.2,.7,.2,1)' }} />
                  {[35, 65].map(p => (
                    <span key={p} style={{ position: 'absolute', left: p + '%', top: -3, bottom: -3, width: 1, background: 'var(--ink-2)', opacity: 0.55 }} />
                  ))}
                  {r.prev != null && (
                    <span title={'2024: ' + r.prev} style={{ position: 'absolute', left: r.prev + '%', top: -4, bottom: -4, width: 2, background: 'var(--ink-2)' }} />
                  )}
                  <span style={{
                    position: 'absolute', left: `calc(${r.value}% - 16px)`, top: -22,
                    background: 'var(--ink)', color: 'var(--paper)',
                    padding: '2px 6px', fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                  }}>{r.value}</span>
                </div>
                {delta !== 0 && (
                  <div className="mono" style={{ fontSize: 10, color: delta > 0 ? 'var(--sage)' : 'var(--rust)', letterSpacing: '0.04em', marginBottom: 6 }}>
                    {delta > 0 ? '+' : ''}{delta} {deltaLabel} ({r.prev})
                  </div>
                )}
                <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', marginBottom: 16 }}>
                  <span>0</span><span>35</span><span>65</span><span>100</span>
                </div>

                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>{c.what}</div>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>{note}</p>
              </article>
            );
          })}
        </div>

        <div className="mono" style={{ marginTop: 14, fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>
          {c.src}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .acquis-top { grid-template-columns: 1fr !important; }
          .acquis-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function ScaleLine({ accent, ink, text, pct }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 14, alignItems: 'center' }}>
      <div style={{ height: 6, background: 'var(--paper-3)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, width: pct + '%', background: accent }} />
      </div>
      <span style={{ fontSize: 13, color: ink === 'var(--ink-3)' ? 'var(--ink-2)' : ink }}>{text}</span>
    </div>
  );
}

function ReformaServicesSection({ lang }) {
  const data = REFORMA_SERVICES;
  const copy = {
    sq: {
      eyebrow: 'Shërbimet kryesore',
      title: 'Para dhe pas — afatet që qytetari i ndien',
      sub: 'Krahasimi i shkurtër para/pas dixhitalizimit për gjashtë shërbimet më të kërkuara. Të dhënat janë mbledhur nga platforma eKosova, Strategjia e MAP 2022–2027 dhe Raporti i Komisionit Evropian për Kosovën 2024.',
      before: 'Më parë',
      after: 'Tani',
      owner: 'Institucioni përgjegjës',
      stat1: 'shërbime online në eKosova',
      stat2: 'kohë mesatare e reduktuar',
      stat3: 'institucione në një portal',
    },
    en: {
      eyebrow: 'Top services',
      title: 'Before and after — deadlines citizens can feel',
      sub: 'A short before/after comparison after digitisation for the six most-requested services. Data drawn from the eKosova platform, the PAR Strategy 2022–2027 and the European Commission 2024 Kosovo Report.',
      before: 'Before',
      after: 'Today',
      owner: 'Responsible institution',
      stat1: 'online services in eKosova',
      stat2: 'average time cut',
      stat3: 'institutions in one portal',
    },
    sr: {
      eyebrow: 'Najtraženije usluge',
      title: 'Pre i posle — rokovi koje građanin oseti',
      sub: 'Kratko poređenje pre/posle digitalizacije za šest najtraženijih usluga. Podaci iz platforme eKosova, Strategije MUJU 2022–2027 i Izveštaja EK o Kosovu 2024.',
      before: 'Ranije',
      after: 'Sada',
      owner: 'Odgovorna institucija',
      stat1: 'online usluga u eKosova',
      stat2: 'prosečno smanjeno vreme',
      stat3: 'institucija u jednom portalu',
    },
  }[lang] || null;
  const c = copy || {
    eyebrow: 'Shërbimet kryesore', title: 'Para dhe pas — afatet që qytetari i ndien',
    sub: '', before: 'Më parë', after: 'Tani', owner: 'Institucioni përgjegjës',
    stat1: '', stat2: '', stat3: '',
  };
  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container">
        <SectionHead eyebrow={c.eyebrow} title={c.title} sub={c.sub} num="02" />

        {/* Stat row */}
        <div className="reforma-stat-row" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
          background: 'var(--line)', border: '1px solid var(--line)',
          marginBottom: 48,
        }}>
          <div style={{ background: 'var(--paper)', padding: '28px 26px' }}>
            <div className="serif" style={{ fontSize: 56, color: 'var(--ink)', lineHeight: 0.9 }}>620<span style={{ fontSize: 26, color: 'var(--ink-3)' }}>+</span></div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 12 }}>{c.stat1}</div>
          </div>
          <div style={{ background: 'var(--paper)', padding: '28px 26px' }}>
            <div className="serif" style={{ fontSize: 56, color: 'var(--blue)', lineHeight: 0.9 }}>−72<span style={{ fontSize: 26, color: 'var(--ink-3)' }}>%</span></div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 12 }}>{c.stat2}</div>
          </div>
          <div style={{ background: 'var(--paper)', padding: '28px 26px' }}>
            <div className="serif" style={{ fontSize: 56, color: 'var(--ink)', lineHeight: 0.9 }}>38</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 12 }}>{c.stat3}</div>
          </div>
        </div>

        <div className="reforma-services" style={{ border: '1px solid var(--line)', borderBottom: 'none' }}>
          <div className="reforma-services-head mono" style={{
            display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1.1fr', gap: 24,
            padding: '14px 22px', background: 'var(--ink)',
            borderBottom: '1px solid var(--line)',
            fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(242,239,232,0.65)',
          }}>
            <span>{lang === 'sq' ? 'Shërbimi' : lang === 'en' ? 'Service' : 'Usluga'}</span>
            <span>{c.before}</span>
            <span style={{ color: 'var(--paper)' }}>{c.after}</span>
            <span>{c.owner}</span>
          </div>
          {data.map((s, i) => (
            <div key={s.key} className="reforma-services-row" style={{
              display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1.1fr', gap: 24,
              padding: '22px', borderBottom: '1px solid var(--line)',
              background: i % 2 === 0 ? 'var(--paper)' : 'var(--paper-2)',
              alignItems: 'start',
            }}>
              <div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', marginBottom: 6 }}>0{i + 1} · {s.key.toUpperCase()}</div>
                <h4 className="serif" style={{ fontSize: 22, lineHeight: 1.15, color: 'var(--ink)' }}>{s['name_' + lang] || s.name_sq}</h4>
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.45, fontStyle: 'italic' }}>{s['before_' + lang] || s.before}</div>
              <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.45, borderLeft: '2px solid var(--blue)', paddingLeft: 12 }}>{s['after_' + lang] || s.after}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', letterSpacing: '0.04em', lineHeight: 1.55 }}>{s['owner_' + lang] || s.owner_sq}</div>
            </div>
          ))}
        </div>
        <div className="mono" style={{ marginTop: 14, fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>
          {lang === 'sq' ? 'Burimet: eKosova · ARC/MPB · ATK · ARBK · AKK · SIGMA 2023 · EC Kosovo Report 2024.' :
           lang === 'en' ? 'Sources: eKosova · ARC/MIA · TAK · KBRA · KCA · SIGMA 2023 · EC Kosovo Report 2024.' :
           'Izvori: eKosova · ARC/MUP · PUK · ARBK · AKK · SIGMA 2023 · EK Izveštaj o Kosovu 2024.'}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .reforma-stat-row { grid-template-columns: 1fr !important; }
          .reforma-services-head { display: none !important; }
          .reforma-services-row {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .reforma-services-row > div:nth-child(3) { border-left: none !important; padding-left: 0 !important; border-top: 1px dashed var(--line); padding-top: 10px !important; }
        }
      `}</style>
    </section>
  );
}

// ============================================================
// Reforma — Harta institucionale (kush bën çfarë)
// ============================================================
const REFORMA_INSTITUTIONS = [
  {
    key: 'mpb',
    short: 'MPB',
    name_sq: 'Ministria e Punëve të Brendshme',
    name_en: 'Ministry of Internal Affairs',
    name_sr: 'Ministarstvo unutrašnjih poslova',
    role_sq: 'Drejton koordinimin politik të reformës së administratës publike dhe mbikëqyr ARC-në për shërbimet civile.',
    role_en: 'Leads political coordination of the public administration reform and oversees the Civil Registry Agency.',
    role_sr: 'Vodi političku koordinaciju reforme javne uprave i nadgleda Agenciju za civilnu registraciju.',
    site: 'mpb.rks-gov.net', url: 'https://mpb.rks-gov.net',
  },
  {
    key: 'ashi',
    short: 'ASHI',
    name_sq: 'Agjencia e Shoqërisë së Informacionit',
    name_en: 'Information Society Agency',
    name_sr: 'Agencija informacionog društva',
    role_sq: 'Operon platformën eKosova, infrastrukturën shtetërore të interoperabilitetit (GG) dhe identitetin dixhital (eID).',
    role_en: 'Operates the eKosova platform, the state interoperability layer and digital identity (eID).',
    role_sr: 'Upravlja platformom eKosova, državnim slojem interoperabilnosti i digitalnim identitetom (eID).',
    site: 'ashi.rks-gov.net', url: 'https://ashi.rks-gov.net',
  },
  {
    key: 'dap',
    short: 'DAP',
    name_sq: 'Departamenti i Administrimit të Pushtetit Lokal',
    name_en: 'Department of Local Government Administration',
    name_sr: 'Departman za lokalnu samoupravu',
    role_sq: 'Përgjegjës për koordinimin me 38 komunat dhe transferimin e shërbimeve lokale në eKosova.',
    role_en: 'Coordinates the 38 municipalities and the migration of local services to eKosova.',
    role_sr: 'Koordinira 38 opština i prelaz lokalnih usluga na eKosova.',
    site: 'mapl.rks-gov.net', url: 'https://mapl.rks-gov.net',
  },
  {
    key: 'iap',
    short: 'IKAP',
    name_sq: 'Instituti i Kosovës për Administratë Publike',
    name_en: 'Kosovo Institute for Public Administration',
    name_sr: 'Kosovski institut za javnu upravu',
    role_sq: 'Trajnimi i nëpunësve civilë dhe çertifikimi i kompetencave bazë sipas standardeve të SIGMA.',
    role_en: 'Training of civil servants and certification of core competencies along SIGMA standards.',
    role_sr: 'Obuka državnih službenika i sertifikacija osnovnih kompetencija prema SIGMA standardima.',
    site: 'ikap.rks-gov.net', url: 'https://ikap.rks-gov.net',
  },
  {
    key: 'arc',
    short: 'ARC',
    name_sq: 'Agjencia e Regjistrimit Civil',
    name_en: 'Civil Registration Agency',
    name_sr: 'Agencija za civilnu registraciju',
    role_sq: 'Lëshon dokumente personale, mban regjistrin e gjendjes civile dhe lidhjen me eID.',
    role_en: 'Issues personal documents, maintains the civil status registry and the eID link.',
    role_sr: 'Izdaje lična dokumenta, vodi matični registar i vezu sa eID.',
    site: 'arc.rks-gov.net', url: 'https://arc.rks-gov.net',
  },
  {
    key: 'omb',
    short: 'IAP',
    name_sq: 'Avokati i Popullit',
    name_en: 'Ombudsperson Institution',
    name_sr: 'Institucija ombudsmana',
    role_sq: 'Trajton ankesat e qytetarëve kur administrata nuk përgjigjet brenda afateve ligjore.',
    role_en: 'Handles citizen complaints when the administration fails to respond within legal deadlines.',
    role_sr: 'Razmatra žalbe građana kada administracija ne odgovori u zakonskim rokovima.',
    site: 'oik-rks.org', url: 'https://oik-rks.org',
  },
];

function ReformaInstitutionsSection({ lang }) {
  const data = REFORMA_INSTITUTIONS;
  const copy = {
    sq: {
      eyebrow: 'Harta institucionale',
      title: 'Kush e drejton reformën në praktikë',
      sub: 'Reforma administrative nuk është një institucion i vetëm. Këto janë gjashtë organet me ndikim të drejtpërdrejtë në shërbimin që merr qytetari, sipas Ligjit Nr. 06/L-113 për Organizimin dhe Funksionimin e Administratës Shtetërore.',
    },
    en: {
      eyebrow: 'Institutional map',
      title: 'Who actually runs the reform',
      sub: 'Administrative reform is not a single institution. These are the six bodies with the most direct impact on the service a citizen receives, per Law No. 06/L-113 on the Organisation and Functioning of State Administration.',
    },
    sr: {
      eyebrow: 'Institucionalna mapa',
      title: 'Ko zaista vodi reformu',
      sub: 'Reforma uprave nije jedna institucija. Ovo je šest tela sa najdirektnijim uticajem na uslugu koju građanin dobija, prema Zakonu br. 06/L-113 o organizaciji i funkcionisanju državne uprave.',
    },
  }[lang] || null;
  const c = copy || { eyebrow: 'Harta institucionale', title: 'Kush e drejton reformën në praktikë', sub: '' };
  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div className="container">
        <SectionHead eyebrow={c.eyebrow} title={c.title} sub={c.sub} num="03" />
        <div className="reforma-inst-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
          background: 'var(--line)', border: '1px solid var(--line)',
        }}>
          {data.map((it, i) => (
            <Reveal as="article" key={it.key} delay={i * 70} className="hover-lift" style={{
              background: 'var(--paper-2)', padding: '28px 26px', minHeight: 240,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                <span className="serif" style={{
                  fontSize: 32, color: 'var(--blue)', lineHeight: 0.9,
                }}>{it.short}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>{String(i + 1).padStart(2, '0')} / 06</span>
              </div>
              <h4 className="serif" style={{ fontSize: 24, lineHeight: 1.15, color: 'var(--ink)', marginBottom: 12 }}>{it['name_' + lang] || it.name_sq}</h4>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, flex: 1 }}>{it['role_' + lang] || it.role_sq}</p>
              {it.url ? (
                <a href={it.url} target="_blank" rel="noreferrer" className="mono" style={{
                  marginTop: 18, paddingTop: 12, borderTop: '1px dashed var(--line)',
                  fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink)',
                  alignSelf: 'flex-start', borderBottom: '1px solid var(--ink-3)', paddingBottom: 1,
                }}>
                  ↗ {it.site}
                </a>
              ) : (
                <div className="mono" style={{
                  marginTop: 18, paddingTop: 12, borderTop: '1px dashed var(--line)',
                  fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-3)',
                }}>{it.site}</div>
              )}
            </Reveal>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 980px) {
          .reforma-inst-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .reforma-inst-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

// ============================================================
// Reforma — Burime dhe referenca (sourced citations)
// ============================================================
const REFORMA_SOURCES = [
  {
    cat_sq: 'Komisioni Evropian',
    cat_en: 'European Commission',
    cat_sr: 'Evropska komisija',
    items: [
      { t: 'Kosovo 2024 Report', sub: 'SWD(2024) 690 final · 30 tetor 2024 — kapitulli "Public administration reform".', url: 'neighbourhood-enlargement.ec.europa.eu', href: 'https://neighbourhood-enlargement.ec.europa.eu/document/download/4eb01baa-aa49-414c-a4ec-90cefcfa5c5b_en' },
      { t: 'Communication on EU Enlargement Policy', sub: 'COM(2024) 690 final — udhëzimet politike për vendet kandidate.', url: 'ec.europa.eu', href: 'https://ec.europa.eu/commission/presscorner/detail/en/ip_24_5546' },
    ],
  },
  {
    cat_sq: 'OECD / SIGMA',
    cat_en: 'OECD / SIGMA',
    cat_sr: 'OECD / SIGMA',
    items: [
      { t: 'Monitoring Report: Kosovo (SIGMA, 2023)', sub: 'Vlerësim kundrejt Parimeve të Administratës Publike — 6 fusha politike.', url: 'sigmaweb.org', href: 'https://www.sigmaweb.org/publications/monitoring-reports.htm' },
      { t: 'Principles of Public Administration', sub: 'Standardi referencë i përdorur nga BE-ja për vlerësimin e administratës.', url: 'sigmaweb.org/principles', href: 'https://www.sigmaweb.org/publications/principles-public-administration.htm' },
    ],
  },
  {
    cat_sq: 'Qeveria e Republikës së Kosovës',
    cat_en: 'Government of Kosovo',
    cat_sr: 'Vlada Kosova',
    items: [
      { t: 'Strategjia për Modernizimin e Administratës Publike 2022–2027', sub: 'Plan veprimi shumëvjeçar i miratuar nga Qeveria · objektiva të matshme.', url: 'mpb.rks-gov.net', href: 'https://mpb.rks-gov.net' },
      { t: 'Ligji Nr. 06/L-114 për Zyrtarët Publikë', sub: 'Bazë ligjore për rekrutimin me meritë dhe pavarësinë e shërbimit civil.', url: 'gzk.rks-gov.net', href: 'https://gzk.rks-gov.net/ActDetail.aspx?ActID=18555' },
      { t: 'Ligji Nr. 08/L-196 për Pagat në Sektorin Publik', sub: 'Sistem i ri i pagave i miratuar · në fazë zbatimi.', url: 'gzk.rks-gov.net', href: 'https://gzk.rks-gov.net/ActDetail.aspx?ActID=82733' },
    ],
  },
  {
    cat_sq: 'Platforma dhe shoqëria civile',
    cat_en: 'Platforms & civil society',
    cat_sr: 'Platforme i civilno društvo',
    items: [
      { t: 'eKosova', sub: 'Platforma qeveritare e shërbimeve elektronike — pikë qendrore për qytetarë e biznese.', url: 'ekosova.rks-gov.net', href: 'https://ekosova.rks-gov.net' },
      { t: 'PAR Monitor (GAP / KDI / Lëvizja FOL)', sub: 'Monitor i pavarur i reformës nga organizatat e shoqërisë civile.', url: 'institutigap.org', href: 'https://www.institutigap.org' },
      { t: 'Worldwide Governance Indicators', sub: 'Banka Botërore — tregues krahasues të efektivitetit qeveritar.', url: 'worldbank.org/wgi', href: 'https://info.worldbank.org/governance/wgi/' },
    ],
  },
];

function ReformaSourcesSection({ lang }) {
  const data = REFORMA_SOURCES;
  const copy = {
    sq: {
      eyebrow: 'Burimet',
      title: 'Çdo numër në këtë faqe ka një dokument origjinal',
      sub: 'Të dhënat dhe afatet e cituara këtu nuk janë opinion redaksional. Burimet kryesore janë publikime të Komisionit Evropian, raportet vjetore të SIGMA-s, Strategjia e MAP-it dhe platformat zyrtare të Qeverisë së Kosovës.',
    },
    en: {
      eyebrow: 'Sources',
      title: 'Every number on this page has an original document',
      sub: 'The data and deadlines cited here are not editorial opinion. The primary sources are European Commission publications, annual SIGMA monitoring reports, the PAR Strategy and official Kosovo Government platforms.',
    },
    sr: {
      eyebrow: 'Izvori',
      title: 'Svaki broj na stranici ima originalni dokument',
      sub: 'Podaci i rokovi navedeni ovde nisu uredničko mišljenje. Osnovni izvori su publikacije Evropske komisije, godišnji izveštaji SIGMA-e, Strategija MUJU i zvanične platforme Vlade Kosova.',
    },
  }[lang] || null;
  const c = copy || { eyebrow: 'Burimet', title: 'Çdo numër në këtë faqe ka një dokument origjinal', sub: '' };
  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container">
        <SectionHead eyebrow={c.eyebrow} title={c.title} sub={c.sub} num="04" />
        <div className="reforma-sources-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
          {data.map((g, gi) => (
            <Reveal key={gi} delay={gi * 90} distance={14} style={{ borderTop: '1px solid var(--line)', paddingTop: 22 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 22 }}>
                <span style={{ color: 'var(--rust)' }}>§ 0{gi + 1}</span> · {g['cat_' + lang] || g.cat_sq}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {g.items.map((it, ii) => (
                  <li key={ii} style={{ display: 'flex', gap: 14, paddingBottom: 18, borderBottom: ii < g.items.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--rust)', flexShrink: 0, marginTop: 4 }}>0{ii + 1}</span>
                    <div>
                      <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, color: 'var(--ink)' }}>{it.t}</div>
                      <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, marginTop: 6 }}>{it.sub}</div>
                      <a href={it.href || `https://${it.url}`} target="_blank" rel="noreferrer" className="mono" style={{ display: 'inline-block', fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink)', marginTop: 10, borderBottom: '1px solid var(--ink-3)', paddingBottom: 1 }}>↗ {it.url}</a>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
        <div className="mono" style={{ marginTop: 40, paddingTop: 18, borderTop: '1px solid var(--line)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink-3)' }}>
          {lang === 'sq' ? 'Përditësuar maj 2026 · Linket janë referenca për publikimet origjinale; statusi i tyre mund të ndryshojë.' :
           lang === 'en' ? 'Updated May 2026 · Links reference the original publications; their status may change over time.' :
           'Ažurirano maj 2026 · Linkovi su reference za originalne publikacije; status može da se promeni.'}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .reforma-sources-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
      `}</style>
    </section>
  );
}

// ============================================================
// Korrupsioni — Checklist i provave
// ============================================================
const KORRUPSION_EVIDENCE = [
  { k: '01', h_sq: 'Datë dhe orë', h_en: 'Date and time', h_sr: 'Datum i vreme',
    p_sq: 'Shëno datën, orën dhe kohëzgjatjen e takimit ose ngjarjes.',
    p_en: 'Note the date, time and duration of the meeting or event.',
    p_sr: 'Zabeležite datum, vreme i trajanje sastanka ili događaja.' },
  { k: '02', h_sq: 'Vendi', h_en: 'Place', h_sr: 'Mesto',
    p_sq: 'Adresa, zyra, kati, sportel — sa më e saktë.',
    p_en: 'Address, office, floor, counter — as precise as possible.',
    p_sr: 'Adresa, kancelarija, sprat, šalter — što preciznije.' },
  { k: '03', h_sq: 'Institucioni', h_en: 'Institution', h_sr: 'Institucija',
    p_sq: 'Emri i institucionit, departamenti dhe njësia konkrete.',
    p_en: 'Institution name, department and specific unit.',
    p_sr: 'Naziv institucije, departman i konkretna jedinica.' },
  { k: '04', h_sq: 'Personat e përfshirë', h_en: 'People involved', h_sr: 'Osobe',
    p_sq: 'Emër, mbiemër, pozicion ose, nëse mungojnë, përshkrim fizik.',
    p_en: 'Name, surname, position, or physical description if unknown.',
    p_sr: 'Ime, prezime, pozicija ili fizički opis ako nisu poznati.' },
  { k: '05', h_sq: 'Dokumentet', h_en: 'Documents', h_sr: 'Dokumenti',
    p_sq: 'Çdo letër, formular, faturë apo vërtetim që ke marrë ose që të është treguar.',
    p_en: 'Any letter, form, invoice or certificate received or shown.',
    p_sr: 'Svako pismo, formular, račun ili potvrda koja je primljena ili prikazana.' },
  { k: '06', h_sq: 'Foto dhe ekrane', h_en: 'Photos / screens', h_sr: 'Fotografije / ekrani',
    p_sq: 'Foto të dokumenteve, ekraneve dhe vendit; ruaj origjinalet.',
    p_en: 'Photos of documents, screens and the place; keep originals.',
    p_sr: 'Fotografije dokumenata, ekrana i mesta; sačuvajte originale.' },
  { k: '07', h_sq: 'Mesazhet', h_en: 'Messages', h_sr: 'Poruke',
    p_sq: 'SMS, WhatsApp, email, thirrje — eksporto dhe ruaj me datën origjinale.',
    p_en: 'SMS, WhatsApp, email, calls — export and keep with original timestamps.',
    p_sr: 'SMS, WhatsApp, email, pozivi — izvezite i sačuvajte sa originalnim datumom.' },
  { k: '08', h_sq: 'Dëshmitarët', h_en: 'Witnesses', h_sr: 'Svedoci',
    p_sq: 'Kush ishte i pranishëm; emër dhe kontakt nëse pranojnë.',
    p_en: 'Who was present; name and contact if they agree.',
    p_sr: 'Ko je bio prisutan; ime i kontakt ako se slože.' },
  { k: '09', h_sq: 'Çfarë u kërkua', h_en: 'What was requested', h_sr: 'Šta je traženo',
    p_sq: 'Çfarë "shërbimi" po kërkoje dhe çfarë u kërkua ose u premtua në shkëmbim.',
    p_en: 'What "service" you were asking for and what was requested or promised in return.',
    p_sr: 'Koju "uslugu" ste tražili i šta je traženo ili obećano u zamenu.' },
];

function KorrupsionEvidenceSection({ lang }) {
  const data = KORRUPSION_EVIDENCE;
  const copy = {
    sq: {
      eyebrow: 'Checklist i provave',
      title: 'Çfarë të ruash para se të raportosh',
      sub: 'Korrupsioni hetohet vetëm me prova të dokumentuara. Para se të shkosh në një institucion, mblidh këto nëntë gjëra. Asnjë nuk është detyrimisht e nevojshme veçmas, por sa më shumë të kesh, aq më e besueshme është dëshmia.',
      note: 'Mos krijo prova të rreme. Mos rrezikon sigurinë tënde — nëse ndjehesh i kërcënuar, raporto fillimisht në polici.',
    },
    en: {
      eyebrow: 'Evidence checklist',
      title: 'What to keep before you report',
      sub: 'Corruption is only investigated with documented evidence. Before going to an institution, collect these nine items. None is strictly required on its own, but the more you have, the stronger the case.',
      note: 'Do not fabricate evidence. Do not risk your safety — if you feel threatened, report to the police first.',
    },
    sr: {
      eyebrow: 'Lista dokaza',
      title: 'Šta sačuvati pre prijave',
      sub: 'Korupcija se istražuje samo sa dokumentovanim dokazima. Pre nego što odete u instituciju, prikupite ovih devet stavki. Nijedna nije obavezna sama po sebi, ali što više imate, jači je predmet.',
      note: 'Ne falsifikujte dokaze. Ne ugrožavajte svoju bezbednost — ako se osećate ugroženo, prvo prijavite policiji.',
    },
  }[lang] || null;
  const c = copy || {};
  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div className="container">
        <SectionHead eyebrow={c.eyebrow} title={c.title} sub={c.sub} num="03" />
        <div className="korr-evidence-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
          background: 'var(--line)', border: '1px solid var(--line)',
        }}>
          {data.map((it, i) => (
            <Reveal as="article" key={it.k} delay={i * 60} className="hover-lift" style={{ background: 'var(--paper-2)', padding: '24px 22px', minHeight: 180, display: 'flex', flexDirection: 'column' }}>
              <span className="serif" style={{ fontSize: 38, color: 'oklch(58% 0.14 82)', lineHeight: 0.9, marginBottom: 14 }}>{it.k}</span>
              <h4 className="serif" style={{ fontSize: 22, lineHeight: 1.12, color: 'var(--ink)', marginBottom: 10 }}>{it['h_' + lang] || it.h_sq}</h4>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', margin: 0 }}>{it['p_' + lang] || it.p_sq}</p>
            </Reveal>
          ))}
        </div>
        <p className="mono" style={{ marginTop: 18, fontSize: 11, color: 'var(--rust)', letterSpacing: '0.05em' }}>
          ⚠ {c.note}
        </p>
      </div>
      <style>{`
        @media (max-width: 980px) { .korr-evidence-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px) { .korr-evidence-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

// ============================================================
// Korrupsioni — Kanalet e raportimit (institucione reale)
// ============================================================
const KORRUPSION_CHANNELS = [
  {
    key: 'akk', short: 'AKK',
    name_sq: 'Agjencia kundër Korrupsionit',
    name_en: 'Anti-Corruption Agency',
    name_sr: 'Antikorupcijska agencija',
    role_sq: 'Parandalim, monitorim i deklarimit të pasurisë, konflikt interesi dhe pranim i kallëzimeve.',
    role_en: 'Prevention, asset-declaration monitoring, conflict of interest and complaint intake.',
    role_sr: 'Prevencija, praćenje prijave imovine, sukob interesa i prijem prijava.',
    site: 'akk-ks.org', url: 'https://akk-ks.org', phone: '038 511 467',
    anon_sq: 'Pranon kallëzime anonime',
    anon_en: 'Accepts anonymous complaints',
    anon_sr: 'Prima anonimne prijave',
  },
  {
    key: 'psrk', short: 'PSRK',
    name_sq: 'Prokuroria Speciale',
    name_en: 'Special Prosecution',
    name_sr: 'Specijalno tužilaštvo',
    role_sq: 'Hetim i korrupsionit në nivel të lartë, krimit të organizuar dhe pastrimit të parave.',
    role_en: 'High-level corruption, organised crime and money-laundering investigations.',
    role_sr: 'Istrage korupcije na visokom nivou, organizovanog kriminala i pranja novca.',
    site: 'prokuroria-rks.org', url: 'https://prokuroria-rks.org',
    anon_sq: 'Identifikimi opsional',
    anon_en: 'Identification optional',
    anon_sr: 'Identifikacija opciona',
  },
  {
    key: 'police', short: 'PK',
    name_sq: 'Policia e Kosovës',
    name_en: 'Kosovo Police',
    name_sr: 'Kosovska policija',
    role_sq: 'Hetim i krimit ekonomik, ryshfetit dhe abuzimeve me detyrën zyrtare në bashkëpunim me Prokurorinë.',
    role_en: 'Economic crime, bribery and abuse-of-office investigations, alongside Prosecution.',
    role_sr: 'Istrage ekonomskog kriminala, mita i zloupotrebe službene dužnosti, uz Tužilaštvo.',
    site: 'kosovopolice.com', url: 'https://www.kosovopolice.com', phone: '192 · 0800 80 800',
    anon_sq: 'Linjë e gjelbër anonime',
    anon_en: 'Anonymous tip line',
    anon_sr: 'Anonimna linija prijave',
  },
  {
    key: 'ombud', short: 'IAP',
    name_sq: 'Avokati i Popullit',
    name_en: 'Ombudsperson Institution',
    name_sr: 'Institucija ombudsmana',
    role_sq: 'Mbron qytetarët nga keqpërdorimi i pushtetit ose mosveprimi i administratës publike.',
    role_en: 'Protects citizens from abuse of power or administrative inaction.',
    role_sr: 'Štiti građane od zloupotrebe vlasti ili neaktivnosti uprave.',
    site: 'oik-rks.org', url: 'https://oik-rks.org', phone: '038 223 782',
    anon_sq: 'Identifikimi nuk është i detyrueshëm',
    anon_en: 'Identification not required',
    anon_sr: 'Identifikacija nije obavezna',
  },
  {
    key: 'alac', short: 'ALAC',
    name_sq: 'ALAC · KDI / Lëvizja FOL',
    name_en: 'ALAC · KDI / FOL Movement',
    name_sr: 'ALAC · KDI / Pokret FOL',
    role_sq: 'Qendra për këshillim juridik falas të sigurt nga shoqëria civile; orientim para raportimit zyrtar.',
    role_en: 'Civil-society safe legal-advice centre; orientation before formal reporting.',
    role_sr: 'Centar za bezbedan pravni savet civilnog društva; orijentacija pre zvanične prijave.',
    site: 'kdi-kosova.org', url: 'https://kdi-kosova.org',
    anon_sq: 'Konsultim plotësisht anonim',
    anon_en: 'Fully anonymous consultation',
    anon_sr: 'Potpuno anonimna konsultacija',
  },
  {
    key: 'whistle', short: '06/L-085',
    name_sq: 'Mbrojtja e sinjalizuesve',
    name_en: 'Whistleblower protection',
    name_sr: 'Zaštita zviždača',
    role_sq: 'Ligji Nr. 06/L-085 garanton anonimat, mbrojtje juridike e profesionale dhe ndalim të hakmarrjes.',
    role_en: 'Law No. 06/L-085 guarantees anonymity, legal and professional protection, and a ban on retaliation.',
    role_sr: 'Zakon br. 06/L-085 garantuje anonimnost, pravnu i profesionalnu zaštitu i zabranu odmazde.',
    site: 'gzk.rks-gov.net · Ligji Nr. 06/L-085', url: 'https://gzk.rks-gov.net/ActDetail.aspx?ActID=18757',
    anon_sq: 'Mbron çdo punonjës që raporton në mirëbesim',
    anon_en: 'Covers any employee reporting in good faith',
    anon_sr: 'Obuhvata svakog zaposlenog koji prijavljuje u dobroj veri',
  },
];

function KorrupsionChannelsSection({ lang }) {
  const data = KORRUPSION_CHANNELS;
  const copy = {
    sq: {
      eyebrow: 'Kanalet e raportimit',
      title: 'Ku raportohet korrupsioni në Kosovë',
      sub: 'Pesë institucione zyrtare dhe një ligj që mbron sinjalizuesin. Mund të zgjedhësh më shumë se një kanal — ato shkëmbejnë informacion në rastet me dyshime serioze.',
    },
    en: {
      eyebrow: 'Reporting channels',
      title: 'Where to report corruption in Kosovo',
      sub: 'Five official institutions and a law that protects whistleblowers. You can use more than one channel — they share information in serious cases.',
    },
    sr: {
      eyebrow: 'Kanali prijave',
      title: 'Gde prijaviti korupciju na Kosovu',
      sub: 'Pet zvaničnih institucija i zakon koji štiti zviždače. Možete koristiti više od jednog kanala — razmenjuju informacije u ozbiljnim slučajevima.',
    },
  }[lang] || null;
  const c = copy || {};
  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container">
        <SectionHead eyebrow={c.eyebrow} title={c.title} sub={c.sub} num="04" />
        <div className="korr-channels-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
          background: 'var(--line)', border: '1px solid var(--line)',
        }}>
          {data.map((it, i) => (
            <Reveal as="article" key={it.key} delay={i * 70} className="hover-lift" style={{ background: 'var(--paper)', padding: '28px 26px', minHeight: 240, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <span className="serif" style={{ fontSize: 32, color: 'oklch(58% 0.14 82)', lineHeight: 0.9 }}>{it.short}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>{String(i + 1).padStart(2, '0')} / 0{data.length}</span>
              </div>
              <h4 className="serif" style={{ fontSize: 24, lineHeight: 1.15, color: 'var(--ink)', marginBottom: 12 }}>{it['name_' + lang] || it.name_sq}</h4>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, flex: 1 }}>{it['role_' + lang] || it.role_sq}</p>
              <div className="mono" style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed var(--line)', fontSize: 10, letterSpacing: '0.1em', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <a href={it.url} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--ink-3)', paddingBottom: 1, alignSelf: 'flex-start' }}>↗ {it.site}</a>
                {it.phone && <span style={{ color: 'var(--ink-3)' }}>{it.phone}</span>}
              </div>
              <div className="mono" style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.04em', color: 'var(--rust)' }}>
                ✓ {it['anon_' + lang] || it.anon_sq}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 980px) { .korr-channels-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px) { .korr-channels-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

// ============================================================
// Korrupsioni — Shenjat paralajmëruese (red flags) + burimet
// ============================================================
const KORRUPSION_RED_FLAGS = [
  {
    cat_sq: 'Prokurimi publik', cat_en: 'Public procurement', cat_sr: 'Javne nabavke',
    items_sq: ['Tender me afate jorealisht të shkurtra', 'Specifika që përshtaten për një ofertues të vetëm', 'Kontratë e dhënë pa konkurrencë', 'Çmime që devijojnë ndjeshëm nga tregu'],
    items_en: ['Tenders with unrealistically short deadlines', 'Specs tailored to a single bidder', 'Contracts awarded without competition', 'Prices that deviate significantly from the market'],
    items_sr: ['Tenderi sa nerealno kratkim rokovima', 'Specifikacije skrojene za jednog ponuđača', 'Ugovori dodeljeni bez konkurencije', 'Cene koje znatno odstupaju od tržišta'],
  },
  {
    cat_sq: 'Punësimi në sektorin publik', cat_en: 'Public-sector hiring', cat_sr: 'Zapošljavanje u javnom sektoru',
    items_sq: ['Konkurs i shpallur dhe vlerësuar brenda pak ditësh', 'Kërkesa me kritere që përshtatin një kandidat', 'Anëtarë familjeje në komision intervistues', 'Pozicione drejtuese që nuk publikohen'],
    items_en: ['Vacancies opened and decided within days', 'Criteria tailored to a single candidate', 'Family members on selection panels', 'Leadership posts not publicly announced'],
    items_sr: ['Konkursi otvoreni i odlučeni za nekoliko dana', 'Kriterijumi skrojeni za jednog kandidata', 'Članovi porodice u komisiji', 'Rukovodeća mesta koja se ne objavljuju'],
  },
  {
    cat_sq: 'Konflikti i interesit', cat_en: 'Conflict of interest', cat_sr: 'Sukob interesa',
    items_sq: ['Zyrtari miraton kontratë me biznesin e familjes', 'Anëtarë bordi që votojnë për veten', 'Konsulent që rrjedh nga institucioni i kontraktuesit', 'Mungesë e deklarimit në AKK'],
    items_en: ['Officials approving contracts with family-owned firms', 'Board members voting on their own interests', 'Consultants flowing from contracting institution', 'No declaration filed at AKK'],
    items_sr: ['Službenici koji odobravaju ugovore sa porodičnim firmama', 'Članovi odbora koji glasaju o sopstvenim interesima', 'Konsultanti iz ugovorne institucije', 'Bez prijave u AKK'],
  },
  {
    cat_sq: 'Pasuria e pajustifikuar', cat_en: 'Unexplained wealth', cat_sr: 'Neobjašnjiva imovina',
    items_sq: ['Pronë e blerë mbi pagën zyrtare', 'Mospërputhje ndërmjet deklaratës dhe stilit të jetës', 'Para të transferuara në llogari të të afërmve', 'Aktivitete biznesi pa burim të dukshëm'],
    items_en: ['Property purchased beyond declared salary', 'Lifestyle inconsistent with the declaration', 'Money routed through relatives\' accounts', 'Business activity with no visible source'],
    items_sr: ['Imovina kupljena iznad prijavljene plate', 'Stil života koji odstupa od prijave', 'Novac usmeravan preko rodbinskih računa', 'Poslovanje bez vidljivog izvora'],
  },
];

function KorrupsionRedFlagsSection({ lang }) {
  const data = KORRUPSION_RED_FLAGS;
  const copy = {
    sq: {
      eyebrow: 'Shenjat paralajmëruese',
      title: 'Kur diçka nuk shkon — si dukët korrupsioni në praktikë',
      sub: 'Lista e mëposhtme nuk është dëshmi e fajësisë, por shenja statistikisht të lidhura me skemat e raportuara. Nëse vëren disa prej tyre në të njëjtin rast, ia vlen të raportohet për shqyrtim institucional.',
      src: 'Burime: GRECO Round V Evaluation Report on Kosovo · Transparency International Kosovo · KDI · Raporti EC Kosovo 2025 (kap. anti-corruption).',
    },
    en: {
      eyebrow: 'Red flags',
      title: 'When something is off — what corruption looks like in practice',
      sub: 'The list below is not proof of guilt, but signs statistically associated with reported schemes. If several appear in the same case, it is worth reporting for institutional review.',
      src: 'Sources: GRECO Round V Evaluation Report on Kosovo · Transparency International Kosovo · KDI · EC Kosovo Report 2025 (anti-corruption chapter).',
    },
    sr: {
      eyebrow: 'Signali rizika',
      title: 'Kada nešto ne valja — kako korupcija izgleda u praksi',
      sub: 'Lista ispod nije dokaz krivice, već signali statistički povezani sa prijavljenim šemama. Ako se nekoliko pojavi u istom slučaju, vredi prijaviti radi institucionalnog razmatranja.',
      src: 'Izvori: GRECO Round V Evaluation Report on Kosovo · Transparency International Kosovo · KDI · EK Izveštaj o Kosovu 2025 (poglavlje antikorupcija).',
    },
  }[lang] || null;
  const c = copy || {};
  return (
    <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div className="container">
        <SectionHead eyebrow={c.eyebrow} title={c.title} sub={c.sub} num="05" />
        <div className="korr-redflags-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
          {data.map((g, gi) => (
            <Reveal key={gi} delay={gi * 90} distance={14} style={{ borderTop: '1px solid var(--line)', paddingTop: 22 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 22 }}>
                <span style={{ color: 'var(--rust)' }}>§ 0{gi + 1}</span> · {g['cat_' + lang] || g.cat_sq}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(g['items_' + lang] || g.items_sq).map((item, ii) => (
                  <li key={ii} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--rust)', flexShrink: 0, marginTop: 2 }}>⚠</span>
                    <span style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
        <div className="mono" style={{ marginTop: 40, paddingTop: 18, borderTop: '1px solid var(--line)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink-3)' }}>
          {c.src}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) { .korr-redflags-grid { grid-template-columns: 1fr !important; gap: 24px !important; } }
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

function RecognitionHomeSection({ lang }) {
  const data = useCmsArray('recognitions', RECOGNITIONS);
  const [barsRef, barsInView] = useInView({ threshold: 0.25 });
  const [activeYear, setActiveYear] = useState(data[data.length - 1]?.y || 2025);
  const active = data.find(d => d.y === activeYear) || data[data.length - 1] || { y: 2025, n: 118 };
  const max = Math.max(...data.map(d => d.n), 120);
  const recognitionCopy = {
    sq: {
      eyebrow: 'Njohjet ndër vite',
      title: <>Sa shtete e kanë njohur <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Kosovën?</span></>,
      sub: 'Pas shpalljes së pavarësisë në vitin 2008, numri i njohjeve diplomatike u rrit me valë. Grafiku tregon rritjen kumulative të njohjeve të raportuara ndër vite.',
      current: 'njohje të raportuara',
      source: 'Burim: MPJD / listë kronologjike e njohjeve',
      selected: 'viti i zgjedhur',
    },
    en: {
      eyebrow: 'Recognitions over time',
      title: <>How many states have recognised <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Kosovo?</span></>,
      sub: 'After the 2008 declaration of independence, diplomatic recognitions grew in waves. The chart shows the cumulative growth of reported recognitions over time.',
      current: 'reported recognitions',
      source: 'Source: MFAD / chronological recognition list',
      selected: 'selected year',
    },
    sr: {
      eyebrow: 'Priznanja kroz godine',
      title: <>Koliko država je priznalo <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Kosovo?</span></>,
      sub: 'Posle proglašenja nezavisnosti 2008. diplomatska priznanja rasla su u talasima. Grafikon prikazuje kumulativni rast prijavljenih priznanja kroz godine.',
      current: 'prijavljena priznanja',
      source: 'Izvor: MPJD / hronološka lista priznanja',
      selected: 'izabrana godina',
    },
  };
  const copy = recognitionCopy[lang] || recognitionCopy.sq;

  return (
    <section className="recognition-home-section" style={{ padding: '92px 0', borderTop: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)' }}>
      <div className="container recognition-home" style={{ display: 'grid', gridTemplateColumns: '0.88fr 1.42fr', gap: 58, alignItems: 'end' }}>
        <div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', borderTop: '1px solid var(--ink-3)', paddingTop: 8, display: 'inline-block' }}>
            {copy.eyebrow}
          </div>
          <h2 className="serif" style={{ fontSize: 'clamp(36px, 5.2vw, 66px)', lineHeight: 1.04, marginTop: 22, color: 'var(--ink)' }}>{copy.title}</h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink-2)', marginTop: 22, maxWidth: 560 }}>{copy.sub}</p>
          <div style={{ marginTop: 34, border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)' }} className="recognition-facts">
            <div style={{ background: 'var(--paper-2)', padding: 22 }}>
              <div className="serif" style={{ fontSize: 54, color: 'var(--gold)', lineHeight: 0.9 }}>{active.n}</div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)', marginTop: 12, textTransform: 'uppercase' }}>{copy.current}</div>
            </div>
            <div style={{ background: 'var(--paper-2)', padding: 22 }}>
              <div className="serif" style={{ fontSize: 54, color: 'var(--ink)', lineHeight: 0.9 }}>{active.y}</div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)', marginTop: 12, textTransform: 'uppercase' }}>{copy.selected}</div>
            </div>
          </div>
        </div>

        <div>
          <div ref={barsRef} style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, minmax(28px, 1fr))`, gap: 5, height: 330, alignItems: 'end', borderBottom: '1px solid var(--line)', paddingBottom: 12 }} className="recognition-bars" role="list" aria-label={copy.eyebrow}>
            {data.map((d, i) => {
              const h = `${Math.max(12, (d.n / max) * 88)}%`;
              const mark = [2008, 2011, 2014, 2017, 2020, 2023, 2025].includes(d.y);
              const selected = d.y === active.y;
              const barDelay = i * 45;
              return (
                <button
                  key={d.y}
                  type="button"
                  onMouseEnter={() => setActiveYear(d.y)}
                  onFocus={() => setActiveYear(d.y)}
                  onClick={() => setActiveYear(d.y)}
                  style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                  aria-label={`${d.y}: ${d.n}`}
                  role="listitem">
                  <div style={{
                    height: h,
                    background: selected ? 'var(--gold)' : d.y === 2008 ? 'var(--rust)' : 'var(--ink)',
                    opacity: selected ? 1 : 0.72,
                    position: 'relative',
                    boxShadow: selected ? '0 -10px 24px rgba(199,173,112,0.26)' : 'none',
                    transform: barsInView ? 'scaleY(1)' : 'scaleY(0)',
                    transformOrigin: 'bottom',
                    transition: `transform 540ms cubic-bezier(.2,.7,.2,1) ${barDelay}ms, height 180ms ease, opacity 180ms ease, box-shadow 180ms ease, background 180ms ease`,
                    width: '100%',
                  }}>
                    {(mark || selected) && <span className="mono" style={{
                      position: 'absolute', top: -22, left: 0, right: 0, textAlign: 'center',
                      fontSize: 10, color: selected ? 'var(--ink)' : 'var(--ink-3)',
                      opacity: barsInView ? 1 : 0,
                      transition: `opacity 420ms ease ${barDelay + 320}ms`,
                    }}>{d.n}</span>}
                  </div>
                  <span className="mono" style={{
                    fontSize: 9, color: selected || mark ? 'var(--ink)' : 'var(--ink-3)',
                    writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '10px auto 0', height: 38,
                    opacity: barsInView ? 1 : 0,
                    transition: `opacity 320ms ease ${barDelay + 200}ms`,
                  }}>
                    {d.y}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)', textAlign: 'center', marginTop: 14 }}>
            {copy.source}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 980px) {
          .recognition-home { grid-template-columns: 1fr !important; align-items: start !important; }
          .recognition-bars { grid-template-columns: repeat(18, minmax(0, 1fr)) !important; height: 250px !important; padding-top: 24px; overflow: visible !important; }
        }
        @media (max-width: 560px) {
          .recognition-home-section { padding: 64px 0 !important; }
          .recognition-home { gap: 34px !important; }
          .recognition-facts { grid-template-columns: 1fr !important; }
          .recognition-bars {
            height: 220px !important;
            gap: 3px !important;
            grid-template-columns: repeat(18, minmax(0, 1fr)) !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .recognition-bars > button { min-width: 0 !important; }
          .recognition-bars span { font-size: 7px !important; }
        }
      `}</style>
    </section>
  );
}

// ============================================================
// Home Page
// ============================================================
function HomePage({ lang, t, onChat }) {
  // Mini regional bars (top 4)
  const top = useCmsArray('region', REGION);
  const homeStats = useCmsArray('home_stats', HOME_STATS);
  // Mini objectives preview
  const objectives = useCmsArray('objectives', OBJECTIVES);
  const faqData = useCmsArray('faq', FAQ_DATA);
  const objsPreview = objectives.slice(0, 4);
  const totalCompleted = objectives.filter(o => o.completed).length;
  const globalProgress = Math.round(objectives.reduce((s, o) => s + (o.completed ? 100 : o.progress), 0) / objectives.length);
  // Mini FAQ
  const faqPreview = faqData.slice(0, 3);

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
          {top.map((c, i) => {
            const color = c.status === 'negotiating' ? 'var(--sage)' : c.status === 'candidate' ? 'var(--gold)' : 'var(--rust)';
            const isKosova = c.code === 'XK';
            return (
              <Reveal key={c.code} delay={i * 60} distance={10} className="region-row" style={{
                display: 'grid', gridTemplateColumns: '52px 130px 1fr 80px',
                alignItems: 'center', gap: 16, padding: '10px 0',
                borderBottom: '1px solid var(--line)',
                background: isKosova ? 'var(--paper-2)' : 'transparent',
                margin: isKosova ? '0 -16px' : 0,
                paddingLeft: isKosova ? 16 : 0, paddingRight: isKosova ? 16 : 0,
              }}>
                <span className="mono" style={{ fontSize: 16, color: 'var(--ink)' }}>{c.code}</span>
                <span className="serif" style={{ fontSize: 20, color: 'var(--ink)' }}>{c['name_' + lang] || c.name_sq || c.name}{isKosova && <span style={{ color: 'var(--rust)', marginLeft: 6 }}>★</span>}</span>
                <div style={{ height: 14, background: 'var(--paper-3)', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: c.progress + '%', background: color }} />
                </div>
                <span className="mono" style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'right' }}>{c.progress}/100</span>
              </Reveal>
            );
          })}
        </div>
      </PreviewBlock>

      <RecognitionHomeSection lang={lang} />

      {/* Stats strip */}
      <section style={{ padding: '80px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, border: '1px solid var(--line)' }} className="stats-strip">
            {homeStats.map((stat, i) => (
              <Reveal key={i} delay={i * 80} distance={14}><BigStat {...stat} lang={lang} border={i > 0} /></Reveal>
            ))}
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
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 12 }}>{totalCompleted} të plotësuara nga {objectives.length}</div>
          </div>
          <div>
            {objsPreview.map((o, i) => {
              const cl = CLUSTER_LABELS[o.cluster] || CLUSTER_LABELS.other;
              return (
                <Reveal key={o.id} delay={i * 65} distance={10} className="obj-preview-row" style={{ display: 'grid', gridTemplateColumns: '36px 1fr 120px 80px', alignItems: 'center', gap: 16, padding: '16px 0', borderTop: '1px solid var(--line)' }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `1.5px solid ${o.completed ? 'var(--sage)' : 'var(--ink-3)'}`,
                    background: o.completed ? 'var(--sage)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--paper)', fontSize: 11, fontWeight: 700,
                  }}>{o.completed ? '✓' : ''}</span>
                  <span className="serif" style={{ fontSize: 20, color: 'var(--ink)', lineHeight: 1.2 }}>{o['name_' + lang] || o.name_sq || o.name}</span>
                  <span className="mono" style={{ fontSize: 10, padding: '3px 8px', border: `1px solid ${cl.color}`, color: cl.color, justifySelf: 'start' }}>{cl[lang] || cl.sq}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right' }}>{o.completed ? 100 : o.progress}%</span>
                </Reveal>
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
            <Reveal as="details" key={i} delay={i * 70} distance={10} style={{ borderTop: '1px solid var(--line)' }}>
              <summary style={{ padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, cursor: 'pointer', listStyle: 'none' }}>
                <span className="serif" style={{ fontSize: 22, lineHeight: 1.2, color: 'var(--ink)' }}>{f['q_' + lang] || f.q_sq || f.question}</span>
                <span style={{ fontSize: 22, color: 'var(--ink-2)', flexShrink: 0 }}>+</span>
              </summary>
              <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0, padding: '0 60px 24px 0' }}>{f['a_' + lang] || f.a_sq || f.answer}</p>
            </Reveal>
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
        <Reveal delay={0} distance={8} className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.18em', marginBottom: 24 }}>
          <a href="#/" style={{ color: 'var(--ink-3)' }}>HOME</a> / {kicker.toUpperCase()}
        </Reveal>
        <Reveal as="h1" delay={100} distance={16} className="serif" style={{ fontSize: 'clamp(48px, 7.5vw, 104px)', lineHeight: 0.94, color: accent, letterSpacing: '-0.02em' }}>{title}</Reveal>
        {sub && <Reveal as="p" delay={200} style={{ fontSize: 20, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 720, marginTop: 24 }}>{sub}</Reveal>}
      </div>
    </section>
  );
}

function localizedValue(item, field, lang) {
  if (!item) return '';
  return item[field + '_' + lang] || item[field + '_sq'] || item[field] || '';
}

function ui(lang, sq, en, sr) {
  return lang === 'en' ? en : lang === 'sr' ? sr : sq;
}

const KNOWN_TEXT_TRANSLATIONS = {
  'Në fuqi': { en: 'In force', sr: 'Na snazi' },
  'Në progres': { en: 'In progress', sr: 'U toku' },
  'Në pritje': { en: 'Pending', sr: 'Na čekanju' },
  'E plotësuar': { en: 'Completed', sr: 'Završeno' },
  'Hap i ardhshëm teknik': { en: 'Next technical step', sr: 'Sledeći tehnički korak' },
  'Kusht politik': { en: 'Political condition', sr: 'Politički uslov' },
  'Vazhdimisht': { en: 'Ongoing', sr: 'Stalno' },
  'to_collect': { en: 'to collect', sr: 'za prikupljanje' },
  'law_report_guide_or_dataset': { en: 'law, report, guide or dataset', sr: 'zakon, izveštaj, vodič ili skup podataka' },
  'Aktet Themelore': { en: 'Foundational acts', sr: 'Osnovni akti' },
  'Ligje me Ndikim Direkt te Qytetarët': { en: 'Laws with direct impact on citizens', sr: 'Zakoni sa direktnim uticajem na građane' },
  'Arsim, Kulturë, Rini, Sport': { en: 'Education, culture, youth, sport', sr: 'Obrazovanje, kultura, omladina, sport' },
  'Shëndetësi': { en: 'Health', sr: 'Zdravstvo' },
  'Mjedis, Bujqësi, Pyje': { en: 'Environment, agriculture, forests', sr: 'Životna sredina, poljoprivreda, šume' },
  'Energji, Telekomunikacion, Transport': { en: 'Energy, telecommunications, transport', sr: 'Energija, telekomunikacije, transport' },
  'Ligje për Sundimin e Ligjit dhe Korrupsionin': { en: 'Rule of law and anti-corruption laws', sr: 'Zakoni za vladavinu prava i antikorupciju' },
  'Ligje për Institucionet dhe Administratën': { en: 'Institutions and administration laws', sr: 'Zakoni o institucijama i administraciji' },
  'Ligje për Ekonominë dhe Biznesin': { en: 'Economy and business laws', sr: 'Zakoni o ekonomiji i poslovanju' },
  'Ligje për Integrimin në BE': { en: 'EU integration documents', sr: 'Dokumenti za EU integracije' },
  'Akte Nënligjore': { en: 'Secondary legislation', sr: 'Podzakonski akti' },
  'Procesi Legjislativ dhe Edukimi Qytetar': { en: 'Legislative process and civic education', sr: 'Zakonodavni proces i građansko obrazovanje' },
  'Raporte Zyrtare': { en: 'Official reports', sr: 'Zvanični izveštaji' },
  'Dokumente Shpjeguese për Qytetarët': { en: 'Citizen explainers', sr: 'Objašnjenja za građane' },
  'Pyetje të Shpeshta (FAQ)': { en: 'Frequently asked questions (FAQ)', sr: 'Česta pitanja (FAQ)' },
  'Të Drejtat e Njeriut dhe Dokumente Ndërkombëtare': { en: 'Human rights and international documents', sr: 'Ljudska prava i međunarodni dokumenti' },
  'Marrëveshje Ndërkombëtare të Kosovës': { en: 'Kosovo international agreements', sr: 'Međunarodni sporazumi Kosova' },
  'Infografika dhe Statistika': { en: 'Infographics and statistics', sr: 'Infografike i statistika' },
  'Kontakte Praktike (numra dhe institucione)': { en: 'Practical contacts (numbers and institutions)', sr: 'Praktični kontakti (brojevi i institucije)' },
  'Glosar / Fjalorë': { en: 'Glossary / dictionaries', sr: 'Glosar / rečnici' },
};

function translateKnownText(text, lang) {
  if (!text || lang === 'sq') return text || '';
  return KNOWN_TEXT_TRANSLATIONS[text]?.[lang] || text;
}

function translateLegalTitle(text, lang) {
  if (!text || lang === 'sq') return text || '';
  const exact = translateKnownText(text, lang);
  if (exact !== text) return exact;
  if (lang === 'en') {
    return text
      .replace(/^Ligji për /, 'Law on ')
      .replace(/^Ligji i /, 'Law on ')
      .replace(/^Ligje për /, 'Laws on ')
      .replace(/^Kodi i /, 'Code of ')
      .replace(/^Kodi /, 'Code ')
      .replace(/^Marrëveshja për /, 'Agreement on ')
      .replace(/^Marrëveshjet për /, 'Agreements on ')
      .replace(/^Udhëzues /, 'Guide ')
      .replace(/^Fjalor i /, 'Glossary of ')
      .replace(/^Lista e /, 'List of ');
  }
  return text
    .replace(/^Ligji për /, 'Zakon o ')
    .replace(/^Ligji i /, 'Zakon o ')
    .replace(/^Ligje për /, 'Zakoni o ')
    .replace(/^Kodi i /, 'Zakonik o ')
    .replace(/^Kodi /, 'Zakonik ')
    .replace(/^Marrëveshja për /, 'Sporazum o ')
    .replace(/^Marrëveshjet për /, 'Sporazumi o ')
    .replace(/^Udhëzues /, 'Vodič ')
    .replace(/^Fjalor i /, 'Rečnik ')
    .replace(/^Lista e /, 'Lista ');
}

function localizedField(item, field, lang) {
  if (!item) return '';
  return item[field + '_' + lang] || item[field + '_sq'] || item[field] || '';
}

function MaterialSourceBadge({ label }) {
  if (!label) return null;
  return (
    <span className="mono" style={{
      display: 'inline-flex',
      width: 'fit-content',
      border: '1px solid rgba(163, 91, 74, 0.35)',
      background: 'rgba(163, 91, 74, 0.08)',
      color: 'var(--rust)',
      padding: '6px 8px',
      fontSize: 9,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      lineHeight: 1.1,
    }}>
      {label}
    </span>
  );
}

function LawCitizenBrief({ item, lang }) {
  if (!item) return null;
  const copy = {
    sq: {
      regulates: 'Çka rregullon?',
      affects: 'Kë e prek?',
      citizen: 'Çka duhet të dijë qytetari?',
      complaint: 'Ku ankohem?',
      fallbackAffects: 'Qytetarët, institucionet, bizneset ose palët që hyjnë në procedura të lidhura me këtë akt.',
      fallbackCitizen: 'Kontrollo versionin e konsoliduar, afatet, dokumentet e kërkuara dhe institucionin kompetent para se të veprosh.',
      fallbackComplaint: 'Fillimisht te institucioni përgjegjës; pastaj përmes ankesës administrative, gjykatës kompetente ose Avokatit të Popullit kur preken të drejtat.',
    },
    en: {
      regulates: 'What does it regulate?',
      affects: 'Who is affected?',
      citizen: 'What should citizens know?',
      complaint: 'Where can I complain?',
      fallbackAffects: 'Citizens, institutions, businesses, or parties involved in procedures connected to this act.',
      fallbackCitizen: 'Check the consolidated version, deadlines, required documents, and competent institution before taking action.',
      fallbackComplaint: 'Start with the responsible institution; then use an administrative appeal, the competent court, or the Ombudsperson when rights are affected.',
    },
    sr: {
      regulates: 'Šta reguliše?',
      affects: 'Koga pogađa?',
      citizen: 'Šta građanin treba da zna?',
      complaint: 'Gde mogu da se žalim?',
      fallbackAffects: 'Građane, institucije, biznise ili strane u postupcima povezanim sa ovim aktom.',
      fallbackCitizen: 'Proveri konsolidovanu verziju, rokove, potrebne dokumente i nadležnu instituciju pre postupanja.',
      fallbackComplaint: 'Prvo kod odgovorne institucije; zatim kroz administrativnu žalbu, nadležni sud ili Ombudsmana kada su pogođena prava.',
    },
  }[lang] || {};
  const rows = [
    [copy.regulates, localizedValue(item, 'regulates', lang) || localizedValue(item, 'summary', lang) || item.status],
    [copy.affects, localizedValue(item, 'affects', lang) || copy.fallbackAffects],
    [copy.citizen, localizedValue(item, 'citizen_note', lang) || copy.fallbackCitizen],
    [copy.complaint, localizedValue(item, 'complaint', lang) || copy.fallbackComplaint],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginTop: 28 }} className="law-citizen-brief">
      {rows.map(([label, body]) => (
        <div key={label} style={{ background: 'var(--paper-2)', padding: 18 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--rust)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
          <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.55 }}>{body}</p>
        </div>
      ))}
      <style>{`@media (max-width: 680px) { .law-citizen-brief { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function PageActionCards({ items }) {
  if (!items.length) return null;
  const normalizeHref = (href) => {
    if (href === '#kushtetuta') return '#/kushtetuta';
    if (href === '#ligjet-themelore') return '#/ligjet-themelore';
    if (href === '#katalogu-materialeve') return '#/katalogu-materialeve';
    return href || '#';
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, margin: '28px 0 34px' }}>
      {items.map((item, i) => (
        <a key={`${item.href || item.anchor || i}-${i}`} href={normalizeHref(item.href || item.anchor)} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          border: '1px solid var(--ink)',
          background: item.variant === 'dark' ? 'var(--ink)' : 'var(--paper)',
          color: item.variant === 'dark' ? 'var(--paper)' : 'var(--ink)',
          padding: '14px 18px',
          fontSize: 12,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }} className="mono">
          {item.label}
          <span style={{ fontSize: 16, lineHeight: 1 }}>→</span>
        </a>
      ))}
    </div>
  );
}

function BEObjectivesEntry({ lang }) {
  const fallback = [{
    eyebrow_sq: 'Kushtet për integrimin në BE',
    eyebrow_en: 'Membership objectives',
    eyebrow_sr: 'Ciljevi clanstva',
    title_sq: 'Shiko listën e objektivave, kapitujve dhe burimeve zyrtare.',
    title_en: 'See the list of objectives, chapters and official sources.',
    title_sr: 'Pogledaj listu ciljeva, poglavlja i zvanicnih izvora.',
    body_sq: 'Të gjitha kushtet dhe objektivat e integrimit janë mbledhur në një pamje të veçantë.',
    body_en: 'All integration conditions and objectives are collected in one dedicated view.',
    body_sr: 'Svi uslovi i ciljevi integracija nalaze se u posebnom prikazu.',
    cta_sq: 'Objektivat e integrimit',
    cta_en: 'Integration objectives',
    cta_sr: 'Ciljevi integracija',
    href: '#/objektivat',
    variant: 'dark',
  }];
  const entries = useCmsArray('be_actions', fallback);
  if (!entries.length) return null;
  return (
    <section style={{ padding: '22px 0 44px', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 28, alignItems: 'center', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '24px 0' }} className="be-objectives-grid">
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--rust)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>
              {localizedValue(entries[0], 'eyebrow', lang)}
            </div>
            <h2 className="serif" style={{ fontSize: 'clamp(24px, 3vw, 34px)', lineHeight: 1.08, color: 'var(--ink)', margin: 0 }}>
              {localizedValue(entries[0], 'title', lang)}
            </h2>
            <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: '10px 0 0', maxWidth: 680 }}>
              {localizedValue(entries[0], 'body', lang)}
            </p>
          </div>
          <PageActionCards items={entries.map(item => ({
            label: localizedValue(item, 'cta', lang),
            href: item.href || '#/objektivat',
            variant: item.variant || 'dark',
          }))} />
        </div>
      </div>
      <style>{`
        .be-objectives-grid > div:last-child { margin-top: 0 !important; }
        @media (max-width: 900px) { .be-objectives-grid { grid-template-columns: 1fr !important; gap: 18px !important; } }
      `}</style>
    </section>
  );
}

function RuleOfLawMaterials({ lang }) {
  const fallbackCopy = {
    eyebrow_sq: 'Materiale ligjore',
    eyebrow_en: 'Legal materials',
    eyebrow_sr: 'Pravni materijali',
    title_sq: 'Kushtetuta dhe ligjet themelore për sundimin e ligjit.',
    title_en: 'The Constitution and fundamental laws for the rule of law.',
    title_sr: 'Ustav i osnovni zakoni za vladavinu prava.',
    sub_sq: 'Këtu janë aktet bazë që qytetarët duhet t’i kenë afër kur lexojnë për gjykata, procedura, administratë, dogana dhe trafik.',
    sub_en: 'These are the core acts citizens should have nearby when reading about courts, procedure, administration, customs and traffic.',
    sub_sr: 'Ovo su osnovni akti koje građani treba da imaju pri ruci kada citaju o sudovima, postupku, administraciji, carini i saobracaju.',
    constitution_title_sq: 'Kushtetuta e Republikës së Kosovës',
    constitution_title_en: 'Constitution of the Republic of Kosovo',
    constitution_title_sr: 'Ustav Republike Kosovo',
    fundamental_title_sq: 'Ligjet themelore',
    fundamental_title_en: 'Fundamental laws',
    fundamental_title_sr: 'Osnovni zakoni',
    catalog_title_sq: 'Ligjet tjera',
    catalog_title_en: 'Other laws',
    catalog_title_sr: 'Ostali zakoni',
  };
  const fallbackActions = [
    { label_sq: 'Kushtetuta e Republikës së Kosovës', label_en: 'Constitution of Kosovo', label_sr: 'Ustav Kosova', href: '#/kushtetuta', variant: 'dark' },
    { label_sq: 'Ligjet themelore', label_en: 'Fundamental laws', label_sr: 'Osnovni zakoni', href: '#/ligjet-themelore', variant: 'light' },
    { label_sq: 'Ligjet tjera', label_en: 'Other laws', label_sr: 'Ostali zakoni', href: '#/katalogu-materialeve', variant: 'light' },
  ];
  const fallbackMaterials = [
    {
      group: 'constitution',
      law_number: 'K-09042008',
      status: 'Në fuqi; me amendamente 2012, 2013, 2015, 2016, 2020',
      title_sq: 'Kushtetuta e Republikës së Kosovës',
      title_en: 'Constitution of the Republic of Kosovo',
      title_sr: 'Ustav Republike Kosovo',
      summary_sq: 'Akti themelor i shtetit: të drejtat dhe liritë themelore, organizimi institucional, ndarja e pushteteve dhe amendamentet kushtetuese.',
      source_url: 'https://gzk.rks-gov.net/ActDetail.aspx?ActID=3702',
    },
    {
      group: 'fundamental',
      law_number: '06/L-074',
      status: 'Në fuqi si akt i konsoliduar',
      title_sq: 'Kodi Penal i Republikës së Kosovës',
      title_en: 'Criminal Code of the Republic of Kosovo',
      title_sr: 'Krivicni zakonik Republike Kosovo',
      summary_sq: 'Përcakton veprat penale, përgjegjësinë penale, sanksionet, korrupsionin, krimin e organizuar dhe veprat kundër detyrës zyrtare.',
      source_url: 'https://gzk.rks-gov.net/ActDetail.aspx?ActID=116031',
    },
    {
      group: 'fundamental',
      law_number: '08/L-032',
      status: 'Në fuqi; ndryshuar/plotësuar nga 08/L-187',
      title_sq: 'Kodi i Procedurës Penale',
      title_en: 'Criminal Procedure Code',
      title_sr: 'Zakonik o krivicnom postupku',
      summary_sq: 'Rregullon hetimin, ndjekjen penale, të drejtat e palëve, provat, masat procedurale, gjykimin dhe mjetet juridike.',
      source_url: 'https://gzk.rks-gov.net/ActDetail.aspx?ActID=61759',
    },
    {
      group: 'fundamental',
      law_number: 'Projektkod',
      status: 'Projekt; të mos paraqitet si ligj në fuqi pa verifikim në Gazetën Zyrtare',
      title_sq: 'Kodi Civil i Republikës së Kosovës',
      title_en: 'Civil Code of the Republic of Kosovo',
      title_sr: 'Gradjanski zakonik Republike Kosovo',
      summary_sq: 'Projektkod për kodifikimin e së drejtës civile: pjesa e përgjithshme, detyrimet, prona, familja dhe trashëgimia.',
      source_url: 'https://md.rks-gov.net/wp-content/uploads/2024/06/A1CCB78F-9020-41D5-826E-14D67A90F369.pdf',
    },
    {
      group: 'fundamental',
      law_number: '03/L-006',
      status: 'Në fuqi si Ligji për Procedurën Kontestimore',
      title_sq: 'Procedura civile / Ligji për Procedurën Kontestimore',
      title_en: 'Civil procedure / Law on Contested Procedure',
      title_sr: 'Gradjanski postupak / Zakon o parnicnom postupku',
      summary_sq: 'Rregullon paditë, palët, afatet, seancat, provat, vendimet, ankesat dhe gjykimin civil kontestimor.',
      source_url: 'https://gzk.rks-gov.net/ActDetail.aspx?ActID=2583',
    },
    {
      group: 'fundamental',
      law_number: '05/L-031',
      status: 'Në fuqi',
      title_sq: 'Ligji për Procedurën e Përgjithshme Administrative',
      title_en: 'Law on General Administrative Procedure',
      title_sr: 'Zakon o opstem upravnom postupku',
      summary_sq: 'Rregullon procedurat administrative, afatet, njoftimin, vendimin dhe ankesën ndaj administratës publike.',
      source_url: 'https://gzk.rks-gov.net/ActDetail.aspx?ActID=12559&langid=1',
    },
    {
      group: 'fundamental',
      law_number: '08/L-247',
      status: 'Në fuqi; shfuqizon Kodin 03/L-109',
      title_sq: 'Kodi Doganor dhe i Akcizave',
      title_en: 'Customs and Excise Code',
      title_sr: 'Carinski i akcizni zakonik',
      summary_sq: 'Rregullon procedurat doganore, akcizat, obligimet e importit/eksportit, kontrollet dhe kundërvajtjet.',
      source_url: 'https://gzk.rks-gov.net/ActDetail.aspx?ActID=89203',
    },
    {
      group: 'fundamental',
      law_number: '08/L-186',
      status: 'Në fuqi; shfuqizon 05/L-088 dhe 06/L-069',
      title_sq: 'Ligji për Rregullat e Trafikut Rrugor / Kodi Rrugor',
      title_en: 'Law on Road Traffic Rules',
      title_sr: 'Zakon o pravilima drumskog saobracaja',
      summary_sq: 'Rregullon qarkullimin rrugor, sigurinë, shenjat, pajisjet, përgjegjësitë dhe kundërvajtjet në trafik.',
      source_url: 'https://gzk.rks-gov.net/ActDetail.aspx?ActID=87975',
    },
  ];
  const copy = useCmsObject('rule_of_law_materials_copy', fallbackCopy);
  const actions = useCmsArray('rule_of_law_actions', fallbackActions);
  const materials = useCmsArray('legal_materials', fallbackMaterials);
  const catalog = useCmsArray('materials_catalog', []);
  if (!materials.length && !catalog.length) return null;

  const constitution = materials.filter(item => item.group === 'constitution');
  const fundamentals = materials.filter(item => item.group !== 'constitution');
  const categories = catalog.reduce((acc, item) => {
    const key = item.category || 'Materiale';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <section id="materialet-ligjore" style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container">
        <SectionHead
          eyebrow={localizedValue(copy, 'eyebrow', lang)}
          title={localizedValue(copy, 'title', lang)}
          sub={localizedValue(copy, 'sub', lang)}
          num="02"
        />
        <PageActionCards items={actions.map(item => ({
          label: localizedValue(item, 'label', lang),
          href: item.href || item.anchor || '#materialet-ligjore',
          variant: item.variant,
        }))} />

        {!!constitution.length && (
          <div id="kushtetuta" style={{ marginTop: 56 }}>
            <h3 className="serif" style={{ fontSize: 38, lineHeight: 1.05, color: 'var(--ink)', marginBottom: 20 }}>
              {localizedValue(copy, 'constitution_title', lang)}
            </h3>
            <MaterialGrid items={constitution} lang={lang} />
          </div>
        )}

        {!!fundamentals.length && (
          <div id="ligjet-themelore" style={{ marginTop: 56 }}>
            <h3 className="serif" style={{ fontSize: 38, lineHeight: 1.05, color: 'var(--ink)', marginBottom: 20 }}>
              {localizedValue(copy, 'fundamental_title', lang)}
            </h3>
            <MaterialGrid items={fundamentals} lang={lang} />
          </div>
        )}

        {!!catalog.length && (
          <div id="katalogu-materialeve" style={{ marginTop: 64 }}>
            <h3 className="serif" style={{ fontSize: 38, lineHeight: 1.05, color: 'var(--ink)', marginBottom: 20 }}>
              {localizedValue(copy, 'catalog_title', lang)}
            </h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {Object.entries(categories).map(([category, items]) => (
                <details key={category} style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}>
                  <summary style={{ cursor: 'pointer', padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, listStyle: 'none' }}>
                    <span className="serif" style={{ fontSize: 22, lineHeight: 1.08, color: 'var(--ink)' }}>{translateKnownText(category, lang)}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{items.length}</span>
                  </summary>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, background: 'var(--line)', borderTop: '1px solid var(--line)' }} className="materials-catalog-grid">
                    {items.map((item, i) => (
                      <a key={`${item.slug || item.title}-${i}`} href={item.source_url || '#'} target={item.source_url ? '_blank' : undefined} rel="noreferrer" style={{ background: 'var(--paper)', padding: 18, color: 'var(--ink)' }}>
                        <div style={{ fontSize: 15, lineHeight: 1.35, fontWeight: 650 }}>{localizedField(item, 'title', lang) || translateLegalTitle(item.title, lang)}</div>
                        {(localizedField(item, 'summary', lang) || item.summary_sq) && (
                          <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.45, color: 'var(--ink-2)' }}>
                            {localizedField(item, 'summary', lang) || item.summary_sq}
                          </p>
                        )}
                        <div style={{ marginTop: 12 }}>
                          <MaterialSourceBadge label={translateKnownText(item.source_label || item.material_type || item.status, lang)} />
                        </div>
                        {item.status && (
                          <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.45, color: 'var(--ink-3)' }}>{translateKnownText(localizedField(item, 'status', lang) || item.status, lang)}</div>
                        )}
                      </a>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 760px) { .materials-catalog-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 760px) { .material-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function MaterialGrid({ items, lang }) {
  const cols = items.length === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))';
  const hasOrphan = items.length > 1 && items.length % 2 === 1;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }} className="material-grid">
      {items.map((item, i) => (
        <Reveal as="article" key={`${item.title_sq || item.title}-${i}`} delay={i * 60} className="hover-lift" style={{ background: 'var(--paper-2)', padding: 24, minHeight: 210, gridColumn: hasOrphan && i === items.length - 1 ? '1 / -1' : undefined }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--rust)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            {item.law_number || translateKnownText(localizedField(item, 'status', lang) || item.status, lang)}
          </div>
          <h4 className="serif" style={{ fontSize: 28, lineHeight: 1.08, color: 'var(--ink)', margin: 0 }}>
            {localizedField(item, 'title', lang) || translateLegalTitle(item.title, lang)}
          </h4>
          <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 14 }}>
            {localizedField(item, 'summary', lang) || translateKnownText(localizedField(item, 'status', lang) || item.status, lang)}
          </p>
          <MaterialSourceBadge label={translateKnownText(item.source_label || item.material_type || item.status, lang)} />
          {item.source_url && (
            <a href={item.source_url} target="_blank" rel="noreferrer" className="mono" style={{ display: 'inline-flex', marginTop: 14, fontSize: 10, color: 'var(--ink)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {ui(lang, 'Burimi zyrtar', 'Official source', 'Zvanični izvor')} →
            </a>
          )}
        </Reveal>
      ))}
    </div>
  );
}

function useRuleOfLawContent() {
  return {
    materials: useCmsArray('legal_materials', []),
    catalog: useCmsArray('materials_catalog', []),
  };
}

function MaterialsPageHero({ eyebrow, title, sub, stat, statLabel, lang = 'sq', backHref = '#/sundimi', backLabel }) {
  const defaultBackLabel = {
    sq: 'Kthehu te Sundimi i ligjit',
    en: 'Back to Rule of Law',
    sr: 'Nazad na vladavinu prava',
  }[lang] || 'Kthehu te Sundimi i ligjit';
  return (
    <section style={{ padding: '118px 0 74px', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div className="container materials-page-hero" style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.55fr', gap: 56, alignItems: 'end' }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--rust)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 18 }}>{eyebrow}</div>
          <h1 className="serif" style={{ fontSize: 'clamp(46px, 7vw, 92px)', lineHeight: 0.95, color: 'var(--ink)', maxWidth: 980 }}>{title}</h1>
          {sub && <p style={{ marginTop: 22, fontSize: 18, lineHeight: 1.65, color: 'var(--ink-2)', maxWidth: 720 }}>{sub}</p>}
          <a href={backHref} className="mono" style={{ display: 'inline-flex', marginTop: 30, color: 'var(--ink)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>← {backLabel || defaultBackLabel}</a>
        </div>
        <div style={{ border: '1px solid var(--line)', background: 'var(--paper-2)', padding: 28 }}>
          <div className="serif" style={{ fontSize: 74, color: 'var(--rust)', lineHeight: 0.88 }}>{stat}</div>
          <div className="mono" style={{ marginTop: 14, fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{statLabel}</div>
        </div>
      </div>
      <style>{`
        @media (max-width: 860px) { .materials-page-hero { grid-template-columns: 1fr !important; gap: 30px !important; } }
      `}</style>
    </section>
  );
}

function LoadingMaterials() {
  return (
    <section style={{ padding: '80px 0 120px', background: 'var(--paper)' }}>
      <div className="container">
        <div style={{ border: '1px solid var(--line)', padding: 28, color: 'var(--ink-2)' }}>Materialet po ngarkohen nga databaza...</div>
      </div>
    </section>
  );
}

function MaterialSearchBar({ value, onChange, placeholder, count, compact = false }) {
  return (
    <div className="material-search" style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: compact ? 10 : 14,
      marginBottom: compact ? 0 : 28,
    }}>
      <label style={{ position: 'relative', display: 'block' }}>
        <span className="mono" style={{
          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
          fontSize: 13, color: 'var(--rust)', lineHeight: 1,
        }}>⌕</span>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            border: '1px solid var(--line)',
            background: 'var(--paper-2)',
            color: 'var(--ink)',
            padding: compact ? '13px 14px 13px 42px' : '16px 18px 16px 46px',
            fontSize: compact ? 13 : 15,
            outline: 'none',
          }}
        />
      </label>
      <div className="mono" style={{
        border: '1px solid var(--line)',
        background: 'var(--paper)',
        padding: compact ? '13px 12px' : '16px 18px',
        fontSize: compact ? 9 : 11,
        letterSpacing: '0.12em',
        color: 'var(--ink-3)',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}>
        {count} rezultate
      </div>
      <style>{`
        @media (max-width: 640px) { .material-search { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

const CONSTITUTION_OFFICIAL_URL = 'https://gzk.rks-gov.net/ActDocumentDetail.aspx?ActID=97703';
const CONSTITUTION_ORIGINAL_URL = 'https://gzk.rks-gov.net/ActDocumentDetail.aspx?ActID=3702';
const CONSTITUTION_ARTICLE_BASE = 'https://wikisource.org/wiki/Kushtetuta_e_Kosov%C3%ABs';

function constitutionSection(slug, chapter, title, summary, articles) {
  return { slug, chapter, title, summary, articles: articles.map(([number, topic]) => ({ number, topic, title: `Neni ${number} [${topic}]` })) };
}

const KOSOVO_CONSTITUTION_FALLBACK = {
  intro: {
    adopted: '9 prill 2008',
    in_force: '15 qershor 2008',
    body_sq: 'Kushtetuta e Republikës së Kosovës është akti më i lartë juridik i shtetit. Ajo u miratua nga Kuvendi më 9 prill 2008 dhe hyri në fuqi më 15 qershor 2008, pas shpalljes së pavarësisë. Teksti u përgatit në proces kushtetues vendor me Komisionin Kushtetues dhe me mbështetje ndërkombëtare të lidhur me zbatimin e Propozimit Gjithëpërfshirës për Zgjidhjen e Statusit të Kosovës. Kushtetuta përcakton shtetin, sovranitetin, ndarjen e pushteteve, të drejtat themelore, të drejtat e komuniteteve, institucionet, gjyqësorin, sektorin e sigurisë dhe procedurën për ndryshime kushtetuese.',
    official_url: CONSTITUTION_OFFICIAL_URL,
    original_url: CONSTITUTION_ORIGINAL_URL,
  },
  key_numbers: ['1', '2', '3', '4', '7', '16', '21', '22', '24', '31', '32', '40', '41', '45', '46', '53', '54', '55', '65', '102'],
  sections: [
    { slug: 'Preambula', chapter: 'Preambula', title: 'Preambula', summary: 'Hyrje normative për shtetin demokratik, paqen, barazinë, pajtimin dhe orientimin evropian.', articles: [] },
    constitutionSection('Kapitulli_I', 'Kapitulli I', 'Dispozitat Themelore', 'Baza e shtetit, sovraniteti, barazia, simbolet, gjuhët dhe epërsia e Kushtetutës.', [['1','Përkufizimi i Shtetit'], ['2','Sovraniteti'], ['3','Barazia para Ligjit'], ['4','Forma e Qeverisjes dhe Ndarja e Pushtetit'], ['5','Gjuhët'], ['6','Simbolet'], ['7','Vlerat'], ['8','Shteti Laik'], ['9','Trashëgimia Kulturore dhe Fetare'], ['10','Ekonomia'], ['11','Valuta'], ['12','Pushteti Lokal'], ['13','Kryeqyteti'], ['14','Shtetësia'], ['15','Shtetasit jashtë Vendit'], ['16','Epërsia e Kushtetutës'], ['17','Marrëveshjet Ndërkombëtare'], ['18','Ratifikimi i Marrëveshjeve Ndërkombëtare'], ['19','Zbatimi i së Drejtës Ndërkombëtare'], ['20','Bartja e Sovranitetit']]),
    constitutionSection('Kapitulli_II', 'Kapitulli II', 'Të Drejtat dhe Liritë Themelore', 'Katalogu kryesor i lirive dhe të drejtave të njeriut në rendin kushtetues.', [['21','Parimet e Përgjithshme'], ['22','Zbatimi i drejtpërdrejtë i Marrëveshjeve dhe Instrumenteve Ndërkombëtare'], ['23','Dinjiteti i Njeriut'], ['24','Barazia para Ligjit'], ['25','E Drejta për Jetën'], ['26','E Drejta e Integritetit Personal'], ['27','Ndalimi i Torturës, Trajtimit Mizor, Çnjerëzor ose Poshtërues'], ['28','Ndalimi i Skllavërisë dhe i Punës së Detyruar'], ['29','E Drejta e Lirisë dhe Sigurisë'], ['30','Të Drejat e të Akuzuarit'], ['31','E Drejta për Gjykim të Drejtë dhe të Paanshëm'], ['32','E Drejta për Mjete Juridike'], ['33','Parimi i Legalitetit dhe Proporcionalitetit në Rastet Penale'], ['34','E Drejta për të mos u Gjykuar dy herë për të njëjtën Vepër'], ['35','Liria e Lëvizjes'], ['36','E Drejta e Privatësisë'], ['37','E Drejta e Martesës dhe Familjes'], ['38','Liria e Besimit, e Ndërgjegjes dhe e Fesë'], ['39','Konfesionet Fetare'], ['40','Liria e Shprehjes'], ['41','E Drejta e Qasjes në Dokumente Publike'], ['42','Liria e Medieve'], ['43','Liria e Tubimit'], ['44','Liria e Asociimit'], ['45','Të Drejtat Zgjedhore dhe të Pjesëmarrjes'], ['46','Mbrojtja e Pronës'], ['47','E Drejta për Arsimin'], ['48','Liria e Artit dhe e Shkencës'], ['49','E Drejta e Punës dhe Ushtrimit të Profesionit'], ['50','Të Drejtat e Fëmijës'], ['51','Mbrojtja Shëndetësore dhe Sociale'], ['52','Përgjegjësia për Mjedisin Jetësor'], ['53','Interpretimi i Dispozitave për të Drejtat e Njeriut'], ['54','Mbrojtja Gjyqësore e të Drejtave'], ['55','Kufizimi i të Drejtave dhe Lirive Themelore'], ['56','Të Drejtat dhe Liritë Themelore gjatë Gjendjes së Jashtëzakonshme']]),
    constitutionSection('Kapitulli_III', 'Kapitulli III', 'Të Drejtat e Komuniteteve dhe Pjesëtarëve të tyre', 'Mbrojtje kushtetuese për komunitetet, përfaqësimin dhe pjesëmarrjen e tyre.', [['57','Parimet e Përgjithshme'], ['58','Përgjegjësitë e Shtetit'], ['59','Të Drejtat e Komuniteteve dhe Pjesëtarëve të Tyre'], ['60','Këshilli Konsultativ për Komunitete'], ['61','Përfaqësimi në Punësim në Institucionet Publike'], ['62','Përfaqësimi në Organet e Pushtetit Lokal']]),
    constitutionSection('Kapitulli_IV', 'Kapitulli IV', 'Kuvendi i Republikës së Kosovës', 'Roli, struktura, kompetencat, mandati, imuniteti dhe procedurat legjislative të Kuvendit.', [['63','Parimet e Përgjithshme'], ['64','Struktura e Kuvendit'], ['65','Kompetencat e Kuvendit'], ['66','Zgjedhja dhe Mandati'], ['67','Zgjedhja e Kryetarit dhe Nënkryetarëve'], ['68','Seancat'], ['69','Orari i Seancave dhe Kuorumi'], ['70','Mandati i Deputetëve'], ['71','Kualifikimet dhe Barazia Gjinore'], ['72','Papajtueshmëria'], ['73','Pamundësia e Kandidimit'], ['74','Ushtrimi i Funksionit'], ['75','Imuniteti'], ['76','Rregullorja e Punës'], ['77','Komisionet'], ['78','Komisioni për të Drejtat dhe Interesat e Komuniteteve'], ['79','Nisma Legjislative'], ['80','Miratimi i Ligjeve'], ['81','Legjislacioni me Interes Vital'], ['82','Shpërndarja e Kuvendit']]),
    constitutionSection('Kapitulli_V', 'Kapitulli V', 'Presidenti i Republikës së Kosovës', 'Statusi, kompetencat, zgjedhja, mandati, imuniteti dhe shkarkimi i Presidentit.', [['83','Statusi i Presidentit'], ['84','Kompetencat e Presidentit'], ['85','Kualifikimi për Zgjedhjen e Presidentit'], ['86','Zgjedhja e Presidentit'], ['87','Mandati dhe Betimi'], ['88','Papajtueshmëria'], ['89','Imuniteti'], ['90','Mungesa e Përkohshme e Presidentit'], ['91','Shkarkimi i Presidentit']]),
    constitutionSection('Kapitulli_VI', 'Kapitulli VI', 'Qeveria e Republikës së Kosovës', 'Kompetencat e Qeverisë dhe Kryeministrit, zgjedhja, përgjegjësia dhe shërbimi civil.', [['92','Parimet e Përgjithshme'], ['93','Kompetencat e Qeverisë'], ['94','Kompetencat e Kryeministrit'], ['95','Zgjedhja e Qeverisë'], ['96','Ministritë dhe Përfaqësimi i Komuniteteve'], ['97','Përgjegjësia'], ['98','Imuniteti'], ['99','Procedurat'], ['100','Mocioni i Votëbesimit'], ['101','Shërbimi Civil']]),
    constitutionSection('Kapitulli_VII', 'Kapitulli VII', 'Sistemi i Drejtësisë', 'Parimet e gjyqësorit, gjykatat, gjyqtarët, prokuroria dhe avokatura.', [['102','Parimet e Përgjithshme të Sistemit Gjyqësor'], ['103','Organizimi dhe Jurisdiksioni i Gjykatave'], ['104','Emërimi dhe Shkarkimi i Gjyqtarëve'], ['105','Mandati dhe Riemërimi'], ['106','Papajtueshmëria'], ['107','Imuniteti'], ['108','Këshilli Gjyqësor i Kosovës'], ['109','Prokurori i Shtetit'], ['110','Këshilli Prokurorial i Kosovës'], ['111','Avokatura']]),
    constitutionSection('Kapitulli_VIII', 'Kapitulli VIII', 'Gjykata Kushtetuese', 'Jurisdiksioni, përbërja, mandati dhe efekti i vendimeve të Gjykatës Kushtetuese.', [['112','Parimet e Përgjithshme'], ['113','Jurisdiksioni dhe Palët e Autorizuara'], ['114','Përbërja dhe Mandati i Gjykatës Kushtetuese'], ['115','Organizimi i Gjykatës Kushtetuese'], ['116','Efekti Juridik i Vendimeve'], ['117','Imuniteti'], ['118','Shkarkimi']]),
    constitutionSection('Kapitulli_IX', 'Kapitulli IX', 'Marrëdhëniet Ekonomike', 'Parimet ekonomike, financat publike, prona dhe burimet natyrore.', [['119','Parimet e Përgjithshme'], ['120','Financat Publike'], ['121','Prona'], ['122','Përdorimi i Pasurisë dhe Burimeve Natyrore']]),
    constitutionSection('Kapitulli_X', 'Kapitulli X', 'Qeverisja Lokale dhe Organizimi Territorial', 'Parimet dhe funksionimi i vetëqeverisjes lokale.', [['123','Parimet e Përgjithshme'], ['124','Organizimi dhe Funksionimi i Vetëqeverisjes Lokale']]),
    constitutionSection('Kapitulli_XI', 'Kapitulli XI', 'Sektori i Sigurisë', 'FSK, Policia, AKI, aviacioni civil dhe gjendja e jashtëzakonshme.', [['125','Parimet e Përgjithshme'], ['126','Forca e Sigurisë e Kosovës'], ['127','Këshilli i Sigurisë i Kosovës'], ['128','Policia e Kosovës'], ['129','Agjencia e Kosovës për Inteligjencë'], ['130','Autoriteti Civil i Aviacionit'], ['131','Gjendja e Jashtëzakonshme']]),
    constitutionSection('Kapitulli_XII', 'Kapitulli XII', 'Institucionet e Pavarura', 'Avokati i Popullit, Auditori, KQZ, BQK, KPM dhe agjencitë e pavarura.', [['132','Roli dhe Kompetencat e Avokatit të Popullit'], ['133','Zyra e Avokatit të Popullit'], ['134','Kualifikimi, Zgjedhja dhe Shkarkimi i Avokatit të Popullit'], ['135','Raportimi i Avokatit të Popullit'], ['136','Auditori i Përgjithshëm i Kosovës'], ['137','Kompetencat e Auditorit të Përgjithshëm të Kosovës'], ['138','Raportimi i Auditorit të Përgjithshëm të Kosovës'], ['139','Komisioni Qendror i Zgjedhjeve'], ['140','Banka Qendrore e Kosovës'], ['141','Komisioni i Pavarur i Medieve'], ['142','Agjencitë e Pavarura']]),
    constitutionSection('Kapitulli_XIII', 'Kapitulli XIII', 'Dispozitat Përfundimtare', 'Propozimi gjithëpërfshirës, amendamentimi dhe vazhdimësia e legjislacionit.', [['143','Propozimi Gjithëpërfshirës për Zgjidhjen e Statusit të Kosovës'], ['144','Amendamentimi'], ['145','Vazhdimësia e Marrëveshjeve Ndërkombëtare dhe e Legjislacionit të Aplikueshëm']]),
    constitutionSection('Kapitulli_XIV', 'Kapitulli XIV', 'Dispozitat Kalimtare', 'Dispozitat kalimtare për tranzicionin institucional pas hyrjes në fuqi.', [['146','Përfaqësuesi Ndërkombëtarë Civil'], ['147','Autoriteti Përfundimtarë i Përfaqësuesit Ndërkombëtarë Civil'], ['148','Dispozitat Transicionale për Kuvendin e Kosovës'], ['149','Miratimi Fillestar i Ligjeve me Interes Vital'], ['150','Procesi i Emërimit të Gjyqtarëve dhe Prokurorëve'], ['151','Përbërja e Përkohshme e Këshillit Gjyqësor të Kosovës'], ['152','Përbërja e Përkohshme e Gjykatës Kushtetuese'], ['153','Prania Ndërkombëtare Ushtarake'], ['154','Trupat e Mbrojtjes të Kosovës'], ['155','Shtetësia'], ['156','Refugjatët dhe Personat e Zhvendosur Brenda Vendit'], ['157','Auditori i Përgjithshëm i Kosovës'], ['158','Autoriteti Qendror Bankar'], ['159','Pronat dhe Ndërmarrjet në Pronësi Shoqërore'], ['160','Ndërmarrjet në Pronësi Publike'], ['161','Transicioni i Institucioneve'], ['162','Hyrja në Fuqi']]),
  ],
};

function constitutionArticleUrl(article, section) {
  if (article.source_url) return article.source_url;
  return `${CONSTITUTION_ARTICLE_BASE}/${section.slug}#${article.title.replace(/\s+/g, '_')}`;
}

function normalizeConstitutionArticle(article, section) {
  const normalized = Array.isArray(article)
    ? { number: article[0], topic: article[1], title: `Neni ${article[0]} [${article[1]}]` }
    : article;
  return { ...normalized, section };
}

function ConstitutionPage({ lang }) {
  const constitutionData = useCmsObject('constitution_structure', KOSOVO_CONSTITUTION_FALLBACK);
  const sections = Array.isArray(constitutionData.sections) ? constitutionData.sections : KOSOVO_CONSTITUTION_FALLBACK.sections;
  const allArticles = sections.flatMap(section => (section.articles || []).map(article => normalizeConstitutionArticle(article, section)));
  const keyNumbers = constitutionData.key_numbers || KOSOVO_CONSTITUTION_FALLBACK.key_numbers;
  const keyArticles = keyNumbers.map(number => allArticles.find(article => article.number === number)).filter(Boolean);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const needle = query.trim().toLowerCase();
  const visible = allArticles.filter(item => {
    const text = `${item.title} ${item.topic || ''} ${item.section?.title || ''} ${item.section?.chapter || ''}`.toLowerCase();
    return !needle || text.includes(needle);
  });
  return (
    <>
      <MaterialsPageHero
        eyebrow="Akt themelor"
        title="Kushtetuta e Republikës së Kosovës"
        sub="Historiku, 20 nenet kryesore dhe lista e plotë e neneve me kërkim dhe burime."
        stat={allArticles.length || 162}
        statLabel="nene kushtetuese"
        lang={lang}
      />
      <section style={{ padding: '0 0 120px', background: 'var(--paper)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.72fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 32 }} className="constitution-intro-grid">
            <article style={{ background: 'var(--paper-2)', padding: '34px 32px' }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--rust)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>Historik i shkurtër</div>
              <h2 className="serif" style={{ fontSize: 'clamp(34px, 4vw, 58px)', lineHeight: 1.02, color: 'var(--ink)', margin: 0 }}>Akti më i lartë juridik i Republikës</h2>
              <p style={{ fontSize: 16.5, color: 'var(--ink-2)', lineHeight: 1.7, marginTop: 20 }}>{constitutionData.intro?.body_sq || KOSOVO_CONSTITUTION_FALLBACK.intro.body_sq}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
                <a href={constitutionData.intro?.official_url || CONSTITUTION_OFFICIAL_URL} target="_blank" rel="noreferrer" className="mono" style={{ border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)', padding: '12px 14px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Dokumenti zyrtar</a>
                <a href={constitutionData.intro?.original_url || CONSTITUTION_ORIGINAL_URL} target="_blank" rel="noreferrer" className="mono" style={{ border: '1px solid var(--ink)', color: 'var(--ink)', padding: '12px 14px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Versioni origjinal</a>
              </div>
            </article>
            <aside style={{ background: 'var(--paper)', padding: 28 }}>
              {[
                ['Miratuar', constitutionData.intro?.adopted || '9 prill 2008'],
                ['Hyri në fuqi', constitutionData.intro?.in_force || '15 qershor 2008'],
                ['Kapituj', sections.length],
                ['Nene', allArticles.length],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 18, borderBottom: '1px solid var(--line)', padding: '14px 0' }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
                  <span className="serif" style={{ fontSize: 24, color: 'var(--ink)', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </aside>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'end', margin: '42px 0 18px' }} className="constitution-section-head">
            <div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--rust)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>20 nenet kryesore</div>
              <h2 className="serif" style={{ fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.04, color: 'var(--ink)', margin: 0 }}>Pikat që duhen parë së pari</h2>
            </div>
            <button type="button" onClick={() => setShowAll(true)} className="mono" style={{ border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)', padding: '13px 16px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>Shfaq të gjitha nenet</button>
          </div>

          <div className="constitution-key-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            {keyArticles.map(article => (
              <a key={article.number} href={constitutionArticleUrl(article, article.section)} target="_blank" rel="noreferrer" style={{ background: 'var(--paper-2)', padding: 18, color: 'var(--ink)', minHeight: 148 }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--rust)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>{article.section?.chapter} / Neni {article.number}</div>
                <h3 className="serif" style={{ fontSize: 24, lineHeight: 1.08, margin: 0 }}>{article.topic || article.title}</h3>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 14 }}>Lexo nenin</div>
              </a>
            ))}
          </div>

          {showAll && (
            <div id="te-gjitha-nenet" style={{ marginTop: 48 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'end', marginBottom: 18 }} className="constitution-section-head">
                <div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--rust)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>Lista e plotë</div>
                  <h2 className="serif" style={{ fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.04, color: 'var(--ink)', margin: 0 }}>Të gjitha nenet e Kushtetutës</h2>
                </div>
                <button type="button" onClick={() => { setShowAll(false); setQuery(''); }} className="mono" style={{ border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink)', padding: '12px 14px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>Mbyll listën</button>
              </div>
            <MaterialSearchBar
              value={query}
              onChange={setQuery}
                placeholder="Kërko nen, kapitull, të drejtë, institucion..."
              count={visible.length}
            />
              <div style={{ display: 'grid', gap: 10 }}>
                {sections.map(section => {
                  const sectionArticles = visible.filter(article => article.section?.slug === section.slug);
                  if (!sectionArticles.length && needle) return null;
                  return (
                    <details key={section.slug} open={!!needle} style={{ border: '1px solid var(--line)', background: 'var(--paper-2)' }}>
                      <summary style={{ cursor: 'pointer', padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, listStyle: 'none', alignItems: 'center' }}>
                        <span>
                          <span className="mono" style={{ display: 'block', fontSize: 9, color: 'var(--rust)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>{section.chapter}</span>
                          <span className="serif" style={{ fontSize: 26, lineHeight: 1.08, color: 'var(--ink)' }}>{section.title}</span>
                        </span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{sectionArticles.length}</span>
                      </summary>
                      <div className="constitution-article-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, background: 'var(--line)', borderTop: '1px solid var(--line)' }}>
                        {sectionArticles.map(article => (
                          <a key={`${section.slug}-${article.number}`} href={constitutionArticleUrl(article, section)} target="_blank" rel="noreferrer" style={{ background: 'var(--paper)', padding: '14px 16px', color: 'var(--ink)' }}>
                            <div className="mono" style={{ fontSize: 9, color: 'var(--rust)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Neni {article.number}</div>
                            <div className="serif" style={{ fontSize: 21, lineHeight: 1.12 }}>{article.topic || article.title}</div>
                          </a>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        <style>{`
          @media (max-width: 980px) {
            .constitution-intro-grid { grid-template-columns: 1fr !important; }
            .constitution-key-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          }
          @media (max-width: 640px) {
            .constitution-key-grid,
            .constitution-article-grid { grid-template-columns: 1fr !important; }
            .constitution-section-head { align-items: stretch !important; flex-direction: column; }
          }
        `}</style>
      </section>
    </>
  );
}

function FundamentalLawsPage({ lang }) {
  const { materials } = useRuleOfLawContent();
  const fundamentals = materials.filter(item => item.group && item.group !== 'constitution');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const needle = query.trim().toLowerCase();
  const visible = fundamentals.filter(item => {
    const text = `${localizedValue(item, 'title', lang)} ${localizedValue(item, 'summary', lang)} ${item.status || ''} ${item.law_number || ''}`.toLowerCase();
    return !needle || text.includes(needle);
  });
  const selected = visible[active] || visible[0];
  return (
    <>
      <MaterialsPageHero
        eyebrow="Ligjet themelore"
        title="Kodet dhe ligjet bazë që mbajnë sundimin e ligjit"
        sub="Këtu janë aktet themelore që lidhen me gjykatat, procedurat, administratën, doganat, trafikun dhe të drejtat e qytetarit."
        stat={fundamentals.length || 0}
        statLabel="akte në listë"
        lang={lang}
      />
      {!fundamentals.length ? <LoadingMaterials /> : (
        <section style={{ padding: '0 0 120px', background: 'var(--paper)' }}>
          <div className="container laws-page-grid" style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.25fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            <div style={{ background: 'var(--paper-2)' }}>
              <div style={{ padding: 18, borderBottom: '1px solid var(--line)' }}>
                <MaterialSearchBar
                  value={query}
                  onChange={(value) => { setQuery(value); setActive(0); }}
                  placeholder="Kërko ligj, kod, procedurë..."
                  count={visible.length}
                  compact
                />
              </div>
              {visible.map((item, i) => (
                <button key={`${item.title_sq || item.title}-${i}`} type="button" onClick={() => setActive(i)} style={{
                  width: '100%', textAlign: 'left', padding: '18px 20px', border: 'none', borderBottom: '1px solid var(--line)',
                  background: i === active ? 'var(--ink)' : 'var(--paper-2)', color: i === active ? 'var(--paper)' : 'var(--ink)', cursor: 'pointer',
                }}>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: i === active ? 'var(--gold)' : 'var(--rust)', marginBottom: 8 }}>{item.law_number || String(i + 1).padStart(2, '0')}</div>
                  <div className="serif" style={{ fontSize: 23, lineHeight: 1.1 }}>{localizedValue(item, 'title', lang)}</div>
                </button>
              ))}
            </div>
            {selected ? <article style={{ background: 'var(--paper)', padding: '38px 36px', minHeight: 480 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--rust)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 16 }}>
                {selected?.law_number || 'Material ligjor'}
              </div>
              <h2 className="serif" style={{ fontSize: 'clamp(34px, 4vw, 58px)', lineHeight: 1.02, color: 'var(--ink)' }}>{localizedValue(selected, 'title', lang)}</h2>
              <p style={{ marginTop: 22, fontSize: 17, lineHeight: 1.65, color: 'var(--ink-2)' }}>{localizedValue(selected, 'summary', lang) || selected?.status}</p>
              <div style={{ marginTop: 16 }}>
                <MaterialSourceBadge label={selected?.source_label || selected?.material_type || 'Gazeta Zyrtare'} />
              </div>
              <LawCitizenBrief item={selected} lang={lang} />
              <div style={{ marginTop: 32, borderTop: '1px solid var(--line)', paddingTop: 22 }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Statusi</div>
                <p style={{ margin: 0, color: 'var(--ink-2)', lineHeight: 1.55 }}>{selected?.status}</p>
              </div>
              {selected?.source_url && (
                <a href={selected.source_url} target="_blank" rel="noreferrer" className="mono" style={{ display: 'inline-flex', marginTop: 28, color: 'var(--ink)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  Hap burimin zyrtar →
                </a>
              )}
            </article> : (
              <article style={{ background: 'var(--paper)', padding: '38px 36px', minHeight: 300, color: 'var(--ink-2)' }}>
                Nuk u gjet asnjë ligj me këtë kërkim.
              </article>
            )}
          </div>
        </section>
      )}
      <style>{`
        @media (max-width: 900px) { .laws-page-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}

function MaterialsCatalogPage({ lang }) {
  const { catalog } = useRuleOfLawContent();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const categories = Array.from(new Set(catalog.map(item => item.category || 'Materiale')));
  const needle = query.trim().toLowerCase();
  const filtered = catalog.filter(item => {
    const inCategory = category === 'all' || (item.category || 'Materiale') === category;
    const text = `${item.title || ''} ${item.material_type || ''} ${item.source_label || ''}`.toLowerCase();
    return inCategory && (!needle || text.includes(needle));
  });
  const grouped = filtered.reduce((acc, item) => {
    const key = item.category || 'Materiale';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <>
      <MaterialsPageHero
        eyebrow="Ligjet tjera"
        title="Të gjitha materialet e nxjerra për juristët, në një vend"
        sub="Ligje, raporte, udhëzues, dokumente ndërkombëtare, kontakte praktike, glosarë dhe infografika të ndara sipas kategorive."
        stat={catalog.length || 313}
        statLabel="materiale"
        lang={lang}
      />
      {!catalog.length ? <LoadingMaterials /> : (
        <section style={{ padding: '0 0 120px', background: 'var(--paper)' }}>
          <div className="container">
            <div className="catalog-tools" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, marginBottom: 28 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Kërko material, ligj, raport..." style={{ border: '1px solid var(--line)', background: 'var(--paper-2)', padding: '16px 18px', fontSize: 15, color: 'var(--ink)' }} />
              <div className="mono" style={{ border: '1px solid var(--line)', padding: '16px 18px', fontSize: 11, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>{filtered.length} rezultate</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 34 }}>
              {['all', ...categories].map(cat => (
                <button key={cat} type="button" onClick={() => setCategory(cat)} className="mono" style={{
                  border: '1px solid var(--line)', background: category === cat ? 'var(--ink)' : 'var(--paper-2)',
                  color: category === cat ? 'var(--paper)' : 'var(--ink)', padding: '10px 12px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                }}>{cat === 'all' ? 'Të gjitha' : cat}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {Object.entries(grouped).map(([cat, items], groupIndex) => (
                <details key={cat} open={groupIndex === 0} style={{ border: '1px solid var(--line)', background: 'var(--paper-2)' }}>
                  <summary style={{ cursor: 'pointer', padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, listStyle: 'none' }}>
                    <span className="serif" style={{ fontSize: 22, lineHeight: 1.08, color: 'var(--ink)' }}>{cat}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{items.length}</span>
                  </summary>
                  <div className="materials-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, background: 'var(--line)', borderTop: '1px solid var(--line)' }}>
                    {items.map((item, i) => (
                      <a key={`${item.slug || item.title}-${i}`} href={item.source_url || '#'} target={item.source_url ? '_blank' : undefined} rel="noreferrer" style={{ background: 'var(--paper)', padding: 20, color: 'var(--ink)' }}>
                        <div style={{ fontSize: 16, lineHeight: 1.35, fontWeight: 650 }}>{item.title}</div>
                        <div className="mono" style={{ fontSize: 9, color: 'var(--rust)', letterSpacing: '0.08em', marginTop: 12, textTransform: 'uppercase' }}>{item.material_type}</div>
                        <div style={{ marginTop: 10 }}>
                          <MaterialSourceBadge label={item.source_label} />
                        </div>
                      </a>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
          <style>{`
            @media (max-width: 760px) {
              .catalog-tools { grid-template-columns: 1fr !important; }
              .materials-catalog-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </section>
      )}
    </>
  );
}

const EU_ROADMAP_STEPS = [
  { step: '01', title_sq: 'MSA në fuqi', status_sq: 'E plotësuar', body_sq: 'Marrëveshja e Stabilizim-Asociimit është baza kontraktuale Kosovë-BE dhe është në fuqi nga 1 prill 2016.', source: 'European Commission / SAA', progress: 100 },
  { step: '02', title_sq: 'Aplikimi për BE', status_sq: 'E plotësuar', body_sq: 'Kosova dorëzoi aplikimin për anëtarësim në Bashkimin Evropian në dhjetor 2022.', source: 'Council / Kosovo application', progress: 100 },
  { step: '03', title_sq: 'Opinion i Komisionit', status_sq: 'Në pritje', body_sq: 'Këshilli duhet t’i kërkojë Komisionit Evropian opinion për aplikimin. Ky hap kërkon vullnet politik të shteteve anëtare.', source: 'EU enlargement procedure', progress: 35 },
  { step: '04', title_sq: 'Status kandidat', status_sq: 'Në pritje', body_sq: 'Statusi kandidat kërkon vendim unanim në Këshill dhe progres të besueshëm në reforma, sundim ligji dhe normalizim rajonal.', source: 'Copenhagen criteria', progress: 30 },
  { step: '05', title_sq: 'Screening dhe klasterë', status_sq: 'Hap i ardhshëm teknik', body_sq: 'Pas statusit kandidat, acquis-ja shqyrtohet në klasterë dhe kapituj për të matur harmonizimin ligjor dhe zbatimin praktik.', source: 'EU revised enlargement methodology', progress: 20 },
  { step: '06', title_sq: 'Traktati i anëtarësimit', status_sq: 'Final', body_sq: 'Mbyllja e kapitujve dhe ratifikimi nga të gjitha shtetet anëtare janë hapi përfundimtar para anëtarësimit.', source: 'EU accession treaty process', progress: 5 },
];

const EU_PROGRESS_TRACKER = [
  { area_sq: 'Sundimi i ligjit', owner_sq: 'KGJK, KPK, Ministria e Drejtësisë', status_sq: 'Në progres', deadline_sq: '2025-2027', source_sq: 'Kosovo Report 2025', progress: 35 },
  { area_sq: 'Lufta kundër korrupsionit', owner_sq: 'APK, Prokuroria Speciale, Kuvendi', status_sq: 'Në progres', deadline_sq: '2025-2028', source_sq: 'Strategjia anti-korrupsion / EC', progress: 32 },
  { area_sq: 'Administrata publike', owner_sq: 'MAPL/MPB, Qeveria, komunat', status_sq: 'Në progres', deadline_sq: '2025-2027', source_sq: 'SIGMA / EC', progress: 45 },
  { area_sq: 'Të drejtat themelore', owner_sq: 'Qeveria, Avokati i Popullit, Kuvendi', status_sq: 'Në progres', deadline_sq: '2025-2027', source_sq: 'EC / Ombudsperson', progress: 45 },
  { area_sq: 'Media dhe liria e shprehjes', owner_sq: 'KPM, Kuvendi, RTK', status_sq: 'Në progres', deadline_sq: '2025-2026', source_sq: 'EC / media acquis', progress: 40 },
  { area_sq: 'Normalizimi Kosovë-Serbi', owner_sq: 'Qeveria, BE facilitator', status_sq: 'Kusht politik', deadline_sq: 'Vazhdimisht', source_sq: 'EU-facilitated dialogue', progress: 30 },
  { area_sq: 'Ekonomia e tregut', owner_sq: 'MFPT, BQK, ARBK, Autoriteti i Konkurrencës', status_sq: 'Në progres', deadline_sq: '2025-2028', source_sq: 'EC economic criteria', progress: 48 },
];

const EU_ACQUIS_CLUSTERS = [
  { cluster: 'Themelet', chapters: '23, 24, ekonomi, institucione demokratike, administratë publike', citizen_sq: 'Gjykata më të pavarura, procedura më të drejta, institucione që përgjigjen dhe të drejta të zbatueshme.', progress: 38 },
  { cluster: 'Tregu i brendshëm', chapters: '1, 2, 3, 4, 6, 7, 8, 9, 28', citizen_sq: 'Mbrojtje konsumatore, konkurrencë e drejtë, standarde të produkteve dhe shërbime më të sigurta.', progress: 42 },
  { cluster: 'Konkurrueshmëria dhe rritja', chapters: '10, 16, 17, 19, 20, 25, 26, 29', citizen_sq: 'Ekonomi më formale, arsim më cilësor, taksa më transparente dhe treg pune më i drejtë.', progress: 44 },
  { cluster: 'Agjenda e gjelbër dhe lidhshmëria', chapters: '14, 15, 21, 27', citizen_sq: 'Ajër më i pastër, energji më e sigurt, transport më i mirë dhe mbrojtje e mjedisit.', progress: 34 },
  { cluster: 'Burimet, bujqësia dhe kohezioni', chapters: '11, 12, 13, 22, 33', citizen_sq: 'Siguri ushqimore, zhvillim rural, fonde më të menaxhuara dhe statistika më të besueshme.', progress: 31 },
  { cluster: 'Marrëdhëniet e jashtme', chapters: '30, 31', citizen_sq: 'Përafrim me politikën e jashtme të BE-së, tregti më e qartë dhe partneritet ndërkombëtar.', progress: 52 },
];

const EC_RECOMMENDATIONS = [
  { pillar_sq: 'Drejtësia', recommendation_sq: 'Të forcohet llogaridhënia e KGJK/KPK, menaxhimi i rasteve dhe zbatimi i standardeve të integritetit.', source_sq: 'Kosovo Report 2025', priority: 'High' },
  { pillar_sq: 'Anti-korrupsioni', recommendation_sq: 'Të ketë rezultate më të matshme në rastet e profilit të lartë, deklarim pasurie dhe konflikt interesi.', source_sq: 'Kosovo Report 2025', priority: 'High' },
  { pillar_sq: 'Administrata publike', recommendation_sq: 'Të rritet rekrutimi meritor, të zvogëlohen ushtruesit e detyrës dhe të racionalizohen agjencitë.', source_sq: 'SIGMA / EC', priority: 'High' },
  { pillar_sq: 'Media', recommendation_sq: 'Të garantohet pavarësia e rregullatorëve, transparenca e pronësisë dhe financimi i qëndrueshëm i transmetuesit publik.', source_sq: 'EC media recommendations', priority: 'Medium' },
  { pillar_sq: 'Të drejtat themelore', recommendation_sq: 'Të zbatohet mbrojtja nga diskriminimi, të drejtat e fëmijëve, personave me aftësi të kufizuara dhe komuniteteve.', source_sq: 'EC / Ombudsperson', priority: 'High' },
  { pillar_sq: 'Prokurimi publik', recommendation_sq: 'Të rritet transparenca, konkurrenca dhe kontrolli i kontratave publike me rrezik të lartë.', source_sq: 'EU rule-of-law standards', priority: 'High' },
];

const CITIZEN_ACTIONS = [
  { title_sq: 'Kërko dokument publik', body_sq: 'Përdor të drejtën për qasje në dokumente publike për kontrata, vendime, buxhete dhe raporte.', source_sq: 'Ligji për Qasje në Dokumente Publike' },
  { title_sq: 'Raporto korrupsion', body_sq: 'Ruaj datën, vendin, dokumentet dhe komunikimet; raporto te APK, prokuroria ose kanale të sigurta këshillimi.', source_sq: 'Ligji për sinjalizuesit / APK' },
  { title_sq: 'Ankohu ndaj administratës', body_sq: 'Nëse institucioni nuk përgjigjet ose vendos padrejtësisht, përdor ankesën administrative dhe pastaj mjetet gjyqësore.', source_sq: 'Ligji për Procedurën e Përgjithshme Administrative' },
  { title_sq: 'Kërko ndihmë juridike falas', body_sq: 'Për raste sociale, familjare, pronësore ose administrative, kontrollo kriteret për ndihmë juridike falas.', source_sq: 'Agjencia për Ndihmë Juridike Falas' },
];

function EUIntegrationImpactSections({ lang }) {
  const roadmap = useCmsArray('eu_roadmap_steps', EU_ROADMAP_STEPS);
  const tracker = useCmsArray('eu_progress_tracker', EU_PROGRESS_TRACKER);
  const clusters = useCmsArray('eu_acquis_clusters', EU_ACQUIS_CLUSTERS);
  const recommendations = useCmsArray('ec_recommendations', EC_RECOMMENDATIONS);
  const actions = useCmsArray('citizen_actions', CITIZEN_ACTIONS);
  const navCopy = {
    sq: { objectives: 'Objektivat e integrimit', rule: 'Sundimi i ligjit', laws: 'Ligjet themelore', catalog: 'Ligjet tjera' },
    en: { objectives: 'Integration objectives', rule: 'Rule of law', laws: 'Fundamental laws', catalog: 'Other laws' },
    sr: { objectives: 'Ciljevi integracije', rule: 'Vladavina prava', laws: 'Osnovni zakoni', catalog: 'Ostali zakoni' },
  }[lang] || {};
  return (
    <>
      <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div className="container">
          <SectionHead eyebrow="Roadmap i anëtarësimit" title="Ku është Kosova tash dhe çka vjen më pas" sub="Ky roadmap e ndan procesin politik dhe teknik në hapa të lexueshëm për qytetarë dhe prezantim institucional." num="05" />
          <PageActionCards items={[
            { label: navCopy.objectives || 'Objektivat e integrimit', href: '#/objektivat', variant: 'dark' },
            { label: navCopy.rule || 'Sundimi i ligjit', href: '#/sundimi' },
            { label: navCopy.laws || 'Ligjet themelore', href: '#/ligjet-themelore' },
            { label: navCopy.catalog || 'Ligjet tjera', href: '#/katalogu-materialeve' },
          ]} />
          <div className="eu-roadmap-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            {roadmap.map(item => (
              <article key={item.step} style={{ background: 'var(--paper-2)', padding: 24, minHeight: 260 }}>
                <div className="mono" style={{ color: 'var(--rust)', fontSize: 11, letterSpacing: '0.14em' }}>{item.step} / {item.status_sq}</div>
                <h3 className="serif" style={{ fontSize: 30, lineHeight: 1.05, color: 'var(--ink)', marginTop: 18 }}>{item.title_sq}</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.6 }}>{item.body_sq}</p>
                <div style={{ height: 8, background: 'var(--paper-3)', marginTop: 18 }}><div style={{ width: `${item.progress}%`, height: '100%', background: 'var(--blue)' }} /></div>
                <div className="mono" style={{ marginTop: 12, fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.source}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
        <div className="container">
          <SectionHead eyebrow="Tracker reformash" title="Objektivat që duhet të maten, jo vetëm të përmenden" sub="Çdo objektiv lidhet me institucion, afat, burim dhe progres. Kjo është forma që e bën platformën të dobishme për monitorim publik." num="06" />
          <div style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}>
            {tracker.map((row, i) => (
              <div key={row.area_sq} className="eu-tracker-row" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 0.8fr 0.8fr 1fr', gap: 18, padding: '18px 20px', borderTop: i ? '1px solid var(--line)' : 'none', alignItems: 'center' }}>
                <strong style={{ color: 'var(--ink)' }}>{row.area_sq}</strong>
                <span style={{ color: 'var(--ink-2)', fontSize: 13 }}>{row.owner_sq}</span>
                <span className="mono" style={{ color: 'var(--rust)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{row.status_sq}</span>
                <span style={{ color: 'var(--ink-2)', fontSize: 13 }}>{row.deadline_sq}</span>
                <span><span style={{ display: 'block', height: 7, background: 'var(--paper-3)' }}><span style={{ display: 'block', width: `${row.progress}%`, height: '100%', background: 'var(--sage)' }} /></span><span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{row.progress}% · {row.source_sq}</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div className="container">
          <SectionHead eyebrow="Acquis dhe klasterë" title="35 kapitujt duhet të shpjegohen si përfitime konkrete" sub="Përafrimi me acquis nuk është ushtrim teknik vetëm për juristë. Çdo klaster duhet të tregojë çka ndryshon në jetë të përditshme." num="07" />
          <div className="eu-cluster-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            {clusters.map(item => (
              <article key={item.cluster} style={{ background: 'var(--paper-2)', padding: 26 }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--rust)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{item.chapters}</div>
                <h3 className="serif" style={{ fontSize: 34, lineHeight: 1.05, marginTop: 12 }}>{item.cluster}</h3>
                <p style={{ color: 'var(--ink-2)', lineHeight: 1.6 }}>{item.citizen_sq}</p>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Përafrim indikativ: {item.progress}/100</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
        <div className="container">
          <SectionHead eyebrow="Raporti i Komisionit Evropian" title="Rekomandimet kryesore të kthehen në punë konkrete" sub="Këto pika e bëjnë faqen të flasë me gjuhën e progres-raporteve: rekomandim, prioritet, burim dhe fushë." num="08" />
          <div className="ec-recommendations-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            {recommendations.map(item => (
              <article key={item.pillar_sq} style={{ background: 'var(--paper)', padding: 24, minHeight: 220 }}>
                <span className="mono" style={{ color: item.priority === 'High' ? 'var(--rust)' : 'var(--blue)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{item.priority}</span>
                <h3 className="serif" style={{ fontSize: 28, marginTop: 14 }}>{item.pillar_sq}</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.6 }}>{item.recommendation_sq}</p>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.source_sq}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '100px 0', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div className="container citizen-action-grid" style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.4fr', gap: 56 }}>
          <SectionHead eyebrow="Çka bën qytetari" title="Integrimi bëhet praktik kur qytetari di ku të veprojë" sub="Këto janë veprimet që e lidhin procesin evropian me jetën reale: transparencë, raportim, ankesë dhe ndihmë juridike." num="09" />
          <div style={{ display: 'grid', gap: 12 }}>
            {actions.map((item, i) => (
              <article key={item.title_sq} style={{ border: '1px solid var(--line)', background: 'var(--paper-2)', padding: 20 }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--rust)', letterSpacing: '0.12em' }}>0{i + 1} · {item.source_sq}</div>
                <h3 className="serif" style={{ fontSize: 27, marginTop: 10 }}>{item.title_sq}</h3>
                <p style={{ color: 'var(--ink-2)', lineHeight: 1.6 }}>{item.body_sq}</p>
              </article>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 980px) {
            .eu-roadmap-grid, .ec-recommendations-grid { grid-template-columns: 1fr !important; }
            .eu-cluster-grid, .citizen-action-grid { grid-template-columns: 1fr !important; }
            .eu-tracker-row { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>
    </>
  );
}

const LEGAL_PAGE_COPY = {
  privatesia: {
    eyebrow: 'Privacy Policy',
    title: 'Politika e Privatësisë',
    sub: 'Standard evropian për transparencë, minimizim të të dhënave dhe përdorim të përgjegjshëm të AI-së.',
    sections: [
      ['Çfarë mbledhim', 'Platforma mund të përdorë email për kyçje në admin, mesazhe chat-i, dokumente të ngarkuara dhe statistika teknike të domosdoshme për funksionim.'],
      ['Pse i përdorim', 'Të dhënat përdoren për autentikim, menaxhim përmbajtjeje, përgjigje të chatbot-it, siguri, auditim dhe përmirësim të shërbimit.'],
      ['Parimet GDPR', 'Minimizim, kufizim qëllimi, saktësi, ruajtje e kufizuar, siguri, transparencë dhe e drejtë për qasje/korrigjim/fshirje kur aplikohet.'],
      ['AI dhe dokumentet', 'Përgjigjet e AI duhet të citohen me burime. Për çështje ligjore konkrete përdoruesi udhëzohet të konsultojë jurist të licencuar.'],
    ],
  },
  kushtet: {
    eyebrow: 'Terms of Use',
    title: 'Kushtet e Përdorimit',
    sub: 'Platforma është informative dhe edukative; nuk zëvendëson këshillën juridike profesionale.',
    sections: [
      ['Përdorimi i drejtë', 'Përdoruesi nuk duhet të ngarkojë përmbajtje të paligjshme, të dhëna të panevojshme personale ose materiale që shkelin të drejta të palëve të treta.'],
      ['Saktësia', 'Ekipi përdor burime zyrtare kur është e mundur, por përdoruesi duhet të verifikojë vendime ligjore në Gazetën Zyrtare ose institucionin kompetent.'],
      ['Kufizimi', 'euguide-ks nuk është institucion publik dhe nuk jep vendime administrative, opinione ligjore detyruese ose përfaqësim juridik.'],
      ['Licenca', 'Materialet publike synohen për edukim, citim dhe përdorim qytetar me atribuuim të burimit.'],
    ],
  },
  aksesueshmeria: {
    eyebrow: 'Accessibility',
    title: 'Deklarata e Aksesueshmërisë',
    sub: 'Synimi është përputhje praktike me WCAG 2.2 AA dhe me parimet evropiane të aksesit dixhital.',
    sections: [
      ['Struktura', 'Faqet përdorin tituj të qartë, kontrast të lartë, layout responsiv dhe navigim me linke të kuptueshme.'],
      ['Kërkimi dhe leximi', 'Faqet me shumë materiale kanë search bar, lista të ndara dhe tekst të shkurtër për skanim të shpejtë.'],
      ['Përmirësime të ardhshme', 'Duhet shtuar audit i plotë keyboard-only, aria labels për të gjitha ikonat dhe testim me screen readers.'],
      ['Raportim problemi', 'Përdoruesit mund të raportojnë pengesa aksesueshmërie te ekipi i platformës.'],
    ],
  },
  burimet: {
    eyebrow: 'Sources Standard',
    title: 'Standardi i Burimeve dhe Citimeve',
    sub: 'Çdo e dhënë e rëndësishme duhet të jetë e lidhur me burim zyrtar ose raport të njohur ndërkombëtar.',
    sections: [
      ['Burime primare', 'Gazeta Zyrtare, Kuvendi, Qeveria, ministritë, Komisioni Evropian, EUR-Lex dhe institucionet e pavarura.'],
      ['Burime sekondare', 'SIGMA/OECD, Transparency International, Freedom House, BIRN/KDI dhe raporte të organizatave me metodologji publike.'],
      ['Rregulli i citimit', 'Çdo chart, objektiv ose material ligjor duhet të ketë titull, datë/vit, institucion, link dhe shënim për statusin.'],
      ['Kujdes ligjor', 'Kur ligji ka amendamente, përdoret akti i konsoliduar ose shënohet qartë statusi dhe data e kontrollit.'],
    ],
  },
};

const LEGAL_PAGE_COPY_I18N = {
  privatesia: {
    sq: {
      eyebrow: 'Politika e privatësisë',
      title: 'Politika e Privatësisë',
      sub: 'Standard evropian për transparencë, minimizim të të dhënave dhe përdorim të përgjegjshëm të AI-së.',
      back: 'Kthehu në fillim',
      sections: [
        ['Çfarë mbledhim', 'Platforma mund të përdorë email për kyçje në admin, mesazhe chat-i, dokumente të ngarkuara dhe statistika teknike të domosdoshme për funksionim.'],
        ['Pse i përdorim', 'Të dhënat përdoren për autentikim, menaxhim përmbajtjeje, përgjigje të chatbot-it, siguri, auditim dhe përmirësim të shërbimit.'],
        ['Parimet GDPR', 'Minimizim, kufizim qëllimi, saktësi, ruajtje e kufizuar, siguri, transparencë dhe e drejtë për qasje, korrigjim ose fshirje kur aplikohet.'],
        ['AI dhe dokumentet', 'Përgjigjet e AI duhet të citohen me burime. Për çështje ligjore konkrete përdoruesi udhëzohet të konsultojë jurist të licencuar.'],
      ],
    },
    en: {
      eyebrow: 'Privacy Policy',
      title: 'Privacy Policy',
      sub: 'European-standard transparency for data minimisation and responsible use of AI.',
      back: 'Back to home',
      sections: [
        ['What we collect', 'The platform may use admin login email addresses, chat messages, uploaded documents, and technical statistics required for reliable operation.'],
        ['Why we use it', 'Data is used for authentication, content management, chatbot answers, security, audit trails, and service improvement.'],
        ['GDPR principles', 'We follow minimisation, purpose limitation, accuracy, limited retention, security, transparency, and access, correction or deletion rights where applicable.'],
        ['AI and documents', 'AI answers should cite sources. For specific legal matters, users are directed to consult a licensed lawyer.'],
      ],
    },
    sr: {
      eyebrow: 'Politika privatnosti',
      title: 'Politika privatnosti',
      sub: 'Evropski standard transparentnosti za minimalnu obradu podataka i odgovornu upotrebu veštačke inteligencije.',
      back: 'Nazad na početnu',
      sections: [
        ['Šta prikupljamo', 'Platforma može koristiti email adrese za admin prijavu, poruke iz chata, učitane dokumente i tehničke statistike neophodne za rad.'],
        ['Zašto ih koristimo', 'Podaci se koriste za autentifikaciju, upravljanje sadržajem, odgovore chatbota, bezbednost, reviziju i unapređenje usluge.'],
        ['GDPR principi', 'Pratimo minimizaciju, ograničenje svrhe, tačnost, ograničeno čuvanje, bezbednost, transparentnost i prava pristupa, ispravke ili brisanja kada se primenjuju.'],
        ['AI i dokumenti', 'Odgovori veštačke inteligencije treba da navode izvore. Za konkretna pravna pitanja korisnik se upućuje na licenciranog pravnika.'],
      ],
    },
  },
  kushtet: {
    sq: {
      eyebrow: 'Kushtet e përdorimit',
      title: 'Kushtet e Përdorimit',
      sub: 'Platforma është informative dhe edukative; nuk zëvendëson këshillën juridike profesionale.',
      back: 'Kthehu në fillim',
      sections: [
        ['Përdorimi i drejtë', 'Përdoruesi nuk duhet të ngarkojë përmbajtje të paligjshme, të dhëna të panevojshme personale ose materiale që shkelin të drejta të palëve të treta.'],
        ['Saktësia', 'Ekipi përdor burime zyrtare kur është e mundur, por përdoruesi duhet të verifikojë vendime ligjore në Gazetën Zyrtare ose institucionin kompetent.'],
        ['Kufizimi', 'euguide-ks nuk është institucion publik dhe nuk jep vendime administrative, opinione ligjore detyruese ose përfaqësim juridik.'],
        ['Licenca', 'Materialet publike synohen për edukim, citim dhe përdorim qytetar me atribuim të burimit.'],
      ],
    },
    en: {
      eyebrow: 'Terms of Use',
      title: 'Terms of Use',
      sub: 'The platform is informational and educational; it does not replace professional legal advice.',
      back: 'Back to home',
      sections: [
        ['Fair use', 'Users must not upload unlawful content, unnecessary personal data, or materials that infringe third-party rights.'],
        ['Accuracy', 'The team uses official sources where possible, but users should verify legal decisions in the Official Gazette or with the competent institution.'],
        ['Limitation', 'euguide-ks is not a public institution and does not issue administrative decisions, binding legal opinions, or legal representation.'],
        ['Licence', 'Public materials are intended for education, citation, and civic use with attribution to the source.'],
      ],
    },
    sr: {
      eyebrow: 'Uslovi korišćenja',
      title: 'Uslovi korišćenja',
      sub: 'Platforma je informativna i edukativna; ne zamenjuje profesionalni pravni savet.',
      back: 'Nazad na početnu',
      sections: [
        ['Pravilna upotreba', 'Korisnik ne sme učitavati nezakonit sadržaj, nepotrebne lične podatke ili materijale koji krše prava trećih lica.'],
        ['Tačnost', 'Tim koristi zvanične izvore kada je moguće, ali korisnik treba da proveri pravne odluke u Službenom listu ili kod nadležne institucije.'],
        ['Ograničenje', 'euguide-ks nije javna institucija i ne izdaje administrativne odluke, obavezujuća pravna mišljenja ili pravno zastupanje.'],
        ['Licenca', 'Javni materijali namenjeni su edukaciji, citiranju i građanskoj upotrebi uz navođenje izvora.'],
      ],
    },
  },
  aksesueshmeria: {
    sq: {
      eyebrow: 'Aksesueshmëria',
      title: 'Deklarata e Aksesueshmërisë',
      sub: 'Synimi është përputhje praktike me WCAG 2.2 AA dhe me parimet evropiane të aksesit dixhital.',
      back: 'Kthehu në fillim',
      sections: [
        ['Struktura', 'Faqet përdorin tituj të qartë, kontrast të lartë, layout responsiv dhe navigim me linke të kuptueshme.'],
        ['Kërkimi dhe leximi', 'Faqet me shumë materiale kanë search bar, lista të ndara dhe tekst të shkurtër për skanim të shpejtë.'],
        ['Përmirësime të ardhshme', 'Duhet shtuar audit i plotë keyboard-only, aria labels për të gjitha ikonat dhe testim me screen readers.'],
        ['Raportim problemi', 'Përdoruesit mund të raportojnë pengesa aksesueshmërie te ekipi i platformës.'],
      ],
    },
    en: {
      eyebrow: 'Accessibility',
      title: 'Accessibility Statement',
      sub: 'The goal is practical alignment with WCAG 2.2 AA and European digital accessibility principles.',
      back: 'Back to home',
      sections: [
        ['Structure', 'Pages use clear headings, strong contrast, responsive layout, and understandable navigation links.'],
        ['Search and reading', 'Material-heavy pages include search bars, separated lists, and concise text for fast scanning.'],
        ['Future improvements', 'A full keyboard-only audit, ARIA labels for all icons, and screen reader testing should be added.'],
        ['Report an issue', 'Users can report accessibility barriers to the platform team.'],
      ],
    },
    sr: {
      eyebrow: 'Pristupačnost',
      title: 'Izjava o pristupačnosti',
      sub: 'Cilj je praktično usklađivanje sa WCAG 2.2 AA i evropskim principima digitalne pristupačnosti.',
      back: 'Nazad na početnu',
      sections: [
        ['Struktura', 'Stranice koriste jasne naslove, jak kontrast, responzivan raspored i razumljive navigacione linkove.'],
        ['Pretraga i čitanje', 'Stranice sa mnogo materijala imaju pretragu, odvojene liste i kratak tekst za brzo skeniranje.'],
        ['Buduća poboljšanja', 'Treba dodati potpunu proveru rada samo tastaturom, ARIA oznake za sve ikone i testiranje čitačima ekrana.'],
        ['Prijava problema', 'Korisnici mogu prijaviti prepreke pristupačnosti timu platforme.'],
      ],
    },
  },
  burimet: {
    sq: {
      eyebrow: 'Standardi i burimeve',
      title: 'Standardi i Burimeve dhe Citimeve',
      sub: 'Çdo e dhënë e rëndësishme duhet të jetë e lidhur me burim zyrtar ose raport të njohur ndërkombëtar.',
      back: 'Kthehu në fillim',
      sections: [
        ['Burime primare', 'Gazeta Zyrtare, Kuvendi, Qeveria, ministritë, Komisioni Evropian, EUR-Lex dhe institucionet e pavarura.'],
        ['Burime sekondare', 'SIGMA/OECD, Transparency International, Freedom House, BIRN/KDI dhe raporte të organizatave me metodologji publike.'],
        ['Rregulli i citimit', 'Çdo chart, objektiv ose material ligjor duhet të ketë titull, datë ose vit, institucion, link dhe shënim për statusin.'],
        ['Kujdes ligjor', 'Kur ligji ka amendamente, përdoret akti i konsoliduar ose shënohet qartë statusi dhe data e kontrollit.'],
      ],
    },
    en: {
      eyebrow: 'Sources standard',
      title: 'Sources and Citation Standard',
      sub: 'Every important claim should be tied to an official source or a recognised international report.',
      back: 'Back to home',
      sections: [
        ['Primary sources', 'Official Gazette, Assembly, Government, ministries, European Commission, EUR-Lex, and independent institutions.'],
        ['Secondary sources', 'SIGMA/OECD, Transparency International, Freedom House, BIRN/KDI, and organisations with public methodologies.'],
        ['Citation rule', 'Each chart, objective, or legal material should include title, date or year, institution, link, and a status note.'],
        ['Legal caution', 'When a law has amendments, use the consolidated act or clearly state status and review date.'],
      ],
    },
    sr: {
      eyebrow: 'Standard izvora',
      title: 'Standard izvora i citiranja',
      sub: 'Svaka važna tvrdnja treba da bude povezana sa zvaničnim izvorom ili priznatim međunarodnim izveštajem.',
      back: 'Nazad na početnu',
      sections: [
        ['Primarni izvori', 'Službeni list, Skupština, Vlada, ministarstva, Evropska komisija, EUR-Lex i nezavisne institucije.'],
        ['Sekundarni izvori', 'SIGMA/OECD, Transparency International, Freedom House, BIRN/KDI i organizacije sa javnom metodologijom.'],
        ['Pravilo citiranja', 'Svaki grafikon, cilj ili pravni materijal treba da ima naslov, datum ili godinu, instituciju, link i napomenu o statusu.'],
        ['Pravni oprez', 'Kada zakon ima izmene, koristi se konsolidovani akt ili se jasno navode status i datum provere.'],
      ],
    },
  },
};

const LEGAL_PAGE_COPY_FULL = {
  privatesia: {
    sq: {
      eyebrow: "Politika e privatësisë",
      title: "Si i mbron euguide-ks të dhënat, dokumentet dhe përdorimin e AI-së",
      sub: "Kjo faqe shpjegon çfarë të dhënash përdor platforma, pse përdoren dhe si mbrohen gjatë shfletimit publik, administrimit të përmbajtjes dhe përdorimit të chatbot-it.",
      back: "Kthehu në fillim",
      meta: [["Platforma", "euguide-ks"], ["Qëllimi", "informim qytetar për integrimin në BE"], ["Përditësuar", "maj 2026"]],
      notice: "Shfletimi publik i euguide-ks nuk kërkon llogari. Të dhënat personale përdoren vetëm kur janë të nevojshme për siguri, administrim, dërgim të linkut të hyrjes ose funksione të AI-së.",
      sections: [
        ["Kush jemi", "euguide-ks është platformë edukative dhe qytetare për Kosovën, e ndërtuar për të sqaruar integrimin në BE, ligjet, objektivat, raportet dhe burimet zyrtare në një vend të vetëm."],
        ["Çfarë mbledhim", "Për vizitorët publikë synojmë të ruajmë minimumin e mundshëm: gjuhën e zgjedhur, kërkimet brenda faqes dhe të dhëna teknike bazë për siguri. Për adminët ruhet emaili, roli dhe historiku minimal i veprimeve."],
        ["Standardet evropiane", "Platforma synon të ndjekë parimet e GDPR (General Data Protection Regulation), ePrivacy Directive (Directive on Privacy and Electronic Communications), EU AI Act (Artificial Intelligence Act) dhe WCAG 2.2 AA (Web Content Accessibility Guidelines), aty ku aplikohen për një platformë edukative."],
        ["Admin dhe magic link", "Hyrja në admin bëhet me link në email. Vetëm profilet me rol admin ose editor duhet të kenë qasje. Root admin mbrohet nga fshirja ose degradimi për të ruajtur kontrollin e projektit."],
        ["Chatbot dhe AI", "Pyetjet në chatbot mund të përpunohen për të kthyer përgjigje me burime. Përdoruesit nuk duhet të dërgojnë të dhëna shumë personale, dokumente private ose informata që nuk duan të ruhen në histori teknike."],
        ["Dokumentet", "Dokumentet e ngarkuara në panelin admin ruhen për kërkim, indeksim, copëzim dhe citim nga AI. Ato duhet të jenë materiale publike, ligje, raporte ose dokumente që projekti ka të drejtë t’i përdorë."],
        ["Palët teknike", "Platforma mund të përdorë shërbime si Supabase për databazë/autentikim, Vercel për hostim dhe modele AI për përgjigje. Këto shërbime përdoren vetëm për funksionimin e platformës."],
        ["Ruajtja dhe fshirja", "Të dhënat ruhen për aq kohë sa duhen për funksionim, siguri dhe auditim editorial. Përmbajtja, dokumentet dhe profilet mund të fshihen nga adminët e autorizuar, përveç llogarisë root."],
        ["Të drejtat e përdoruesit", "Nëse një përdorues kërkon korrigjim ose fshirje të të dhënave që lidhen me të, ekipi i projektit duhet ta trajtojë kërkesën në mënyrë proporcionale dhe të arsyeshme sipas ligjit në fuqi."],
        ["Siguria", "Përdoren role, kontroll i qasjes, ruajtje e kufizuar e sekreteve dhe ndarje mes pjesës publike dhe adminit. Asnjë platformë nuk është pa rrezik, prandaj shmanget mbledhja e panevojshme e të dhënave."],
        ["Fëmijët dhe të rinjtë", "Përmbajtja është edukative dhe mund të lexohet nga të rinjtë, por nuk kërkohet krijim llogarie nga ta. Materialet ligjore shpjegohen në gjuhë të qartë, pa mbledhje të qëllimshme të të dhënave të fëmijëve."],
      ],
    },
    en: {
      eyebrow: "Privacy policy",
      title: "How euguide-ks protects data, documents and AI use",
      sub: "This page explains what the platform uses, why it is used and how it is protected while browsing, managing content and using the chatbot.",
      back: "Back home",
      meta: [["Platform", "euguide-ks"], ["Purpose", "civic information on EU integration"], ["Updated", "May 2026"]],
      notice: "Public browsing does not require an account. Personal data is used only when necessary for security, administration, login links or AI features.",
      sections: [
        ["Who we are", "euguide-ks is an educational civic platform for Kosovo, built to explain EU integration, laws, objectives, reports and official sources in one place."],
        ["What we collect", "For public visitors we keep data minimal: selected language, site searches and basic technical security data. For administrators we store email, role and a minimal action history."],
        ["European standards", "The platform aims to follow the principles of GDPR (General Data Protection Regulation), ePrivacy Directive (Directive on Privacy and Electronic Communications), EU AI Act (Artificial Intelligence Act) and WCAG 2.2 AA (Web Content Accessibility Guidelines), where they apply to an educational platform."],
        ["Admin and magic link", "Admin access uses an email login link. Only profiles with admin or editor roles should have access. The root admin is protected from deletion or demotion."],
        ["Chatbot and AI", "Chatbot questions may be processed to return sourced answers. Users should not submit sensitive personal data, private documents or information they do not want processed technically."],
        ["Documents", "Documents uploaded in the admin panel are stored for search, indexing, chunking and AI citation. They should be public legal materials, reports or files the project may lawfully use."],
        ["Technical providers", "The platform may use services such as Supabase for database/auth, Vercel for hosting and AI models for answers. They are used only to operate the platform."],
        ["Retention and deletion", "Data is kept only as long as needed for operation, security and editorial audit. Content, documents and profiles may be deleted by authorised admins, except the root account."],
        ["User rights", "Requests to correct or delete personal data related to a user should be handled proportionately and reasonably under applicable law."],
        ["Security", "The platform uses roles, access checks, limited secret handling and separation between public and admin areas. Since no system is risk-free, unnecessary data collection is avoided."],
        ["Children and youth", "The content is educational and may be read by young people, but they are not asked to create accounts. Legal materials are explained clearly without intentional collection of children's data."],
      ],
    },
    sr: {
      eyebrow: "Politika privatnosti",
      title: "Kako euguide-ks štiti podatke, dokumente i upotrebu AI",
      sub: "Ova stranica objašnjava koje podatke platforma koristi, zašto ih koristi i kako ih štiti tokom javnog pregleda, administracije sadržaja i korišćenja chatbota.",
      back: "Nazad na početnu",
      meta: [["Platforma", "euguide-ks"], ["Svrha", "građansko informisanje o EU integraciji"], ["Ažurirano", "maj 2026"]],
      notice: "Javno pregledanje euguide-ks ne zahteva nalog. Lični podaci se koriste samo kada su potrebni za bezbednost, administraciju, link za prijavu ili AI funkcije.",
      sections: [
        ["Ko smo", "euguide-ks je edukativna građanska platforma za Kosovo, izgrađena da objasni EU integraciju, zakone, ciljeve, izveštaje i zvanične izvore na jednom mestu."],
        ["Šta prikupljamo", "Za javne posetioce čuvamo minimum: izabrani jezik, pretrage na sajtu i osnovne tehničke podatke za bezbednost. Za administratore čuvamo email, ulogu i minimalnu istoriju aktivnosti."],
        ["Evropski standardi", "Platforma teži da prati principe GDPR (General Data Protection Regulation), ePrivacy Directive (Directive on Privacy and Electronic Communications), EU AI Act (Artificial Intelligence Act) i WCAG 2.2 AA (Web Content Accessibility Guidelines), kada se primenjuju na edukativnu platformu."],
        ["Admin i magic link", "Pristup adminu ide preko linka u emailu. Pristup treba da imaju samo profili sa ulogom admin ili editor. Root admin je zaštićen od brisanja ili degradacije."],
        ["Chatbot i AI", "Pitanja u chatbotu mogu se obraditi radi odgovora sa izvorima. Korisnici ne treba da šalju osetljive lične podatke, privatne dokumente ili informacije koje ne žele da budu tehnički obrađene."],
        ["Dokumenti", "Dokumenti učitani u admin panel čuvaju se za pretragu, indeksiranje, deljenje na delove i AI citiranje. Treba da budu javni pravni materijali, izveštaji ili fajlovi koje projekat sme da koristi."],
        ["Tehnički pružaoci", "Platforma može koristiti Supabase za bazu/autentikaciju, Vercel za hosting i AI modele za odgovore. Ti servisi se koriste samo za rad platforme."],
        ["Čuvanje i brisanje", "Podaci se čuvaju onoliko dugo koliko je potrebno za rad, bezbednost i urednički audit. Sadržaj, dokumenti i profili mogu se brisati od strane ovlašćenih admina, osim root naloga."],
        ["Prava korisnika", "Zahtevi za ispravku ili brisanje ličnih podataka korisnika treba da se obrade proporcionalno i razumno prema važećem pravu."],
        ["Bezbednost", "Koriste se uloge, kontrole pristupa, ograničeno rukovanje tajnama i odvajanje javnog i admin dela. Pošto nijedan sistem nije bez rizika, izbegava se nepotrebno prikupljanje podataka."],
        ["Deca i mladi", "Sadržaj je edukativan i mogu ga čitati mladi, ali se od njih ne traži nalog. Pravni materijali se objašnjavaju jasno bez namernog prikupljanja podataka dece."],
      ],
    },
  },
  kushtet: {
    sq: {
      eyebrow: "Kushtet e përdorimit",
      title: "Rregullat e përdorimit të euguide-ks",
      sub: "Këto kushte e bëjnë të qartë çfarë është platforma, çfarë nuk është, si duhet të përdoren materialet dhe si trajtohen përgjigjet nga AI.",
      back: "Kthehu në fillim",
      meta: [["Statusi", "platformë edukative"], ["Fokusi", "Kosova dhe integrimi në BE"], ["Përditësuar", "maj 2026"]],
      notice: "euguide-ks nuk është institucion publik, zyrë ligjore apo burim zyrtar i vetëm. Për vendime ligjore duhet të verifikohet gjithmonë ligji, akti ose institucioni zyrtar.",
      sections: [
        ["Qëllimi", "Platforma ndihmon qytetarët, studentët, gazetarët dhe organizatat të kuptojnë rrugën e Kosovës drejt BE-së, ligjet kryesore dhe institucionet përgjegjëse."],
        ["Jo këshillë ligjore", "Përmbajtja është informuese. Ajo nuk zëvendëson avokatin, institucionin kompetent, gjykatën, Gazetën Zyrtare ose versionin zyrtar të një akti."],
        ["Burimet", "Kur është e mundur, materialet lidhen me Gazetën Zyrtare, Kuvendin, Qeverinë, Komisionin Evropian, EUR-Lex, ASK, institucionet e drejtësisë dhe raporte të njohura ndërkombëtare."],
        ["AI dhe verifikimi", "Chatboti duhet të japë përgjigje me citime kur ka burime. Përdoruesi duhet të kontrollojë linkun, datën dhe nenin para se ta përdorë përgjigjen për vendime praktike."],
        ["Përdorimi i lejuar", "Lejohet shfletimi, kërkimi, citimi i shkurtër dhe përdorimi edukativ i materialeve, duke ruajtur burimin dhe duke mos ndryshuar kuptimin e përmbajtjes."],
        ["Përdorimi i ndaluar", "Nuk lejohet ngarkimi i dokumenteve private pa të drejtë, keqpërdorimi i chatbotit, sulmet teknike, spam-i, tentimi për qasje në admin ose publikimi i informatave të rreme si zyrtare."],
        ["Përgjegjësia editoriale", "Adminët dhe editorët duhet të përdorin burime të verifikuara, të shënojnë datën/statusin e materialit dhe të korrigjojnë gabimet sapo identifikohen."],
        ["Disponueshmëria", "Platforma mund të ndryshojë, ndërpritet për mirëmbajtje ose të ketë kufizime teknike. Synimi është që përmbajtja kryesore të mbetet e qasshme dhe e lexueshme."],
        ["Përgjegjësia", "euguide-ks ofron orientim dhe strukturë. Nuk merr përgjegjësi për dëme që vijnë nga përdorimi i gabuar, mosverifikimi i burimit ose interpretimi i pasaktë i një materiali."],
        ["Ndryshimet", "Kushtet mund të përditësohen kur ndryshon funksionaliteti, ligji, standardi i burimeve ose mënyra e përdorimit të AI-së në platformë."],
      ],
    },
    en: {
      eyebrow: "Terms of use",
      title: "Rules for using euguide-ks",
      sub: "These terms clarify what the platform is, what it is not, how materials should be used and how AI answers should be treated.",
      back: "Back home",
      meta: [["Status", "educational platform"], ["Focus", "Kosovo and EU integration"], ["Updated", "May 2026"]],
      notice: "euguide-ks is not a public institution, law office or the only official source. Legal decisions should always be checked against the official act or institution.",
      sections: [
        ["Purpose", "The platform helps citizens, students, journalists and organisations understand Kosovo's EU path, key laws and responsible institutions."],
        ["Not legal advice", "Content is informational. It does not replace a lawyer, competent institution, court, Official Gazette or the official version of an act."],
        ["Sources", "Where possible, materials link to the Official Gazette, Assembly, Government, European Commission, EUR-Lex, statistics, justice institutions and recognised reports."],
        ["AI and verification", "The chatbot should cite sources when available. Users should check the link, date and article before relying on an answer for practical decisions."],
        ["Allowed use", "Browsing, searching, short citation and educational use are allowed when the source is preserved and the meaning is not distorted."],
        ["Prohibited use", "Do not upload private documents without rights, misuse the chatbot, attack the system, spam, attempt admin access or publish false information as official."],
        ["Editorial responsibility", "Admins and editors should use verified sources, mark date/status and correct errors once identified."],
        ["Availability", "The platform may change, be interrupted for maintenance or have technical limits. The goal is to keep core content accessible and readable."],
        ["Liability", "euguide-ks provides orientation and structure. It is not liable for harm caused by misuse, failure to verify a source or incorrect interpretation."],
        ["Changes", "Terms may be updated when features, laws, source standards or AI use in the platform change."],
      ],
    },
    sr: {
      eyebrow: "Uslovi korišćenja",
      title: "Pravila korišćenja euguide-ks",
      sub: "Ovi uslovi objašnjavaju šta platforma jeste, šta nije, kako se koriste materijali i kako treba tretirati AI odgovore.",
      back: "Nazad na početnu",
      meta: [["Status", "edukativna platforma"], ["Fokus", "Kosovo i EU integracija"], ["Ažurirano", "maj 2026"]],
      notice: "euguide-ks nije javna institucija, advokatska kancelarija niti jedini zvanični izvor. Za pravne odluke uvek treba proveriti zvanični akt ili instituciju.",
      sections: [
        ["Svrha", "Platforma pomaže građanima, studentima, novinarima i organizacijama da razumeju put Kosova ka EU, ključne zakone i nadležne institucije."],
        ["Nije pravni savet", "Sadržaj je informativan. Ne zamenjuje advokata, nadležnu instituciju, sud, Službeni list ili zvaničnu verziju akta."],
        ["Izvori", "Kada je moguće, materijali vode ka Službenom listu, Skupštini, Vladi, Evropskoj komisiji, EUR-Lex, statistici, pravosudnim institucijama i priznatim izveštajima."],
        ["AI i provera", "Chatbot treba da navede izvore kada postoje. Korisnik treba da proveri link, datum i član pre oslanjanja na odgovor u praksi."],
        ["Dozvoljena upotreba", "Dozvoljeni su pregled, pretraga, kratko citiranje i edukativna upotreba uz očuvanje izvora i bez menjanja smisla."],
        ["Zabranjena upotreba", "Nije dozvoljeno učitavanje privatnih dokumenata bez prava, zloupotreba chatbota, napadi na sistem, spam, pokušaj admin pristupa ili predstavljanje netačnih informacija kao zvaničnih."],
        ["Urednička odgovornost", "Admini i editori treba da koriste proverene izvore, označe datum/status i isprave greške kada se uoče."],
        ["Dostupnost", "Platforma se može menjati, biti prekinuta zbog održavanja ili imati tehnička ograničenja. Cilj je da osnovni sadržaj ostane dostupan i čitljiv."],
        ["Odgovornost", "euguide-ks pruža orijentaciju i strukturu. Ne odgovara za štetu nastalu pogrešnom upotrebom, neproveravanjem izvora ili pogrešnim tumačenjem."],
        ["Izmene", "Uslovi se mogu ažurirati kada se promene funkcije, zakoni, standardi izvora ili upotreba AI u platformi."],
      ],
    },
  },
  aksesueshmeria: {
    sq: {
      eyebrow: "Aksesueshmëria",
      title: "Qasje e barabartë në materialet e euguide-ks",
      sub: "Synimi është që qytetarët, studentët dhe përdoruesit me nevoja të ndryshme të mund të gjejnë, lexojnë dhe kuptojnë materialet pa pengesa të panevojshme.",
      back: "Kthehu në fillim",
      meta: [["Synimi", "WCAG 2.2 AA"], ["Gjuhët", "shqip, anglisht, serbisht"], ["Përditësuar", "maj 2026"]],
      notice: "Aksesueshmëria trajtohet si pjesë e produktit, jo si shtesë. Çdo faqe duhet të ketë strukturë të qartë, kontrast të lexueshëm, kërkim dhe navigim të kuptueshëm.",
      sections: [
        ["Standardi", "euguide-ks synon përputhje praktike me WCAG 2.2 AA: tekst i lexueshëm, fokus i dukshëm, strukturë semantike dhe përmbajtje që funksionon në pajisje të ndryshme."],
        ["Navigimi", "Faqet përdorin breadcrumb, lidhje të qarta, butona me tekst të kuptueshëm dhe renditje logjike që ndihmon përdoruesin të dijë ku ndodhet."],
        ["Tastiera", "Elementet interaktive duhet të jenë të arritshme me tastierë, me fokus të dallueshëm dhe pa kurthe navigimi."],
        ["Lexueshmëria", "Tekstet shkruhen në gjuhë të thjeshtë, me ndarje në seksione, kërkim në katalogë dhe shpjegime qytetare për materiale ligjore të rënda."],
        ["Gjuhët", "Përmbajtja kryesore duhet të jetë e qasshme në shqip, anglisht dhe serbisht. Përkthimet automatike mund të ndihmojnë, por materialet kryesore duhet të kontrollohen nga editori."],
        ["Dokumentet PDF", "Disa burime zyrtare të jashtme mund të jenë PDF të skanuara ose jo plotësisht të aksesueshme. Platforma mundohet t’i shoqërojë me përmbledhje, metadata dhe link të drejtpërdrejtë."],
        ["Kontrasti dhe pajisjet", "Dizajni duhet të ruajë kontrast të mjaftueshëm, tekst që nuk mbivendoset dhe paraqitje të mirë në telefon, tablet dhe desktop."],
        ["AI dhe zëri", "Funksionet AI ose voice mund të kenë kufizime. Përgjigjet e rëndësishme duhet të shfaqen edhe si tekst i lexueshëm dhe me burim."],
        ["Raportimi i problemit", "Kur një përdorues has pengesë, duhet të dërgojë faqen, përshkrimin e problemit, pajisjen/browserin dhe, nëse mundet, një screenshot. Kjo ndihmon korrigjimin e shpejtë."],
        ["Përmirësim i vazhdueshëm", "Aksesueshmëria kontrollohet sa herë shtohen faqe, cards, tabela, grafikë ose dokumente të reja."],
      ],
    },
    en: {
      eyebrow: "Accessibility",
      title: "Equal access to euguide-ks materials",
      sub: "The goal is for citizens, students and users with different needs to find, read and understand materials without unnecessary barriers.",
      back: "Back home",
      meta: [["Target", "WCAG 2.2 AA"], ["Languages", "Albanian, English, Serbian"], ["Updated", "May 2026"]],
      notice: "Accessibility is treated as part of the product. Each page should have clear structure, readable contrast, search and understandable navigation.",
      sections: [
        ["Standard", "euguide-ks aims for practical WCAG 2.2 AA alignment: readable text, visible focus, semantic structure and content that works across devices."],
        ["Navigation", "Pages use breadcrumbs, clear links, understandable buttons and logical order so users know where they are."],
        ["Keyboard", "Interactive elements should be reachable by keyboard with visible focus and no navigation traps."],
        ["Readability", "Texts use plain language, sections, catalogue search and citizen-friendly explanations of heavy legal materials."],
        ["Languages", "Core content should be available in Albanian, English and Serbian. Automatic translation can help, but core materials should be editor-reviewed."],
        ["PDF documents", "Some external official sources may be scanned PDFs or not fully accessible. The platform tries to add summaries, metadata and direct links."],
        ["Contrast and devices", "Design should preserve enough contrast, avoid overlapping text and work well on phone, tablet and desktop."],
        ["AI and voice", "AI or voice features may have limitations. Important answers should also appear as readable text with a source."],
        ["Reporting issues", "Users should report the page, issue description, device/browser and, if possible, a screenshot. This helps quick fixes."],
        ["Continuous improvement", "Accessibility is checked whenever pages, cards, tables, charts or documents are added."],
      ],
    },
    sr: {
      eyebrow: "Pristupačnost",
      title: "Jednak pristup materijalima euguide-ks",
      sub: "Cilj je da građani, studenti i korisnici sa različitim potrebama mogu da pronađu, čitaju i razumeju materijale bez nepotrebnih prepreka.",
      back: "Nazad na početnu",
      meta: [["Cilj", "WCAG 2.2 AA"], ["Jezici", "albanski, engleski, srpski"], ["Ažurirano", "maj 2026"]],
      notice: "Pristupačnost je deo proizvoda. Svaka stranica treba da ima jasnu strukturu, čitljiv kontrast, pretragu i razumljivu navigaciju.",
      sections: [
        ["Standard", "euguide-ks teži praktičnom usklađivanju sa WCAG 2.2 AA: čitljiv tekst, vidljiv fokus, semantička struktura i sadržaj koji radi na različitim uređajima."],
        ["Navigacija", "Stranice koriste breadcrumbs, jasne linkove, razumljive dugmad i logičan redosled da korisnik zna gde se nalazi."],
        ["Tastatura", "Interaktivni elementi treba da budu dostupni tastaturom, sa vidljivim fokusom i bez zamki u navigaciji."],
        ["Čitljivost", "Tekstovi koriste jednostavan jezik, sekcije, pretragu kataloga i građanska objašnjenja složenih pravnih materijala."],
        ["Jezici", "Osnovni sadržaj treba da bude dostupan na albanskom, engleskom i srpskom. Automatski prevod može pomoći, ali ključni materijali treba da prođu uredničku proveru."],
        ["PDF dokumenti", "Neki spoljni zvanični izvori mogu biti skenirani PDF-ovi ili ne potpuno pristupačni. Platforma nastoji da doda sažetke, metapodatke i direktne linkove."],
        ["Kontrast i uređaji", "Dizajn treba da čuva dovoljan kontrast, izbegava preklapanje teksta i radi dobro na telefonu, tabletu i desktopu."],
        ["AI i glas", "AI ili glasovne funkcije mogu imati ograničenja. Važni odgovori treba da budu prikazani i kao čitljiv tekst sa izvorom."],
        ["Prijava problema", "Korisnik treba da pošalje stranicu, opis problema, uređaj/browser i, ako može, screenshot. To pomaže brzoj ispravci."],
        ["Stalno poboljšanje", "Pristupačnost se proverava kad god se dodaju stranice, kartice, tabele, grafikoni ili dokumenti."],
      ],
    },
  },
  burimet: {
    sq: {
      eyebrow: "Standardi i burimeve",
      title: "Si i zgjedh, kontrollon dhe citon burimet euguide-ks",
      sub: "Ky standard tregon hierarkinë e burimeve, mënyrën e citimit dhe rregullat për materiale ligjore, raporte, grafika, objektiva dhe përgjigje nga AI.",
      back: "Kthehu në fillim",
      meta: [["Burimi kryesor", "institucione zyrtare"], ["Rregulli", "link + datë + status"], ["Përditësuar", "maj 2026"]],
      notice: "Çdo pretendim i rëndësishëm në euguide-ks duhet të lidhet me burim të kontrollueshëm. Kur burimi është i paqartë, përmbajtja duhet të shënohet si kontekst ose të mos publikohet.",
      sections: [
        ["Hierarkia e burimeve", "Prioritet kanë Gazeta Zyrtare, Kuvendi, Qeveria, ministritë, Komisioni Evropian, EUR-Lex, ASK, Avokati i Popullit, AKK, KGJK, KPK dhe institucionet përkatëse."],
        ["Burime ndërkombëtare", "Përdoren raportet e Komisionit Evropian, SIGMA/OECD, Bankës Botërore, Transparency International, Freedom House, Reporterëve pa Kufij dhe organizatave me metodologji publike."],
        ["Ligjet", "Për ligjet përdoret titulli zyrtar, numri, viti, institucioni, linku në Gazetën Zyrtare ose Kuvend dhe, kur ka ndryshime, shënimi se a është akt i konsoliduar apo jo."],
        ["Kushtetuta", "Për nenet kushtetuese përdoret numri i nenit, kapitulli, titulli dhe linku në tekstin zyrtar ose në një burim institucional të verifikueshëm."],
        ["Objektivat e BE-së", "Për objektivat përdoren dokumente si MSA, PKZMSA, PKAA, raportet e Komisionit Evropian, udhërrëfyesit dhe plan-veprimet me datë/status të qartë."],
        ["Grafikët", "Çdo chart duhet të ketë burimin, vitin, metodologjinë ose shënimin shpjegues. Nëse të dhënat janë të përmbledhura, kjo duhet të thuhet qartë."],
        ["Materialet për qytetarë", "Kur ligji përkthehet në gjuhë të thjeshtë, ruhet dallimi mes shpjegimit qytetar dhe tekstit zyrtar. Shpjegimi nuk duhet ta ndryshojë kuptimin juridik."],
        ["AI dhe citimet", "Chatboti duhet të preferojë përgjigje me citim: ligj, nen, raport, institucion ose link. Pa burim, përgjigjja duhet të trajtohet si orientim i përgjithshëm."],
        ["Kontrolli editorial", "Para publikimit kontrollohen linku, institucioni, data, gjuha dhe statusi. Gabimet korrigjohen me prioritet, sidomos kur prekin të drejta, afate ose procedura."],
        ["Transparenca", "Nëse një faqe përdor të dhëna nga disa burime, ato duhet të dallohen me badge ose tekst: Gazeta Zyrtare, Komisioni Evropian, Kuvendi, Qeveria, ASK, OIK, AKK ose burim tjetër."],
      ],
    },
    en: {
      eyebrow: "Source standard",
      title: "How euguide-ks selects, checks and cites sources",
      sub: "This standard explains source hierarchy, citation rules and requirements for laws, reports, charts, objectives and AI answers.",
      back: "Back home",
      meta: [["Primary source", "official institutions"], ["Rule", "link + date + status"], ["Updated", "May 2026"]],
      notice: "Every important claim in euguide-ks should connect to a verifiable source. If the source is unclear, the content should be marked as context or not published.",
      sections: [
        ["Source hierarchy", "Priority goes to the Official Gazette, Assembly, Government, ministries, European Commission, EUR-Lex, statistics agency, Ombudsperson, Anti-Corruption Agency and justice institutions."],
        ["International sources", "The platform may use European Commission reports, SIGMA/OECD, World Bank, Transparency International, Freedom House, Reporters Without Borders and organisations with public methodology."],
        ["Laws", "Law entries should include official title, number, year, institution, link to the Official Gazette or Assembly and, when amended, whether the text is consolidated."],
        ["Constitution", "Constitution articles should include article number, chapter, title and a link to the official text or a verifiable institutional source."],
        ["EU objectives", "Objectives use documents such as the SAA, national implementation plans, NPAA, European Commission reports, roadmaps and action plans with clear date/status."],
        ["Charts", "Each chart should show source, year, methodology or an explanatory note. If values are summarised, that should be clearly stated."],
        ["Citizen materials", "When law is explained in plain language, the distinction between citizen explanation and official text is preserved. The explanation must not change legal meaning."],
        ["AI and citations", "The chatbot should prefer cited answers: law, article, report, institution or link. Without a source, the answer should be treated as general orientation."],
        ["Editorial checks", "Before publishing, editors check the link, institution, date, language and status. Errors are corrected with priority, especially when they affect rights, deadlines or procedures."],
        ["Transparency", "If a page uses several sources, they should be visible through badges or text: Official Gazette, European Commission, Assembly, Government, statistics, Ombudsperson or another source."],
      ],
    },
    sr: {
      eyebrow: "Standard izvora",
      title: "Kako euguide-ks bira, proverava i citira izvore",
      sub: "Ovaj standard objašnjava hijerarhiju izvora, pravila citiranja i zahteve za zakone, izveštaje, grafikone, ciljeve i AI odgovore.",
      back: "Nazad na početnu",
      meta: [["Primarni izvor", "zvanične institucije"], ["Pravilo", "link + datum + status"], ["Ažurirano", "maj 2026"]],
      notice: "Svaka važna tvrdnja u euguide-ks treba da bude povezana sa proverljivim izvorom. Ako izvor nije jasan, sadržaj treba označiti kao kontekst ili ga ne objaviti.",
      sections: [
        ["Hijerarhija izvora", "Prioritet imaju Službeni list, Skupština, Vlada, ministarstva, Evropska komisija, EUR-Lex, statistička agencija, Ombudsman, Agencija protiv korupcije i pravosudne institucije."],
        ["Međunarodni izvori", "Platforma može koristiti izveštaje Evropske komisije, SIGMA/OECD, Svetske banke, Transparency International, Freedom House, Reportera bez granica i organizacija sa javnom metodologijom."],
        ["Zakoni", "Unosi zakona treba da sadrže zvanični naziv, broj, godinu, instituciju, link ka Službenom listu ili Skupštini i, kada ima izmena, da li je tekst konsolidovan."],
        ["Ustav", "Članovi Ustava treba da sadrže broj člana, poglavlje, naslov i link ka zvaničnom tekstu ili proverljivom institucionalnom izvoru."],
        ["EU ciljevi", "Ciljevi koriste dokumente kao što su SSP, nacionalni planovi sprovođenja, NPAA, izveštaji Evropske komisije, mape puta i akcioni planovi sa jasnim datumom/statusom."],
        ["Grafikoni", "Svaki grafikon treba da prikaže izvor, godinu, metodologiju ili objašnjenje. Ako su vrednosti sažete, to mora biti jasno navedeno."],
        ["Materijali za građane", "Kada se zakon objašnjava jednostavnim jezikom, čuva se razlika između građanskog objašnjenja i zvaničnog teksta. Objašnjenje ne sme promeniti pravno značenje."],
        ["AI i citati", "Chatbot treba da preferira odgovore sa citatom: zakon, član, izveštaj, institucija ili link. Bez izvora odgovor je samo opšta orijentacija."],
        ["Urednička provera", "Pre objave proveravaju se link, institucija, datum, jezik i status. Greške se ispravljaju prioritetno, posebno kada utiču na prava, rokove ili procedure."],
        ["Transparentnost", "Ako stranica koristi više izvora, oni treba da budu vidljivi kroz oznake ili tekst: Službeni list, Evropska komisija, Skupština, Vlada, statistika, Ombudsman ili drugi izvor."],
      ],
    },
  },
};

function LegalStandardPage({ type, lang = 'sq' }) {
  const fallbackGroup = LEGAL_PAGE_COPY_FULL[type] || LEGAL_PAGE_COPY_FULL.privatesia;
  const group = useCmsObject(`legal_page_${type}`, fallbackGroup);
  const copy = group[lang] || group.sq;
  return (
    <>
      <MaterialsPageHero eyebrow={copy.eyebrow} title={copy.title} sub={copy.sub} stat="EU" statLabel="standard" lang={lang} backHref="#/" backLabel={copy.back} />
      <section style={{ padding: '0 0 120px', background: 'var(--paper)' }}>
        <div className="container">
          {copy.meta?.length ? (
            <div className="legal-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 1 }}>
              {copy.meta.map(([label, value]) => (
                <div key={label} style={{ background: 'var(--paper-2)', padding: '18px 22px' }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--rust)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ marginTop: 8, color: 'var(--ink)', fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>
          ) : null}
          {copy.notice ? (
            <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderBottom: 0, padding: '24px 28px', color: 'var(--ink-2)', lineHeight: 1.75 }}>
              {copy.notice}
            </div>
          ) : null}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }} className="legal-grid">
            {copy.sections.map(([title, body], i) => (
              <article key={title} style={{ background: 'var(--paper-2)', padding: 26, minHeight: 190 }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--rust)', letterSpacing: '0.14em' }}>0{i + 1}</div>
                <h2 className="serif" style={{ fontSize: 30, lineHeight: 1.05, marginTop: 14 }}>{title}</h2>
                <p style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>{body}</p>
              </article>
            ))}
          </div>
        </div>
        <style>{`@media (max-width: 760px) { .legal-grid, .legal-meta-grid { grid-template-columns: 1fr !important; } }`}</style>
      </section>
    </>
  );
}

// ============================================================
// Detail pages
// ============================================================
function TopicPage({ topicKey, lang, t, onChat }) {
  const topics = useCmsArray('topics', TOPICS);
  const topic = topics.find(t => t.key === topicKey) || TOPICS.find(t => t.key === topicKey);
  return (
    <>
      <TopicSection topic={topic} lang={lang} idx={0} />
      {/* Show context-relevant detail per topic */}
      {topicKey === 'be' && <BEObjectivesEntry lang={lang} />}
      {topicKey === 'be' && <RegionChart lang={lang} t={t} />}
      {topicKey === 'be' && <Clusters lang={lang} t={t} />}
      {topicKey === 'korrupsioni' && <CPIChart lang={lang} t={t} />}
      {topicKey === 'sundimi' && <RuleOfLawMaterials lang={lang} />}
      {topicKey === 'be' && <AcquisProgressSection lang={lang} accent={topic.accent} />}
      {topicKey === 'be' && <EUIntegrationImpactSections lang={lang} />}
      {topicKey === 'reforma' && <ReformaServicesSection lang={lang} />}
      {topicKey === 'reforma' && <ReformaInstitutionsSection lang={lang} />}
      {topicKey === 'reforma' && <ReformaSourcesSection lang={lang} />}
      {topicKey === 'korrupsioni' && <KorrupsionEvidenceSection lang={lang} />}
      {topicKey === 'korrupsioni' && <KorrupsionChannelsSection lang={lang} />}
      {topicKey === 'korrupsioni' && <KorrupsionRedFlagsSection lang={lang} />}
      {false && <TopicActionSection topicKey={topicKey} lang={lang} />}
      <NextTopicNav current={topicKey} lang={lang} t={t} />
    </>
  );
}

function NextTopicNav({ current, lang, t }) {
  const topics = useCmsArray('topics', TOPICS);
  const keys = topics.map(x => x.key);
  const idx = keys.indexOf(current);
  const next = topics[(idx + 1) % keys.length];
  const prev = topics[(idx - 1 + keys.length) % keys.length];
  return (
    <section style={{ padding: '60px 0', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <Reveal as="a" delay={0} href={'#/' + prev.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--ink)' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.15em' }}>← {lang === 'sq' ? 'Më parë' : lang === 'en' ? 'Previous' : 'Prethodno'}</span>
          <span className="serif" style={{ fontSize: 26 }}>{(prev['title_' + lang] || prev.title_sq).replace('\n', ' ')}</span>
        </Reveal>
        <Reveal as="a" delay={120} href={'#/' + next.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--ink)', textAlign: 'right' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.15em' }}>{lang === 'sq' ? 'Më pas' : lang === 'en' ? 'Next' : 'Sledeće'} →</span>
          <span className="serif" style={{ fontSize: 26 }}>{(next['title_' + lang] || next.title_sq).replace('\n', ' ')}</span>
        </Reveal>
      </div>
    </section>
  );
}

function ObjectivesPage({ lang, t }) {
  return (
    <>
      <Objectives lang={lang} t={t} />
      <ObjectiveContext lang={lang} />
    </>
  );
}

function FAQPage({ lang, t, onChat }) {
  return (
    <>
      <FAQ lang={lang} t={t} />
      <FAQGuide lang={lang} onChat={onChat} />
    </>
  );
}

function InfoPage({ lang, t }) {
  return (
    <>
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
  const cmsKosovaCopy = useCmsObject('kosova_page', {});
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
      facts: [['Popullsia', '~1.6M'], ['Nën moshën 30', '50%'], ['Pro BE-së në sondazhe', '92%'], ['Gjuhë të folura', '4']],
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
      facts: [['Population', '~1.6M'], ['Under Age 30', '50%'], ['Pro-EU in polls', '92%'], ['Languages Spoken', '4']],
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
      facts: [['Stanovništvo', '~1.6M'], ['Mlađi od 30', '50%'], ['Pro-EU u anketama', '92%'], ['Jezika u upotrebi', '4']],
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
  const copy = deepMerge(copyByLang[lang] || copyByLang.sq, cmsKosovaCopy[lang]);

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
  const fallback = [
    {
      h_sq: 'Si lexohen objektivat',
      h_en: 'How to read objectives',
      h_sr: 'Kako čitati ciljeve',
      p_sq: 'Objektivat janë ura mes reformave vendore dhe kërkesave të BE-së: secili duhet të ketë status, kusht, burim dhe indikator të matshëm.',
      p_en: 'Objectives connect domestic reforms with EU requirements: each needs a status, condition, source and measurable indicator.',
      p_sr: 'Ciljevi povezuju domaće reforme sa zahtevima EU: svaki treba status, uslov, izvor i merljiv indikator.',
    },
    {
      h_sq: 'Çfarë do të thotë progresi',
      h_en: 'What progress means',
      h_sr: 'Šta znači napredak',
      p_sq: 'Progresi nuk është vetëm miratim ligji. Ai kërkon zbatim, buxhet, institucion përgjegjës dhe rezultat që qytetari mund ta ndiejë.',
      p_en: 'Progress is not only adopting a law. It requires implementation, budget, responsible institutions and an outcome citizens can feel.',
      p_sr: 'Napredak nije samo usvajanje zakona. Potrebni su sprovođenje, budžet, odgovorna institucija i rezultat koji građanin oseća.',
    },
    {
      h_sq: 'Pse disa mbeten hapur',
      h_en: 'Why some stay open',
      h_sr: 'Zašto neki ostaju otvoreni',
      p_sq: 'Disa objektiva varen nga konsensusi politik, disa nga kapaciteti administrativ dhe disa nga vendimet e shteteve anëtare të BE-së.',
      p_en: 'Some objectives depend on political consensus, some on administrative capacity and some on decisions by EU member states.',
      p_sr: 'Neki ciljevi zavise od političkog konsenzusa, neki od administrativnog kapaciteta, a neki od odluka država članica EU.',
    },
  ];
  const raw = useCmsArray('objective_context', fallback);
  const usable = raw.filter(b => tr(b, 'h', lang) || tr(b, 'p', lang));
  const cards = usable.length ? usable : fallback;
  return (
    <section style={{ padding: '84px 0', borderTop: '1px solid var(--line)' }}>
      <div className="container objective-context" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
        {cards.map((b, i) => (
          <article key={tr(b, 'h', lang) || i} style={{ background: 'var(--paper)', padding: 28, minHeight: 210 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>0{i + 1}</span>
            <h3 className="serif" style={{ fontSize: 28, lineHeight: 1.05, marginTop: 16 }}>{tr(b, 'h', lang)}</h3>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 14 }}>{tr(b, 'p', lang)}</p>
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
  const guide = useCmsObject('faq_guide', {});
  const fallback = {
    eyebrow_sq: 'Si ta përdorësh FAQ',
    eyebrow_en: 'How to use the FAQ',
    eyebrow_sr: 'Kako koristiti FAQ',
    title_sq: 'Pyetjet janë hyrje, jo fundi i kërkimit.',
    title_en: 'Questions are an entry point, not the end of inquiry.',
    title_sr: 'Pitanja su ulaz, ne kraj istraživanja.',
    body_sq: 'Nëse përgjigjja është e shkurtër, përdore si orientim: hap temën përkatëse, shiko objektivat dhe pyet EU Agent për shembuj konkretë.',
    body_en: 'If an answer is short, use it as orientation: open the related topic, check the objectives and ask EU Agent for concrete examples.',
    body_sr: 'Ako je odgovor kratak, koristi ga kao orijentaciju: otvori povezanu temu, pogledaj ciljeve i pitaj EU Agent za konkretne primere.',
    cta_sq: 'Pyet për një rast',
    cta_en: 'Ask about a case',
    cta_sr: 'Pitaj za slučaj',
  };
  const copy = { ...fallback, ...guide };
  return (
    <section style={{ padding: '84px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container faq-guide" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 48, alignItems: 'center' }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>{tr(copy, 'eyebrow', lang)}</div>
          <h2 className="serif" style={{ fontSize: 'clamp(34px, 4.8vw, 56px)', lineHeight: 1.04, marginTop: 18 }}>
            {tr(copy, 'title', lang)}
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--ink-2)', maxWidth: 640, marginTop: 18 }}>
            {tr(copy, 'body', lang)}
          </p>
        </div>
        <button onClick={onChat} style={{ background: 'var(--ink)', color: 'var(--paper)', border: 'none', padding: '24px 28px', textAlign: 'left' }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em' }}>EU AGENT</span>
          <span className="serif" style={{ display: 'block', fontSize: 34, marginTop: 20 }}>{tr(copy, 'cta', lang)}</span>
        </button>
      </div>
      <style>{`
        @media (max-width: 900px) { .faq-guide { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function InfographicsGuide({ lang }) {
  const fallback = [
    { n: '01', label_sq: 'Pyetja', label_en: 'Question', label_sr: 'Pitanje' },
    { n: '02', label_sq: 'Burimi', label_en: 'Source', label_sr: 'Izvor' },
    { n: '03', label_sq: 'Treguesi', label_en: 'Indicator', label_sr: 'Pokazatelj' },
    { n: '04', label_sq: 'Veprimi', label_en: 'Action', label_sr: 'Akcija' },
  ];
  const methodCards = useCmsArray('infographics_method', fallback);
  return (
    <section style={{ padding: '84px 0', borderTop: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="container">
        <SectionHead
          eyebrow={lang === 'sq' ? 'Metodologjia' : lang === 'en' ? 'Method' : 'Metodologija'}
          title={lang === 'sq' ? 'Çdo infografikë duhet të tregojë një vendim, jo vetëm një ilustrim.' : lang === 'en' ? 'Every infographic should show a decision, not just an illustration.' : 'Svaka infografika treba da pokaže odluku, ne samo ilustraciju.'}
          num="08"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }} className="info-method-grid">
          {methodCards.map(card => (
            <div key={card.n} style={{ background: 'var(--paper)', padding: 26 }}>
              <span className="serif" style={{ fontSize: 46, color: 'var(--blue)' }}>{card.n}</span>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--ink-3)', marginTop: 12 }}>{tr(card, 'label', lang).toUpperCase()}</div>
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
  const [cms, setCms] = useState({ settings: {}, collections: {} });
  const [route, setRoute] = useRoute();
  const t = deepMerge(STRINGS[lang], cms.settings?.strings?.[lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    async function loadCms() {
      try {
        const [settingsRes, blocksRes, chartsRes, faqRes, objectivesRes, infoRes] = await Promise.all([
          supabase.from('site_settings').select('key,value'),
          supabase.from('page_blocks').select('page_slug,type,content,sort_order,published').eq('published', true).order('sort_order'),
          supabase.from('chart_series').select('key,data,published').eq('published', true),
          supabase.from('faq_items').select('*').eq('published', true).order('sort_order'),
          supabase.from('eu_objectives').select('*').eq('published', true).order('sort_order'),
          supabase.from('infographics').select('*').eq('published', true).order('sort_order'),
        ]);

        if (cancelled) return;
        setCms(buildCmsPayload({
          settingsRows: settingsRes.data ?? [],
          blockRows: blocksRes.data ?? [],
          chartRows: chartsRes.data ?? [],
          faqRows: faqRes.data ?? [],
          objectiveRows: objectivesRes.data ?? [],
          infographicRows: infoRes.data ?? [],
        }));
      } catch {
        if (!cancelled) setCms({ settings: {}, collections: {} });
      }
    }
    loadCms();
    return () => { cancelled = true; };
  }, []);

  let page;
  if (['reforma', 'sundimi', 'korrupsioni', 'be'].includes(route)) {
    page = <TopicPage topicKey={route} lang={lang} t={t} onChat={() => setChatOpen(true)} />;
  } else if (route === 'objektivat') {
    page = <ObjectivesPage lang={lang} t={t} />;
  } else if (route === 'kushtetuta') {
    page = <ConstitutionPage lang={lang} />;
  } else if (route === 'ligjet-themelore') {
    page = <FundamentalLawsPage lang={lang} />;
  } else if (route === 'katalogu-materialeve') {
    page = <MaterialsCatalogPage lang={lang} />;
  } else if (['privatesia', 'kushtet', 'aksesueshmeria', 'burimet'].includes(route)) {
    page = <LegalStandardPage type={route} lang={lang} />;
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
    <CmsContext.Provider value={cms}>
      <div className="euguide-zoom">
      <Navbar lang={lang} setLang={setLang} t={t} route={route} onChat={() => setChatOpen(true)} />
        <PageBreadcrumb route={route} t={t} lang={lang} />
        <main key={route}>{page}</main>
        <Footer lang={lang} t={t} />
      </div>
      <ChatWidget lang={lang} t={t} open={chatOpen} setOpen={setChatOpen} />
      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-3px); opacity: 1; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        html { scroll-behavior: auto; }
        main { animation: fadeIn 280ms ease both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </CmsContext.Provider>
  );
}

export default App;

