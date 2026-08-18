# Job-Search Automation Readiness Assessment

## Scope and Method

This assessment inventories the skill artifacts committed in this repository
and compares their implemented behavior with the workflow documented in:

- `ai-planning/design-briefs/job-search-skill-roadmap.md`
- `ai-planning/design-briefs/job-search-workflow-design.md`
- `openspec/specs/job-search-tracker/spec.md`

It distinguishes executable repository artifacts from planning documents and
from skills available in a developer's local environment. A locally installed
skill is not counted as repository implementation unless this repository owns
its artifact and tests.

## Executive Assessment

**The repository is not yet ready to automate an end-to-end job search.** It
has one implemented job-search capability: a well-tested, local-only tracker
reference adapter. That adapter is an important foundation, but it does not
connect to a live tracker, discover or verify jobs, access LinkedIn or Gmail,
perform research, interact with application forms, send drafts, or manage a
calendar.

The documented workflow is substantially broader than the implemented code.
The next safe step is to build the planned OpenSpec changes in dependency order
rather than connect the reference adapter directly to personal systems.

## Implemented Repository Skills

### `job-search-tracker`

Path: `skills/job-search-tracker/`

This is the repository's only implemented job-search skill. It is an
assistant-neutral Node.js CLI and local JSON reference adapter. It requires an
explicit local `.json` target and rejects URLs, external connections,
credential-backed targets, and known protected-source patterns.

| Capability | Implemented behavior |
|---|---|
| Lead schema | Persists the complete `LeadRecord` contract: source and official URLs, native IDs, provenance, lifecycle states, candidate-owned decision fields, outcomes, evidence, notes, research references, and audit events. |
| Identity and deduplication | Prefers native source IDs; otherwise uses normalized company, role, and canonical discovery URL. Ambiguous fallback matches stop without mutation. |
| Intake writes | `upsertLead` creates or enriches first-pass leads while preserving original discovery provenance and not changing candidate decisions. |
| Review and decisions | `findByIdentity`, `readForReview`, and an explicit `updateCandidateDecision` operation are available. Decision writes require `candidate_confirmed: true`. |
| Verification and outcomes | `updateVerification` and `updateApplicationOutcome` have separate field allowlists and lifecycle validation. |
| Research and audit | `createOrUpdateResearch` stores references; `recordAuditEvent` and semantic operation keys make actions auditable and retry-safe. |
| Persistence safety | Dry-run planning, same-directory temporary writes, pre-replacement backups, post-write validation, recovery behavior, and idempotent retries are implemented. |
| Safety | Imported values are inert data; operation-specific fields reject cross-domain mutation. No external requests, sends, calendar writes, decisions, or submissions exist. |

Current deterministic evidence: `npm test --prefix skills/job-search-tracker`
passes **10 tests** covering assistant parity, lifecycle separation,
provenance-preserving upserts, ambiguity stops, field ownership, local-target
rejection, dry runs, untrusted input, protected fixtures, recovery, backups,
and retry idempotency.

### OpenSpec lifecycle skills

Paths: `.agents/skills/openspec-*/` and matching `.claude/skills/openspec-*/`

These are duplicated assistant integrations for repository governance. They do
not automate job-search work; they govern how reusable changes are explored,
planned, implemented, validated, synchronized, and archived.

| Skill | Capability |
|---|---|
| `openspec-explore` | Investigate the codebase and clarify a proposed change without implementation. |
| `openspec-propose` | Create proposal, specification, design, and task artifacts for a selected change. |
| `openspec-apply-change` | Implement a selected, proposal-ready OpenSpec change. |
| `openspec-verify-change` | Check implementation completeness, correctness, and coherence against its artifacts. |
| `openspec-sync-specs` | Promote accepted delta requirements into the living specifications. |
| `openspec-archive-change` | Finalize and archive a completed, verified change. |

The `.claude/commands/opsx/` files are command wrappers for those lifecycle
skills. They are not additional job-search capabilities.

## Other Repository Assets

- `ai-planning/design-briefs/` defines the intended job-search architecture;
  it is not executable automation.
- `ai-planning/research/` records research and reusable design input; it is
  not executable automation.
- `ai-planning/scripts/render_resume_pdf.py` renders a resume PDF; it is a
  supporting script, not a job-search workflow skill.
- Resume artifacts are candidate material, not automation capabilities.

## Documented Workflow Coverage

| Documented capability | Repository implementation | Readiness |
|---|---|---|
| Tracker foundation and local, safe LeadRecord operations | `job-search-tracker` reference adapter | Implemented foundation only |
| Live spreadsheet/database adapter and candidate-data migration | None | Missing |
| Job discovery and replacement intake | None | Missing |
| Official posting verification and fit assessment | None | Missing |
| LinkedIn saved jobs, messages, recruiter signals, and profile views | None | Missing |
| Gmail recruiter/contact lead intake | None | Missing |
| Company light/deep research and role-research lifecycle | None | Missing |
| Post-review archival, targeted research, and replacement workflow | None in this repository | Missing |
| Resume selection/tailoring, cover letters, and approved-answer library | None | Missing |
| Supervised browser-assisted application preparation and validation | None | Missing |
| Outreach drafting, contact lifecycle, and follow-up preparation | None | Missing |
| Gmail reply drafting, interview scheduling, and Calendar integration | None | Missing |
| Interview preparation, compensation support, and learning recommendations | None | Missing |

An installed environment may provide a `job-search-post-review` skill, but it
is not stored, specified, tested, or versioned in this repository. It must not
be treated as an implemented repository capability until it is imported or
reimplemented through an approved OpenSpec change.

## What Is Missing Before Useful Automation

### Essential workflow implementations

1. **Live tracker adapter**: map the canonical contract to an explicitly
   authorized spreadsheet or database; define field ownership, locking,
   backups, validation, migration, recovery, and audit retention.
2. **Discovery and verification**: collect leads from allowed sources, apply
   candidate-controlled filters, resolve each eligible lead to an official
   employer/ATS page, record evidence, and recheck stale listings.
3. **LinkedIn and Gmail intake**: define allowed surfaces, OAuth/session
   boundaries, native-ID extraction, prompt-injection handling, upserts, and
   dry-run fixtures.
4. **Research and post-review**: implement company/role record creation,
   evidence/citation standards, archive/restore behavior, decision-driven
   actions, and verified replacement selection.
5. **Application materials and supervised assistance**: create an approved
   answer contract, resume-selection/tailoring evidence, form-state validation,
   manual gates, confirmation evidence, and safe tracker outcome updates.

### Operational controls

Before connecting a real account or live tracker, each connector proposal must
also define:

- account ownership, minimal OAuth scopes, secret storage, revocation, and
  credential rotation;
- platform terms-of-service review, rate limits, and retry/backoff behavior;
- an approval interface or explicit durable approval record for each external
  write, send, calendar event, and final submission;
- observability, error classification, audit retention, failure alerts, and
  replay/recovery procedures;
- synthetic test fixtures plus narrowly scoped integration or dry-run evidence;
- private-data minimization, retention/deletion policy, and redaction before
  any external model is called; and
- a scheduler/worker deployment model only after its unattended behavior,
  idempotency keys, and human escalation path are specified.

## Recommended Completion Order

The existing roadmap order remains correct:

1. `job-search-tracker-foundation` is complete as a local reference adapter.
2. Propose and implement `job-discovery-and-verification`.
3. Propose and implement `linkedin-job-lead-intake` and
   `gmail-job-lead-intake` against the tracker contract.
4. Propose and implement `company-and-role-research` and
   `job-search-post-review`.
5. Propose and implement `application-materials-library` and
   `supervised-job-application-assistance`.
6. Propose and implement `outreach-and-follow-up-preparation`.
7. Propose and implement `interview-scheduling-and-monitoring`, then
   interview, compensation, and learning preparation.

The live tracker adapter can be proposed either immediately after the
foundation or alongside the first workflow that needs live persistence. It
must not bypass the reference adapter's guarantees.

## Readiness Decision

| Question | Answer |
|---|---|
| Is the repository ready for end-to-end job-search automation? | No. |
| Does it implement the complete documented workflow? | No. It implements only the tracker foundation. |
| Can it safely exercise the common lead-record contract with synthetic or explicitly authorized local JSON data? | Yes. |
| Can it currently automate live discovery, intake, research, application preparation, outreach, or scheduling? | No. |
| Is the next implementation step defined well enough for SDD proposal work? | Yes. The roadmap and workflow design provide proposal-ready contracts and ordered changes. |

## Evidence Reviewed

- `skills/job-search-tracker/SKILL.md`
- `skills/job-search-tracker/README.md`
- `skills/job-search-tracker/src/tracker.mjs`
- `skills/job-search-tracker/src/cli.mjs`
- `skills/job-search-tracker/test/tracker.test.mjs`
- `openspec/specs/job-search-tracker/spec.md`
- `openspec/changes/archive/2026-08-14-job-search-tracker-foundation/`
- `.agents/skills/openspec-*/SKILL.md` and `.claude/skills/openspec-*/SKILL.md`
- `ai-planning/design-briefs/job-search-skill-roadmap.md`
- `ai-planning/design-briefs/job-search-workflow-design.md`
