// Shared by the /api functions (the leading _ keeps Vercel from deploying it as a route).
// Adds the secret header server-side and passes n8n's status code through.
export async function callN8n(path: string | undefined, init: RequestInit = {}): Promise<Response> {
  const { N8N_BASE_URL, N8N_DEMO_KEY } = process.env
  if (!N8N_BASE_URL || !path || !N8N_DEMO_KEY) {
    return Response.json({ ok: false, error: 'not_configured' }, { status: 500 })
  }
  try {
    const res = await fetch(N8N_BASE_URL + path, {
      ...init,
      headers: { ...init.headers, 'X-Demo-Key': N8N_DEMO_KEY },
      // Gemini takes 3-10 s, up to ~30 s with n8n's retries
      signal: AbortSignal.timeout(55_000),
    })
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
    })
  } catch {
    return Response.json({ ok: false, error: 'upstream_unreachable' }, { status: 502 })
  }
}
