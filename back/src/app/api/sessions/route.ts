import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/sessions?userId=xxx — lista e bisedave të user-it
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  if (!userId) {
    return Response.json({ error: 'userId kërkohet' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, source, language, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ sessions: data })
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
