import { NextRequest } from 'next/server'
import { openai } from '@/lib/openai'
import { searchDocuments } from '@/lib/rag'
import { saveSession } from '@/lib/session'
import { SYSTEM_PROMPT } from '@/lib/prompt'

// Zgjat Vercel function timeout deri 60s (kërkon Pro plan, injorohet në Hobby)
export const maxDuration = 60

// Fjali përshëndetjeje — nuk bëjmë RAG për to
const GREETINGS = /^(hi|hello|hey|përshëndetje|pershendetje|mirëmëngjes|mirëdita|mirëmbrëma|zdravo|bok|ćao|salut|hej)\W*$/i

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.VAPI_SECRET
  if (expectedSecret) {
    const receivedSecret =
      req.headers.get('x-vapi-secret') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

    if (receivedSecret !== expectedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await req.json()

  const messages: Array<{ role: string; content: string }> = body.messages ?? []
  const call = body.call ?? {}
  const sessionId = call?.metadata?.sessionId ?? call?.id ?? `vapi-${Date.now()}`

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  const userText = (lastUserMsg?.content ?? '').trim()

  // RAG search me timeout 4s — nëse vonohet, vazhdo pa kontekst
  let context = ''
  const isGreeting = userText.length < 20 || GREETINGS.test(userText)
  if (!isGreeting) {
    try {
      const ragResult = await Promise.race([
        searchDocuments(userText),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('RAG timeout')), 4000)
        ),
      ])
      context = ragResult
    } catch {
      // RAG timeout ose gabim — vazhdo pa kontekst
      context = ''
    }
  }

  const encoder = new TextEncoder()
  let fullReply = ''

  const chatMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const VOICE_RULES = `

RREGULLA PËR VOICE AGENT:
- Përgjigju SHKURT — maksimum 3 fjali
- Mos përdor lista, numra, ose formatim
- Fol natyrshëm si në bisedë
- Nëse nuk ke informacion të mjaftueshëm, thuaj "Mund të më pyesësh më shumë detaje?"`

  // gpt-4o-mini — 3x më i shpejtë se gpt-4o, i mjaftueshëm për voice
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    max_tokens: 200,
    temperature: 0.5,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT(context) + VOICE_RULES },
      ...chatMessages,
    ],
  })

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) {
          fullReply += delta
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              id: chunk.id,
              object: 'chat.completion.chunk',
              choices: [{
                index: 0,
                delta: { content: delta },
                finish_reason: null,
              }],
            })}\n\n`)
          )
        }
      }

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({
          id: 'done',
          object: 'chat.completion.chunk',
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        })}\n\n`)
      )
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()

      // Ruaj sesionin në background — nuk bllokon stream-in
      saveSession(sessionId, [
        ...chatMessages,
        { role: 'assistant', content: fullReply },
      ], { source: 'voice' }).catch(() => {})
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
    },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
