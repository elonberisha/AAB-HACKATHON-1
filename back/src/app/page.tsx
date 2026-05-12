export default function Home() {
  return (
    <main style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>euguide-ks API</h1>
      <p>API Routes:</p>
      <ul>
        <li>POST /api/chat — Chat me RAG</li>
        <li>POST /api/vapi — Vapi webhook</li>
        <li>POST /api/ingest — Document ingestion</li>
        <li>GET /api/session/[id] — Session history</li>
      </ul>
    </main>
  )
}
