'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ChartSeries {
  key: string
  title: string | null
  type: string
  data: unknown
  config: unknown
  published: boolean
}

type Row = { [key: string]: string | number | boolean | null | undefined }

const empty: ChartSeries = { key: '', title: '', type: 'bar', data: [], config: {}, published: true }
const structuredKeys = ['region', 'cpi', 'reform', 'clusters']

export default function AdminChartsPage() {
  const [items, setItems] = useState<ChartSeries[]>([])
  const [editing, setEditing] = useState<ChartSeries | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [dataJson, setDataJson] = useState('')
  const [configJson, setConfigJson] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('chart_series').select('*').order('key')
    setItems(data ?? [])
  }

  function startEdit(item: ChartSeries) {
    setError('')
    setEditing(item)
    const nextRows = Array.isArray(item.data) ? item.data as Row[] : []
    setRows(nextRows)
    setDataJson(JSON.stringify(nextRows, null, 2))
    setConfigJson(JSON.stringify(item.config ?? {}, null, 2))
  }

  function updateRow(index: number, field: string, value: string | number) {
    const next = rows.map((row, i) => i === index ? { ...row, [field]: value } : row)
    setRows(next)
    setDataJson(JSON.stringify(next, null, 2))
  }

  function addRow() {
    const key = editing?.key
    const row =
      key === 'region' ? { code: '', name_sq: '', name_en: '', name_sr: '', status: 'candidate', chapters: 0, progress: 0 } :
        key === 'cpi' ? { year: new Date().getFullYear(), score: 0 } :
          key === 'reform' ? { key: '', label_sq: '', label_en: '', label_sr: '', value: 0 } :
            key === 'clusters' ? { code: rows.length + 1, name_sq: '', name_en: '', name_sr: '', color: 'var(--blue)', chapters: 0, weight: 0 } :
              {}
    const next = [...rows, row]
    setRows(next)
    setDataJson(JSON.stringify(next, null, 2))
  }

  function deleteRow(index: number) {
    const next = rows.filter((_, i) => i !== index)
    setRows(next)
    setDataJson(JSON.stringify(next, null, 2))
  }

  async function save() {
    if (!editing) return
    setError('')
    let data: unknown
    let config: unknown
    try {
      data = structuredKeys.includes(editing.key) ? rows : JSON.parse(dataJson)
      config = JSON.parse(configJson)
    } catch {
      setError('Data ose config JSON nuk eshte valid.')
      return
    }
    await supabase.from('chart_series').upsert({ ...editing, data, config })
    setEditing(null)
    load()
  }

  async function remove(key: string) {
    if (!confirm('Fshi chart dataset?')) return
    await supabase.from('chart_series').delete().eq('key', key)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Charts</h1>
          <p className="text-sm text-slate-500 mt-1">Menaxho dataset-et qe lexohen nga frontend-i publik: region, cpi, clusters, reform.</p>
        </div>
        <button onClick={() => startEdit({ ...empty })} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">+ Shto dataset</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {items.map(item => (
          <div key={item.key} className="px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">{item.key} <span className="text-xs text-slate-400">({item.type})</span></h2>
              <p className="text-sm text-slate-500">{item.title}</p>
              {!item.published && <span className="text-xs text-slate-400">draft</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(item)} className="text-blue-600 text-sm">Edito</button>
              <button onClick={() => remove(item.key)} className="text-red-600 text-sm">Fshi</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="px-4 py-8 text-center text-slate-400">Nuk ka chart datasets.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing.key ? 'Edito' : 'Shto'} Chart Dataset</h2>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div><label className="text-xs text-slate-500">Key</label><input value={editing.key} onChange={e => setEditing({ ...editing, key: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs text-slate-500">Type</label><input value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <label className="flex items-end gap-2 pb-2"><input type="checkbox" checked={editing.published} onChange={e => setEditing({ ...editing, published: e.target.checked })} /><span className="text-sm">Publikuar</span></label>
              <div className="col-span-3"><label className="text-xs text-slate-500">Title</label><input value={editing.title ?? ''} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
            {structuredKeys.includes(editing.key) ? (
              <StructuredChartRows chartKey={editing.key} rows={rows} updateRow={updateRow} deleteRow={deleteRow} addRow={addRow} />
            ) : (
              <div><label className="text-xs text-slate-500">Data JSON</label><textarea rows={18} value={dataJson} onChange={e => setDataJson(e.target.value)} className="w-full font-mono text-xs px-3 py-2 border rounded-lg" /></div>
            )}
            <div className="mt-3"><label className="text-xs text-slate-500">Config JSON</label><textarea rows={8} value={configJson} onChange={e => setConfigJson(e.target.value)} className="w-full font-mono text-xs px-3 py-2 border rounded-lg" /></div>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Ruaj</button>
              <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Anulo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StructuredChartRows({
  chartKey,
  rows,
  updateRow,
  deleteRow,
  addRow,
}: {
  chartKey: string
  rows: Row[]
  updateRow: (index: number, field: string, value: string | number) => void
  deleteRow: (index: number) => void
  addRow: () => void
}) {
  const fields =
    chartKey === 'region' ? [
      ['code', 'text'], ['name_sq', 'text'], ['name_en', 'text'], ['name_sr', 'text'], ['status', 'text'], ['chapters', 'number'], ['progress', 'number'],
    ] :
      chartKey === 'cpi' ? [['year', 'number'], ['score', 'number']] :
        chartKey === 'reform' ? [['key', 'text'], ['label_sq', 'text'], ['label_en', 'text'], ['label_sr', 'text'], ['value', 'number']] :
          [['code', 'number'], ['name_sq', 'text'], ['name_en', 'text'], ['name_sr', 'text'], ['color', 'text'], ['chapters', 'number'], ['weight', 'number']]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Data rows</h3>
        <button onClick={addRow} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm">+ Shto rresht</button>
      </div>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-1 lg:grid-cols-8 gap-2 border rounded-lg p-3">
            {fields.map(([field, type]) => (
              <label key={field} className={fields.length <= 2 ? 'lg:col-span-3' : ''}>
                <span className="text-xs text-slate-500">{field}</span>
                <input
                  type={type}
                  value={typeof row[field] === 'string' || typeof row[field] === 'number' ? row[field] : ''}
                  onChange={e => updateRow(index, field, type === 'number' ? Number(e.target.value) : e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </label>
            ))}
            <button onClick={() => deleteRow(index)} className="self-end text-red-600 text-sm">Fshi</button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-400">Nuk ka rreshta.</p>}
      </div>
    </div>
  )
}
