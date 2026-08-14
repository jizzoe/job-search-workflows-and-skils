# Apply Evidence

Date: 2026-08-14

## Deterministic behavior evidence

| Command | Exit status | Relevant result |
| --- | ---: | --- |
| `node --check skills/job-search-tracker/src/tracker.mjs` | 0 | The canonical adapter parses. |
| `node --check skills/job-search-tracker/src/cli.mjs` | 0 | The assistant-neutral command entry point parses. |
| `npm test --prefix skills/job-search-tracker` | 0 | 10 tests passed; 0 failed. Coverage includes portability parity, lifecycle separation, provenance-preserving duplicate upserts, official enrichment, ambiguity stop, field ownership, candidate confirmation, missing/external target rejection, dry runs, untrusted input, fixture scanning, recovery, backup, and idempotent retry. |

## OpenSpec and repository checks

| Command | Exit status | Relevant result |
| --- | ---: | --- |
| `openspec status --change job-search-tracker-foundation --json` | 0 | 12 implementation/evidence tasks complete before this evidence record; remaining checklist items addressed below. |
| `openspec instructions apply --change job-search-tracker-foundation --json` | 0 | Change state `ready`; selected schema and task context confirmed. |
| `openspec validate job-search-tracker-foundation --strict` | 0 | `Change 'job-search-tracker-foundation' is valid`. |
| `openspec validate --all --strict` | 0 | 1 change passed; 0 failed. |
| `git diff --check` | 0 | No tracked-diff whitespace errors. |
| per-file `git diff --no-index --check /dev/null <changed-file>` | 0 after expected no-index diff status normalization | No whitespace errors in the new, untracked planning and asset files. |

## Reviewed artifacts

- `openspec/changes/job-search-tracker-foundation/proposal.md`
- `openspec/changes/job-search-tracker-foundation/specs/job-search-tracker/spec.md`
- `openspec/changes/job-search-tracker-foundation/design.md`
- `openspec/changes/job-search-tracker-foundation/tasks.md`
- `skills/job-search-tracker/SKILL.md`
- `skills/job-search-tracker/README.md`
- `skills/job-search-tracker/package.json`
- `skills/job-search-tracker/src/tracker.mjs`
- `skills/job-search-tracker/src/cli.mjs`
- `skills/job-search-tracker/test/tracker.test.mjs`

## Review conclusion

The change is scoped to the local reference adapter and its synthetic test
data. It adds no live connector, credentials, candidate-specific records,
generated OpenSpec lifecycle edits, external send, calendar action, decision
inference, or application behavior. The documented protected-data scan found
only explanatory policy words and command placeholders, not a secret,
credential, or candidate-specific value.

## Verification Report: job-search-tracker-foundation

### Summary

| Dimension | Status |
| --- | --- |
| Completeness | 15/15 tasks complete; 6/6 requirements implemented. |
| Correctness | All 17 specified scenarios map to an implementation guard and deterministic test coverage. |
| Coherence | The local JSON, Node built-in test-runner, atomic backup/rename, and assistant-neutral command decisions match `design.md`. |

### Requirement and scenario mapping

| Requirement | Implementation evidence | Deterministic evidence |
| --- | --- | --- |
| Portable candidate-controlled tracker contract | `skills/job-search-tracker/src/tracker.mjs:161-166,496-599`; `src/cli.mjs`; `SKILL.md:26-58` | `test/tracker.test.mjs:51-64,158-169` proves equivalent local results and rejects missing/external targets. |
| Complete lead records with separated lifecycle ownership | `src/tracker.mjs:7-34,169-231,341-367,444-464` | `test/tracker.test.mjs:66-93,139-155` proves first-pass defaults, verification separation, and lifecycle rejection. |
| Stable identity and provenance-preserving upsert | `src/tracker.mjs:121-155,327-390,524-537` | `test/tracker.test.mjs:95-137` proves native-ID deduplication, official enrichment, canonical fallback identity, and ambiguity stop. |
| Field-scoped validated mutations | `src/tracker.mjs:84-99,424-473,538-572` | `test/tracker.test.mjs:66-93,139-155` proves decision preservation, operation allowlists, explicit candidate confirmation, and unchanged rejected state. |
| Auditable dry-run and recoverable local writes | `src/tracker.mjs:271-301,392-407,477-493,503-507,585-599` | `test/tracker.test.mjs:171-193,215-234` proves dry run, semantic audit, recovery audit, backup, retry, and idempotency. |
| Protected-data and untrusted-input boundary | `src/tracker.mjs:52-61,204-210,234-239`; `SKILL.md:12-24,92-96` | `test/tracker.test.mjs:195-212` proves inert action-like content and prohibited-pattern rejection. |

### Issues

No CRITICAL, WARNING, or SUGGESTION issues found.

### Final assessment

All checks passed. The implementation is complete, correct against the active
delta specification, and coherent with the selected design. It is ready for
the Sync lifecycle action; no external tracker or candidate data was touched.
