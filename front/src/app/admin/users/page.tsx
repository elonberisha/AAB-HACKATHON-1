'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data ?? [])
  }

  async function toggleRole(user: Profile) {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`${newRole === 'admin' ? 'Promovo' : 'Ç-promovo'} ${user.email} si ${newRole}?`)) return
    await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Përdoruesit</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="text-left px-4 py-3">Emri</th>
            <th className="text-left px-4 py-3">Email</th>
            <th className="text-left px-4 py-3">Roli</th>
            <th className="text-left px-4 py-3">Regjistruar</th>
            <th className="px-4 py-3">Veprime</th>
          </tr></thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{u.full_name || '—'}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString('sq')}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleRole(u)} className={`text-sm ${u.role === 'admin' ? 'text-orange-600' : 'text-blue-600'} hover:underline`}>
                    {u.role === 'admin' ? 'Ç-promovo' : 'Promovo admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
