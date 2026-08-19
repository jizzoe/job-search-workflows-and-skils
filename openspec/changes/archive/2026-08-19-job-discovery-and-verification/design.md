## Context

See [proposal.md](proposal.md) for motivation. The living
[`job-search-tracker`](../../specs/job-search-tracker/spec.md) already owns
LeadRecord identity, source upsert, verification updates, field ownership,
local-only persistence, audit semantics, dry runs, and recovery. The
proposal-ready discovery brief defines the observable discovery and official
evidence rules, while intentionally leaving live source selection and private
candidate configuration out of the repository.

## Goals / Non-Goals

**Goals:**

- Add a portable, offline-first Node reference implementation under
  `skills/job-discovery-and-verification/` that calls the tracker only through
  its canonical versioned request/result boundary.
- Make source-policy, private filtering, explainable ranking, candidate gates,
  official evidence validation, replacement bounds, and retry keys executable
  with synthetic or manually captured inert snapshots.
- Prove all normative scenarios with deterministic Node built-in tests and a
  fixture scanner for known protected-data patterns.

**Non-Goals:**

- Live web collection, source crawling, OAuth, credentials, browser sessions,
  a scheduler, a tracker-vendor adapter, or a candidate-specific configuration.
- Resume matching, candidate-decision inference, outreach, calendar work,
  application preparation, or application submission.

## Decisions

### Canonical local request envelope and tracker bridge

The asset will expose a versioned JSON request/result CLI with explicit local
tracker target, operation key, dry-run flag, source policy, filter profile,
and inert observation or official-evidence payload. A bridge will invoke the
existing tracker CLI using its documented envelope rather than write tracker
JSON directly. The bridge receives and validates the tracker's structured
result, so Claude and Codex documentation invokes exactly the same command and
data contract.

This keeps tracker ownership centralized and allows a later tracker adapter to
preserve the same discovery behavior. Direct JSON mutation would bypass
identity, field ownership, audits, backup, and recovery guarantees.

### Snapshot provider and policy validation first

The first provider is a snapshot adapter: callers supply structured,
synthetic-or-manually-captured observations plus an approved source policy.
The policy declares source version, allowed URL patterns, request budget,
discovery/official role, recheck duration, and official employer/ATS patterns.
The implementation validates the complete provider output before filtering;
unrecognized fields, URLs, source identities, exhausted budgets, malformed
evidence, or forbidden fixture patterns stop without calling the tracker.

This implements the full boundary deterministically without pretending a
third-party source's terms, robots policy, rendering behavior, or access
control has been approved. A live source adapter remains a later, separately
proposed extension.

### Deterministic filters, ranking, and reports

The filter schema holds generic include/exclude and unknown-data policies;
runtime values are not persisted in shared test artifacts. Ranking is a sum of
declared source-grounded factors, with every evaluated factor emitted in the
report. Equal values sort by capture timestamp, source identity, and canonical
URL. The result distinguishes accepted, filtered, duplicate, malformed,
budget-stopped, and unavailable observations. Dry-run executes the same
planning branch but never invokes a tracker mutation.

This is preferred to an opaque score or resume-derived matching because it is
portable, auditable, and cannot silently make a pursue decision.

### Explicit verification gate and official-evidence evaluator

Verification accepts a tracker review record plus a caller assertion separate
from source content. It permits the request only when the record has a `Yes`
decision or explicit verification authorization. The evaluator accepts only a
matching policy-approved official employer or ATS URL, checks role/company,
active apply path, and availability, and produces a validation result before
calling `updateVerification`. It maps sufficient evidence to `Verified
Active`, official unavailability to its matching non-active state, and all
other uncertainty to `Needs Research` with reason codes.

The evaluator treats aggregators, cached content, and redirect escapes as
discovery evidence only. This conservative mapping is preferred to following
arbitrary redirects or silently treating a title page as active.

### Recheck and replacement orchestration stays explicit

Rechecks take an explicit batch request, calculate eligibility from a policy
deadline (seven days by default), and preserve existing evidence when
retrieval/evidence validation fails. Replacement discovery uses the normal
pipeline plus caller-supplied identity exclusions and a maximum accepted count.
Operation keys hash normalized policy, request, identity, and evidence
fingerprints. The tracker provides per-write recovery and audit idempotency;
the discovery layer journals deterministic result keys to avoid replaying
already-completed work after a partial batch failure.

No scheduler or background retry process is introduced: explicit callers own
when to run a recheck or replacement batch.

### Deterministic evidence and protected-data scan

Node's built-in test runner will cover every spec scenario with clean temporary
local tracker targets. Fixture scans will reject documented credential-like
patterns and protected repository paths before tests accept a fixture. Tests
will assert byte-level unchanged tracker state for rejected inputs and
dry-runs, preserved candidate/application fields, idempotent retry outcomes,
and equivalent CLI results for Claude/Codex guidance.

## Risks / Trade-offs

- [Snapshot-only providers do not prove live-source compatibility] → Keep the
  source contract and terms/rate-policy fields executable; add a live provider
  only through a later approved change with source-specific evidence.
- [Filter values can reveal candidate preferences] → Accept them only at run
  time, omit raw private values from reports and fixtures, and retain generic
  schema-level explanations.
- [Official pages vary in structure and redirects] → Require declared URL
  patterns and complete evidence; return `Needs Research` rather than guess.
- [Batch interruption can duplicate work] → Use stable operation keys,
  tracker idempotency, and result-key journaling with deterministic resume.

## Migration Plan

1. Add the offline discovery asset, contract documentation, synthetic fixtures,
   tests, and change-specific verification evidence without a live connector.
2. Run its Node test suite, tracker compatibility tests, strict OpenSpec
   validation, whitespace checks, fixture scan, and full diff review.
3. Deliver the isolated implementation, then Sync the new capability into the
   living specs and Archive the completed change through the governed
   lifecycle.

Rollback is an isolated Git revert; no live account, candidate data, or
external state is changed. A runtime failure preserves the canonical local
tracker or its adjacent backup under the existing tracker contract.

## Open Questions

- A later live-provider proposal must select the public source, record its
  terms/rate-policy review, and define source-specific URL/extraction behavior.
- A later scheduler proposal must define its run ownership, approval model,
  retries, and human escalation path.
