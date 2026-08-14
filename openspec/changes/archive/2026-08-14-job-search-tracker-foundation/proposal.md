## Why

The planned job-search workflows need a shared, durable way to preserve lead
identity, provenance, lifecycle state, and candidate-owned decisions before
any intake, verification, research, or application workflow can operate
safely. The repository currently has no reusable tracker implementation or
contract, which makes duplicate-safe, recoverable workflow behavior impossible
to verify.

## What Changes

- Introduce a reusable tracker adapter contract and a local reference
  implementation for `LeadRecord` lifecycle data.
- Define stable identity matching and duplicate-safe upserts that retain the
  original discovery source when later official-posting evidence enriches a
  record.
- Provide explicit, narrowly scoped operations for review reads, candidate
  decision updates, verification updates, application-outcome updates,
  research references, and audit events.
- Add schema validation, field ownership rules, audit records, dry-run
  fixtures, backups, and recovery behavior for tracker writes.
- Prove that tracker operations do not infer or change a candidate pursue
  decision, do not write unmapped fields, and remain safe to rerun after a
  partial failure.

## Capabilities

### New Capabilities

- `job-search-tracker`: Candidate-controlled lead-record storage, identity
  resolution, validated adapter operations, auditability, and recoverable
  writes for all later job-search workflow slices.

### Modified Capabilities

None.

## Impact

- Adds an assistant-neutral reusable tracker asset, its deterministic test or
  evaluation fixtures, and a living OpenSpec capability.
- Establishes the shared adapter boundary used by later discovery, intake,
  verification, research, materials, and post-review changes; it does not
  connect to or mutate a candidate's live spreadsheet, database, accounts, or
  other external tracker.
- Is derived from the tracker and workflow contracts in
  `ai-planning/design-briefs/job-search-workflow-design.md` and the delivery
  order in `ai-planning/design-briefs/job-search-skill-roadmap.md`.
