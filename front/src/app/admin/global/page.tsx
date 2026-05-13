'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type CmsValue = string | number | boolean | null | undefined | CmsValue[] | { [key: string]: CmsValue }
type CmsRecord = { [key: string]: CmsValue }
type Lang = 'sq' | 'en' | 'sr'

interface Setting {
  key: string
  value: unknown
  description: string | null
}

const langs: Lang[] = ['sq', 'en', 'sr']

const defaultStrings: CmsRecord = {
  sq: {
    nav: { reforma: 'Reforma', sundimi: 'Sundimi i ligjit', korrupsioni: 'Korrupsioni', be: 'Integrimi në BE', objektivat: 'Objektivat', faq: 'Pyetje', kosova: 'Rreth Kosovës', kerko: 'Kërko' },
    common: { all: 'Të gjitha', completed: 'Të plotësuara', pending: 'Të paplotësuara', cluster: 'Klasteri', source: 'Burimi', see_all: 'Shih të gjitha', previous: 'Më parë', next: 'Më pas', progress_global: 'Progres i përgjithshëm', completed_caps: 'Të plotësuara', from_main_objectives: 'nga objektivat kryesore', next_step: 'Hapi i ardhshëm', candidate_status: 'Statusi kandidat', expected: 'pritet', description: 'Përshkrimi', conditions: 'Kushtet', completed_at: 'plotësuar', key_metric: 'Metrikë kyçe', pillar: 'shtylla', live: 'LIVE' },
    chat: { title: 'EU Agent', sub: 'Pyet diçka për reformat ose BE-në', greeting: 'Përshëndetje. Mund të të ndihmoj me reformën në administratë, sundimin e ligjit, luftën kundër korrupsionit dhe procesin e BE-së. Çfarë do të dije?', placeholder: 'Shkruaj pyetjen tënde…', send: 'Dërgo', sample: ['Çfarë është SAA?', 'Si raportohet korrupsioni?', 'Cilat janë kushtet për anëtarësim?'], auth: 'Vazhdo me Google për të ruajtur historinë' },
    footer: { tagline: 'Platformë informative dhe edukative për vizualizimin, analizën dhe kuptimin e procesit të integrimit europian të Kosovës.', about: 'euguide-ks është një iniciativë edukative e zhvilluar për të rritur qasjen në të dhëna dhe për të nxitur transparencën në procesin e integrimit europian përmes teknologjisë dhe të dhënave të hapura.', funded: 'Projekti u financua nga:', cols: { temat: 'Temat', burimet: 'Burimet', rreth: 'Rreth projektit' }, copy: '© 2026 · MIT-licensed open data · Hackathon Edition', built: 'euguide-ks.info · built for Kosovo · Hackathon May 2026' },
  },
  en: {
    nav: { reforma: 'Reform', sundimi: 'Rule of law', korrupsioni: 'Corruption', be: 'EU Integration', objektivat: 'Objectives', faq: 'FAQ', kosova: 'About Kosovo', kerko: 'Search' },
    common: { all: 'All', completed: 'Completed', pending: 'Pending', cluster: 'Cluster', source: 'Source', see_all: 'See all', previous: 'Previous', next: 'Next', progress_global: 'Overall progress', completed_caps: 'Completed', from_main_objectives: 'of the main objectives', next_step: 'Next step', candidate_status: 'Candidate status', expected: 'expected', description: 'Description', conditions: 'Conditions', completed_at: 'completed', key_metric: 'Key metric', pillar: 'pillar', live: 'LIVE' },
    chat: { title: 'EU Agent', sub: 'Ask anything about reforms or the EU', greeting: 'Hello. I can help with public administration reform, rule of law, anti-corruption and the EU process. What would you like to know?', placeholder: 'Type your question…', send: 'Send', sample: ['What is the SAA?', 'How do I report corruption?', 'What are the membership conditions?'], auth: 'Continue with Google to save history' },
    footer: { tagline: 'An informative and educational platform for visualising, analysing and understanding Kosovo’s European integration process.', about: 'euguide-ks is an educational initiative developed to increase access to data and encourage transparency in the European integration process through technology and open data.', funded: 'Project funded by:', cols: { temat: 'Topics', burimet: 'Sources', rreth: 'About project' }, copy: '© 2026 · MIT-licensed open data · Hackathon Edition', built: 'euguide-ks.info · built for Kosovo · Hackathon May 2026' },
  },
  sr: {
    nav: { reforma: 'Reforma', sundimi: 'Vladavina prava', korrupsioni: 'Korupcija', be: 'EU integracije', objektivat: 'Ciljevi', faq: 'FAQ', kosova: 'O Kosovu', kerko: 'Pretraga' },
    common: { all: 'Sve', completed: 'Završeno', pending: 'U toku', cluster: 'Klaster', source: 'Izvor', see_all: 'Pogledaj sve', previous: 'Prethodno', next: 'Sledeće', progress_global: 'Ukupan napredak', completed_caps: 'Završeno', from_main_objectives: 'od glavnih ciljeva', next_step: 'Sledeći korak', candidate_status: 'Status kandidata', expected: 'očekuje se', description: 'Opis', conditions: 'Uslovi', completed_at: 'završeno', key_metric: 'Ključni pokazatelj', pillar: 'stub', live: 'UŽIVO' },
    chat: { title: 'EU Agent', sub: 'Pitaj bilo šta o reformama ili EU', greeting: 'Zdravo. Mogu vam pomoći sa reformom uprave, vladavinom prava, antikorupcijom i procesom EU. Šta želite da znate?', placeholder: 'Upišite pitanje…', send: 'Pošalji', sample: ['Šta je SSP?', 'Kako se prijavljuje korupcija?', 'Koji su uslovi za članstvo?'], auth: 'Nastavi sa Google nalogom da sačuvaš istoriju' },
    footer: { tagline: 'Informativna i edukativna platforma za vizualizaciju, analizu i razumevanje procesa evropskih integracija Kosova.', about: 'euguide-ks je edukativna inicijativa razvijena radi povećanja pristupa podacima i podsticanja transparentnosti u procesu evropskih integracija kroz tehnologiju i otvorene podatke.', funded: 'Projekat je finansiran od:', cols: { temat: 'Teme', burimet: 'Izvori', rreth: 'O projektu' }, copy: '© 2026 · MIT licencirani otvoreni podaci · Hackathon Edition', built: 'euguide-ks.info · napravljeno za Kosovo · Hackathon Maj 2026' },
  },
}

function asRecord(value: CmsValue): CmsRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as CmsRecord : {}
}

function deepMerge(base: CmsRecord, override: CmsRecord): CmsRecord {
  const next = { ...base }
  Object.entries(override || {}).forEach(([key, value]) => {
    const baseValue = base[key]
    next[key] = value && typeof value === 'object' && !Array.isArray(value) && baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue)
      ? deepMerge(baseValue as CmsRecord, value as CmsRecord)
      : value
  })
  return next
}

function inputValue(value: CmsValue): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function getNested(source: CmsRecord, lang: Lang, section: string, field: string): string {
  return inputValue(asRecord(asRecord(source[lang])[section])[field])
}

function getFooterCol(source: CmsRecord, lang: Lang, field: string): string {
  return inputValue(asRecord(asRecord(asRecord(source[lang]).footer).cols)[field])
}

export default function AdminGlobalPage() {
  const [strings, setStrings] = useState<CmsRecord>(defaultStrings)
  const [settings, setSettings] = useState<Setting[]>([])
  const [editing, setEditing] = useState<Setting | null>(null)
  const [json, setJson] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('site_settings').select('*').order('key')
    const rows = data ?? []
    const stringRow = rows.find(row => row.key === 'strings')
    const value = stringRow?.value && typeof stringRow.value === 'object' ? stringRow.value as CmsRecord : {}
    setStrings(deepMerge(defaultStrings, value))
    setSettings(rows.length ? rows : [{ key: 'strings', value: {}, description: 'Global UI copy' }])
  }

  function setNested(lang: Lang, section: string, field: string, value: CmsValue) {
    setStrings(prev => ({
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

  function setFooterCol(lang: Lang, field: string, value: string) {
    setStrings(prev => ({
      ...prev,
      [lang]: {
        ...asRecord(prev[lang]),
        footer: {
          ...asRecord(asRecord(prev[lang]).footer),
          cols: {
            ...asRecord(asRecord(asRecord(prev[lang]).footer).cols),
            [field]: value,
          },
        },
      },
    }))
  }

  function setSamples(lang: Lang, value: string) {
    setNested(lang, 'chat', 'sample', value.split('\n').map(line => line.trim()).filter(Boolean))
  }

  async function saveStructured() {
    setSaving(true)
    setMessage('')
    const { error: saveError } = await supabase.from('site_settings').upsert({
      key: 'strings',
      value: strings,
      description: 'Global translated UI copy for nav, footer, chat, labels and page copy overrides.',
    })
    setSaving(false)
    setMessage(saveError ? saveError.message : 'Global u ruajt me sukses.')
    if (!saveError) load()
  }

  function startEdit(item: Setting) {
    setError('')
    setEditing(item)
    setJson(JSON.stringify(item.value ?? {}, null, 2))
  }

  async function saveJson() {
    if (!editing) return
    setError('')
    let value: unknown
    try {
      value = JSON.parse(json)
    } catch {
      setError('JSON nuk eshte valid.')
      return
    }
    await supabase.from('site_settings').upsert({ key: editing.key, value, description: editing.description })
    setEditing(null)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Global</h1>
          <p className="text-sm text-slate-500 mt-1">Tekste qe perdoren ne te gjitha faqet: nav, footer, chat dhe labels.</p>
        </div>
        <button onClick={saveStructured} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
          {saving ? 'Duke ruajtur...' : 'Ruaj Global'}
        </button>
      </div>
      {message && <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('sukses') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      <div className="space-y-6">
        {langs.map(lang => (
          <section key={lang} className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-bold uppercase mb-5">{lang}</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Panel title="Navbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {['reforma', 'sundimi', 'korrupsioni', 'be', 'objektivat', 'faq', 'kosova', 'kerko'].map(field => (
                    <Field key={field} label={field} value={getNested(strings, lang, 'nav', field)} onChange={v => setNested(lang, 'nav', field, v)} />
                  ))}
                </div>
              </Panel>

              <Panel title="Chatbot">
                <div className="space-y-3">
                  <Field label="Title" value={getNested(strings, lang, 'chat', 'title')} onChange={v => setNested(lang, 'chat', 'title', v)} />
                  <Field label="Subtitle" value={getNested(strings, lang, 'chat', 'sub')} onChange={v => setNested(lang, 'chat', 'sub', v)} />
                  <TextArea label="Greeting" value={getNested(strings, lang, 'chat', 'greeting')} onChange={v => setNested(lang, 'chat', 'greeting', v)} />
                  <Field label="Placeholder" value={getNested(strings, lang, 'chat', 'placeholder')} onChange={v => setNested(lang, 'chat', 'placeholder', v)} />
                  <Field label="Send button" value={getNested(strings, lang, 'chat', 'send')} onChange={v => setNested(lang, 'chat', 'send', v)} />
                  <TextArea
                    label="Sample questions (nje rresht = nje pyetje)"
                    value={Array.isArray(asRecord(asRecord(strings[lang]).chat).sample) ? (asRecord(asRecord(strings[lang]).chat).sample as CmsValue[]).map(inputValue).join('\n') : ''}
                    onChange={v => setSamples(lang, v)}
                  />
                  <Field label="Auth hint" value={getNested(strings, lang, 'chat', 'auth')} onChange={v => setNested(lang, 'chat', 'auth', v)} />
                </div>
              </Panel>

              <Panel title="Footer">
                <div className="space-y-3">
                  <TextArea label="Tagline" value={getNested(strings, lang, 'footer', 'tagline')} onChange={v => setNested(lang, 'footer', 'tagline', v)} />
                  <TextArea label="About" value={getNested(strings, lang, 'footer', 'about')} onChange={v => setNested(lang, 'footer', 'about', v)} />
                  <Field label="Funded" value={getNested(strings, lang, 'footer', 'funded')} onChange={v => setNested(lang, 'footer', 'funded', v)} />
                  <Field label="Column: temat" value={getFooterCol(strings, lang, 'temat')} onChange={v => setFooterCol(lang, 'temat', v)} />
                  <Field label="Column: burimet" value={getFooterCol(strings, lang, 'burimet')} onChange={v => setFooterCol(lang, 'burimet', v)} />
                  <Field label="Column: rreth" value={getFooterCol(strings, lang, 'rreth')} onChange={v => setFooterCol(lang, 'rreth', v)} />
                  <Field label="Copyright" value={getNested(strings, lang, 'footer', 'copy')} onChange={v => setNested(lang, 'footer', 'copy', v)} />
                  <Field label="Built line" value={getNested(strings, lang, 'footer', 'built')} onChange={v => setNested(lang, 'footer', 'built', v)} />
                </div>
              </Panel>

              <Panel title="Labels të përbashkëta">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {['all', 'completed', 'pending', 'cluster', 'source', 'see_all', 'previous', 'next', 'progress_global', 'completed_caps', 'from_main_objectives', 'next_step', 'candidate_status', 'expected', 'description', 'conditions', 'completed_at', 'key_metric', 'pillar', 'live'].map(field => (
                    <Field key={field} label={field} value={getNested(strings, lang, 'common', field)} onChange={v => setNested(lang, 'common', field, v)} />
                  ))}
                </div>
              </Panel>
            </div>
          </section>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y mt-6">
        <div className="px-4 py-3">
          <h2 className="font-semibold text-slate-800">Advanced JSON</h2>
          <p className="text-sm text-slate-500">Per konfigurime te tjera qe nuk kane ende forme te dedikuar.</p>
        </div>
        {settings.map(item => (
          <div key={item.key} className="px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-800">{item.key}</h3>
              <p className="text-sm text-slate-500">{item.description}</p>
            </div>
            <button onClick={() => startEdit(item)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm">Edito JSON</button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-3">Edito {editing.key}</h2>
            <textarea value={json} onChange={e => setJson(e.target.value)} rows={22} className="w-full font-mono text-xs px-3 py-2 border rounded-lg" />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={saveJson} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Ruaj</button>
              <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Anulo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border rounded-xl p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
    </label>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
    </label>
  )
}
