import { NextRequest } from 'next/server'
import { openai } from '@/lib/openai'
import { searchDocuments } from '@/lib/rag'
import { getSession, saveSession } from '@/lib/session'
import { SYSTEM_PROMPT } from '@/lib/prompt'

export async function POST(req: NextRequest) {
  const { message, sessionId } = await req.json()

  if (!message || !sessionId) {
    return Response.json({ error: 'message dhe sessionId kërkohen' }, { status: 400 })
  }

  const [context, history] = await Promise.all([
    searchDocuments(message),
    getSession(sessionId),
  ])

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT(context) },
      ...history,
      { role: 'user', content: message },
    ],
  })

  let fullReply = ''

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) {
          fullReply += delta
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
        }
      }

      // Ruaj sesionin pasi stream mbaron
      await saveSession(sessionId, [
        ...history,
        { role: 'user', content: message },
        { role: 'assistant', content: fullReply },
      ])

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`))
      controller.close()
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

// CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
