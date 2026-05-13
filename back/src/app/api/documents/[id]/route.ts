import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: doc, error } = await supabase
    .from('uploaded_documents')
    .select('id, storage_path')
    .eq('id', id)
    .single()

  if (error || !doc) {
    return Response.json({ error: 'Document not found' }, { status: 404 })
  }

  await supabase.from('documents').delete().eq('uploaded_document_id', id)
  await supabase.from('uploaded_documents').delete().eq('id', id)

  if (doc.storage_path) {
    await supabase.storage.from('documents').remove([doc.storage_path])
  }

  return Response.json({ ok: true })
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
