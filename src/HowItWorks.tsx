// One lane per n8n workflow: what starts it, what it does, what it reads or writes.
const LANES = [
  { when: 'An inquiry arrives', from: 'this page or the n8n form', name: 'Lead intake', does: 'Checks for duplicates, has Gemini score the message, then validates the verdict', to: 'Leads table', verb: 'writes' },
  { when: 'Every 6 hours', from: 'schedule', name: 'Payment sync', does: 'Matches payments to leads by email', to: 'Leads table', verb: 'marks won' },
  { when: 'Saturday, 9 AM', from: 'schedule', name: 'Weekly report', does: 'Runs payment sync, counts outcomes from stored rows', to: 'Gmail', verb: 'emails' },
  { when: 'A chat question', from: 'the agent panel', name: 'Q&A agent', does: 'Answers with three lookup tools; the public copy redacts names and emails', to: 'Leads table', verb: 'reads' },
  { when: 'Any workflow fails', from: 'error trigger', name: 'Error handler', does: 'Sends a failure alert with the workflow and step', to: 'Gmail', verb: 'emails' },
]

const GUARDRAILS = [
  ['Evidence or nothing.', 'The verdict must quote words that appear in the message. If the quote isn\'t found, the lead is marked unclear.'],
  ['Hot needs 80% confidence.', 'Below that, a hot verdict is held back as unclear. Below 70%, the lead is flagged for a person to review.'],
  ['Payments beat opinions.', 'A matched payment marks a lead won, overriding a manual call, which in turn overrides the AI.'],
  ['Numbers come from code.', 'Counts and conversion rate are computed over stored rows, never written by the AI. Spam is left out.'],
] as const

const label = 'font-mono text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400'
const arrow = 'text-slate-400 dark:text-slate-600 select-none'

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="border-t border-slate-200 py-16 dark:border-slate-800">
      <h2 id="how-heading" className="font-display text-3xl font-bold tracking-tight">How it works</h2>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
        Five n8n workflows share one Leads table. This page talks to them through a small server-side proxy, so the browser never holds a key.
      </p>

      <ol className="mt-8 space-y-3" aria-label="Workflows">
        {LANES.map(l => (
          <li
            key={l.name}
            className="grid items-center gap-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5 md:grid-cols-[11rem_auto_minmax(0,1fr)_auto_10.5rem] md:gap-4 dark:bg-night-raised dark:ring-slate-800"
          >
            <div>
              <p className="font-medium">{l.when}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{l.from}</p>
            </div>
            <span aria-hidden="true" className={`${arrow} hidden md:block`}>→</span>
            <div className="border-slate-200 md:border-l md:pl-4 dark:border-slate-800">
              <p className="font-display text-lg font-bold tracking-tight">{l.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{l.does}</p>
            </div>
            <span aria-hidden="true" className={`${arrow} hidden md:block`}>→</span>
            <p className="text-sm">
              <span className="text-slate-500 dark:text-slate-400">{l.verb} </span>
              <span className={`rounded-md px-2 py-0.5 font-mono text-xs whitespace-nowrap ${l.to === 'Gmail' ? 'bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200' : 'bg-marker/60 text-ink dark:bg-marker/20 dark:text-marker'}`}>
                {l.to}
              </span>
            </p>
          </li>
        ))}
      </ol>

      <h3 className={`${label} mt-12`}>Guardrails</h3>
      <ul className="mt-4 grid gap-x-10 gap-y-5 sm:grid-cols-2">
        {GUARDRAILS.map(([title, body]) => (
          <li key={title}>
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
