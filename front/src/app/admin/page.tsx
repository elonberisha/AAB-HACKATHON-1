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

const cards = [
  { key: 'pages', label: 'Faqe', href: '/admin/pages', icon: '📄', color: 'bg-blue-50 text-blue-700' },
  { key: 'articles', label: 'Artikuj', href: '/admin/articles', icon: '📰', color: 'bg-green-50 text-green-700' },
  { key: 'faq', label: 'FAQ', href: '/admin/faq', icon: '❓', color: 'bg-purple-50 text-purple-700' },
  { key: 'documents', label: 'Dokumente AI', href: '/admin/documents', icon: '📁', color: 'bg-orange-50 text-orange-700' },
  { key: 'infographics', label: 'Infografika', href: '/admin/infographics', icon: '📈', color: 'bg-pink-50 text-pink-700' },
  { key: 'objectives', label: 'Objektivat BE', href: '/admin/objectives', icon: '🎯', color: 'bg-yellow-50 text-yellow-700' },
  { key: 'users', label: 'Përdorues', href: '/admin/users', icon: '👥', color: 'bg-gray-100 text-gray-700' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ pages: 0, articles: 0, faq: 0, documents: 0, infographics: 0, objectives: 0, users: 0 })

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
    }
    load()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Link key={c.key} href={c.href} className={`${c.color} rounded-xl p-5 hover:shadow-md transition`}>
            <div className="text-3xl mb-2">{c.icon}</div>
            <div className="text-2xl font-bold">{stats[c.key as keyof Stats]}</div>
            <div className="text-sm opacity-75">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
