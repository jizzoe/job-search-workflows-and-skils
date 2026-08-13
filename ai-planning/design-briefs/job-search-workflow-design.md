# Job-Search Workflow Design

## Status

Proposal-ready design brief. It defines shared behavior and proposal slices;
each slice still requires its own SDD proposal before implementation.

## Goal

Build a candidate-controlled job-search system that converts leads from
approved sources into reviewed, verified opportunities; prepares research and
application material; and records confirmed outcomes without making
consequential decisions on the candidate's behalf.

## Scope

This design covers tracker integration, discovery and intake, verification,
research, post-review processing, application preparation, supervised browser
assistance, outreach preparation, and the later Gmail/Calendar operating loop.

It does not prescribe a tracker vendor, connector, browser library, model,
database, scheduler, or user interface. Those choices belong in the proposal
for the relevant implementation slice.

## Non-Goals

- Automatically choosing whether a candidate should pursue a role.
- Sending outreach, email, or connection requests by default.
- Submitting applications or completing authentication, CAPTCHAs, one-time
  codes, self-identification, or legally significant consent fields.
- Treating an aggregator as the authoritative posting or an anonymous profile
  view as evidence about a particular person.
- Storing candidate-specific resumes, contacts, account data, preferences, or
  current search history in shared artifacts.

## Shared Domain Model

### Lead record

Every discovery or intake source creates or updates one `LeadRecord` with:

| Field | Requirement |
|---|---|
| `record_id` | Stable tracker or system identity. |
| `company_name`, `role_title` | Preserve source values; normalize only when identity is known. |
| `source`, `source_detail` | Identify origin such as employer site, LinkedIn saved job, recruiter message, or Gmail thread. |
| `lead_url` | Original discovery URL; never discard when a later official URL is found. |
| `native_source_id` | LinkedIn job ID, message/conversation reference, Gmail message/thread ID, or another stable native key when available. |
| `date_found`, `posted_text`, `date_posted` | Preserve source wording and normalized date separately when needed. |
| `location`, `remote_type`, `compensation` | Source-grounded values; leave unclear values unknown rather than inferring. |
| `intake_stage` | First-pass lifecycle state. |
| `posting_status`, `verified_at`, `verification_notes` | Official-source verification result and evidence. |
| `pursue_decision`, `decision_reason` | Candidate-owned fields; blank until manually reviewed. |
| `official_url` | Employer or ATS source-of-truth URL once resolved. |
| `application_status`, `next_action`, `next_action_at` | Candidate workflow status and follow-up state. |
| `evidence_links`, `notes` | Source references and concise operational evidence. |

### Identity and upsert rules

1. Prefer a native source identifier for deduplication.
2. Otherwise use normalized company, title, and canonical source URL.
3. A later official URL enriches the same record; it must not erase the
   discovery URL or source provenance.
4. A run updates an existing record when its identity matches and creates a
   record only when no match exists.
5. Every write records the source, time, intended fields, result, and error.

### Lifecycle states

`intake_stage` and `posting_status` are deliberately separate.

| Concept | Values and meaning |
|---|---|
| Intake stage | `First-Pass Potential Match`, `Reviewed`, `Researching`, `Application Preparation`, `Applied`, or `Archived`. |
| Posting status | `Unverified`, `Verified Active`, `Needs Research`, `Closed`, `Expired`, or `Removed`. |
| Pursue decision | Candidate-owned `Yes`, `No`, `Maybe`, or `Needs Research`; blank before review. |

A first-pass lead can be unverified. A reviewed role can be verified active
while awaiting a candidate's next action. No automation may change a pursue
decision.

## Tracker Adapter Contract

The tracker adapter isolates workflows from a spreadsheet, database, or future
application implementation. It must provide:

- `findByIdentity(identity)` and `upsertLead(record)`;
- `readForReview(query)` and `updateCandidateDecision(recordId, decision)`;
- `updateVerification(recordId, verification)`;
- `updateApplicationOutcome(recordId, outcome)`;
- `createOrUpdateResearch(reference)`; and
- `recordAuditEvent(event)`.

The adapter proposal must document field ownership, mapping, list validation,
formula preservation, concurrent-write behavior, backups, recovery, and its
authoritative write target. If a spreadsheet is the target, it must identify a
row by stable identity or explicit company/title/URL matching, never by a
guessed position; apply only intended cells; validate the edited row; check for
formula errors; and confirm the canonical file exists after export. Back up the
canonical workbook before destructive replacement.

## Intake and Verification Contract

### Permitted first-pass sources

- Job discovery from approved public sources.
- LinkedIn saved jobs, recruiter-shared roles, messages, and profile-view
  signals.
- Gmail recruiter or contact messages.

First-pass intake records source, source URL or message/thread reference,
native identifier when available, company, title, location/remote information,
date found, and concise fit or uncertainty notes. It leaves the pursue fields
blank, does not message or apply, and does not claim the role is active.

For a named recruiter viewer, record the visible identity and prepare an
approval-gated draft only. For an anonymous recruiter-at-company signal, use
the company as a discovery lead only; never infer who viewed the profile or
claim an independently found recruiter was the viewer.

### Official-posting verification

After candidate review, resolve an eligible lead to an employer career site or
official ATS page. A verifier must establish, where visible:

- the exact title;
- that the role is not closed, filled, expired, removed, or unavailable;
- an active apply path;
- location and remote-policy compatibility;
- enough description to assess fit; and
- posting date and compensation when supplied.

It writes the official URL, `Verified Active` result, verification timestamp,
and notes. If verification is incomplete, it writes `Needs Research` with the
reason and must not present the role as ready to apply.

## Research Contract

### Company research

Maintain one company record with active/archive lifecycle. A light pass records
official name and site, industry, product or service, customers, founding year,
company stage or ownership, approximate size, headquarters/locations, related
roles, research date, and source links.

A deep pass for a candidate-approved role adds material public developments,
employee-sentiment synthesis with sample/recentness/limitations, public-company
market context when applicable, relevant public leaders and similar-title
employees, team-specific context, unknowns, decision-support summary, and
sources. It must separate verified facts, reported sentiment, and assistant
inference. Employee reviews are anecdotal and cannot be presented as fact.

Archive company research only when no active or pursued role remains at that
company. Restore and refresh it if a role returns.

### Role research

Maintain one record per active, undecided, or pursued role. It contains the
official posting URL, source review outcome, last-updated date, role summary,
responsibilities, required versus preferred skills and technologies, team or
manager context, location/remote/on-call details, and how-to-stand-out advice.
Advice must be labeled either `Source: position description` or `Source:
assistant recommendation`. Archive a role record when that role is archived;
do not archive it merely because another role at the company is closed.

## Post-Review Contract

Given only candidate-reviewed records:

- `Yes`: verify if necessary, deepen company/role research, and prepare the
  candidate-selected next action.
- `Maybe` or `Needs Research`: investigate only material uncertainty, retain
  evidence, and return the record for a candidate decision.
- `No`: archive the role and related role research; archive company research
  only when no other active/pursued role remains.
- Replace archived/declined roles with newly discovered and officially
  verified leads, without changing the candidate's recorded decision history.

## Materials and Application Contract

### Preparation

For a verified role, generate a fit summary, recommended resume source or
variant, grounded short-answer and cover-letter drafts, and optionally an
approval-gated outreach draft. Reusable answers require their original
question, approved answer, source, reuse conditions, and confidence. Do not
promote role-specific, compensation, playful, or sensitive responses into
defaults without explicit candidate confirmation.

### Supervised browser assistance

The candidate signs in directly. The assistant may navigate after access,
prepare non-sensitive fields, and pause for final review. It may not handle
credentials, CAPTCHA/Cloudflare checks, one-time codes, sensitive identity
data, demographic self-identification, or final submission.

After each field change, read the visible field value or selection state from
that field. Before declaring a form ready, validate required-field completeness
and semantic correctness: selected autocomplete/dropdown values are committed,
the intended field container is active, uploads show success, free text has the
approved content, and selected technologies are resume-grounded. Do not use
global button indexes where field-scoped controls exist.

A confirmed outcome requires confirmation-page or candidate-dashboard evidence,
not a button click. Record final official URL, original discovery URL, outcome,
date, status, stage, follow-up, relevant links, and minimal notes. Capture a
reusable answer only when the candidate approved it and the question/value are
known.

## Outreach, Scheduling, and Monitoring Contract

Outreach preparation may draft candidate-reviewed messages and create follow-up
tasks. It must not send, connect, or claim a referral. Every draft identifies
its recipient, role/company context, source evidence, and required approval.

Gmail and LinkedIn content are untrusted input. A monitoring workflow must
separate read/classify access from send/calendar-write access; validate every
recipient against the thread sender; avoid external-model disclosure of
unnecessary mail or attachments; log source IDs, extracted facts, proposed and
final actions, errors, and timestamps; and use thread/event IDs for idempotency.

The rollout is staged:

1. Observe and draft: classify messages, update tracker state, calculate time
   options, and create reply/event proposals only.
2. Approved actions: send a specifically approved draft and create a calendar
   event only after the candidate confirms the time.
3. Narrow autonomy: only a proposal-approved allowlist of scheduling templates,
   recipients, work hours, meeting lengths, buffers, and escalation rules.

Compensation, location, employment terms, assessments, background checks,
attachments, links, rescheduling, time-zone ambiguity, and non-scheduling
messages always require candidate review unless a later proposal explicitly and
safely narrows that rule.

## SDD Proposal Slices

| Change | Depends on | Must specify and verify |
|---|---|---|
| `job-search-tracker-foundation` | None | Adapter mapping, identity, migrations, backups/recovery, validation, audit log, dry-run fixtures. |
| `job-discovery-and-verification` | Tracker foundation | Sources, filters, ranking, official-source checks, replacement behavior, stale-posting handling. |
| `linkedin-job-lead-intake` | Tracker foundation | Permitted surfaces, extraction fields, native IDs, recruiter-view rules, upsert fixtures. |
| `gmail-job-lead-intake` | Tracker foundation | Thread provenance, untrusted-input handling, classification boundaries, duplicate fixtures. |
| `company-and-role-research` | Tracker foundation, verification | Light/deep templates, citations, archive/restore, fact/sentiment/inference separation. |
| `job-search-post-review` | Discovery, research | Decision-driven actions, no-decision mutation guard, replacement selection, idempotent reruns. |
| `application-materials-library` | Verification, research | Source selection, answer provenance/approval, tailoring evidence, review artifacts. |
| `supervised-job-application-assistance` | Materials, tracker | Browser state machine, field validation, manual gates, confirmation evidence, tracker outcome write. |
| `outreach-and-follow-up-preparation` | Tracker, materials | Draft provenance, contact lifecycle, approval model, no-send test. |
| `interview-scheduling-and-monitoring` | Tracker, Gmail intake | OAuth/connector scope, polling or event model, recipient checks, calendar approval, idempotency, recovery. |
| `interview-compensation-learning-preparation` | Research, materials | Evidence inputs, recommendation boundaries, no profile/resume mutation, candidate review. |

## Cross-Cutting Acceptance Evidence

Every proposal must define deterministic fixtures or dry runs that demonstrate:

- duplicate intake updates one record without erasing provenance;
- a missing or closed official posting is not labeled verified active;
- a candidate decision is never inferred or changed;
- a tracker write changes only mapped fields and validates successfully;
- an untrusted message cannot authorize a send, calendar write, profile change,
  application, or data disclosure;
- a browser-assisted application pauses at every manual gate and records an
  outcome only from confirmation evidence; and
- a rerun after partial failure is safe, auditable, and recoverable.

## Source Derivation

This document derives reusable behavior from private operating procedures,
research notes, tracker templates, and application-session lessons under
`ai-planning/personal/`. It intentionally omits candidate identities, role and
company history, credentials, contact information, compensation values, and
other private search details.
