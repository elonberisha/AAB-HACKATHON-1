import { NextRequest } from 'next/server'
import { openai } from '@/lib/openai'
import { searchDocuments } from '@/lib/rag'
import { saveSession } from '@/lib/session'
import { SYSTEM_PROMPT, WEB_SEARCH_PROMPT } from '@/lib/prompt'

// Vapi Custom LLM endpoint
// Vapi dërgon mesazhet në formatin OpenAI-compatible
// Ne bëjmë RAG, thirrim GPT, dhe kthejmë stream
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Vapi dërgon call info + messages
  const messages: Array<{ role: string; content: string }> = body.messages ?? body.message ?? []
  const call = body.call ?? {}
  const sessionId = call?.metadata?.sessionId ?? call?.id ?? `vapi-${Date.now()}`

  // Merr mesazhin e fundit të user-it për RAG search
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  const userText = lastUserMsg?.content ?? ''

  // RAG search
  const context = await searchDocuments(userText)
  const hasLocalContext = context.length > 0

  let fullReply = ''
  const encoder = new TextEncoder()

  // System prompt me kontekstin e RAG
  const systemMessage = {
    role: 'system' as const,
    content: hasLocalContext
      ? SYSTEM_PROMPT(context)
      : SYSTEM_PROMPT('') + '\n\n' + WEB_SEARCH_PROMPT,
  }

  // Filtro mesazhet — mbaj vetëm user/assistant
  const chatMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  // GPT-4o streaming
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    messages: [
      systemMessage,
      ...chatMessages,
    ],
  })

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) {
          fullReply += delta
          // Vapi Custom LLM pret formatin OpenAI SSE
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

      // Signal përfundim
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({
          id: 'done',
          object: 'chat.completion.chunk',
          choices: [{
            index: 0,
            delta: {},
            finish_reason: 'stop',
          }],
        })}\n\n`)
      )
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()

      // Ruaj sesionin në background
      try {
        await saveSession(sessionId, [
          ...chatMessages,
          { role: 'assistant', content: fullReply },
        ], { source: 'voice' })
      } catch { /* skip save errors */ }
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
