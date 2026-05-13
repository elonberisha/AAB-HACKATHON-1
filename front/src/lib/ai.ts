const AI_URL = process.env.NEXT_PUBLIC_AI_URL || "";

export function getSession() {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem("euguide-session-id");
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem("euguide-session-id", next);
  return next;
}

export async function chatStream(message: string, sessionId = getSession(), language = "sq", userId?: string | null) {
  return fetch(`${AI_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId, language, userId: userId ?? null })
  });
}
