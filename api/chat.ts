import { callN8n } from './_n8n.js'

// Only what the chat panel sends. Memory lives in n8n, keyed by sessionId.
export function cleanChat(body: unknown): { action: 'sendMessage'; sessionId: string; chatInput: string } | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const sessionId = typeof b.sessionId === 'string' ? b.sessionId.trim() : ''
  const chatInput = typeof b.chatInput === 'string' ? b.chatInput.trim() : ''
  const valid = b.action === 'sendMessage'
    && sessionId && sessionId.length <= 100
    && chatInput && chatInput.length <= 500 // ponytail: length cap only; per-visitor limits need storage
  return valid ? { action: 'sendMessage', sessionId, chatInput } : null
}

export async function POST(request: Request) {
  const chat = cleanChat(await request.json().catch(() => null))
  if (!chat) return Response.json({ ok: false, error: 'invalid' }, { status: 400 })

  const auth = process.env.N8N_CHAT_AUTH // "user:password" of the n8n Basic Auth credential
  if (!auth) return Response.json({ ok: false, error: 'not_configured' }, { status: 500 })

  return callN8n(process.env.N8N_CHAT_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${btoa(auth)}` },
    body: JSON.stringify(chat),
  })
}
