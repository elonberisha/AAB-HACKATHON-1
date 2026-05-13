'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    })

    if (error) {
      setError(error.message === 'Signups not allowed for otp'
        ? 'Ky email nuk është i regjistruar si admin.'
        : error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">euguide-ks</h1>
          <p className="text-gray-500 text-sm mt-1">Admin Panel</p>
        </div>

        {!sent ? (
          <form onSubmit={sendLink} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="admin@email.com"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Duke dërguar...' : 'Dërgo linkun e hyrjes'}
            </button>
            <p className="text-xs text-gray-400 text-center">Do të marrësh një link hyrjeje në email</p>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-4xl">📧</div>
            <p className="text-sm text-gray-600">
              Linku i hyrjes u dërgua te <strong>{email}</strong>
            </p>
            <p className="text-xs text-gray-400">
              Hap emailin dhe kliko linkun për të hyrë në admin panel.
            </p>
            <button
              onClick={() => { setSent(false); setError('') }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Dërgo përsëri
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
