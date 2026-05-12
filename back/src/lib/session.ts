import { supabase } from './supabase'

type Message = { role: 'user' | 'assistant'; content: string }

export async function getSession(sessionId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('sessions')
    .select('messages')
    .eq('id', sessionId)
    .single()

  return data?.messages ?? []
}

export async function saveSession(sessionId: string, messages: Message[]) {
  await supabase.from('sessions').upsert({
    id: sessionId,
    messages,
    updated_at: new Date().toISOString(),
  })
}
