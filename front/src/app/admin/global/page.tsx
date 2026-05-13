'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Setting {
  key: string
  value: unknown
  description: string | null
}

const defaultSettings: Setting[] = [
  {
    key: 'strings',
    description: 'Override per tekstet globale: nav, footer, chat, CTA, SEO. Struktura: { "sq": { "nav": { ... } }, "en": ... }',
    value: {},
  },
]

export default function AdminGlobalPage() {
  const [items, setItems] = useState<Setting[]>([])
  const [editing, setEditing] = useState<Setting | null>(null)
  const [json, setJson] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('site_settings').select('*').order('key')
    setItems(data?.length ? data : defaultSettings)
  }

  function startEdit(item: Setting) {
    setError('')
    setEditing(item)
    setJson(JSON.stringify(item.value ?? {}, null, 2))
  }

  async function save() {
    if (!editing) return
    setError('')
    let value: unknown
    try {
      value = JSON.parse(json)
    } catch {
      setError('JSON nuk eshte valid.')
      return
    }
    await supabase.from('site_settings').upsert({
      key: editing.key,
      value,
      description: editing.description,
    })
    setEditing(null)
    load()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Global</h1>
        <p className="text-sm text-slate-500 mt-1">Tekste dhe konfigurime qe perdoren ne te gjitha faqet: nav, footer, chat, CTA dhe labels.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {items.map(item => (
          <div key={item.key} className="px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-800">{item.key}</h2>
              <p className="text-sm text-slate-500">{item.description}</p>
            </div>
            <button onClick={() => startEdit(item)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm">Edito JSON</button>
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
              <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Ruaj</button>
              <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Anulo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
