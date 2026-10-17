import { useEffect, useRef, useState, type FormEvent } from 'react'
import ResultCard, { type LeadResult } from './ResultCard'
import type { Stats } from './Stats'

type Fields = { name: string; email: string; company: string; message: string }
type State =
  | { kind: 'idle' | 'scoring' | 'duplicate' | 'rate_limited' | 'too_fast' | 'invalid' | 'error' }
  | { kind: 'result'; result: LeadResult; message: string }

const SAMPLES = [
  {
    label: 'Ready to buy',
    message: "We're a 12-person accounting firm and want our inbound leads scored and routed automatically. Budget is about $6,000 and we'd like it live before January.",
  },
  {
    label: 'Just curious',
    message: 'Saw your lead-scoring demo on LinkedIn. Could something like this work with HubSpot? Curious what it would involve.',
  },
  { label: 'Too vague', message: 'Hi, can you send me more info?' },
]

// The real pipeline steps, in order. Timing is approximate: n8n only reports when it's done.
const STEPS = ['Checking for duplicates', 'Reading your message with Gemini', 'Checking the quote against your words', 'Saving to the Leads table']

const NOTICES = {
  duplicate: ['Already scored', "You've sent this exact message before. Each message is scored once, so there's nothing new to show. Change the wording to score it again."],
  rate_limited: ['Daily limit reached', 'This demo scores up to 5 messages per email, and about 50 in total, each day. Try again tomorrow.'],
  too_fast: ['Too many requests', 'Your connection sent several requests in a short time. Wait a minute and try again.'],
  invalid: ['Check the form', 'Name, a valid email and a message are required. Keep the message under 2,000 characters.'],
  error: ["Couldn't score your message", "The AI didn't answer in time. Wait a minute and try again."],
} as const

const field =
  'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-ink placeholder:text-slate-400 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/20 dark:border-slate-700 dark:bg-night-raised dark:text-slate-100 dark:focus:border-slate-300 dark:focus:ring-slate-300/20'

export default function TryIt({ onStats }: { onStats: (stats: Stats) => void }) {
  const [fields, setFields] = useState<Fields>({ name: '', email: '', company: '', message: '' })
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [step, setStep] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.kind !== 'scoring') return
    const timer = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 2200)
    return () => clearInterval(timer)
  }, [state.kind])

  // Move focus (and, on phones, the view) to the verdict once it arrives
  useEffect(() => {
    if (state.kind !== 'idle' && state.kind !== 'scoring') panelRef.current?.focus()
  }, [state])

  const set = (key: keyof Fields) => (e: { target: { value: string } }) => setFields(f => ({ ...f, [key]: e.target.value }))

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const website = String(new FormData(e.currentTarget).get('website') ?? '')
    setStep(0)
    setState({ kind: 'scoring' })
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, website }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.stats) onStats(data.stats)
      if (data.result) setState({ kind: 'result', result: data.result, message: fields.message.trim() })
      else if (data.duplicate) setState({ kind: 'duplicate' })
      else if (data.error === 'rate_limited') setState({ kind: 'rate_limited' })
      // Vercel Firewall's per-IP rule answers before our code runs (429, or 403 when set to deny)
      else if (res.status === 429 || res.status === 403) setState({ kind: 'too_fast' })
      else if (res.status === 400) setState({ kind: 'invalid' })
      else setState({ kind: 'error' })
    } catch {
      setState({ kind: 'error' })
    }
  }

  const scoring = state.kind === 'scoring'

  return (
    <section aria-labelledby="try-heading" className="grid gap-8 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
      <form onSubmit={submit} className="space-y-5">
        <h2 id="try-heading" className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Your inquiry
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Name
            <input required maxLength={100} autoComplete="name" value={fields.name} onChange={set('name')} className={field} />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input required type="email" maxLength={200} autoComplete="email" value={fields.email} onChange={set('email')} className={field} />
          </label>
        </div>
        <label className="block text-sm font-medium">
          Company <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
          <input maxLength={100} autoComplete="organization" value={fields.company} onChange={set('company')} className={field} />
        </label>

        <div>
          <label htmlFor="message" className="block text-sm font-medium">Message</label>
          <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Fill the message with a sample">
            <span className="text-sm text-slate-500 dark:text-slate-400">Try a sample:</span>
            {SAMPLES.map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => setFields(f => ({ ...f, message: s.message }))}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:border-ink hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink dark:border-slate-700 dark:hover:border-slate-300 dark:hover:bg-night-raised dark:focus-visible:outline-slate-300"
              >
                {s.label}
              </button>
            ))}
          </div>
          <textarea id="message" required maxLength={2000} rows={6} value={fields.message} onChange={set('message')} className={field} />
        </div>

        {/* Honeypot: hidden from people and screen readers, so only bots fill it in */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <button
          type="submit"
          disabled={scoring}
          className="w-full rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-70 sm:w-auto dark:bg-slate-100 dark:text-ink dark:hover:bg-white dark:focus-visible:outline-slate-100"
        >
          {scoring ? 'Scoring…' : 'Score my inquiry'}
        </button>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your message is saved to this demo's lead table and counted in the stats. Your name, email and company are never shown on this page; the
          chat agent may quote short parts of messages, by lead number only.
        </p>
      </form>

      <div ref={panelRef} tabIndex={-1} aria-live="polite" className="scroll-mt-6 focus:outline-none lg:pt-8">
        {state.kind === 'idle' && (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 sm:p-8 dark:border-slate-700">
            <p className="font-medium">Your verdict appears here.</p>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Gemini rates the inquiry hot, warm, cold or unclear, and has to quote the exact words it based that on.
            </p>
          </div>
        )}

        {scoring && (
          <ol className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 dark:bg-night-raised dark:ring-slate-800">
            {STEPS.map((label, i) => (
              <li key={label} className={i < step ? 'text-slate-400 line-through decoration-slate-300 dark:text-slate-500 dark:decoration-slate-600' : i === step ? 'font-medium' : 'text-slate-400 dark:text-slate-600'}>
                <span aria-hidden="true" className="mr-2 inline-block w-4 font-mono">{i < step ? '✓' : i === step ? '›' : '·'}</span>
                {label}
                {i === step && '…'}
              </li>
            ))}
          </ol>
        )}

        {state.kind === 'result' && <ResultCard result={state.result} message={state.message} />}

        {state.kind in NOTICES && (
          <div className="motion-safe:animate-rise rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 dark:bg-night-raised dark:ring-slate-800">
            <p className="font-semibold">{NOTICES[state.kind as keyof typeof NOTICES][0]}</p>
            <p className="mt-2 text-slate-600 dark:text-slate-400">{NOTICES[state.kind as keyof typeof NOTICES][1]}</p>
          </div>
        )}
      </div>
    </section>
  )
}
