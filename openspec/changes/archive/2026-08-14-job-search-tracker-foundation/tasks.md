## 1. Canonical tracker contract

- [x] 1.1 Create the assistant-neutral `skills/job-search-tracker/` asset
  structure and document the versioned local JSON target, complete LeadRecord
  schema, lifecycle enums, operation envelope, result schema, and documented
  prohibited fixture patterns.
- [x] 1.2 Implement structural validation for data documents, operation
  envelopes, local JSON target paths, allowed fields, lifecycle values, and
  synthetic fixture content; reject missing targets and all non-local or
  credential-backed targets before I/O.
- [x] 1.3 Implement deterministic native-ID-first and fallback identity
  normalization, canonical discovery-URL handling, ambiguity detection, and
  provenance/evidence merge rules.

## 2. Field-scoped adapter operations

- [x] 2.1 Implement `findByIdentity`, `readForReview`, and `upsertLead` with
  first-pass defaults, immutable discovery provenance, and no decision-field
  mutation.
- [x] 2.2 Implement `updateCandidateDecision`, `updateVerification`, and
  `updateApplicationOutcome` with distinct field ownership, pre-write and
  post-write record validation, and structured non-mutating validation errors.
- [x] 2.3 Implement `createOrUpdateResearch` and `recordAuditEvent` under the
  same local-only validation and audit semantics, then expose all canonical
  operations through a documented command interface usable equivalently by
  Claude and Codex.

## 3. Safe local persistence and recovery

- [x] 3.1 Implement dry-run planning results, deterministic operation keys,
  semantic audit-event deduplication, and redaction of values matching
  documented secret patterns.
- [x] 3.2 Implement same-directory temporary writes, pre-replacement backups,
  staged-document validation, atomic replacement, rollback or restoration, and
  test-only fault injection for each recoverable failure boundary.
- [x] 3.3 Add synthetic fixtures and a deterministic fixture/evidence scanner
  that rejects the documented protected-source paths and credential-like or
  candidate-data prohibited patterns.

## 4. Deterministic evidence

- [x] 4.1 Add Node built-in test-runner coverage mapping every positive
  contract scenario: portable equivalent operations, first-pass defaults,
  verification separation, native-ID upsert, official-URL enrichment, and
  decision preservation.
- [x] 4.2 Add rejection and stop coverage for missing or external targets,
  invalid lifecycle values, ambiguous fallback identity, cross-operation
  decision fields, untrusted action-like content, and prohibited fixture data;
  assert that each leaves canonical data unchanged.
- [x] 4.3 Add dry-run, post-write-validation, partial-write-recovery, retry
  idempotency, audit-deduplication, and backup-restoration tests using clean
  temporary directories; verify Claude/Codex command guidance shares the exact
  canonical request/result contract.

## 5. Completion checks and review

- [x] 5.1 Run the documented Node test command and capture its exit status and
  scenario coverage in the change evidence.
- [x] 5.2 Run `openspec validate job-search-tracker-foundation --strict`,
  `git diff --check`, and the required status/instruction checks; record the
  output and every reviewed artifact path.
- [x] 5.3 Review the complete change diff for requirements mapping, portability,
  untrusted-input behavior, protected data, secret patterns, unintended
  generated OpenSpec edits, and recovery evidence; resolve findings before
  marking any task complete.
