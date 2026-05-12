'use client'

import { useState, useRef } from 'react'
import { chatStream } from '@/lib/ai'

export default function TestPage() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const sessionId = useRef(`test-${Date.now()}`)

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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        // Parse SSE lines
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content ?? parsed.content ?? data
              text += delta
              setResponse(text)
            } catch {
              // plain text delta
              text += data
              setResponse(text)
            }
          }
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

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
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
        <div style={{ marginTop: 20, padding: 16, background: '#f1f5f9', borderRadius: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {response}
        </div>
      )}
    </main>
  )
}
