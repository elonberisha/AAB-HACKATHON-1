import { openai } from './openai'
import { supabase } from './supabase'

export async function searchDocuments(query: string, matchCount = 5): Promise<string> {
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  })

  const embedding = embeddingRes.data[0].embedding

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_count: matchCount,
  })

  if (error || !data?.length) return ''

  return data
    .map((d: { content: string; source: string }) => `[${d.source}]\n${d.content}`)
    .join('\n\n---\n\n')
}
