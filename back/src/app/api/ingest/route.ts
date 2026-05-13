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

async function extractText(fileName: string, buffer: Buffer): Promise<string> {
  const ext = fileName.toLowerCase().split('.').pop()

  if (ext === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(buffer)
    return result.text
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  // Plain text fallback
  return buffer.toString('utf-8')
}

export async function POST(req: NextRequest) {
  const { fileName, content, uploadedBy, language } = await req.json()

  if (!fileName || !content) {
    return Response.json({ error: 'fileName dhe content kërkohen' }, { status: 400 })
  }

  const buffer = Buffer.from(content, 'base64')
  const fileType = fileName.toLowerCase().split('.').pop() ?? 'unknown'
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const storagePath = `${Date.now()}-${safeName}`

  const { data: storedFile, error: storageErr } = await supabase.storage
    .from('documents')
    .upload(storagePath, buffer, {
      contentType: fileType === 'pdf'
        ? 'application/pdf'
        : fileType === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'text/plain',
      upsert: false,
    })

  if (storageErr || !storedFile) {
    return Response.json({ error: 'Failed to store document file', details: storageErr?.message }, { status: 500 })
  }

  // 1. Krijo uploaded_documents entry (status: processing)
  const { data: uploadRow, error: uploadErr } = await supabase
    .from('uploaded_documents')
    .insert({
      file_name: fileName,
      file_size_bytes: buffer.length,
      file_type: fileType,
      uploaded_by: uploadedBy ?? null,
      language: language ?? 'sq',
      status: 'processing',
      storage_path: storagePath,
    })
    .select()
    .single()

  if (uploadErr || !uploadRow) {
    await supabase.storage.from('documents').remove([storagePath])
    return Response.json({ error: 'Failed to create upload record', details: uploadErr?.message }, { status: 500 })
  }

  try {
    // 2. Fshi chunks të vjetra me të njëjtin source (rikrijim)
    await supabase.from('documents').delete().eq('source', fileName)

    // 3. Ekstrakto tekst
    const text = await extractText(fileName, buffer)
    const chunks = chunkText(text).filter((c) => c.trim().length > 20)

    if (chunks.length === 0) {
      await supabase.from('uploaded_documents')
        .update({ status: 'failed', error_message: 'Nuk u ekstraktua tekst nga dokumenti' })
        .eq('id', uploadRow.id)
      return Response.json({ status: 'failed', error: 'No text extracted' }, { status: 400 })
    }

    // 4. Embed + insert chunks
    let stored = 0
    for (const chunk of chunks) {
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
      })

      const { error } = await supabase.from('documents').insert({
        uploaded_document_id: uploadRow.id,
        content: chunk,
        embedding: embeddingRes.data[0].embedding,
        source: fileName,
        metadata: { chunk_index: stored, total_chunks: chunks.length },
      })

      if (!error) stored++
    }

    // 5. Update status: ready
    await supabase.from('uploaded_documents')
      .update({ status: 'ready', chunks_count: stored })
      .eq('id', uploadRow.id)

    return Response.json({ status: 'ok', chunks: stored, fileName, id: uploadRow.id })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    await supabase.from('uploaded_documents')
      .update({ status: 'failed', error_message: errorMsg })
      .eq('id', uploadRow.id)
    return Response.json({ status: 'failed', error: errorMsg }, { status: 500 })
  }
}
