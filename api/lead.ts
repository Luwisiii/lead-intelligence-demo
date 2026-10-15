import { callN8n } from './_n8n.js'

export type LeadInput = { name: string; email: string; company: string; message: string; website: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Same limits as "Check input" in the n8n intake workflow. Returns null when invalid.
export function cleanLead(body: unknown): LeadInput | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const lead = { name: s(b.name), email: s(b.email).toLowerCase(), company: s(b.company), message: s(b.message), website: s(b.website) }
  const valid = lead.name && lead.name.length <= 100
    && lead.email.length <= 200 && EMAIL.test(lead.email)
    && lead.company.length <= 100
    && lead.message && lead.message.length <= 2000
  return valid ? lead : null
}

export async function POST(request: Request) {
  const lead = cleanLead(await request.json().catch(() => null))
  if (!lead) return Response.json({ ok: false, error: 'invalid' }, { status: 400 })

  const res = await callN8n(process.env.N8N_LEAD_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  })

  // /api/stats is CDN-cached, so a scored lead brings fresh stats back with it
  // and the visitor sees their own lead counted straight away.
  const data = res.ok ? ((await res.clone().json().catch(() => null)) as { result?: unknown } | null) : null
  if (!data?.result) return res
  const statsRes = await callN8n(process.env.N8N_STATS_PATH)
  const stats = statsRes.ok ? await statsRes.json().catch(() => null) : null
  return Response.json({ ...data, stats })
}
