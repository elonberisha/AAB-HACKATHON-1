'use client'

import { useState, useRef, useEffect } from 'react'
import { chatStream } from '@/lib/ai'
import Vapi from '@vapi-ai/web'

export default function TestPage() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [callActive, setCallActive] = useState(false)
  const [vapiStatus, setVapiStatus] = useState('idle')
  const vapiRef = useRef<Vapi | null>(null)
  const sessionId = useRef(`test-${Date.now()}`)

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
