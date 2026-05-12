const AI_URL = process.env.NEXT_PUBLIC_AI_URL

// POST /api/chat — returns SSE stream
export async function chatStream(message: string, sessionId: string) {
  return fetch(`${AI_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  })
}

// POST /api/ingest — upload document (base64)
export async function ingestDocument(fileName: string, content: string) {
  const res = await fetch(`${AI_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, content }),
  })
  return res.json()
}

// GET /api/session/:id — merr historinë e sesionit
export async function getSession(sessionId: string) {
  const res = await fetch(`${AI_URL}/api/session/${sessionId}`)
  return res.json()
}
