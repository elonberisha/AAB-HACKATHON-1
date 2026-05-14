import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('documents')
    .select('source')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const total = data?.length ?? 0

  const bySource: Record<string, number> = {}
  for (const row of data ?? []) {
    bySource[row.source] = (bySource[row.source] ?? 0) + 1
  }

  const sources = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .map(([source, chunks]) => ({ source, chunks }))

  return Response.json(
    { total_chunks: total, sources },
    {
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
      },
    }
  )
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
