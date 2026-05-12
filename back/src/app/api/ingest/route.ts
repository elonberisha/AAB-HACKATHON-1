import { NextRequest } from 'next/server'
import { openai } from '@/lib/openai'
import { supabase } from '@/lib/supabase'

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50

function chunkText(text: string): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(' '))
    if (i + CHUNK_SIZE >= words.length) break
  }

  return chunks
}

export async function POST(req: NextRequest) {
  const { fileName, content } = await req.json()

  if (!fileName || !content) {
    return Response.json({ error: 'fileName dhe content kërkohen' }, { status: 400 })
  }

  // Dekodo base64
  const text = Buffer.from(content, 'base64').toString('utf-8')
  const chunks = chunkText(text).filter((c) => c.trim().length > 20)

  // Fshi dokumentet e vjetra me të njëjtin emër
  await supabase.from('documents').delete().eq('source', fileName)

  let stored = 0

  for (const chunk of chunks) {
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk,
    })

    const { error } = await supabase.from('documents').insert({
      content: chunk,
      embedding: embeddingRes.data[0].embedding,
      source: fileName,
      metadata: { chunk_index: stored, total_chunks: chunks.length },
    })

    if (!error) stored++
  }

  return Response.json({ status: 'ok', chunks: stored, fileName })
}
