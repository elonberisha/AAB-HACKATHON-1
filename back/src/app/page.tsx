export default function Home() {
  return (
    <main style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>KO-in-EU AI Backend</h1>
      <p>API Routes:</p>
      <ul>
        <li>POST /api/chat — Chat me RAG</li>
        <li>POST /api/vapi — Vapi webhook</li>
      </ul>
    </main>
  )
}
