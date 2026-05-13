import { NextRequest } from 'next/server'
import { openai } from '@/lib/openai'
import { searchDocuments } from '@/lib/rag'
import { saveSession } from '@/lib/session'
import { SYSTEM_PROMPT } from '@/lib/prompt'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const messages: Array<{ role: string; content: string }> = body.messages ?? []
  const call = body.call ?? {}
  const sessionId = call?.metadata?.sessionId ?? call?.id ?? `vapi-${Date.now()}`

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  const userText = lastUserMsg?.content ?? ''

  // RAG search — skip nëse mesazhi është shumë i shkurtër (përshëndetje)
  let context = ''
  if (userText.length > 10) {
    context = await searchDocuments(userText)
  }

  let fullReply = ''
  const encoder = new TextEncoder()

  const chatMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  // gpt-4o-mini për voice — 3x më shpejt se gpt-4o
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    max_tokens: 300, // përgjigje të shkurtra për voice
    messages: [
      { role: 'system', content: SYSTEM_PROMPT(context) + '\n\nRREGULL SHTESË PËR VOICE:\n- Përgjigju GJITHMONË në SHQIP, pavarësisht gjuhës së pyetjes\n- Përgjigju SHKURT (2-4 fjali max)\n- Mos përdor lista, bullet points, ose formatim\n- Fol natyrshëm si në bisedë të përditshme\n- Mos thuaj "sipas dokumenteve" nëse nuk ke kontekst dokumentesh' },
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

      // Ruaj në background — nuk bllokon stream-in
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
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
