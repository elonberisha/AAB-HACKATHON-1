import { supabase } from './supabase'

type Message = { role: 'user' | 'assistant'; content: string; source?: 'rag' | 'web' | 'voice' }

export async function getSession(sessionId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('sessions')
    .select('messages')
    .eq('id', sessionId)
    .single()

  return data?.messages ?? []
}

export async function saveSession(
  sessionId: string,
  messages: Message[],
  options: { userId?: string | null; language?: string; source?: 'chat' | 'voice' | 'mixed' } = {}
) {
  const title = generateTitle(messages)
  await supabase.from('sessions').upsert({
    id: sessionId,
    user_id: options.userId ?? null,
    title,
    language: options.language ?? 'sq',
    source: options.source ?? 'chat',
    messages,
    updated_at: new Date().toISOString(),
  })
}

function generateTitle(messages: Message[]): string {
  const firstUser = messages.find(m => m.role === 'user')
  if (!firstUser) return 'Bisedë e re'
  const words = firstUser.content.trim().split(/\s+/).slice(0, 7).join(' ')
  return words.length > 60 ? words.slice(0, 60) + '…' : words
}
