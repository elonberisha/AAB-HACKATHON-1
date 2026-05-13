'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Objective {
  id: string; slug: string
  name_sq: string; name_en: string; name_sr: string
  description_sq: string; description_en: string; description_sr: string
  conditions_sq: string; conditions_en: string; conditions_sr: string
  cluster: string; completed: boolean; completed_at: string | null
  progress_percent: number; source_url: string; sort_order: number; published: boolean
}

const clusters = ['rule_of_law', 'economy', 'democracy', 'admin_reform', 'visa', 'saa', 'other']
const empty: Objective = { id: '', slug: '', name_sq: '', name_en: '', name_sr: '', description_sq: '', description_en: '', description_sr: '', conditions_sq: '', conditions_en: '', conditions_sr: '', cluster: 'other', completed: false, completed_at: null, progress_percent: 0, source_url: '', sort_order: 0, published: true }

export default function AdminObjectivesPage() {
  const [items, setItems] = useState<Objective[]>([])
  const [editing, setEditing] = useState<Objective | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('eu_objectives').select('*').order('sort_order')
    setItems(data ?? [])
  }

  async function save() {
    if (!editing) return
    if (!editing.slug) editing.slug = editing.name_sq.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
    if (!editing.id) {
      const { id: _, ...rest } = editing; void _
      await supabase.from('eu_objectives').insert(rest)
    } else {
      const { id: _, ...rest } = editing; void _
      await supabase.from('eu_objectives').update(rest).eq('id', editing.id)
    }
    setEditing(null); load()
  }

  async function remove(id: string) {
    if (!confirm('Fshi objektivin?')) return
    await supabase.from('eu_objectives').delete().eq('id', id); load()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Objektivat BE</h1>
        <button onClick={() => setEditing({ ...empty, sort_order: items.length })} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">+ Shto objektiv</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {items.map(o => (
          <div key={o.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className={`text-lg ${o.completed ? 'text-green-500' : 'text-gray-300'}`}>{o.completed ? '✓' : '○'}</span>
              <div>
                <span className="font-medium">{o.name_sq}</span>
                <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 rounded-full">{o.cluster}</span>
                {o.progress_percent > 0 && <span className="ml-2 text-xs text-blue-600">{o.progress_percent}%</span>}
              </div>
            </div>
            <div className="space-x-2">
              <button onClick={() => setEditing(o)} className="text-blue-600 text-sm">Edito</button>
              <button onClick={() => remove(o.id)} className="text-red-600 text-sm">Fshi</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="px-4 py-8 text-center text-gray-400">Nuk ka objektiva.</p>}
      </div>
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing.id ? 'Edito' : 'Shto'} Objektiv</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs text-gray-500">Slug</label>
                <input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Auto-gjenerohet" /></div>
              {(['name_sq', 'name_en', 'name_sr'] as const).map(f => (
                <div key={f}><label className="text-xs text-gray-500">{f}</label>
                  <input value={editing[f]} onChange={e => setEditing({ ...editing, [f]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              ))}
              <div><label className="text-xs text-gray-500">Cluster</label>
                <select value={editing.cluster} onChange={e => setEditing({ ...editing, cluster: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {clusters.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              {(['description_sq', 'description_en'] as const).map(f => (
                <div key={f} className="col-span-2"><label className="text-xs text-gray-500">{f}</label>
                  <textarea rows={3} value={editing[f]} onChange={e => setEditing({ ...editing, [f]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              ))}
              {(['conditions_sq', 'conditions_en'] as const).map(f => (
                <div key={f} className="col-span-2"><label className="text-xs text-gray-500">{f}</label>
                  <textarea rows={3} value={editing[f]} onChange={e => setEditing({ ...editing, [f]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              ))}
              <div><label className="text-xs text-gray-500">Progress %</label>
                <input type="number" min={0} max={100} value={editing.progress_percent} onChange={e => setEditing({ ...editing, progress_percent: +e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Source URL</label>
                <input value={editing.source_url} onChange={e => setEditing({ ...editing, source_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Sort order</label>
                <input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: +e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={editing.completed} onChange={e => setEditing({ ...editing, completed: e.target.checked, completed_at: e.target.checked ? new Date().toISOString() : null })} /><span className="text-sm">Plotësuar</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={editing.published} onChange={e => setEditing({ ...editing, published: e.target.checked })} /><span className="text-sm">Publikuar</span></label>
              </div>
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
