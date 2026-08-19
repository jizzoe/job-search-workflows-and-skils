## 1. Canonical discovery boundary

- [x] 1.1 Create the assistant-neutral `skills/job-discovery-and-verification/` asset, versioned request/result schema, source-policy schema, private filter-profile schema, and Claude/Codex-equivalent command documentation.
- [x] 1.2 Implement inert snapshot-observation validation for source identity/version, provenance, URL allowlists, source budgets, required fields, unsupported fields, and documented protected-fixture patterns.
- [x] 1.3 Implement deterministic candidate-controlled filtering, unknown-data policy handling, source-grounded ranking explanations, canonical tie ordering, and classified non-mutating discovery reports.

## 2. Tracker-backed discovery and replacement

- [x] 2.1 Implement a validated bridge to the canonical tracker request/result CLI; upsert only qualifying observations with stable operation keys, source provenance, `First-Pass Potential Match`, and `Unverified` defaults.
- [x] 2.2 Implement dry-run planning that invokes no tracker mutation and bounded replacement discovery that applies exclusion identities, archive/duplicate guards, count limits, and idempotent resume semantics.
- [x] 2.3 Ensure result journals and error handling safely converge partial batches without overwriting candidate-owned or application-owned fields.

## 3. Official verification and rechecks

- [x] 3.1 Implement explicit verification eligibility based on a recorded `Yes` decision or caller-provided authorization separate from source content, with a structured non-mutating stop result for ineligible leads.
- [x] 3.2 Implement policy-approved official-evidence validation and status mapping for verified-active, closed/expired/removed, and needs-research results; preserve original discovery provenance and candidate-owned fields through tracker updates.
- [x] 3.3 Implement explicit stale/incomplete recheck selection, policy/default deadlines, evidence refresh, retrieval-failure preservation, stable keys, and non-scheduling recovery behavior.

## 4. Deterministic evidence and documentation

- [x] 4.1 Add synthetic fixtures and Node built-in tests covering accepted observations, unapproved/malformed/budget/action-like stops, unknown-data warnings, ranking ties, duplicates, decision preservation, and dry runs.
- [x] 4.2 Add tests covering candidate-gated verification, aggregator/cache/redirect rejection, official active and unavailable evidence mapping, stale rechecks, replacement bounds, partial-failure retry, tracker parity, and fixture scanning.
- [x] 4.3 Document source-policy configuration, local-only scope, CLI request/result examples, error and recovery outcomes, live-provider deferral, and no-decision/no-send/no-application guarantees.

## 5. Completion evidence and review

- [x] 5.1 Run the discovery test suite, tracker compatibility suite, syntax checks, fixture scan, and deterministic dry-run examples; record commands and outcomes in change evidence.
- [x] 5.2 Run `openspec validate job-discovery-and-verification --strict`, repository-wide strict validation, `git diff --check`, and all required status/instruction checks; review changed artifacts for requirements mapping and generated-file scope.
- [x] 5.3 Perform a bounded local code, security, protected-data, portability, attribution, and recovery review; resolve objective findings and rerun affected evidence before formal Verify.
