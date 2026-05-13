'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface MediaItem {
  name: string
  id: string
  metadata: { size: number; mimetype: string }
  created_at: string
}

export default function AdminMediaPage() {
  const [files, setFiles] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.storage.from('media').list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
    setFiles((data ?? []) as unknown as MediaItem[])
  }

  async function handleUpload(file: File) {
    setUploading(true)
    const path = `${Date.now()}-${file.name}`
    await supabase.storage.from('media').upload(path, file)
    setUploading(false)
    load()
  }

  async function remove(name: string) {
    if (!confirm('Fshi imazhin?')) return
    await supabase.storage.from('media').remove([name])
    load()
  }

  function getUrl(name: string) {
    return supabase.storage.from('media').getPublicUrl(name).data.publicUrl
  }

  function copyUrl(name: string) {
    const url = getUrl(name)
    navigator.clipboard.writeText(url)
    setCopied(name)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Media Library</h1>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          {uploading ? 'Duke ngarkuar...' : '+ Upload'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {files.map(f => (
          <div key={f.name} className="bg-white rounded-xl shadow-sm overflow-hidden group">
            <img src={getUrl(f.name)} alt={f.name} className="w-full h-32 object-cover" />
            <div className="p-2">
              <p className="text-xs truncate" title={f.name}>{f.name}</p>
              <div className="flex gap-1 mt-1">
                <button onClick={() => copyUrl(f.name)} className="text-blue-600 text-xs">
                  {copied === f.name ? '✓ Kopjuar' : 'Kopjo URL'}
                </button>
                <button onClick={() => remove(f.name)} className="text-red-600 text-xs ml-auto">Fshi</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {files.length === 0 && <p className="text-center text-gray-400 mt-8">Nuk ka imazhe.</p>}
    </div>
  )
}
