import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: doc, error } = await supabase
    .from('uploaded_documents')
    .select('storage_path, file_name')
    .eq('id', id)
    .single()

  if (error || !doc?.storage_path) {
    return Response.json({ error: 'Document not found' }, { status: 404 })
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 3600)

  if (signErr || !signed) {
    return Response.json({ error: 'Failed to create signed URL' }, { status: 500 })
  }

  return Response.json({ url: signed.signedUrl, fileName: doc.file_name })
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
