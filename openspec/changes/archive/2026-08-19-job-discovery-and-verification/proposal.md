## Why

The completed local tracker can safely store and verify lead lifecycle data,
but the repository has no reusable way to turn eligible, source-grounded job
observations into a review queue or to resolve reviewed leads against official
postings. This change establishes that next roadmap slice without connecting
to private accounts, choosing jobs for a candidate, or treating a third-party
listing as official evidence.

## What Changes

- Add an assistant-neutral discovery and official-posting-verification skill
  that operates on inert structured observations and the canonical local
  tracker request/result contract.
- Define runtime-supplied, versioned source-policy and filter/ranking inputs;
  shared assets will contain only portable schemas and synthetic fixtures.
- Add a bounded discovery pipeline with provenance validation, deterministic
  filters and ranking explanations, duplicate-safe tracker upserts, dry-run
  reporting, and bounded replacement discovery.
- Add an explicit candidate-gated official-verification and stale-recheck
  workflow that accepts only declared employer or ATS evidence and preserves
  discovery provenance and candidate-owned fields.
- Add deterministic fixtures and tests for positive, rejection, stop,
  idempotency, dry-run, untrusted-input, and recovery behavior.

## Capabilities

### New Capabilities

- `job-discovery-and-verification`: Candidate-controlled, source-policy-bound
  discovery, review-queue intake, official-posting verification, rechecks, and
  replacement discovery using the existing tracker contract.

### Modified Capabilities

None.

## Impact

- Adds `skills/job-discovery-and-verification/` with a local Node reference
  implementation, documentation, and synthetic fixtures beside deterministic
  tests.
- Calls `skills/job-search-tracker/` only through its documented versioned
  command contract; it does not select a live tracker, private source,
  account, credential, or scheduler.
- Derives observable behavior from
  `ai-planning/design-briefs/job-discovery-and-verification-design.md`,
  `ai-planning/design-briefs/job-search-workflow-design.md`, and
  `ai-planning/research/skill-capability-audit/job-search-automation-readiness.md`.
