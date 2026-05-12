import { NextRequest } from 'next/server'
import { searchDocuments } from '@/lib/rag'
import { getSession, saveSession } from '@/lib/session'
import { SYSTEM_PROMPT } from '@/lib/prompt'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, call, message } = body

  // Vapi kërkon system prompt kur starton asistentin
  if (type === 'assistant-request') {
    const sessionId = call?.metadata?.sessionId ?? call?.id
    const history = await getSession(sessionId)
    const context = await searchDocuments('reforma administrative Kosovë BE')

    const historyText = history.length
      ? '\n\nHistoria e bisedës:\n' +
        history.map((m) => `${m.role === 'user' ? 'Qytetari' : 'Asistenti'}: ${m.content}`).join('\n')
      : ''

    return Response.json({
      assistant: {
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          systemPrompt: SYSTEM_PROMPT(context) + historyText,
        },
        voice: {
          provider: 'openai',
          voiceId: 'nova',
        },
        firstMessage: history.length
          ? 'Mirë se u kthyet! Si mund t\'ju ndihmoj?'
          : 'Mirë se vini! Si mund t\'ju ndihmoj me pyetjet tuaja për reformën administrative dhe integrimin evropian?',
      },
    })
  }

  // Ruaj transcript kur përfundon call-i
  if (type === 'end-of-call-report') {
    const sessionId = call?.metadata?.sessionId ?? call?.id
    const messages = call?.artifact?.messages ?? []

    const formatted = messages
      .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: string; message: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.message,
      }))

    if (formatted.length) {
      const existing = await getSession(sessionId)
      await saveSession(sessionId, [...existing, ...formatted])
    }
  }

  return Response.json({ ok: true })
}
