import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return Response.json({ error: 'Session ID kërkohet' }, { status: 400 })
  }

  const messages = await getSession(id)
  return Response.json({ messages, sessionId: id })
}
