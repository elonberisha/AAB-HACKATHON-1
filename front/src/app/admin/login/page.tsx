'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Handle magic link callback - detect auth token in URL and redirect
  useEffect(() => {
    // Check if already logged in
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.push('/admin')
    })

    // Listen for auth state changes (magic link returns with token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/admin')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/admin/auth/callback`,
      },
    })

    if (error) {
      setError(error.message === 'Signups not allowed for otp'
        ? 'Ky email nuk eshte i regjistruar si admin.'
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

    setError('Kodi i gabuar ose i skaduar. Provo perseri.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex bg-slate-900">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="relative z-10 text-center px-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm mb-8">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">euguide-ks</h1>
          <p className="text-blue-200 text-lg mb-2">Admin Panel</p>
          <p className="text-blue-300/60 text-sm max-w-sm mx-auto leading-relaxed">
            Menaxho permbajtjen e platformes per integrimin e Kosoves ne Bashkimin Europian
          </p>
          <div className="flex items-center justify-center gap-6 mt-12">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">4</div>
              <div className="text-[11px] text-blue-300/60 uppercase tracking-wider">Fusha</div>
            </div>
            <div className="w-px h-8 bg-blue-400/20" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">3</div>
              <div className="text-[11px] text-blue-300/60 uppercase tracking-wider">Gjuhe</div>
            </div>
            <div className="w-px h-8 bg-blue-400/20" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">AI</div>
              <div className="text-[11px] text-blue-300/60 uppercase tracking-wider">Chatbot</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-500 mb-4">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">euguide-ks</h1>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">
                {step === 'email' ? 'Kyqu ne admin panel' : 'Vendos kodin'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {step === 'email'
                  ? 'Vendos emailin per te marre kodin e hyrjes'
                  : <>Kodi u dergua te <span className="text-blue-400 font-medium">{email}</span></>
                }
              </p>
            </div>

            {step === 'email' ? (
              <form onSubmit={sendCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email adresa</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="admin@email.com"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Duke derguar...
                    </>
                  ) : (
                    <>
                      Dergo kodin
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Kodi i verifikimit</label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                    maxLength={8}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white text-center text-2xl tracking-[0.3em] font-mono placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="00000000"
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Duke verifikuar...
                    </>
                  ) : 'Hyr ne panel'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode(''); setError('') }}
                  className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition"
                >
                  Ndrysho email
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-[11px] text-slate-600 mt-6">
            Vetem administratoret e autorizuar mund te kyqen
          </p>
        </div>
      </div>
    </main>
  )
}
