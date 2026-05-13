'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Article {
  id: string
  slug: string
  title_sq: string
  title_en: string
  body_sq: string
  body_en: string
  excerpt_sq: string
  excerpt_en: string
  cover_image_url: string
  page_id: string | null
  published: boolean
  published_at: string | null
}

const empty: Article = { id: '', slug: '', title_sq: '', title_en: '', body_sq: '', body_en: '', excerpt_sq: '', excerpt_en: '', cover_image_url: '', page_id: null, published: false, published_at: null }

export default function AdminArticlesPage() {
  const [items, setItems] = useState<Article[]>([])
  const [editing, setEditing] = useState<Article | null>(null)
  const [pages, setPages] = useState<{ id: string; slug: string }[]>([])

  useEffect(() => {
    load()
    supabase.from('pages').select('id, slug').then(({ data }) => setPages(data ?? []))
  }, [])

  async function load() {
    const { data } = await supabase.from('articles').select('*').order('published_at', { ascending: false })
    setItems(data ?? [])
  }

  async function save() {
    if (!editing) return
    const row = { ...editing }
    if (!row.slug) row.slug = row.title_sq.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
    if (!row.id) {
      const { id: _, ...rest } = row; void _
      await supabase.from('articles').insert(rest)
    } else {
      const { id: _, ...rest } = row; void _
      await supabase.from('articles').update(rest).eq('id', row.id)
    }
    setEditing(null); load()
  }

  async function remove(id: string) {
    if (!confirm('Fshi artikullin?')) return
    await supabase.from('articles').delete().eq('id', id); load()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Artikujt</h1>
        <button onClick={() => setEditing({ ...empty })} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">+ Shto artikull</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="text-left px-4 py-3">Titulli</th>
            <th className="text-left px-4 py-3">Slug</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="px-4 py-3">Veprime</th>
          </tr></thead>
          <tbody className="divide-y">
            {items.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{a.title_sq}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.slug}</td>
                <td className="px-4 py-3">{a.published ? <span className="text-green-600">Publikuar</span> : <span className="text-gray-400">Draft</span>}</td>
                <td className="px-4 py-3 text-center space-x-2">
                  <button onClick={() => setEditing(a)} className="text-blue-600 hover:underline">Edito</button>
                  <button onClick={() => remove(a.id)} className="text-red-600 hover:underline">Fshi</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nuk ka artikuj.</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing.id ? 'Edito' : 'Shto'} Artikull</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs text-gray-500">Slug</label>
                <input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Auto-gjenerohet" /></div>
              <div><label className="text-xs text-gray-500">Titulli (SQ)</label>
                <input value={editing.title_sq} onChange={e => setEditing({ ...editing, title_sq: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Titulli (EN)</label>
                <input value={editing.title_en} onChange={e => setEditing({ ...editing, title_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="col-span-2"><label className="text-xs text-gray-500">Body (SQ)</label>
                <textarea rows={6} value={editing.body_sq} onChange={e => setEditing({ ...editing, body_sq: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="col-span-2"><label className="text-xs text-gray-500">Body (EN)</label>
                <textarea rows={6} value={editing.body_en} onChange={e => setEditing({ ...editing, body_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Cover Image URL</label>
                <input value={editing.cover_image_url} onChange={e => setEditing({ ...editing, cover_image_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500">Faqja</label>
                <select value={editing.page_id ?? ''} onChange={e => setEditing({ ...editing, page_id: e.target.value || null })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">Asnjë</option>
                  {pages.map(p => <option key={p.id} value={p.id}>{p.slug}</option>)}
                </select></div>
              <label className="col-span-2 flex items-center gap-2">
                <input type="checkbox" checked={editing.published} onChange={e => setEditing({ ...editing, published: e.target.checked, published_at: e.target.checked ? new Date().toISOString() : null })} />
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
