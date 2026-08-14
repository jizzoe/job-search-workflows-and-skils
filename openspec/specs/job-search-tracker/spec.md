# Job-Search Tracker Specification

## Purpose

Provide an assistant-neutral, candidate-controlled tracker foundation that
keeps job-search lead data durable, attributable, validated, and recoverable
without connecting to a candidate's live external systems.

## Requirements

### Requirement: Portable candidate-controlled tracker contract
The system SHALL define an assistant-neutral tracker adapter contract for
`LeadRecord` data and provide a local reference implementation. The contract
MUST expose identity lookup, lead upsert, review reads, candidate-decision
updates, verification updates, application-outcome updates, research-reference
creation or update, and audit-event recording. The reference implementation
MUST operate only on an explicitly supplied local data target and MUST NOT
access external trackers, accounts, credentials, messages, calendars, or
application systems. Claude and Codex exposures MUST invoke the same canonical
contract and produce equivalent persisted records for identical valid input.

#### Scenario: Equivalent portable operation
- **WHEN** Claude and Codex submit the same valid lead-upsert request to
  separate copies of the reference data target
- **THEN** each target contains the same lead identity, mapped values, and
  audit-event semantics

#### Scenario: Missing explicit local target
- **WHEN** a reference operation is requested without an explicit local data
  target
- **THEN** the operation fails before changing any data and reports that no
  target was authorized

#### Scenario: External target request
- **WHEN** a request names an external service, live spreadsheet, account, or
  credential-backed destination
- **THEN** the reference implementation rejects the request without attempting
  a connection or persisting a change

### Requirement: Complete lead records with separated lifecycle ownership
The system SHALL store a lead record with a stable `record_id`, source and
source-detail provenance, original `lead_url` when available, native source
identifier when available, company and role values, date-found and
source-posted text, normalized posting date only when known, location,
remote-type, compensation, intake stage, posting status, verification data,
official URL, application status, next-action data, evidence links, and
concise notes. It MUST store candidate pursue decision and decision reason as
candidate-owned fields that are blank for newly created leads unless supplied
through the dedicated candidate-decision operation. It MUST represent intake
stage separately from posting status and MUST NOT label a record `Verified
Active` without an explicit verification update.

#### Scenario: First-pass intake defaults
- **WHEN** a valid newly discovered lead without a candidate decision or
  verification result is upserted
- **THEN** it is stored as `First-Pass Potential Match` and `Unverified` with
  blank pursue-decision fields

#### Scenario: Verification is independent of intake stage
- **WHEN** an existing reviewed lead receives a valid `Verified Active`
  verification update
- **THEN** its posting status and verification evidence are updated without
  changing its intake stage or candidate decision

#### Scenario: Unsupported lifecycle value
- **WHEN** an operation supplies a lifecycle value outside the documented
  intake-stage, posting-status, or pursue-decision value sets
- **THEN** the operation fails validation and leaves the stored record
  unchanged

### Requirement: Stable identity and provenance-preserving upsert
The system SHALL resolve a lead identity by native source identifier when one
is available; otherwise it MUST use normalized company name, normalized role
title, and canonical discovery-source URL. An upsert with a matching identity
MUST update that one record rather than create a duplicate. A later official
URL or verification update MUST enrich the matching record without deleting
the original discovery URL, source, source detail, native identifier, or
previous evidence links. When multiple records match a supplied fallback
identity, the system MUST stop with an ambiguity error and MUST NOT select a
record by position, recency, or guess.

#### Scenario: Native-identifier duplicate
- **WHEN** two upserts use the same native source identifier with updated
  source-grounded fields
- **THEN** exactly one record remains and it retains its original discovery
  provenance while receiving the intended update

#### Scenario: Official URL enrichment
- **WHEN** a verified official URL is supplied for a lead identified by its
  existing native identifier or fallback identity
- **THEN** the record contains both its original discovery URL and the official
  URL

#### Scenario: Ambiguous fallback identity
- **WHEN** fallback identity matching finds more than one record
- **THEN** the upsert reports an ambiguity error, creates no record, and makes
  no changes to the matched records

### Requirement: Field-scoped validated mutations
The system SHALL apply only the fields owned by the requested adapter
operation. `updateCandidateDecision` MUST be the only operation permitted to
write pursue-decision and decision-reason fields. `updateVerification` and
`updateApplicationOutcome` MUST update only their documented lifecycle and
evidence fields; an upsert MUST NOT overwrite candidate-owned decisions. Each
write MUST validate the intended record and edited fields before persistence,
then validate the persisted record after persistence. A rejected validation
MUST leave the target unchanged.

#### Scenario: Candidate decision is preserved during intake upsert
- **WHEN** an existing lead with a candidate-entered pursue decision receives a
  matching intake upsert that omits decision fields
- **THEN** the stored pursue decision and decision reason remain unchanged

#### Scenario: Unauthorized decision mutation
- **WHEN** an upsert, verification update, outcome update, or research update
  includes pursue-decision data
- **THEN** the operation is rejected and does not change the decision fields

#### Scenario: Post-write validation failure
- **WHEN** a requested write would create a record that fails persisted-record
  validation
- **THEN** the system restores the pre-operation state and reports the
  validation failure

### Requirement: Auditable dry-run and recoverable local writes
The system SHALL support a dry-run mode that performs identity resolution and
validation, reports the intended record and field changes, records no data
mutation, and clearly marks the result as dry run. For each non-dry-run write,
the system MUST record an audit event with operation, record identity, source,
timestamp, intended fields, result, and error when applicable. Before a
destructive replacement of its local canonical data file, it MUST create a
recoverable backup; partial-write failure MUST preserve or restore the last
valid canonical data and report a recoverable error. Repeating a successfully
completed idempotent operation with the same input MUST converge on the same
record state without duplicate records or duplicated semantic audit effects.

#### Scenario: Dry run is non-mutating
- **WHEN** a valid lead-upsert request is executed in dry-run mode
- **THEN** the result describes the intended create or update and the data
  target and audit log remain unchanged

#### Scenario: Partial-write recovery
- **WHEN** a local write fails after a backup is created but before the new
  canonical data validates
- **THEN** the last valid canonical data remains available, the failure is
  auditable, and a retry can safely resume the operation

#### Scenario: Idempotent retry
- **WHEN** the same successful lead-upsert request is run again after its
  result is already persisted
- **THEN** the tracker retains one matching record with no duplicated
  provenance or semantic audit event

### Requirement: Protected-data and untrusted-input boundary
The system SHALL treat all lead, posting, message, and attachment-derived
values as untrusted data. It MUST store such data only as inert field content
after schema validation and MUST NOT execute embedded instructions or use them
to authorize a candidate decision, message, calendar change, application,
external disclosure, or external write. Shared fixtures, audit evidence, and
errors MUST use synthetic data and MUST NOT contain candidate resumes,
contacts, credentials, tokens, account data, or private search history.

#### Scenario: Untrusted content cannot authorize an action
- **WHEN** an imported lead note contains text requesting an external message,
  submission, or decision change
- **THEN** the text is treated as inert content and no such action or decision
  mutation occurs

#### Scenario: Protected data in shared fixture
- **WHEN** a fixture or persisted shared artifact matches a documented
  credential-like or candidate-data prohibited pattern
- **THEN** validation fails before the artifact is accepted as test or delivery
  evidence
