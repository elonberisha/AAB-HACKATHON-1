/**
 * Ingestion Script - Proceson dokumentet e juristëve
 * Vendos dokumentet PDF/TXT/DOCX në /documents dhe ekzekuto:
 * npm run ingest
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DOCS_DIR = path.join(__dirname, '../documents')
const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const words = text.split(/\s+/)
  const chunks = []

  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(' '))
    if (i + size >= words.length) break
  }

  return chunks
}

async function readFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf-8')
  }

  if (ext === '.pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const buffer = fs.readFileSync(filePath)
    const data = await pdfParse(buffer)
    return data.text
  }

  if (ext === '.docx') {
    const mammoth = (await import('mammoth')).default
    const result = await mammoth.extractRawText({ path: filePath })
    return result.value
  }

  console.log(`⚠ Formati i pa-mbështetur: ${ext}`)
  return null
}

async function embedAndStore(chunks, source) {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    if (!chunk.trim()) continue

    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk,
    })

    const embedding = embeddingRes.data[0].embedding

    const { error } = await supabase.from('documents').insert({
      content: chunk,
      embedding,
      source,
      metadata: { chunk_index: i, total_chunks: chunks.length },
    })

    if (error) {
      console.error(`✗ Gabim për chunk ${i} nga ${source}:`, error.message)
    } else {
      process.stdout.write(`\r  Chunk ${i + 1}/${chunks.length}`)
    }
  }
  console.log()
}

async function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.error('✗ Folder /documents nuk ekziston')
    process.exit(1)
  }

  const files = fs.readdirSync(DOCS_DIR).filter((f) =>
    ['.txt', '.pdf', '.docx'].includes(path.extname(f).toLowerCase())
  )

  if (!files.length) {
    console.log('⚠ Nuk ka dokumente në /documents')
    process.exit(0)
  }

  console.log(`📄 Duke procesuar ${files.length} dokument(e)...\n`)

  for (const file of files) {
    console.log(`→ ${file}`)
    const filePath = path.join(DOCS_DIR, file)
    const text = await readFile(filePath)

    if (!text) continue

    const chunks = chunkText(text)
    console.log(`  ${chunks.length} chunks`)

    await embedAndStore(chunks, file)
    console.log(`  ✓ Done`)
  }

  console.log('\n✅ Ingestion kompletuar!')
}

main().catch(console.error)
