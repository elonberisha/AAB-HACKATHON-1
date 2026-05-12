import { NextRequest } from 'next/server'
import { openai } from '@/lib/openai'
import { searchDocuments } from '@/lib/rag'
import { getSession, saveSession } from '@/lib/session'
import { SYSTEM_PROMPT, WEB_SEARCH_PROMPT } from '@/lib/prompt'

export async function POST(req: NextRequest) {
  const { message, sessionId, userId, language } = await req.json()

  if (!message || !sessionId) {
    return Response.json({ error: 'message dhe sessionId kërkohen' }, { status: 400 })
  }

  const saveOpts = { userId: userId ?? null, language: language ?? 'sq', source: 'chat' as const }

  const [context, history] = await Promise.all([
    searchDocuments(message),
    getSession(sessionId),
  ])

  const hasLocalContext = context.length > 0

  let fullReply = ''
  const encoder = new TextEncoder()

  if (hasLocalContext) {
    // RAG ka gjetur dokumente relevante — përdor Chat Completions
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(context) },
        ...history,
        { role: 'user', content: message },
      ],
    })

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          if (delta) {
            fullReply += delta
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
        }

        await saveSession(sessionId, [
          ...history,
          { role: 'user', content: message },
          { role: 'assistant', content: fullReply, source: 'rag' },
        ], saveOpts)

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: sseHeaders(),
    })
  }

  // RAG nuk gjeti asgjë — përdor Responses API me web search
  const stream = await openai.responses.create({
    model: 'gpt-4o',
    stream: true,
    tools: [{ type: 'web_search_preview' }],
    instructions: SYSTEM_PROMPT('') + '\n\n' + WEB_SEARCH_PROMPT,
    input: [
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ],
  })

  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
          const delta = event.delta ?? ''
          if (delta) {
            fullReply += delta
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
        }
      }

      await saveSession(sessionId, [
        ...history,
        { role: 'user', content: message },
        { role: 'assistant', content: fullReply, source: 'web' },
      ], saveOpts)

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: sseHeaders(),
  })
}

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  }
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
