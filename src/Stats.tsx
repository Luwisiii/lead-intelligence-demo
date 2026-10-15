export type Stats = {
  period: string
  total: number
  by_outcome: Record<'won' | 'hot' | 'warm' | 'cold' | 'unclear', number>
  conversion_rate: number
  needs_review: number
  spam: number
}

// Same colors as the verdict badges
const SEGMENTS = [
  { key: 'won', label: 'Won', className: 'bg-emerald-700' },
  { key: 'hot', label: 'Hot', className: 'bg-red-600' },
  { key: 'warm', label: 'Warm', className: 'bg-orange-400' },
  { key: 'cold', label: 'Cold', className: 'bg-slate-500' },
  { key: 'unclear', label: 'Unclear', className: 'bg-violet-600' },
] as const

const label = 'font-mono text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400'

export default function StatsSection({ stats, failed, includesYours }: { stats: Stats | null; failed: boolean; includesYours: boolean }) {
  const show = (v: number | undefined, suffix = '') => (stats && v !== undefined ? `${v}${suffix}` : '–')
  const cells = [
    { label: 'Leads', value: show(stats?.total) },
    { label: 'Won', value: show(stats?.by_outcome.won) },
    { label: 'Conversion', value: show(stats?.conversion_rate, '%') },
    { label: 'Needs review', value: show(stats?.needs_review) },
  ]

  return (
    <section aria-labelledby="stats-heading" className="border-t border-slate-200 py-16 dark:border-slate-800">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="stats-heading" className="font-display text-3xl font-bold tracking-tight">Live numbers</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {failed
            ? "Stats aren't available right now."
            : `All time, from the Leads table${stats?.spam ? `. ${stats.spam} spam excluded` : ''}${includesYours ? '. Includes your inquiry' : ''}.`}
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 sm:grid-cols-4 dark:bg-night-raised dark:ring-slate-800">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={`p-5 sm:p-6 ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l' : ''} border-slate-200 dark:border-slate-800`}
          >
            <dt className={label}>{c.label}</dt>
            <dd className="mt-2 font-mono text-3xl font-medium tabular-nums sm:text-4xl">{c.value}</dd>
          </div>
        ))}
      </dl>

      {stats && stats.total > 0 && (
        <div className="mt-6">
          <p className={label}>By outcome</p>
          <div aria-hidden="true" className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            {SEGMENTS.map(s => (
              <div key={s.key} className={s.className} style={{ width: `${(stats.by_outcome[s.key] / stats.total) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {SEGMENTS.map(s => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${s.className}`} />
                {s.label} <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">{stats.by_outcome[s.key]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
