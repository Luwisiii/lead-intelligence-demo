import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanLead, POST } from './lead.js'
import { GET } from './stats.js'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('N8N_BASE_URL', 'https://n8n.test')
  vi.stubEnv('N8N_LEAD_PATH', '/webhook/lead')
  vi.stubEnv('N8N_STATS_PATH', '/webhook/stats')
  vi.stubEnv('N8N_DEMO_KEY', 'secret')
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllEnvs()
})

const valid = { name: ' Ana ', email: 'Ana@Example.com', message: 'Budget $5k', website: '' }
const post = (body: unknown) =>
  POST(new Request('http://x/api/lead', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }))

test('cleanLead trims, lowercases email and enforces limits', () => {
  expect(cleanLead(valid)).toEqual({ name: 'Ana', email: 'ana@example.com', company: '', message: 'Budget $5k', website: '' })
  expect(cleanLead({ ...valid, email: 'nope' })).toBeNull()
  expect(cleanLead({ ...valid, name: '' })).toBeNull()
  expect(cleanLead({ ...valid, message: 'x'.repeat(2001) })).toBeNull()
  expect(cleanLead({ ...valid, company: 'x'.repeat(101) })).toBeNull()
  expect(cleanLead(null)).toBeNull()
})

test('invalid lead gets 400 without calling n8n', async () => {
  expect((await post({ ...valid, email: 'nope' })).status).toBe(400)
  expect((await post('not json')).status).toBe(400)
  expect(fetchMock).not.toHaveBeenCalled()
})

test('scored lead: secret header added, fresh stats attached', async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json({ ok: true, result: { final_outcome: 'hot' } }))
    .mockResolvedValueOnce(Response.json({ total: 3 }))
  const res = await post(valid)
  expect(await res.json()).toEqual({ ok: true, result: { final_outcome: 'hot' }, stats: { total: 3 } })
  const [url, init] = fetchMock.mock.calls[0]
  expect(url).toBe('https://n8n.test/webhook/lead')
  expect(init.headers['X-Demo-Key']).toBe('secret')
  expect(JSON.parse(init.body).email).toBe('ana@example.com')
})

test("n8n's status codes pass through (duplicate, rate limit)", async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ ok: true, duplicate: true }))
  expect(await (await post(valid)).json()).toEqual({ ok: true, duplicate: true })
  fetchMock.mockResolvedValueOnce(Response.json({ ok: false, error: 'rate_limited' }, { status: 429 }))
  expect((await post(valid)).status).toBe(429)
  expect(fetchMock).toHaveBeenCalledTimes(2) // no stats call for either
})

test('missing config and unreachable n8n fail cleanly', async () => {
  vi.stubEnv('N8N_DEMO_KEY', '')
  expect((await post(valid)).status).toBe(500)
  vi.stubEnv('N8N_DEMO_KEY', 'secret')
  fetchMock.mockRejectedValueOnce(new Error('down'))
  expect((await post(valid)).status).toBe(502)
})

test('stats are CDN-cached only when n8n succeeds', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ total: 2 }))
  const ok = await GET()
  expect(ok.headers.get('Cache-Control')).toContain('s-maxage=60')
  expect(fetchMock.mock.calls[0][1].headers['X-Demo-Key']).toBe('secret')
  fetchMock.mockResolvedValueOnce(new Response('Authorization data is wrong!', { status: 403 }))
  const denied = await GET()
  expect(denied.status).toBe(403)
  expect(denied.headers.get('Cache-Control')).toBeNull()
})
