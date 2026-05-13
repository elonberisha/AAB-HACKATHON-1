import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, redirectTo } = await req.json()
  const normalized = String(email || '').trim().toLowerCase()

  if (!normalized) {
    return Response.json({ error: 'Email kerkohet' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: allowed, error: checkError } = await supabase.rpc('is_admin_email', {
    candidate_email: normalized,
  })

  if (checkError || !allowed) {
    return Response.json({ error: 'Ky email nuk eshte i autorizuar per admin.' }, { status: 403 })
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo,
    },
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
