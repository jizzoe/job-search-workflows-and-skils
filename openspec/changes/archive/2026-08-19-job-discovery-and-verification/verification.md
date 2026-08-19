# Apply Evidence: Job Discovery and Verification

## Scope

This evidence covers only the implementation under
`skills/job-discovery-and-verification/` and the active OpenSpec change
`job-discovery-and-verification`. It does not include the pre-existing dirty
research, resume, or personal-draft files shown by `git status --short`.

## Deterministic checks

All commands below completed with exit status 0 on 2026-08-19.

| Command | Outcome |
| --- | --- |
| `npm test --prefix skills/job-discovery-and-verification` | 14 passing, 0 failing Node built-in tests. Covers source policy, stops, deterministic filtering/ranking, dry runs, tracker intake, candidate gate, official evidence, rechecks, replacement, retries, tracker CLI parity, and protected-data fixtures. |
| `npm test --prefix skills/job-search-tracker` | 10 passing, 0 failing compatibility tests. |
| `node --check skills/job-discovery-and-verification/src/discovery.mjs` | Passed. |
| `node --check skills/job-discovery-and-verification/src/cli.mjs` | Passed. |
| `openspec validate job-discovery-and-verification --strict` | Passed. |
| `openspec validate --all --strict` | 2 passed, 0 failed. |
| `git diff --check` | Passed. |
| `rg -n "[[:blank:]]+$" skills/job-discovery-and-verification openspec/changes/job-discovery-and-verification` | No trailing-whitespace findings after correction. |

The discovery test's dry-run scenario uses an empty temporary tracker target
and asserts that no target is created. Its rejection scenarios assert no
tracker target is created for all stopped observations. The tracker suite
separately verifies its dry-run, recovery, identity, field-ownership, and
untrusted-content contracts.

## Requirement and scenario coverage

| Requirement | Implementation evidence | Deterministic coverage |
| --- | --- | --- |
| Source-policy-bound discovery observations | `src/discovery.mjs` source-policy and observation validation | approved intake; unapproved, malformed, budget, URL, action-like, and protected-data stops |
| Candidate-controlled filtering and explainable ranking | `src/discovery.mjs` filter and sort functions | unknown-data warning and deterministic equal-score ordering |
| Duplicate-safe review-queue intake and dry runs | tracker CLI bridge and stable operation keys | decision preservation, dry-run no target, partial-batch retry, direct CLI bridge |
| Explicitly candidate-gated official verification | official-evidence evaluator and `verify` gate | ineligible stop; active, unavailable, redirect, and evidence-link outcomes |
| Reverification, replacement, and recovery | due-only recheck and bounded replacement paths | stale recheck preserves evidence; bounded exclusions; idempotent retry |
| Protected-data and consequential-action boundary | fixture scan, action-content rejection, local target rejection | action-like content and protected-fixture rejection tests |

## Bounded local review

Reviewed the implementation, command interface, tests, documentation, OpenSpec
proposal/spec/design/tasks, and interaction with the existing tracker boundary.

- Security and protected-data: fixed two objective gaps before this evidence:
  URL allowlists now compare parsed scheme/host/path boundaries rather than raw
  string prefixes, and supplemental official evidence links must be
  policy-approved. URLs with embedded credentials are rejected. The new test
  exercises a path-boundary lookalike and an unapproved evidence link.
- Correctness and recovery: operation keys use deterministic request/identity
  fingerprints; partial writes rely on the canonical tracker idempotency and
  recovery contract; recheck retrieval failures omit official-evidence fields
  and therefore preserve the prior official URL and timestamp.
- Portability and attribution: Node built-ins only; no third-party code,
  copied external content, accounts, credentials, live provider calls, or
  external writes are present.
- Scope: only the new local asset and active change artifacts were reviewed;
  generated OpenSpec integrations were not edited. No unresolved critical or
  warning findings remain.

## Formal OpenSpec verification

### Summary

| Dimension | Status |
| --- | --- |
| Completeness | 15/15 tasks complete; 6/6 delta requirements mapped |
| Correctness | 6/6 requirements and 11/11 scenarios covered by implementation and deterministic tests |
| Coherence | Design decisions followed; no unresolved findings |

### Issues

- **CRITICAL:** None.
- **WARNING:** None.
- **SUGGESTION:** None.

The formal review inspected the complete proposal, delta spec, design, tasks,
implementation, tests, CLI contract, and apply evidence. It confirmed that the
implementation remains snapshot-only, calls the tracker only through its
versioned CLI, keeps filters runtime-supplied, requires a candidate gate for
active verification, and introduces no account, credential, scheduler,
message, decision, or application behavior.

Final assessment: all checks passed. The change is ready for the governed Sync
and Archive lifecycle steps.
