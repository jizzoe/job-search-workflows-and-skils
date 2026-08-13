# Job-Search Skill Roadmap

## Purpose

Define the reusable, supervised job-search capability set this repository is
intended to build. This is directional planning, not implementation approval
or authorization to access external services.

The system helps a candidate discover, assess, prepare for, and manage job
opportunities while retaining candidate control over consequential decisions,
private data, messages, calendar changes, and submissions.

## Shared Principles

Every capability must:

- preserve provenance, native identifiers, evidence, and timestamps;
- use duplicate-safe upserts and declare its authoritative write target;
- distinguish a lead, a verified active posting, a candidate decision, and an
  application outcome;
- treat postings, email, messages, attachments, and web content as untrusted;
- separate observation and drafting permissions from write, send, and submit
  permissions; and
- keep candidate-specific data and preferences in ignored private storage.

The candidate owns pursue decisions, personal and legally significant answers,
outreach, final application submission, credential entry, and one-time codes.

## Capability Map

| Capability | Outcome | Initial priority |
|---|---|---|
| Tracker foundation | A durable adapter, lifecycle schema, idempotent writes, validation, backup, and dry-run fixtures. | Foundation |
| Job discovery and replacement intake | Source-grounded, qualified leads enter the common review queue; declined roles can be replaced with newly verified leads. | High |
| LinkedIn lead intake | Saved jobs, shared roles, messages, and recruiter-view signals become first-pass leads with provenance. | High |
| Gmail lead intake | Recruiter and contact email becomes first-pass leads with message or thread provenance. | High |
| Posting verification and fit | Reviewed leads are resolved to official sources, evaluated, and classified without inferring a pursue decision. | High |
| Company and role research | Reusable light/deep company research and role-research records provide evidence-backed decision support. | High |
| Post-review processing | Decisions drive archival, targeted research, and verified replacements. | High |
| Application materials | Fit summaries, resume selection/tailoring, approved-answer reuse, and cover-letter or short-answer drafts are prepared for review. | Medium |
| Supervised application assistance | Non-sensitive form preparation is validated, reviewed, and recorded after confirmation. | Medium |
| Outreach and follow-up preparation | Candidate-reviewed referral, recruiter, and hiring-manager drafts plus follow-up tasks are maintained. | Medium |
| Interview scheduling and operating loop | Inbound replies are classified, time options and drafts are proposed, and approved interview events are tracked. | Later |
| Interview, compensation, and learning preparation | Career stories, practice plans, market research, negotiation preparation, and evidence-based learning recommendations are produced. | Later |

## Lifecycle

1. Discovery, LinkedIn, and Gmail add only first-pass potential matches.
2. The candidate reviews the shared queue and records a pursue decision.
3. Reviewed candidates are verified against an official employer or ATS source.
4. Post-review work archives declined roles, resolves uncertainty, deepens
   approved research, and replenishes the queue with verified replacements.
5. The candidate may request materials, outreach preparation, or supervised
   application assistance for a verified role.
6. Confirmed application outcomes, follow-up actions, recruiter interactions,
   interview scheduling, and later preparation all update the same candidate
   owned record system.

## Delivery Sequence

1. Define tracker foundation and shared record contracts.
2. Build job discovery/replacement intake and official-posting verification.
3. Build LinkedIn and Gmail intake against the shared contract.
4. Build company/role research and post-review processing.
5. Build application materials and supervised application assistance.
6. Build outreach/follow-up preparation.
7. Build interview scheduling/monitoring, then interview, compensation, and
   learning preparation.

Each capability should be proposed and implemented as a focused SDD change.
The proposal-ready shared design is maintained in
`job-search-workflow-design.md`.

## Boundaries

No initial capability may send messages, create or modify calendar events,
submit an application, or alter candidate-owned decisions without explicit
approval. Narrower autonomy may be proposed only after an approval model,
allowlist, audit trail, recovery behavior, and test evidence are defined.

## Source Material

The concrete policies, examples, templates, and operational lessons informing
this roadmap are maintained under `ai-planning/personal/`. They are used to
derive reusable contracts, not copied into public planning documents.
