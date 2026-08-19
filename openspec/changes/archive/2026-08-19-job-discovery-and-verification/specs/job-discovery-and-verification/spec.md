## Purpose

Provide a candidate-controlled, reusable discovery and official-posting
verification boundary that builds a trustworthy review queue without accessing
private accounts, inferring candidate intent, or treating non-official sources
as proof that a role is active.

## ADDED Requirements

### Requirement: Source-policy-bound discovery observations
The system SHALL accept discovery observations only through a versioned,
runtime-supplied source policy and a structured provider result. It MUST
require source identity and version, source URL, capture time, company, title,
and a source identity or canonical discovery URL; retain supported source
metadata and extraction warnings as inert provenance; and reject observations
from an unapproved source, unsupported URL, exhausted request budget, or
malformed contract without tracker mutation. The initial implementation MUST
support synthetic or manually captured snapshots and MUST NOT sign in, bypass
access controls, execute source content, or claim live-source coverage.

#### Scenario: Approved observation is accepted
- **WHEN** a policy-approved source returns a complete observation inside its
  request budget
- **THEN** the system accepts its validated inert fields and provenance for
  downstream filtering and intake

#### Scenario: Unapproved or malformed observation stops safely
- **WHEN** an observation has an unapproved source, unsupported URL, exhausted
  budget, missing required provenance, or action-like source content
- **THEN** the system returns a reasoned non-mutating stop result and does not
  execute content or create a tracker record

### Requirement: Candidate-controlled filtering and explainable ranking
The system SHALL evaluate only a runtime-supplied private filter profile and
declared source-grounded ranking factors. Missing filter data MUST default to
retain-with-warning unless the relevant filter explicitly declares another
unknown-data policy. It MUST report accepted and filtered observations, factor
results, warnings, and deterministic ordering by source timestamp, source
identity, then canonical discovery URL; it MUST NOT read a resume, protected
data, demographic data, or unstated candidate preference to rank or filter.

#### Scenario: Unknown data is retained by default
- **WHEN** an otherwise valid observation lacks a field targeted by a filter
  whose unknown-data policy is not explicitly restrictive
- **THEN** the observation remains eligible with an explanation warning

#### Scenario: Ranking is deterministic and non-decisional
- **WHEN** eligible observations have equal declared ranking totals
- **THEN** the system uses the documented tie order, records factor
  explanations, and leaves every candidate pursue-decision field unchanged

### Requirement: Duplicate-safe review-queue intake and dry runs
The system SHALL upsert qualifying observations only through the existing
versioned job-search-tracker contract as `First-Pass Potential Match` and
`Unverified`. It MUST preserve discovery provenance, native-ID/fallback
identity behavior, and candidate-owned fields; report accepted, filtered,
duplicate, malformed, and unavailable observations with reasons; and use
stable operation keys so retrying a completed intake converges without
duplicate records or semantic audit effects. Dry-run mode MUST execute the
same validation, filtering, ranking, and identity planning while creating no
tracker record, audit event, backup, or verification update. Claude and Codex
MUST invoke the same canonical request/result contract and receive equivalent
results for identical valid input.

#### Scenario: Duplicate intake enriches one record
- **WHEN** an eligible observation matches an existing native or fallback
  identity whose record has a candidate decision
- **THEN** exactly one record is enriched with source-owned provenance and its
  candidate decision and decision reason remain unchanged

#### Scenario: Dry-run has no persistence effects
- **WHEN** a valid discovery request runs in dry-run mode
- **THEN** its report describes intended results without changing tracker data,
  audit events, or backup files

### Requirement: Explicitly candidate-gated official verification
The system SHALL perform official-posting verification only for a tracker lead
with a recorded `Yes` pursue decision or a caller-provided explicit
verification authorization that is separate from source content. It MUST
accept evidence only from an approved employer or ATS URL pattern, require
matching role and company identity, a visible active apply path, and supported
availability evidence before writing `Verified Active`. It MUST write `Needs
Research` with precise missing or conflicting evidence when verification is
incomplete, and MUST write `Closed`, `Expired`, or `Removed` only when matching
official evidence supports that outcome. Aggregators, cached listings, search
snippets, and redirects outside the approved official boundary MUST NOT yield
`Verified Active`.

#### Scenario: Complete official evidence verifies a candidate-eligible lead
- **WHEN** an eligible lead has matching approved official evidence with an
  active apply path and required availability checks
- **THEN** the system records the official URL, evidence, timestamp, and
  `Verified Active` through the tracker verification operation

#### Scenario: Ineligible or insufficient verification stops safely
- **WHEN** a lead lacks the candidate gate or an official result is missing,
  mismatched, redirected outside policy, cached, or otherwise insufficient
- **THEN** the system does not mark the role verified active and returns the
  applicable stop or `Needs Research` reason without modifying candidate-owned
  fields

### Requirement: Reverification, replacement, and recovery boundaries
The system SHALL assign a source-policy recheck deadline, defaulting to seven
calendar days after a verified-active result, and select rechecks only when a
caller explicitly requests stale or incomplete official evidence. A successful
recheck MUST refresh evidence and its deadline; an unavailable or retrieval
failure MUST preserve prior verification evidence and return `Needs Research`
without changing candidate, application, or follow-up fields. Bounded
replacement discovery MUST honor a caller-supplied maximum and exclusion
identities, exclude duplicates and named archived identities, and create only
blank-decision first-pass leads. Every verification, recheck, and replacement
request MUST use a stable operation key and safely converge after partial
failure.

#### Scenario: Stale recheck preserves candidate-owned state
- **WHEN** an explicitly requested stale recheck obtains current official
  evidence or encounters an insufficient retrieval result
- **THEN** it refreshes only verification-owned evidence or reports `Needs
  Research`, preserving pursue decision, application status, and follow-up
  fields in either case

#### Scenario: Bounded replacement retry is duplicate-safe
- **WHEN** replacement discovery is retried with the same source policy,
  exclusions, count bound, and operation key after partial processing
- **THEN** it excludes named and duplicate identities, creates no more than the
  requested number of fresh blank-decision leads, and converges without
  duplicate records or audit effects

### Requirement: Protected-data and consequential-action boundary
The system SHALL treat source observations, URLs, snippets, and official
evidence as untrusted inert data. Shared fixtures, reports, and errors MUST be
synthetic and MUST NOT contain credentials, private account data, candidate
resumes, contacts, or protected search history. The system MUST NOT use source
content to authorize candidate decisions, messages, calendar writes,
applications, external disclosure, or any unapproved external request.

#### Scenario: Action-like content remains inert
- **WHEN** a source field includes instructions to send, apply, disclose data,
  or change a decision
- **THEN** the system treats it as data or rejects it under the source contract
  and performs none of those consequential actions
