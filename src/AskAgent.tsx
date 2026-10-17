import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

type Message = { role: 'you' | 'agent'; text: string }

const QUESTIONS = ['How many leads this week?', 'Which leads need review?', 'Why was the latest hot lead rated hot?']

// The agent answers in light markdown: **bold**, "* " list items and a trailing "Sources:" block.
// React escapes everything, so this only adds formatting, never HTML.
function bold(line: string): ReactNode[] {
  return line.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))
}

function AgentText({ text }: { text: string }) {
  const lines = text.split('\n').filter(l => l.trim())
  const sourcesAt = lines.findIndex(l => /^\**sources:?\**/i.test(l.trim()))
  const body = sourcesAt < 0 ? lines : lines.slice(0, sourcesAt)
  const sources = sourcesAt < 0 ? [] : lines.slice(sourcesAt)
  return (
    <>
      {body.map((line, i) => {
        const item = line.match(/^\s*(?:[*-]|\d+\.)\s+(.*)/)
        return item ? (
          <p key={i} className="pl-4 -indent-3">• {bold(item[1])}</p>
        ) : (
          <p key={i} className="mt-1 first:mt-0">{bold(line)}</p>
        )
      })}
      {sources.length > 0 && (
        <p className="mt-3 border-t border-slate-200 pt-2 font-mono text-xs whitespace-pre-line text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {sources.map(l => l.replace(/\*\*/g, '')).join('\n')}
        </p>
      )}
    </>
  )
}

export default function AskAgent() {
  const [sessionId] = useState(() => crypto.randomUUID())
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [messages, busy])

  async function send(question: string) {
    const q = question.trim()
    if (!q || busy) return
    setMessages(m => [...m, { role: 'you', text: q }])
    setInput('')
    setBusy(true)
    let reply = "The agent didn't answer. Wait a minute and try again."
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sendMessage', sessionId, chatInput: q }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && typeof data.output === 'string') reply = data.output
      else if (res.status === 400) reply = 'Keep questions under 500 characters.'
      else if (res.status === 429 || res.status === 403) reply = 'Too many questions in a short time. Wait a minute and try again.'
    } catch {
      // keep the default reply
    }
    setMessages(m => [...m, { role: 'agent', text: reply }])
    setBusy(false)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    send(input)
  }

  return (
    <section aria-labelledby="ask-heading" className="border-t border-slate-200 py-16 dark:border-slate-800">
      <h2 id="ask-heading" className="font-display text-3xl font-bold tracking-tight">Ask the agent</h2>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
        A Gemini agent with three read-only tools: count, list and look up leads. This public copy only sees anonymous data: lead numbers,
        dates, outcomes and short quotes.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-night-raised dark:ring-slate-800">
        <div ref={logRef} role="log" aria-live="polite" aria-label="Conversation" className="h-80 space-y-4 overflow-y-auto p-5 sm:h-96 sm:p-6">
          {messages.length === 0 && (
            <div>
              <p className="text-slate-600 dark:text-slate-400">Pick a question or write your own.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUESTIONS.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-left text-sm hover:border-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink dark:border-slate-700 dark:hover:border-slate-300 dark:hover:bg-night dark:focus-visible:outline-slate-300"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === 'you' ? (
              <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2 text-white dark:bg-slate-100 dark:text-ink">
                <span className="sr-only">You: </span>
                {m.text}
              </p>
            ) : (
              <div key={i} className="max-w-[92%] rounded-2xl rounded-bl-md bg-paper px-4 py-3 motion-safe:animate-rise dark:bg-night">
                <span className="sr-only">Agent: </span>
                <AgentText text={m.text} />
              </div>
            ),
          )}
          {busy && <p className="font-mono text-sm text-slate-500 dark:text-slate-400">Looking it up…</p>}
        </div>

        <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
          <label htmlFor="ask-input" className="sr-only">Your question</label>
          <input
            id="ask-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            maxLength={500}
            autoComplete="off"
            placeholder="Ask about the leads…"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base placeholder:text-slate-400 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/20 dark:border-slate-700 dark:bg-night dark:focus:border-slate-300 dark:focus:ring-slate-300/20"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-lg bg-ink px-4 py-2 font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50 dark:bg-slate-100 dark:text-ink dark:hover:bg-white"
          >
            Ask
          </button>
        </form>
      </div>
    </section>
  )
}
