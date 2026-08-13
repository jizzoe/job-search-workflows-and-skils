# ChatGPT Work (OpenAI) — Overview & Job Search Fit

_Captured 2026-08-05. Companion to cowork-overview.md — same research pass, different vendor. For deep-dive/setup later._

## Naming Clarification

"Codex" and "ChatGPT Work" are two different OpenAI products:

- **Codex** = OpenAI's coding agent — the actual analog to **Claude Code** (repo access, running tests, opening PRs). Not the right comparison point for Cowork.
- **ChatGPT Work** (launched July 9, 2026) = OpenAI's actual analog to **Claude Cowork** — a general outcome-oriented agent that gathers context across apps and returns finished artifacts. Has Codex's engine built in under the hood, which is likely why the two get conflated.

This document covers **ChatGPT Work**, since it's the one comparable to Cowork for job-search purposes.

## What It Is

Launched July 9, 2026, running on GPT-5.6. Positioned as the "agent layer" of ChatGPT: you give it an outcome rather than a question, and it plans, works independently for hours, and delivers finished materials rather than chat replies.

Launched alongside a structural merge: the standalone Codex app folded into one ChatGPT desktop app (Chat / Work / Codex together, on every plan including Free), and OpenAI began sunsetting its standalone Atlas browser, folding that browsing capability into ChatGPT itself.

## How It Works

Four-stage pipeline:

1. **Context gathering** — 1,400+ plugins connect existing tools; @-mention an app to pull its context into a task; ChatGPT auto-suggests relevant plugins as work unfolds
2. **Planning** — "Plan mode" produces a step-by-step plan you approve/adjust before work starts
3. **Execution** — including **Scheduled Tasks**: run once, on a schedule, on an event trigger, or continuously as a monitor
4. **Artifact delivery** — sheets, slides, docs, and **Sites** (public beta) — shareable interactive web apps/dashboards/trackers that stay updated as underlying info changes

### Where it runs

- **Web & mobile:** staged rollout — Pro/Enterprise/Edu first, Plus/Business shortly after
- **Desktop:** macOS live at launch, Windows rolling out shortly after. Desktop is the fuller surface — local files, a built-in multi-tab browser, and Computer Use (clicking/typing/moving files on your behalf)

### Governance

Built on ChatGPT Enterprise's security/compliance foundation. Includes an "auto-review" layer where higher-capability models review consequential actions before execution, plus configurable approval gates. OpenAI reported blocking 100% of data-extraction attempts in adversarial red-teaming — a strong signal, but a red-team result, not a production guarantee.

### Pricing — important caveat

**Usage-metered like Codex, not a flat included feature.** No published per-task rates at launch; longer/more involved tasks consume more of the plan's usage allowance. A long-running job-search monitor could add up in ways a flat subscription wouldn't — worth measuring before committing to a recurring schedule.

## Problems It Solves

Same category as Cowork: moving from "chat window beside the work" to "delegate the actual workflow, get finished output back" — via persistent context, tool access, and hours-long unsupervised execution.

## Sample Use Cases (from OpenAI's launch materials / early testers — self-reported, vendor program)

- Lead-drop-off triage across CRM/call/email tools, surfaced into a weekly dashboard (Zapier)
- Recurring competitor-journey benchmarking, compressed from weeks to hours (Virgin Atlantic)
- Event-prep number-crunching, run twice weekly as a standing process (NVIDIA)
- Launch-readiness tracking, scaled from 1 PM/6 customers to ~50 PMs/~80 customers (RingCentral)
- Month-end close, compressed from days to hours (OpenAI internal finance)

---

## Fit for the Job Search

| Need | ChatGPT Work capability | Note |
|---|---|---|
| Search job sites | Built-in browser / Computer Use (desktop) | Same "needs desktop surface" pattern as Cowork |
| Apply to positions | Computer Use + plugins | Desktop-only for authenticated actions |
| Track leads via email/LinkedIn | Plugin connections (@-mention apps) + Computer Use | Depends on plugin coverage for those specific platforms |
| Track interviews/certs | Sites (interactive tracker) or sheets/docs | Sites is a stronger fit here than a plain spreadsheet — a live, shareable dashboard is a named use case |
| Recurring check-ins | Scheduled Tasks | Same concept as Cowork's scheduled tasks — can run continuously as a "monitor" |

### Key differences from Claude Cowork

- **Sites** — genuinely distinct capability: interactive, updatable web trackers/dashboards, not just static documents
- **Usage-metered pricing** — real budget risk for a long-running, multi-week job-search monitor, with no published rate to plan against up front
- **Plugin ecosystem breadth** (1,400+) — may or may not include the specific job boards/tools relevant here; not yet verified

See `job-search-tracker-chatgpt-work-sketch.md` for a concrete first draft of what a ChatGPT Work version of the tracker/scheduled-task setup might look like.
