'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface FaqItem {
  id: string
  page_id: string | null
  question_sq: string; question_en: string; question_sr: string
  answer_sq: string; answer_en: string; answer_sr: string
  sort_order: number
  published: boolean
}

const empty: FaqItem = { id: '', page_id: null, question_sq: '', question_en: '', question_sr: '', answer_sq: '', answer_en: '', answer_sr: '', sort_order: 0, published: true }

export default function AdminFaqPage() {
  const [items, setItems] = useState<FaqItem[]>([])
  const [editing, setEditing] = useState<FaqItem | null>(null)
  const [pages, setPages] = useState<{ id: string; slug: string }[]>([])

  useEffect(() => {
    load()
    supabase.from('pages').select('id, slug').then(({ data }) => setPages(data ?? []))
  }, [])

  async function load() {
    const { data } = await supabase.from('faq_items').select('*').order('sort_order')
    setItems(data ?? [])
  }

  async function save() {
    if (!editing) return
    if (!editing.id) {
      const { id: _, ...rest } = editing; void _
      await supabase.from('faq_items').insert(rest)
    } else {
      const { id: _, ...rest } = editing; void _
      await supabase.from('faq_items').update(rest).eq('id', editing.id)
    }
    setEditing(null); load()
  }

  async function remove(id: string) {
    if (!confirm('Fshi pyetjen?')) return
    await supabase.from('faq_items').delete().eq('id', id); load()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">FAQ</h1>
        <button onClick={() => setEditing({ ...empty, sort_order: items.length })} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">+ Shto pyetje</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {items.map(f => (
          <div key={f.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
            <div>
              <span className="text-xs text-gray-400 mr-2">#{f.sort_order}</span>
              <span className="font-medium">{f.question_sq}</span>
              {!f.published && <span className="ml-2 text-xs text-gray-400">(draft)</span>}
            </div>
            <div className="space-x-2">
              <button onClick={() => setEditing(f)} className="text-blue-600 text-sm">Edito</button>
              <button onClick={() => remove(f.id)} className="text-red-600 text-sm">Fshi</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="px-4 py-8 text-center text-gray-400">Nuk ka pyetje.</p>}
      </div>
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing.id ? 'Edito' : 'Shto'} Pyetje</h2>
            <div className="space-y-3">
              {(['question_sq', 'question_en', 'question_sr'] as const).map(f => (
                <div key={f}><label className="text-xs text-gray-500">{f}</label>
                  <input value={editing[f]} onChange={e => setEditing({ ...editing, [f]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              ))}
              {(['answer_sq', 'answer_en', 'answer_sr'] as const).map(f => (
                <div key={f}><label className="text-xs text-gray-500">{f}</label>
                  <textarea rows={3} value={editing[f]} onChange={e => setEditing({ ...editing, [f]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500">Faqja</label>
                  <select value={editing.page_id ?? ''} onChange={e => setEditing({ ...editing, page_id: e.target.value || null })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Generale</option>
                    {pages.map(p => <option key={p.id} value={p.id}>{p.slug}</option>)}
                  </select></div>
                <div><label className="text-xs text-gray-500">Sort order</label>
                  <input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: +e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editing.published} onChange={e => setEditing({ ...editing, published: e.target.checked })} />
                <span className="text-sm">Publikuar</span>
              </label>
            </div>
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
