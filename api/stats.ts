import { callN8n } from './_n8n.js'

export async function GET() {
  const res = await callN8n(process.env.N8N_STATS_PATH)
  // Vercel's CDN serves this for 60 s, so page views don't each run an n8n execution
  if (res.ok) res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  return res
}
