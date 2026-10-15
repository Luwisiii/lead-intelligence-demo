# Lead Intelligence Demo: React frontend for an n8n AI system

This file briefs Claude Code. Read it fully before doing anything, then start with **Build order → Step 1**, and confirm the plan with me before writing code.

## What this project is

A portfolio piece. A backend already exists in n8n: an "AI Lead Intelligence Assistant" that scores inbound leads with Gemini, matches payments, emails a weekly report and answers questions through a chat agent. It is built, tested and live.

**This repo adds a public React demo page** where visitors can:

1. Submit an inquiry and see the AI's verdict on the page within seconds (the showpiece)
2. See live, aggregate stats (leads, won, conversion rate, needs review)
3. Chat with the lead Q&A agent
4. Read a short "How it works" section

I'm comfortable with React. Explain n8n-side changes clearly, since I built those workflows by hand and want to understand any change.

## Stack

- Vite + React + TypeScript + Tailwind CSS
- `@n8n/chat` for the chat panel (mounted in a component via `useEffect`)
- Vercel for hosting, with **Vercel serverless functions in `/api` as a proxy** to n8n
- No database in this repo; n8n Data Tables are the source of truth

## The existing n8n backend

n8n Cloud instance: `https://luwisiii.app.n8n.cloud`. Every workflow uses timezone **Asia/Manila**.

| Workflow | ID | Trigger | What it does | Published |
|---|---|---|---|---|
| WF1 · Lead ingestion + analysis | `51icnVTrpAltxnSR` | n8n Form | Normalise → duplicate check → Gemini scoring → validate → save to Leads | Yes |
| WF2 · Payment sync | `OjWNjShV7PDsykXG` | Every 6 h + called by WF3 | Match payments to leads by email, mark lead `won` | Yes |
| WF3 · Saturday weekly report | `K30koYz004rvgnn9` | Saturday 9 AM | Runs WF2, counts outcomes, emails HTML report via Gmail | Yes |
| WF4 · Lead Q&A agent | `1OyZxdGndLISeunJ` | Chat Trigger (not public yet) | AI Agent (Gemini) + memory + 3 tools | Yes |
| WF4 · Lead data tools | `PMbjBalL4x3rRRJJ` | Called by WF4 | Code node implementing `count_leads`, `find_leads`, `get_lead` | Yes |
| WF5 · Error handler | `vvr0nESrf3sb4SKn` | Error Trigger | Emails failure alerts; set as error workflow on all of the above | Yes |

Public form (current front door): `https://luwisiii.app.n8n.cloud/form/dfb21762-b03b-473f-8103-baff4a3051d8`

Project ID: `0rueEmei38UZCi52`. Credentials in n8n: Google Gemini, Gmail, Google Sheets (unused).

### Data Tables

**Leads** (`JuVNTrPsVPYAxXrM`): one row per lead.

- Identity: `submission_id` (hash of email + message, used for dedupe), `name`, `email`, `company`, `message`, `received_at` (date)
- AI analysis: `ai_intent` (buying / pricing_question / partnership / support / spam), `ai_temperature` (hot / warm / cold / unclear), `ai_confidence` (number 0–1), `ai_evidence` (exact quote from the message), `ai_budget`, `ai_timeline`, `ai_summary`, `ai_next_step`
- Outcome: `payment_id`, `manual_outcome`, `final_outcome`, `review_note`
- Run status: `status`, `error_message`
- System: `id`, `createdAt`, `updatedAt`

**Payments** (`JpOsVaWFI0JnX9pe`): `customer_email`, `amount`, `paid_at`, `description`. Read only by the system.

### Business rules (keep these consistent everywhere)

- **Final outcome precedence:** Payment > manual override > AI. In code: `payment_id ? 'won' : (manual_outcome || final_outcome || 'unclear')`.
- **Needs review:** outcome is not `won`, and either outcome is `unclear` or `review_note` is set.
- **AI guardrails in WF1:** the evidence must be a real quote found in the message, or the lead becomes `unclear`. `hot` below 0.8 confidence becomes `unclear`. Below 0.7 adds a review note.
- **Spam** is counted separately and excluded from the conversion rate.
- Counts always come from code over stored rows, never from the AI.

## What to build

### n8n changes (do these first)

**A. Lead intake API** (`POST`): the page posts an inquiry and gets the scored result back.

- Recommended approach: move WF1's core (Normalise → dedupe → Gemini → validate → save) into a sub-workflow, "Score lead", that returns the saved row or `{ duplicate: true }`. Then both the existing form workflow and a new "Lead intake API" workflow call it. Discuss this with me before changing WF1, since WF1 is live.
- The API workflow: `Webhook (POST, Header Auth, respond via Respond to Webhook)` → honeypot check → rate limit → call "Score lead" → `Respond to Webhook`.
- Every path must respond, including duplicates and rejections. Today `Already in Leads?` (operation *If Row Does Not Exist*) just stops on duplicates, which would leave a webhook hanging until it times out.
- Request body: `{ name, email, company?, message, website }`. `website` is a hidden honeypot: if it's filled, return a fake success and save nothing.
- Response body, success: `{ ok: true, result: { final_outcome, ai_temperature, ai_confidence, ai_evidence, ai_summary, ai_next_step, ai_budget, ai_timeline, review_note } }`. Other cases: `{ ok: true, duplicate: true }`, `{ ok: false, error: 'rate_limited' }` (HTTP 429), `{ ok: false, error: 'invalid' }` (HTTP 400).
- Rate limits (they protect the Gemini free tier): max 5 submissions per email per 24 h, and a global cap of about 50 per day, both checked against Leads.

**B. Stats API** (`GET`): `Webhook (Header Auth)` → Get all leads → Code → `Respond to Webhook`.

- Returns aggregates only: `{ period, total, by_outcome: { won, hot, warm, cold, unclear }, conversion_rate, needs_review, spam }`.
- **Never return names, emails or messages.** This page is public.
- Reuse the `count_leads` logic from the "WF4 · Lead data tools" Code node.

**C. Public chat:** WF4's Chat Trigger, set to public, Embedded mode, with authentication and allowed origins.

- **Privacy problem to solve first:** `find_leads` and `get_lead` return emails and full messages. A public visitor could ask "show me all leads" and see other visitors' data.
- Fix: add a `redact` input to the tools sub-workflow (drop `email`, reduce the name to a first name, truncate the message). Make a public copy of the agent that always passes `redact: true`. Keep my private agent unchanged.

### Vercel proxy (`/api`)

The browser never talks to n8n directly and never sees a secret.

- `api/lead.ts` (POST) → n8n intake webhook, adding header `X-Demo-Key`
- `api/stats.ts` (GET) → n8n stats webhook, adding the same header. Cache the response for about 60 s.
- `api/chat.ts` (POST) → n8n public chat webhook, adding its auth
- Env vars: `N8N_BASE_URL`, `N8N_LEAD_PATH`, `N8N_STATS_PATH`, `N8N_CHAT_PATH`, `N8N_DEMO_KEY`, `N8N_CHAT_AUTH`. Keep them in `.env.local` locally and in the Vercel dashboard in production. Never commit them.
- Validate input in the proxy too (lengths, email format), and pass n8n's status codes through.

### Frontend (single page)

1. **Hero:** one line on what this is, with links to my portfolio write-up and GitHub.
2. **Try it:** a form with name, email, company and message, plus the hidden honeypot.
   - States: idle, scoring (Gemini takes about 3–10 s, so show progress text, not a bare spinner), result, duplicate, rate limited, error.
   - Result card: an outcome badge (won green, hot red, warm orange, cold slate, unclear violet), a confidence bar, the evidence quote styled as a quote, the summary, the next step, and budget/timeline chips. If `review_note` is set, show "Flagged for human review" with the note.
   - Two or three sample messages the visitor can click to prefill (one hot, one warm, one vague).
3. **Live stats:** four cards (leads, won, conversion rate, needs review), refetched after each submission.
4. **Ask the agent:** the `@n8n/chat` panel, with suggested questions ("How many leads this week?", "Which leads need review?").
5. **How it works:** a simple architecture diagram (five workflows, Leads table, Gmail) and three or four bullets on the guardrails.

It needs to work well at phone width, be keyboard accessible, and support dark mode.

## Lessons already learned (avoid repeating these)

- **Gemini free tier:** about 5 requests per minute, plus occasional 503 "high demand" errors. Both AI nodes have Retry On Fail (3 tries, 5 s). Don't fire test requests in parallel.
- **Gemini model names change.** `models/gemini-2.5-flash` returns a 404 for new API keys. WF4's model is set to `models/gemini-3.5-flash`. WF1's model node uses the default. If you get a 404, pick a current Flash model from the node's list.
- **A workflow called as a tool or sub-workflow must be published**, or it fails with "Workflow is not active". The error workflow must also be published before other workflows can reference it.
- **Error workflows fire only for production runs,** not manual test runs.
- **Data Table Update:** in "Map Each Column Manually" mode, remove every column you're not setting, or they may be blanked.
- **Steps that can return zero items** (a sub-workflow with no matches, an empty Get) need "Always Output Data", or the workflow silently stops.
- **Expression fields need the `=` prefix.** A system message pasted as plain text won't evaluate `{{ }}`.
- **Format dates with the workflow zone:** `DateTime.fromISO(iso, { zone: $now.zone })`.
- **Saving the n8n editor from a stale tab overwrites newer changes.** Reload before editing.
- **Test data:** Leads has 2 test rows and Payments has 2 test rows. Ask me before deleting them.

## Working agreement

- Ask before changing a **published** workflow, publishing anything new, or deleting data. When in doubt, build a new workflow alongside the old one rather than editing the live one.
- Explain n8n changes in plain steps (which node, which setting), so I can follow and redo them by hand.
- Never commit secrets. Add `.env*` to `.gitignore` from the first commit.
- Test each piece before moving on: hit the webhook with curl, then through the proxy, then from the UI.
- Small, descriptive commits.

## Build order

1. **Plan check:** summarise this brief back to me in 5–8 bullets and list any questions. Wait for my go-ahead.
2. **n8n, stats API (B):** the simplest piece, and read-only. Test it with curl.
3. **n8n, lead intake API (A):** agree on the sub-workflow approach with me first. Test duplicate, honeypot, rate limit and success.
4. **Scaffold** Vite + React + TS + Tailwind, set up `.gitignore` and `.env.local`, and make the first commit.
5. **Vercel proxy** functions, tested locally with `vercel dev`.
6. **Frontend:** form and result card first, then stats, then the "How it works" section.
7. **n8n, public chat (C)** with redaction, then the chat panel.
8. **Polish:** mobile, dark mode, loading and error states, and a README with screenshots.
9. **Deploy** to Vercel, set the env vars, and restrict CORS / allowed origins to the production domain.
10. **Final test:** the full visitor journey on a phone, plus a check that no personal data appears anywhere public.
