'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/pages', label: 'Faqet', icon: '📄' },
  { href: '/admin/articles', label: 'Artikujt', icon: '📰' },
  { href: '/admin/faq', label: 'FAQ', icon: '❓' },
  { href: '/admin/infographics', label: 'Infografika', icon: '📈' },
  { href: '/admin/documents', label: 'Dokumentet AI', icon: '📁' },
  { href: '/admin/objectives', label: 'Objektivat BE', icon: '🎯' },
  { href: '/admin/media', label: 'Media', icon: '🖼️' },
  { href: '/admin/users', label: 'Përdoruesit', icon: '👥' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r shadow-sm flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-blue-600">euguide-ks</h1>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                pathname === item.href
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            Dil nga paneli
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
