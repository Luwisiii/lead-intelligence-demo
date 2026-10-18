// Shared by the /api functions (the leading _ keeps Vercel from deploying it as a route).
// Adds the secret header server-side and passes n8n's status code through.

// Error codes our n8n workflows return on purpose. Anything else is hidden from visitors.
const KNOWN_ERRORS = ['invalid', 'rate_limited', 'scoring_failed', 'ai_limit']

export async function callN8n(path: string | undefined, init: RequestInit = {}, timeoutMs = 55_000): Promise<Response> {
  const { N8N_BASE_URL, N8N_DEMO_KEY } = process.env
  if (!N8N_BASE_URL || !path || !N8N_DEMO_KEY) {
    return Response.json({ ok: false, error: 'not_configured' }, { status: 500 })
  }
  let res: Response
  try {
    res = await fetch(N8N_BASE_URL + path, {
      ...init,
      headers: { ...init.headers, 'X-Demo-Key': N8N_DEMO_KEY },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    return Response.json({ ok: false, error: 'upstream_unreachable' }, { status: 502 })
  }

  const text = await res.text()
  let body: unknown = null
  try {
    body = JSON.parse(text)
  } catch {
    // not JSON, e.g. n8n's plain-text "Authorization data is wrong!"
  }
  const error = (body as { error?: unknown } | null)?.error
  const ours = body !== null && typeof body === 'object' && (res.ok || KNOWN_ERRORS.includes(String(error)))
  if (!ours) {
    // Raw n8n errors can name nodes or echo the visitor's input: keep them out of the response
    // and the logs. The n8n execution list has the details.
    console.error(`n8n ${path} -> ${res.status}`)
    return Response.json({ ok: false, error: 'upstream_error' }, { status: 502 })
  }
  return Response.json(body, { status: res.status })
}
