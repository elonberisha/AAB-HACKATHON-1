'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function sendCode(e: React.FormEvent) {
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

    setStep('code')
    setLoading(false)
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Try both types - email OTP and magiclink
    const { error: err1 } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    if (!err1) {
      router.push('/admin')
      return
    }

    const { error: err2 } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'magiclink',
    })

    if (!err2) {
      router.push('/admin')
      return
    }

    setError('Kodi i gabuar ose i skaduar. Provo përsëri.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">euguide-ks</h1>
          <p className="text-gray-500 text-sm mt-1">Admin Panel</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={sendCode} className="space-y-4">
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
              {loading ? 'Duke dërguar...' : 'Dërgo kodin'}
            </button>
            <p className="text-xs text-gray-400 text-center">Do të marrësh një kod verifikimi në email</p>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">Kodi u dërgua te <strong>{email}</strong></p>
            <div>
              <label className="block text-sm font-medium mb-1">Kodi i verifikimit</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                maxLength={8}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-widest"
                placeholder="00000000"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Duke verifikuar...' : 'Hyr'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError('') }} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
              Ndrysho email
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
