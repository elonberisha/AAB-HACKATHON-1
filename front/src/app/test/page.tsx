'use client'

import { useState, useRef, useEffect } from 'react'
import { chatStream } from '@/lib/ai'
import { supabase } from '@/lib/supabase'
import Vapi from '@vapi-ai/web'

interface UserInfo {
  id: string
  email: string
  name: string
  avatar: string
}

export default function TestPage() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [callActive, setCallActive] = useState(false)
  const [vapiStatus, setVapiStatus] = useState('idle')
  const [user, setUser] = useState<UserInfo | null>(null)
  const vapiRef = useRef<Vapi | null>(null)
  const sessionId = useRef(`test-${Date.now()}`)

  // Check auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? '',
          name: data.user.user_metadata?.full_name ?? '',
          avatar: data.user.user_metadata?.avatar_url ?? '',
        })
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          name: session.user.user_metadata?.full_name ?? '',
          avatar: session.user.user_metadata?.avatar_url ?? '',
        })
      } else {
        setUser(null)
      }
    })
    return () => { listener.subscription.unsubscribe() }
  }, [])

  // Vapi setup
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY
    if (!token) return
    const vapi = new Vapi(token)
    vapiRef.current = vapi
    vapi.on('call-start', () => { setCallActive(true); setVapiStatus('connected') })
    vapi.on('call-end', () => { setCallActive(false); setVapiStatus('idle') })
    vapi.on('speech-start', () => setVapiStatus('listening...'))
    vapi.on('speech-end', () => setVapiStatus('thinking...'))
    vapi.on('error', (e) => { setVapiStatus(`error: ${e.message ?? e}`); setCallActive(false) })
    setVapiStatus('ready')
  }, [])

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  function toggleVapi() {
    if (!vapiRef.current) return
    if (callActive) {
      vapiRef.current.stop()
    } else {
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID
      if (assistantId) {
        vapiRef.current.start(assistantId, {
          metadata: { sessionId: sessionId.current },
        })
        setVapiStatus('connecting...')
      } else {
        setVapiStatus('error: VAPI_ASSISTANT_ID not set')
      }
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    setLoading(true)
    setResponse('')

    try {
      const res = await chatStream(input, sessionId.current)
      if (!res.body) { setResponse('No stream body'); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const json = trimmed.slice(6)
          try {
            const parsed = JSON.parse(json)
            if (parsed.done) break
            if (parsed.delta) {
              text += parsed.delta
              setResponse(text)
            }
          } catch { /* skip */ }
        }
      }
    } catch (err: unknown) {
      setResponse(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif', padding: 20 }}>
      <h1>🧪 EUGuide AI Test</h1>
      <p style={{ color: '#666', fontSize: 14 }}>
        Backend: {process.env.NEXT_PUBLIC_AI_URL ?? '⚠️ NEXT_PUBLIC_AI_URL not set'}
      </p>

      {/* Google Auth Test */}
      <h2 style={{ marginTop: 24, fontSize: 18 }}>🔐 Google Auth</h2>
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f0fdf4', borderRadius: 8 }}>
          {user.avatar && <img src={user.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />}
          <div>
            <div style={{ fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{user.email}</div>
            <div style={{ fontSize: 11, color: '#999' }}>ID: {user.id.slice(0, 8)}...</div>
          </div>
          <button onClick={handleLogout} style={{ marginLeft: 'auto', padding: '6px 16px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      ) : (
        <button
          onClick={handleGoogleLogin}
          style={{ padding: '10px 24px', fontSize: 16, borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Hyr me Google
        </button>
      )}

      {/* Chat Test */}
      <h2 style={{ marginTop: 24, fontSize: 18 }}>💬 Chat</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Shkruaj pyetjen këtu..."
          style={{ flex: 1, padding: '8px 12px', fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{ padding: '8px 20px', fontSize: 16, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: loading ? 'wait' : 'pointer' }}
        >
          {loading ? '...' : 'Dërgo'}
        </button>
      </div>

      {response && (
        <div style={{ marginTop: 12, padding: 16, background: '#f1f5f9', borderRadius: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {response}
        </div>
      )}

      {/* Voice Test */}
      <h2 style={{ marginTop: 32, fontSize: 18 }}>🎙️ Voice (Vapi)</h2>
      <p style={{ color: '#666', fontSize: 14, margin: '4px 0 12px' }}>
        Status: {vapiStatus}
      </p>
      <button
        onClick={toggleVapi}
        disabled={vapiStatus === 'idle' && !vapiRef.current}
        style={{
          padding: '12px 32px',
          fontSize: 16,
          borderRadius: 50,
          border: 'none',
          cursor: 'pointer',
          background: callActive ? '#ef4444' : '#10b981',
          color: '#fff',
        }}
      >
        {callActive ? '⏹ Ndalo thirrjen' : '🎤 Fillo thirrjen'}
      </button>

      {!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY && (
        <p style={{ color: '#f59e0b', fontSize: 13, marginTop: 8 }}>
          ⚠️ NEXT_PUBLIC_VAPI_PUBLIC_KEY not set
        </p>
      )}
    </main>
  )
}
