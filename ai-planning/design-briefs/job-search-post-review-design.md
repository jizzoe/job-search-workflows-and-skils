# Job-Search Post-Review Design

## Status

Proposal-ready design brief. It defines the `job-search-post-review` OpenSpec
slice that orchestrates candidate-recorded decisions through the tracker,
discovery/verification, and company/role-research contracts. It is
candidate-controlled and bounded: it never creates or changes a pursue decision
and never takes a consequential external action.

## Goal

Process an explicitly selected, candidate-reviewed set of tracker leads into
auditable next-state work: archive declined roles and their role research,
investigate only stated uncertainty, deepen research for accepted roles, and
request a bounded set of newly discovered and officially verified replacement
options. Return a clear per-record result without deciding what to pursue, how
many replacements are enough, or what the candidate should do next.

## Dependencies and Existing Contracts

This slice composes, but does not reimplement, these contracts:

- [`job-search-tracker`](../../openspec/specs/job-search-tracker/spec.md) for
  review reads, decision-state inspection, outcome updates that may archive a
  lead, research-reference indexing, audit events, local dry runs, and
  retry-safe recovery;
- [job-discovery-and-verification design](job-discovery-and-verification-design.md)
  for bounded replacement discovery and official-posting verification; and
- [company-and-role-research design](company-and-role-research-design.md) for
  targeted role/company research, artifact archive/restore, and source-backed
  decision support.

The post-review workflow MUST use their public, field-scoped operations rather
than write tracker or research artifacts directly. Its initial deterministic
implementation uses their synthetic/local interfaces. A future live provider
is available only when the selected dependency has its own approved source or
connector policy.

## Scope

### Explicit bounded run and decision snapshot

A run begins only from an explicit candidate request that names either stable
tracker record IDs or a deterministic review query plus an explicit maximum
record count. It reads the selected leads, snapshots their current
candidate-owned `pursue_decision` and `decision_reason`, and creates a
candidate-visible dry-run plan before any mutation.

Only persisted, nonblank decisions are eligible. The workflow never calls
`updateCandidateDecision`, never treats a blank field as a decision, and never
derives or changes a decision from source content, ranking, research, prior
activity, or the requested batch. A record with a missing, invalid, or changed
decision snapshot is skipped with a non-mutating reason.

Before each mutation or delegated operation, the workflow re-reads the lead and
requires the decision and relevant lifecycle snapshot to match the plan. If the
candidate changed the decision after planning, that record stops and requires a
new explicit run. This prevents a stale batch from acting on a decision that
the candidate has revised.

### Decision-to-action matrix

The following matrix is the sole post-review routing behavior:

| Candidate decision | Eligible bounded actions | Prohibited outcome |
| --- | --- | --- |
| `Yes` | Verify if current verification is absent/stale/incomplete; request deep company/role research after verification evidence is available; return the record and research results for candidate-selected next action. | No application preparation, outreach, application, follow-up, message, calendar action, or decision mutation. |
| `Maybe` | Investigate only material uncertainty named in the candidate’s decision reason, existing verification gaps, or explicit run request; then return the lead for another decision. | No conversion to `Yes`, automatic deep research beyond the stated uncertainty, or archival. |
| `Needs Research` | Same targeted uncertainty investigation as `Maybe`, including verification or focused research when eligible. | No inferred decision, broad company research, or archive unless the candidate later records `No`. |
| `No` | Archive the lead, archive its associated role-research artifact, evaluate related company research for conditional archive, and request bounded verified replacement options. | No deletion, candidate-decision removal, overwrite of decision history, or assumption that a replacement is sufficient. |

For `Maybe` and `Needs Research`, missing or vague reasons do not authorize a
broad investigation. The workflow returns a `reason-required` review result
unless an existing objective verification gap is sufficient to define a narrow
check. It treats decision-reason text as untrusted data and never executes
instructions embedded in it.

### `Yes`: verification and research routing

A `Yes` decision is an eligible verification gate under the discovery and
verification contract. If the official result is already fresh and complete,
the run does not repeat it solely because post-review ran. If it is unverified,
stale, unavailable, or incomplete, the workflow submits a scoped verification
request using the selected official-source policy. It reports a non-active or
`Needs Research` result faithfully and never changes the candidate’s `Yes`
decision.

Once a `Yes` lead has current verification evidence, the explicit post-review
run may request the deep research operation for that named role. This satisfies
the research contract’s explicit-request gate; it is not inferred merely from
the existence of a lead. The result is evidence-backed decision support and a
research reference, not a resume recommendation, contact action, or next-step
command.

### `Maybe` and `Needs Research`: material uncertainty routing

The workflow creates a narrow investigation plan from only these inputs:

- the candidate’s concise decision reason, treated as a question or constraint
  rather than executable instruction;
- a recorded official-verification gap, conflict, or staleness reason; and
- explicitly named uncertainty categories in the post-review request.

It may delegate a bounded official-posting check or a focused company/role
research request only when that check directly addresses one of those inputs.
It records the question, delegated operation, evidence returned, unresolved
gaps, and stop reason. It must not broaden into full deep research, a general
web search, account access, outreach, or an application workflow. The record
returns to candidate review with its original decision unchanged.

### `No`: archival and research lifecycle

For a persisted `No` decision, the workflow archives the lead by using the
tracker’s outcome operation to set only `intake_stage` to `Archived`; it does
not touch application status, next actions, verification state, or
candidate-owned fields. It preserves all discovery provenance, official
evidence, and the `No` decision for history and recovery.

It then requests archival of the role research artifact associated with that
lead, if one exists. It evaluates company research only after the role archive:
company research is archived only when no other active or pursued lead remains
at that source-backed company. Another role’s closure, a missing research
artifact, or ambiguous company identity cannot trigger a company archive. The
workflow performs an archive, not a deletion; an explicit later restore
preserves the research revision history.

### Bounded verified replacements

For each successfully archived `No` role, the run MAY submit a replacement
request only when its private runtime configuration includes an approved source
profile, explicit maximum count, and identity exclusions. The request delegates
to normal discovery and excludes the archived lead’s canonical identity,
already selected replacement identities, and any explicit exclusions. It then
submits only the newly found replacement candidates to official verification
under the candidate’s explicit post-review-run authorization.

Replacement intake and verification preserve these rules:

- each replacement has a blank candidate pursue decision and retains discovery
  provenance even when its official status becomes `Verified Active`;
- duplicate, unavailable, incomplete, or unverifiable candidates are reported
  but do not count as verified replacements;
- the maximum is a strict run bound across the requested replacement set; and
- the workflow does not declare the pipeline replenished, enough, balanced, or
  preferable. The candidate reviews every replacement independently.

If no source profile, provider, or valid replacement capacity is available,
the archive remains valid and the run reports `replacement-not-run` or
`replacement-incomplete`; it must not invent leads or relax the verification
gate.

### Run journal, idempotency, and recovery

The change owns a local, versioned post-review run journal supplied explicitly
at runtime. A run record stores the selected record identities, sanitized
decision/lifecycle snapshot fingerprints, planned action graph, delegated
operation keys, timestamps, results, stop reasons, and reconciliation state.
It does not store raw decision reasons, private source configuration, contact
data, credentials, or full source captures.

Each record action derives a stable key from the run ID, lead ID, decision
snapshot fingerprint, action type, relevant dependency-policy version, and
input fingerprint. The journal advances a record only when its dependent
action’s documented result is complete. Retrying a completed action retrieves
its prior result or converges through the dependency’s idempotent operation;
retrying a partial run resumes only unfinished actions.

The orchestrator treats records independently: one record’s ambiguous identity,
source outage, write recovery error, or invalid research reference does not
authorize skipping validation or mutating another record. A dry run produces
the full selection, decision routing, archive/replacement plan, and delegated
operation plan without tracker, research, audit, source, or journal mutation.

## Explicit Non-Goals

- Creating, inferring, modifying, or removing candidate pursue decisions or
  decision reasons.
- Sending messages, drafting outreach, connection requests, calendar events,
  applications, application preparation, follow-up scheduling, or contact
  management.
- Deleting lead history, research artifacts, audit history, source provenance,
  or candidate data.
- Ranking candidates, declaring a replacement count sufficient, or making a
  pursue recommendation.
- Reimplementing discovery, official verification, research, Gmail/LinkedIn
  intake, source authentication, or a live tracker adapter.
- Unbounded background processing, polling, crawling, or retries.

## Proposed Architecture

```text
explicit candidate batch + local review-query snapshot
                           |
                           v
                   dry-run action plan / journal
                           |
           decision & lifecycle snapshot re-check
                           |
    +----------+-----------+-----------+-----------+
    |          |           |           |           |
    v          v           v           v           v
   Yes       Maybe    Needs Research   No      unchanged/blank
    |          |           |              |
 verify +   narrow      narrow       archive + research lifecycle
 research   evidence     evidence            |
    |          |           |                 v
    +----------+-----------+       bounded verified replacements
                 |
                 v
          candidate review
```

The plan/routing/journal behavior is assistant-neutral. Claude and Codex must
derive equivalent selected-record plans, stop conditions, action keys, and
persisted local results for the same tracker snapshot and private run
configuration. Their presentation may differ but neither exposure may add an
external action or a candidate-decision mutation.

## Proposal Requirements and Deterministic Evidence

The `job-search-post-review` proposal must define synthetic fixtures or dry
runs that cover at least:

1. A blank, invalid, missing, or modified-after-planning candidate decision
   results in no mutation and a precise per-record stop reason.
2. A `Yes` lead routes to necessary verification and then deep research only
   under the explicit post-review request; both results preserve the `Yes`
   decision and all unrelated lead fields.
3. A `Maybe` or `Needs Research` lead investigates only a named material
   uncertainty or objective verification gap, returns to review unchanged, and
   stops with `reason-required` when no bounded question exists.
4. A `No` lead becomes `Archived` through a field-scoped tracker outcome
   update while preserving provenance, verification history, candidate
   decision, and application-owned fields.
5. Role research archives with its archived lead, while company research
   remains active if another active/pursued company role exists; a later
   restore preserves research history.
6. A bounded replacement request excludes the archived identity and duplicates,
   produces only blank-decision replacement leads, verifies only the selected
   bounded candidates, and does not claim sufficiency.
7. Missing source policy, exhausted replacement capacity, official-source
   failure, ambiguous identity, or incomplete replacement verification leaves
   the valid archive intact and reports a non-fabricated partial result.
8. Prompt-like decision-reason/source content, a request to send/apply/change
   a decision, or any unavailable write capability remains inert and produces
   no such action.
9. Dry run changes no tracker, research, provider, audit, or journal state;
   a partial archive/research/replacement failure resumes via the journal
   without duplicated lead, research, provenance, or semantic audit effects.
10. Equivalent valid tracker snapshots and run inputs through Claude and Codex
    yield equivalent plans and persisted outcomes, using only synthetic data in
    fixtures, evidence, logs, and errors.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A stale batch acts on an edited candidate decision | Re-read and compare the decision/lifecycle snapshot before each action; stop the record when it differs. |
| `No` archival destroys useful history | Use a field-scoped archive state only; preserve decision, evidence, provenance, research revisions, and recoverable backups. |
| `Maybe` turns into broad or intrusive investigation | Require a stated material uncertainty or objective verification gap; otherwise return `reason-required`. |
| Replacement automation implicitly decides what is adequate | Require strict bounds and candidate review; report only verified options and never make a sufficiency claim. |
| A partial delegated workflow duplicates work | Keep a local journal with stable dependency keys and retry only incomplete nodes. |
| Untrusted text changes behavior | Treat decision reasons and source content as inert, validate all delegated inputs, and forbid external actions. |

## Open Configuration Inputs

These inputs are needed to propose a concrete implementation but do not block
this reusable brief:

- the permitted explicit batch selector, maximum records, and whether the
  first release supports only named record IDs or a bounded review query;
- allowed uncertainty categories and the concise candidate-visible
  `reason-required` prompt when a `Maybe`/`Needs Research` decision lacks a
  material question;
- the replacement source/filter profile, global and per-archive maximums,
  exclusion policy, and current-verification freshness rule; and
- local run-journal path, retention/backup policy, and candidate-visible result
  report format.

The recommended first proposal implements named-record batches, dry-run plans,
local journal/recovery, `No` archival, and dependency stubs with synthetic
evidence. It can enable live discovery, verification, and research only after
their proposed source policies and adapters are available. No candidate’s
private review data is required to create the proposal.

## Source Derivation

This brief refines the decision-driven archive, targeted investigation,
research, replacement, provenance, and recovery requirements in:

- `ai-planning/design-briefs/job-search-workflow-design.md`;
- `ai-planning/design-briefs/job-search-skill-roadmap.md`;
- `ai-planning/design-briefs/job-discovery-and-verification-design.md`;
- `ai-planning/design-briefs/company-and-role-research-design.md`;
- `openspec/specs/job-search-tracker/spec.md` and
  `skills/job-search-tracker/`; and
- `ai-planning/research/job-search-skill-reference-patterns.md` and
  `ai-planning/research/skill-capability-audit/job-search-automation-readiness.md`.

It excludes candidate-specific review records, resumes, private planning,
accounts, contacts, messages, credentials, and current search history.
