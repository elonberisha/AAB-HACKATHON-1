'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Stats {
  pages: number
  articles: number
  faq: number
  documents: number
  infographics: number
  objectives: number
  users: number
}

const cards: { key: keyof Stats; label: string; href: string; color: string; iconPath: string }[] = [
  { key: 'pages', label: 'Faqe', href: '/admin/pages', color: 'from-blue-500 to-blue-600', iconPath: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
  { key: 'articles', label: 'Artikuj', href: '/admin/articles', color: 'from-emerald-500 to-emerald-600', iconPath: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z' },
  { key: 'faq', label: 'FAQ', href: '/admin/faq', color: 'from-violet-500 to-violet-600', iconPath: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z' },
  { key: 'documents', label: 'Dokumente AI', href: '/admin/documents', color: 'from-amber-500 to-amber-600', iconPath: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' },
  { key: 'infographics', label: 'Infografika', href: '/admin/infographics', color: 'from-rose-500 to-rose-600', iconPath: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
  { key: 'objectives', label: 'Objektivat BE', href: '/admin/objectives', color: 'from-sky-500 to-sky-600', iconPath: 'M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5' },
  { key: 'users', label: 'Perdorues', href: '/admin/users', color: 'from-slate-500 to-slate-600', iconPath: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ pages: 0, articles: 0, faq: 0, documents: 0, infographics: 0, objectives: 0, users: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [p, a, f, d, i, o, u] = await Promise.all([
        supabase.from('pages').select('id', { count: 'exact', head: true }),
        supabase.from('articles').select('id', { count: 'exact', head: true }),
        supabase.from('faq_items').select('id', { count: 'exact', head: true }),
        supabase.from('uploaded_documents').select('id', { count: 'exact', head: true }),
        supabase.from('infographics').select('id', { count: 'exact', head: true }),
        supabase.from('eu_objectives').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        pages: p.count ?? 0,
        articles: a.count ?? 0,
        faq: f.count ?? 0,
        documents: d.count ?? 0,
        infographics: i.count ?? 0,
        objectives: o.count ?? 0,
        users: u.count ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Mire se erdhe ne Admin Panel</h1>
        <p className="text-slate-500 mt-1">Menaxho permbajtjen e euguide-ks.info</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map(c => (
          <Link
            key={c.key}
            href={c.href}
            className="group relative bg-white rounded-xl border border-slate-200/60 p-5 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300/60 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shadow-sm`}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={c.iconPath} />
                </svg>
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
              </svg>
            </div>
            <div className={`text-3xl font-bold text-slate-800 ${loading ? 'animate-pulse' : ''}`}>
              {loading ? '-' : stats[c.key]}
            </div>
            <div className="text-sm text-slate-500 mt-0.5">{c.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick info */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/60 p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Informacion i shpejte</h3>
          <div className="space-y-2.5 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Platforma eshte aktive dhe funksionale
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              AI Chatbot me RAG eshte i aktivizuar
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-400" />
              3 gjuhe te mbeshtetura: Shqip, English, Srpski
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
          <h3 className="text-sm font-semibold mb-3 text-blue-100">euguide-ks.info</h3>
          <p className="text-sm text-blue-100/80 mb-4">
            Platforma informuese per integrimin e Kosoves ne Bashkimin Europian
          </p>
          <a
            href="https://euguide-ks.info"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition"
          >
            Vizito faqen
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
