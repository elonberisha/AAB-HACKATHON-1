'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Doc {
  id: string
  file_name: string
  file_size_bytes: number
  file_type: string
  chunks_count: number
  status: string
  error_message: string | null
  created_at: string
}

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('uploaded_documents').select('*').order('created_at', { ascending: false })
    setDocs(data ?? [])
  }

  async function handleUpload(file: File) {
    setUploading(true)
    setUploadStatus(`Duke ngarkuar ${file.name}...`)

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_AI_URL}/api/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, content: base64 }),
        })
        const data = await res.json()
        if (data.status === 'ok') {
          setUploadStatus(`${file.name} u indeksua me sukses — ${data.chunks} chunks`)
        } else {
          setUploadStatus(`Gabim: ${data.error}`)
        }
      } catch (err) {
        setUploadStatus(`Gabim: ${err instanceof Error ? err.message : 'Unknown'}`)
      }
      setUploading(false)
      load()
    }
    reader.readAsDataURL(file)
  }

  async function remove(id: string) {
    if (!confirm('Fshi dokumentin dhe chunks?')) return
    await supabase.from('uploaded_documents').delete().eq('id', id)
    load()
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dokumentet AI</h1>

      {/* Upload zone */}
      <div
        className="bg-white rounded-xl shadow-sm p-8 mb-6 border-2 border-dashed border-gray-300 text-center cursor-pointer hover:border-blue-400 transition"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400') }}
        onDragLeave={e => e.currentTarget.classList.remove('border-blue-400')}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleUpload(f) }}
      >
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
        <div className="text-4xl mb-2">📄</div>
        <p className="text-gray-600">{uploading ? 'Duke procesuar...' : 'Kliko ose tërhiq PDF/Word këtu'}</p>
        <p className="text-xs text-gray-400 mt-1">Pranon: .pdf, .docx, .txt</p>
      </div>

      {uploadStatus && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${uploadStatus.includes('sukses') ? 'bg-green-50 text-green-700' : uploadStatus.includes('Gabim') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          {uploadStatus}
        </div>
      )}

      {/* Documents list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="text-left px-4 py-3">Emri</th>
            <th className="text-left px-4 py-3">Madhësia</th>
            <th className="text-left px-4 py-3">Chunks</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Data</th>
            <th className="px-4 py-3">Veprime</th>
          </tr></thead>
          <tbody className="divide-y">
            {docs.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{d.file_name}</td>
                <td className="px-4 py-3 text-gray-500">{formatSize(d.file_size_bytes)}</td>
                <td className="px-4 py-3">{d.chunks_count}</td>
                <td className="px-4 py-3">
                  {d.status === 'ready' && <span className="text-green-600">Gati</span>}
                  {d.status === 'processing' && <span className="text-yellow-600">Duke procesuar...</span>}
                  {d.status === 'failed' && <span className="text-red-600" title={d.error_message ?? ''}>Dështoi</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(d.created_at).toLocaleDateString('sq')}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => remove(d.id)} className="text-red-600 text-sm">Fshi</button>
                </td>
              </tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nuk ka dokumente.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
