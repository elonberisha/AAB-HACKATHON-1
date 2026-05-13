'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Infographic {
  id: string; title_sq: string; title_en: string
  description_sq: string; description_en: string
  image_url: string; sort_order: number; published: boolean; category: string
}

const empty: Infographic = { id: '', title_sq: '', title_en: '', description_sq: '', description_en: '', image_url: '', sort_order: 0, published: true, category: '' }

export default function AdminInfographicsPage() {
  const [items, setItems] = useState<Infographic[]>([])
  const [editing, setEditing] = useState<Infographic | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('infographics').select('*').order('sort_order')
    setItems(data ?? [])
  }

  async function save() {
    if (!editing) return
    if (!editing.id) {
      const { id: _, ...rest } = editing; void _
      await supabase.from('infographics').insert(rest)
    } else {
      const { id: _, ...rest } = editing; void _
      await supabase.from('infographics').update(rest).eq('id', editing.id)
    }
    setEditing(null); load()
  }

  async function remove(id: string) {
    if (!confirm('Fshi infografikën?')) return
    await supabase.from('infographics').delete().eq('id', id); load()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Infografika</h1>
        <button onClick={() => setEditing({ ...empty, sort_order: items.length })} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">+ Shto</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map(i => (
          <div key={i.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            {i.image_url && <img src={i.image_url} alt={i.title_sq} className="w-full h-40 object-cover" />}
            <div className="p-3">
              <h3 className="font-medium text-sm">{i.title_sq}</h3>
              <p className="text-xs text-gray-400 mt-1">{i.published ? 'Publikuar' : 'Draft'}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setEditing(i)} className="text-blue-600 text-xs">Edito</button>
                <button onClick={() => remove(i.id)} className="text-red-600 text-xs">Fshi</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="text-center text-gray-400 mt-8">Nuk ka infografika.</p>}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing.id ? 'Edito' : 'Shto'} Infografikë</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-gray-500">Titulli (SQ)</label>
                <input value={editing.title_sq} onChange={e => setEditing({ ...editing, title_sq: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Titulli (EN)</label>
                <input value={editing.title_en} onChange={e => setEditing({ ...editing, title_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Përshkrimi (SQ)</label>
                <textarea rows={2} value={editing.description_sq} onChange={e => setEditing({ ...editing, description_sq: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Përshkrimi (EN)</label>
                <textarea rows={2} value={editing.description_en} onChange={e => setEditing({ ...editing, description_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Image URL</label>
                <input value={editing.image_url} onChange={e => setEditing({ ...editing, image_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Kategoria</label>
                <input value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="reforma, be, etj." /></div>
              <div><label className="text-xs text-gray-500">Sort order</label>
                <input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: +e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.published} onChange={e => setEditing({ ...editing, published: e.target.checked })} /><span className="text-sm">Publikuar</span></label>
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
