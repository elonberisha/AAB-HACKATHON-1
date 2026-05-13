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
    cta: { title_a: 'Pyet', title_b: ', dhe asistenti përgjigjet në shqip, anglisht ose serbisht — me referencë te dokumenti origjinal.', sub: 'I trajnuar mbi raportet e Komisionit Evropian, ligjet vendore dhe analizat e shoqërisë civile. I përdorshëm me tekst ose me zë.', card_top: 'ASISTENT · SQ/EN/SR', card_action: 'Shkruaj pyetjen', card_hint: '↩ enter për të dërguar' },
  },
  en: {
    nav: { reforma: 'Reform', sundimi: 'Rule of law', korrupsioni: 'Corruption', be: 'EU Integration', objektivat: 'Objectives', faq: 'FAQ', kosova: 'About Kosovo', kerko: 'Search' },
    hero: { tag: 'Citizen guide · updated May 2026', title_a: "Kosovo's path ", title_b: 'to the European Union', title_c: ', explained simply.', sub: 'Public administration reform, rule of law and the fight against corruption are the three pillars that govern this process. Here they are separated, measured and tied back to everyday life.', cta1: 'Start here', cta2: 'Ask the assistant', meta_a: 'Membership application', meta_b: '14 December 2022', meta_c: 'Candidate status', meta_d: 'Pending', days_since: 'Days since the application' },
    topics: { eyebrow: 'Four areas, one process', title: 'Which one matters to you today?' },
    progress: { eyebrow: 'Where we stand on the European map', title: 'Kosovo among regional countries', sub: 'EU accession status — the six Western Balkan states.' },
    objectives: { eyebrow: 'Objectives', title: 'What Kosovo needs to deliver', sub: 'Concrete conditions taken from EC reports and the SAA. Filter by status or cluster.' },
    faq: { eyebrow: 'FAQ', title: 'Short answers, no institutional jargon.' },
    cta: { title_a: 'Ask', title_b: ', and the assistant answers in Albanian, English or Serbian — with reference to the source document.', sub: 'Trained on EC reports, domestic laws and civil-society analysis. Works with text or voice.', card_top: 'ASSISTANT · SQ/EN/SR', card_action: 'Type your question', card_hint: '↩ enter to send' },
  },
  sr: {
    nav: { reforma: 'Reforma', sundimi: 'Vladavina prava', korrupsioni: 'Korupcija', be: 'EU integracije', objektivat: 'Ciljevi', faq: 'FAQ', kosova: 'O Kosovu', kerko: 'Pretraga' },
    hero: { tag: 'Vodič za građane · ažurirano maj 2026', title_a: 'Put Kosova ', title_b: 'ka Evropskoj uniji', title_c: ', jednostavno objašnjen.', sub: 'Reforma javne uprave, vladavina prava i borba protiv korupcije tri su stuba ovog procesa. Ovde su razdvojeni, mereni i povezani sa svakodnevnim životom.', cta1: 'Počni odavde', cta2: 'Pitaj asistenta', meta_a: 'Aplikacija za članstvo', meta_b: '14. decembar 2022', meta_c: 'Status kandidata', meta_d: 'U toku', days_since: 'Dana od aplikacije' },
    topics: { eyebrow: 'Četiri oblasti, jedan proces', title: 'Koja vas se najviše tiče danas?' },
    progress: { eyebrow: 'Gde smo na evropskoj mapi', title: 'Kosovo među zemljama regiona', sub: 'Status EU integracija — šest zemalja Zapadnog Balkana.' },
    objectives: { eyebrow: 'Ciljevi', title: 'Šta Kosovo treba da ispuni', sub: 'Konkretni uslovi iz izveštaja EK i SSP. Filtrirajte po statusu ili klasteru.' },
    faq: { eyebrow: 'Česta pitanja', title: 'Kratki odgovori, bez institucionalnog žargona.' },
    cta: { title_a: 'Pitaj', title_b: ', a asistent odgovara na albanskom, engleskom ili srpskom — sa referencom na izvor.', sub: 'Obučen na izveštajima EK, domaćim zakonima i analizama civilnog društva. Radi sa tekstom ili glasom.', card_top: 'ASISTENT · SQ/EN/SR', card_action: 'Upiši pitanje', card_hint: '↩ enter za slanje' },
  },
}

const defaultHomeTopics: AnyRecord[] = [
  { key: 'reforma', num: '01', title_sq: 'Reforma\nadministrative', title_en: 'Public\nadministration', title_sr: 'Reforma\nuprave', blurb_sq: 'Si shërbimet publike po bëhen më të shpejta, dixhitale dhe të parashikueshme — nga letërnjoftimi te tatimet.', blurb_en: 'How public services are getting faster, digital and predictable — from ID cards to taxes.', blurb_sr: 'Kako javne usluge postaju brže, digitalne i predvidljive — od lične karte do poreza.', accent: 'var(--blue)', accent_soft: 'var(--blue-soft)', metric: '63%', metric_label_sq: 'shërbime tashmë online', metric_label_en: 'services already online', metric_label_sr: 'usluga već online' },
  { key: 'sundimi', num: '02', title_sq: 'Sundimi\ni ligjit', title_en: 'Rule of\nlaw', title_sr: 'Vladavina\nprava', blurb_sq: 'Të drejtat e qytetarit para gjykatës, pavarësia e drejtësisë dhe çfarë do të thotë barazi para ligjit në praktikë.', blurb_en: 'Citizen rights in court, judicial independence, and what equality before the law looks like in practice.', blurb_sr: 'Prava građana pred sudom, nezavisnost pravosuđa i šta jednakost pred zakonom znači u praksi.', accent: 'var(--rust)', accent_soft: 'var(--rust-soft)', metric: '218', metric_label_sq: 'ditë mesatare për një vendim', metric_label_en: 'avg. days per ruling', metric_label_sr: 'prosečno dana po odluci' },
  { key: 'korrupsioni', num: '03', title_sq: 'Lufta kundër\nkorrupsionit', title_en: 'Fight against\ncorruption', title_sr: 'Borba protiv\nkorupcije', blurb_sq: 'Si dallohet korrupsioni, kush e heton dhe ku raportohet anonimisht — me hapa konkretë.', blurb_en: 'How to recognise corruption, who investigates it and where to report anonymously — concrete steps.', blurb_sr: 'Kako prepoznati korupciju, ko je istražuje i gde je anonimno prijaviti — konkretni koraci.', accent: 'var(--gold)', accent_soft: 'var(--gold-soft)', metric: '41/100', metric_label_sq: 'CPI 2025', metric_label_en: 'CPI 2025', metric_label_sr: 'CPI 2025' },
  { key: 'be', num: '04', title_sq: 'Integrimi\nnë BE', title_en: 'EU\nintegration', title_sr: 'EU\nintegracije', blurb_sq: 'SAA, statusi i kandidatit, klasterët, çfarë do të thotë anëtarësia për paga, pasaporta dhe tregun e brendshëm.', blurb_en: 'SAA, candidate status, clusters, and what membership means for wages, passports and the internal market.', blurb_sr: 'SSP, status kandidata, klasteri i šta članstvo znači za plate, pasoše i unutrašnje tržište.', accent: 'var(--ink)', accent_soft: '#E1DBC9', metric: '14·12·22', metric_label_sq: 'aplikoi për anëtarësim', metric_label_en: 'applied for membership', metric_label_sr: 'aplicirano za članstvo' },
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

  async function upsertCollectionBlock(key: string, title: string, items: AnyRecord[], sortOrder: number) {
    const existing = blocks.find(b => b.type === 'collection' && (b.content as AnyRecord)?.key === key)
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
                <td className="px-4 py-3">{p.published ? '✅' : '❌'}</td>
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

      {activePage && pages.find(p => p.id === activePage)?.slug === 'home' && (
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
