import TryIt from './TryIt'

const REPO = 'https://github.com/Luwisiii/lead-intelligence-demo'

export default function App() {
  return (
    <div className="min-h-dvh bg-paper font-sans text-ink antialiased dark:bg-night dark:text-slate-100">
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="pt-14 pb-12 sm:pt-24 sm:pb-16">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Live demo · n8n + Gemini</p>
          <h1 className="mt-4 max-w-3xl font-display text-[2.6rem] leading-[1.02] font-bold tracking-tight sm:text-6xl">
            Send an inquiry. Watch the AI triage it.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            This form feeds a live lead-scoring system built in n8n. Gemini judges how likely your message is to become a paying client, and it has to
            quote the exact words that justify the verdict.
          </p>
          <a
            href={REPO}
            className="mt-6 inline-block font-medium underline decoration-slate-300 underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink dark:decoration-slate-600 dark:hover:decoration-slate-100"
          >
            Source on GitHub
          </a>
        </header>
        <TryIt />
      </main>
    </div>
  )
}
