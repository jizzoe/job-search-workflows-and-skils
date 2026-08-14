## Context

See [proposal.md](proposal.md) for motivation and
[the tracker behavior contract](specs/job-search-tracker/spec.md) for the
observable requirements. This is a new repository with Node.js available but
no existing application framework, package manifest, tracker, or living
capability spec. The shared workflow design requires an adapter boundary while
the tracker vendor and any future live connector intentionally remain
unselected.

## Goals / Non-Goals

**Goals:**

- Deliver a small assistant-neutral local tracker reference implementation that
  makes the shared lead-record contract executable and testable.
- Make valid writes atomic, field-scoped, duplicate-safe, auditable, and safe
  to retry.
- Give later SDD slices a stable interface independent of spreadsheets,
  databases, browser automation, and assistant-specific command exposure.
- Keep all fixtures synthetic and make prohibited fixture patterns
  deterministically detectable.

**Non-Goals:**

- Selecting or connecting a production tracker vendor, spreadsheet, database,
  browser, email, calendar, or job platform.
- Reading protected personal planning or resume sources, storing credentials,
  or migrating candidate data.
- Sending messages, changing calendars, making pursue decisions, submitting
  applications, or handling authentication.
- Implementing discovery, official-posting verification, research, materials,
  or post-review behavior beyond their future adapter calls.

## Decisions

### Canonical local JSON reference target

Implement canonical logic under `skills/job-search-tracker/` with a local JSON
document as the sole reference storage format. A command-line entry point will
require an explicit `--data <path>` argument, and all mutation operations will
reject anything other than a local JSON file path. The document will contain a
versioned lead collection and a deduplicated audit-event collection; backup
files will sit adjacent to the supplied target.

This keeps the foundation portable and reviewable without prematurely choosing
a vendor. A spreadsheet or database adapter can later translate its own
field-mapping and concurrency model into the same canonical operations. The
alternative—implementing directly against a spreadsheet—would couple all
later workflows to credentials, a vendor, non-deterministic live state, and a
candidate-specific schema before those choices have an approved proposal.

### Explicit operation envelope and field allowlists

All public operations will accept a versioned request envelope with an
operation name, explicit local target, request payload, dry-run flag, and a
caller-provided or deterministically derived operation key. The canonical
adapter surface will implement:

- `findByIdentity` and `readForReview` as read operations;
- `upsertLead` for source-owned lead fields only;
- `updateCandidateDecision` for candidate-owned decision fields only;
- `updateVerification` and `updateApplicationOutcome` for their separately
  owned lifecycle/evidence fields;
- `createOrUpdateResearch` for research references; and
- `recordAuditEvent` for a validated explicit audit action.

An operation-specific allowlist will reject extra, candidate-owned, or
cross-domain fields before state changes. The resulting record will undergo
schema validation both before staging and after reconstruction. This is safer
than a generic patch endpoint, which would make accidental decision mutation
or unmapped-field loss easy; it is also less rigid than hard-coding a vendor
row mapping before a vendor has been selected.

### Deterministic identity and merge policy

Identity resolution will prefer `native_source_id`. Without it, it will build
a fallback key from Unicode-normalized, case-folded, whitespace-collapsed
company and title values plus a canonical discovery URL that removes only
non-identifying URL variation documented by the implementation. The original
source values and `lead_url` are stored unchanged. A single match stages an
update; no match stages a create; more than one fallback match fails without
mutation.

Source provenance, original discovery values, and evidence links will be
append-only or set-unioned as appropriate. Official posting information is a
separate enrichment field, never a replacement for discovery provenance. This
avoids the unreliable alternative of matching on row position, fuzzy company
names alone, or a later official URL alone.

### Atomic persistence, backup, and idempotent audit semantics

For non-dry-run writes, the adapter will load and validate the current JSON
document, calculate an immutable intended change, create a timestamped
versioned backup before replacing existing canonical data, write a temporary
file in the target directory, validate the staged document, and atomically
rename it into place. If any stage fails, it will retain the original canonical
file or restore from the just-created backup and return a structured recovery
result. Fault injection used only by tests will exercise each recovery point.

Every meaningful operation will derive a stable semantic audit key from the
operation name, resolved identity, normalized intended field set, and caller
operation key. A retry with an existing matching completed key will return the
prior result without creating another record or audit event. A failed request
will retain a failure audit record only when doing so can be performed without
corrupting the canonical target. A separate append-safe audit sidecar is not
selected because maintaining two recoverable targets introduces a separate
consistency problem; audit records travel in the same atomic data document.

### Repository-owned deterministic evidence

Use Node's built-in test runner so the foundation adds no third-party runtime
dependency. Tests and fixtures will live alongside the asset in
`skills/job-search-tracker/`; synthetic fixture policy and test names will
map each specification scenario to deterministic evidence. The suite will
cover the positive, rejection, stop, idempotency, dry-run, partial-failure,
post-write-validation, assistant-parity, provenance, and protected-data
cases. A fixture scanner will reject documented credential-like patterns and
known protected-source paths; it does not claim to infer all private data.

This is preferable to manual spreadsheet tests because the tests can run
offline, start from clean temporary directories, assert byte-level unchanged
state after rejected writes, and safely simulate storage failures.

### Assistant-neutral exposure

The implementation and its stable JSON request/result schema are canonical.
Claude and Codex guidance will be thin documentation that invokes the same
local command and describes the same dry-run and error outcomes. No generated
OpenSpec integration files will be changed. This avoids diverging copies of
the business rules and permits a later assistant-specific UI proposal without
changing tracker behavior.

## Risks / Trade-offs

- [A local JSON reference format is not a multi-user production tracker] → The
  adapter boundary, explicit version field, and deterministic fixtures make it
  a safe foundation; a later vendor adapter must separately propose locking,
  export, and concurrency behavior.
- [Filesystem atomic-rename behavior varies across filesystems] → Temporary
  files and backups remain in the supplied target directory, tests exercise
  recoverable failures, and the command documents the local-filesystem scope.
- [Fallback identity can be ambiguous] → Refuse to guess and return a
  non-mutating ambiguity error with enough identifiers for human resolution.
- [Audit data can increase local data sensitivity] → Record only operation
  metadata and intended field names/changes needed for recovery, redact values
  matching documented secret patterns, and use synthetic test data.
- [A fixed prohibited-pattern scanner cannot identify every private fact] → It
  provides deterministic enforcement for known risk patterns while repository
  policy and human review remain the control for broader protected-data scope.

## Migration Plan

1. Add the new local asset, reference schema, command, documentation, and
   synthetic fixtures without touching a live tracker.
2. Run the deterministic test suite, strict OpenSpec validation, whitespace
   validation, and a full diff review for protected data and generated-file
   changes.
3. Publish the living `job-search-tracker` spec only through the governed Sync
   lifecycle after implementation has passed Verify.
4. Later adapters import only explicitly supplied data through their own
   approved change. They must back up before destructive replacement, validate
   mapped rows or records, preserve formulas where applicable, and prove a
   recovery path.

Rollback during the initial implementation is a normal Git revert of the
isolated asset; no candidate data migration or external state exists. At
runtime, a failed write retains the canonical data or restores the adjacent
backup, and retrying the same operation key is idempotent.
