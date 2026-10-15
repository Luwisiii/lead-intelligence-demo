export type LeadResult = {
  final_outcome: string
  ai_temperature: string
  ai_confidence: number
  ai_evidence: string
  ai_summary: string
  ai_next_step: string
  ai_budget: string
  ai_timeline: string
  review_note: string
}

// Badge colors from the brief: won green, hot red, warm orange, cold slate, unclear violet
const OUTCOMES: Record<string, { label: string; className: string }> = {
  won: { label: 'Won', className: 'bg-emerald-700 text-white' },
  hot: { label: 'Hot', className: 'bg-red-600 text-white' },
  warm: { label: 'Warm', className: 'bg-orange-400 text-ink' },
  cold: { label: 'Cold', className: 'bg-slate-500 text-white' },
  unclear: { label: 'Unclear', className: 'bg-violet-600 text-white' },
}

// Show the visitor's own message with the AI's evidence quote highlighted in place.
// n8n already checked the quote appears in the message (case-insensitive), or the lead became 'unclear'.
function Evidence({ message, quote }: { message: string; quote: string }) {
  const at = quote ? message.toLowerCase().indexOf(quote.toLowerCase()) : -1
  if (at < 0) return <>{message}</>
  return (
    <>
      {message.slice(0, at)}
      <mark className="evidence-mark">{message.slice(at, at + quote.length)}</mark>
      {message.slice(at + quote.length)}
    </>
  )
}

const stated = (v: string) => (!v || v.toLowerCase() === 'none' ? 'Not stated' : v)

export default function ResultCard({ result, message }: { result: LeadResult; message: string }) {
  const outcome = OUTCOMES[result.final_outcome] ?? OUTCOMES.unclear
  const confidence = Math.round(Math.min(Math.max(Number(result.ai_confidence) || 0, 0), 1) * 100)

  return (
    <article className="motion-safe:animate-rise rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 dark:bg-night-raised dark:ring-slate-800">
      <h2 className="sr-only">AI verdict</h2>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className={`rounded-full px-4 py-1.5 font-display text-xl font-bold tracking-tight ${outcome.className}`}>
          {outcome.label}
        </span>
        <div className="min-w-40 flex-1 sm:max-w-56">
          <div className="flex justify-between font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Confidence</span>
            <span className="text-ink dark:text-slate-100">{confidence}%</span>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-ink dark:bg-slate-200" style={{ width: `${confidence}%` }} />
          </div>
        </div>
      </div>

      {result.review_note && (
        <div className="mt-6 rounded-lg border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm dark:bg-amber-500/10">
          <p className="font-semibold text-amber-900 dark:text-amber-200">Flagged for human review</p>
          <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">{result.review_note}</p>
        </div>
      )}

      <h3 className="mt-7 font-mono text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Evidence in your words</h3>
      <blockquote className="mt-2 border-l-2 border-slate-300 pl-4 leading-relaxed whitespace-pre-line dark:border-slate-600">
        <Evidence message={message} quote={result.ai_evidence} />
      </blockquote>
      {!result.ai_evidence && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No phrase in the message supported a verdict, so it stays unclear.</p>
      )}

      <dl className="mt-7 space-y-5">
        <div>
          <dt className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Summary</dt>
          <dd className="mt-1">{result.ai_summary}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Next step</dt>
          <dd className="mt-1">{result.ai_next_step}</dd>
        </div>
      </dl>

      <ul className="mt-7 flex flex-wrap gap-2 text-sm">
        <li className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Budget</span> {stated(result.ai_budget)}
        </li>
        <li className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Timeline</span> {stated(result.ai_timeline)}
        </li>
      </ul>
    </article>
  )
}
