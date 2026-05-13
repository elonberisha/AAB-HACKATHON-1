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

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [activePage, setActivePage] = useState<string | null>(null)

  useEffect(() => { loadPages() }, [])

  async function loadPages() {
    const { data } = await supabase.from('pages').select('*').order('slug')
    setPages(data ?? [])
  }

  async function loadSections(pageId: string) {
    setActivePage(pageId)
    const { data } = await supabase.from('sections').select('*').eq('page_id', pageId).order('sort_order')
    setSections(data ?? [])
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Menaxhim Faqesh</h1>

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
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{p.slug}</td>
                <td className="px-4 py-3">{p.title_sq}</td>
                <td className="px-4 py-3">{p.published ? '✅' : '❌'}</td>
                <td className="px-4 py-3 text-center space-x-2">
                  <button onClick={() => setEditingPage(p)} className="text-blue-600 hover:underline">Edito</button>
                  <button onClick={() => loadSections(p.id)} className="text-green-600 hover:underline">Seksionet</button>
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

      {/* Sections for selected page */}
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
