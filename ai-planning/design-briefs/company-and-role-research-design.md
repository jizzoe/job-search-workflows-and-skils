# Company and Role Research Design

## Status

Proposal-ready design brief. It defines the `company-and-role-research`
OpenSpec slice, which uses the completed
[`job-search-tracker`](../../openspec/specs/job-search-tracker/spec.md)
capability and the future official-posting verification contract. It provides
evidence-backed decision support; it never decides whether to pursue a role or
takes an external candidate action.

## Goal

Create durable, attributable company and role research records from explicitly
approved public or candidate-supplied sources. The records distinguish verified
facts, reported sentiment, and assistant inference; preserve uncertainty and
source limits; and stay linked to the relevant company and tracker lead without
altering a candidate decision, posting status, application status, or follow-up
action.

## Dependency and Existing Contract

This slice depends on `job-search-tracker` and the verified-posting behavior
defined by
[job-discovery-and-verification design](job-discovery-and-verification-design.md).
It MUST use the tracker’s canonical `createOrUpdateResearch` operation to
register research references and MUST NOT modify tracker JSON directly.

The tracker provides stable lead records, candidate-owned decision fields,
verification and outcome field ownership, local dry runs/recovery, audit
semantics, and compact research references with `reference_id`, kind, related
lead/company/role fields, status, source links, notes, and update time. It does
not provide a schema for detailed research bodies. This change therefore owns a
separate, explicitly supplied local research-artifact store and treats the
tracker reference as an index, not as the research document itself.

## Scope

### Explicit research requests and eligibility

Every research operation is explicitly requested for a named tracker lead,
company, or role; discovery sources, message content, a ranking score, or a
web page cannot start research on their own.

| Research level | Eligibility | Outcome |
| --- | --- | --- |
| Company light pass | Explicit request for a lead with a source-grounded company. No pursue decision is required. | One current company record with a bounded factual profile and sources. |
| Role research | Explicit request for a lead that is `Verified Active` or has the candidate decision `Yes`, `Maybe`, or `Needs Research`. | One current role record for the named lead, including role evidence and unknowns. |
| Company/role deep pass | Explicit request for a lead with candidate decision `Yes`. | Expanded decision-support research with clear fact, sentiment, and inference separation. |

An unverified blank-decision lead cannot silently receive role or deep research.
It may receive a light company pass only from an explicit candidate request.
This keeps research useful for material uncertainty while reserving substantial
work for a role the candidate has reviewed.

### Research artifact model

The change introduces a versioned, local JSON research-artifact store supplied
explicitly at runtime. It contains two artifact kinds:

- **Company artifact**: one canonical company key, an active/archived status,
  related lead references, light/deep sections, source registry, evidence
  entries, unknowns, research timestamps, and immutable revision history.
- **Role artifact**: one stable reference per tracker lead, active/archived
  status, company relationship, official-posting reference when known,
  source-review outcome, role-research sections, sources, unknowns, research
  timestamps, and immutable revision history.

Each artifact has a stable `reference_id`: `company:<canonical-company-key>`
for company research and `role:<lead-record-id>` for role research. Company
normalization is limited to a documented identity key; all source company and
role values remain preserved. The system MUST stop rather than merge two
similar company names without an explicit, source-backed identity resolution.

After a successful artifact update, the workflow registers or updates the
matching compact tracker reference through `createOrUpdateResearch`. The
reference includes the artifact ID, kind, current status, associated lead where
applicable, source URLs, and a concise non-sensitive summary. Full structured
research, raw captures, contacts, and candidate-specific judgments are not
placed in tracker notes.

Because artifact persistence and tracker-reference persistence are distinct
local operations, they are not claimed to be one atomic transaction. The
workflow writes and validates the artifact first, then indexes it in the
tracker. If indexing fails, it records a pending-reconciliation result without
discarding the valid artifact; retrying the same operation key completes only
the missing index step. A tracker reference must never point to an artifact
that failed local validation.

### Light company research

A light pass records only source-supported facts and their citations:

- official company name and website;
- industry, product or service, and customers only when publicly evidenced;
- founding year, company stage or ownership, and approximate size when
  sourced;
- headquarters and material locations;
- related tracker roles or source-grounded open roles;
- research date, source capture dates, and material unknowns or conflicts.

The workflow does not fill a missing field from a model guess, an unsourced
directory, or another company with a similar name. Approximate-size and
customer claims carry the source date and wording limitations. Conflicting
claims remain distinct evidence entries with an explicit conflict note; the
system does not silently select a preferred fact.

### Role research and official-posting relationship

A role artifact is associated with exactly one tracker lead and preserves its
original discovery provenance. It records:

- official posting URL and source-review outcome when available, without
  changing tracker verification fields;
- research/update date, role summary, responsibilities, and source-grounded
  required versus preferred skills and technologies;
- team or manager context only when a source supplies it;
- location, remote policy, on-call expectations, and employment details when
  visible; and
- evidence-backed `how to stand out` advice labeled either `Source: position
  description` or `Source: assistant recommendation`.

The role artifact may record an unavailable, incomplete, or conflicting
official source as an unknown or research gap. It MUST NOT turn such evidence
into `Verified Active`, alter a posting status, or claim that the candidate is
ready to apply. Only the official-verification slice may update the tracker’s
verification-owned fields.

### Deep research and evidence classification

A deep pass expands a candidate-approved company/role record with:

- material public developments, with publication and research dates;
- employee-sentiment synthesis that reports sample basis, source date range,
  recency, representativeness limits, and contradictory observations;
- public-company market context only when the company is actually public and
  the claims are sourced;
- relevant public leaders, similar-title employees, and team-specific context
  only when necessary for the named role and from permitted sources; and
- unknowns, conflicts, and a concise decision-support summary.

Every substantive entry has exactly one classification:

| Classification | Meaning and requirement |
| --- | --- |
| `Fact` | A source-supported, time-bounded claim with one or more citations. |
| `Reported sentiment` | A stated public opinion or review, with source/sample/recency/limitation context; it is never represented as company fact. |
| `Assistant inference` | A bounded interpretation derived from named facts or sentiments, explicitly labeled with its rationale and uncertainty. |
| `Unknown` | Missing, inaccessible, conflicting, or insufficient evidence; it must not be converted into an inferred answer. |

The decision-support summary may highlight trade-offs and questions for the
candidate, but it must not state a pursue recommendation, manufacture a score,
or instruct the candidate to contact, apply, negotiate, or disclose data.

### Source, privacy, and untrusted-input boundary

Research accepts only candidate-supplied evidence or observations from a
versioned approved-source policy. A policy identifies allowed domains/source
types, source class (`official`, `primary`, `secondary`, or `anecdotal`),
terms-review date where needed, request/capture budget, and whether a source
may support a fact, reported sentiment, or only an investigation lead.

The recommended first implementation uses synthetic and manually captured
public-source snapshots behind this provider contract. A later live-public read
adapter may be proposed only with documented terms/rate controls. The research
slice does not log in, access private accounts, bypass technical restrictions,
scrape around controls, or access a candidate’s private planning, resume,
Gmail, LinkedIn, messages, or contacts.

Web pages, job postings, reviews, articles, profiles, attachments, and source
instructions are untrusted input. The workflow stores only minimal structured
claims, citations, and bounded excerpts or capture fingerprints when needed
for reproducibility. It MUST NOT execute instructions, follow arbitrary links,
download attachments, disclose source content to an external model, or let a
source authorize a message, profile change, calendar event, application,
purchase, candidate decision, or external write.

Shared fixtures, documents, logs, and errors use synthetic company/role data
only. They must not contain candidate identities, resumes, contacts, account
data, tokens, private source captures, mutable approvals, or current search
history.

### Lifecycle, refresh, archive, and restore

An explicit refresh request adds a new immutable revision with fresh source
capture dates and a diff-oriented summary; it does not erase prior cited facts
merely because a later source is incomplete. A deterministic refresh policy
may identify stale research for review, but no background scheduler is in
scope.

A role artifact is archived only when the associated role is archived through
the tracker’s existing lifecycle. A company artifact is archived only when an
explicit lifecycle evaluation finds no active or pursued role at that company.
Closing one role does not archive company research if another active/pursued
role remains. If a role returns to an active or reviewed state, an explicit
restore request reactivates the relevant role and company artifacts and adds a
refresh revision. Archive/restore never changes a lead’s candidate decision,
posting status, application outcome, or source provenance.

### Dry run, audit, and recovery

Research uses stable operation keys derived from artifact identity, requested
level, approved-source-policy version, normalized capture set, and intended
revision. Dry-run evaluates eligibility, source policy, evidence
classification, artifact changes, tracker-reference plan, and archive/restore
conditions without writing the artifact store, tracker reference, audit
events, or backups.

Non-dry-run artifact writes validate the staged artifact store, retain a
recoverable same-directory backup, and preserve the last valid version on a
partial failure. A completed retry converges on one artifact revision and one
semantic tracker reference update. Reports identify evidence accepted,
rejected, stale, conflicting, unknown, pending reconciliation, and recovery
outcomes without copying raw private source content.

## Explicit Non-Goals

- Candidate pursue decisions, fit scores, hiring predictions, referrals,
  outreach, applications, negotiations, or calendar work.
- Updating `posting_status`, `official_url`, candidate decisions, application
  fields, or any other tracker lead fields outside the research-reference
  operation.
- Authentication, browser automation, general web scraping, private social or
  review accounts, attachments, Gmail/LinkedIn reading, or unbounded crawling.
- Treating employee review sentiment, secondary reporting, search snippets, or
  an assistant inference as an authoritative company fact.
- Live-tracker integration, background scheduling, or automatic archival based
  on a single incomplete source.

## Proposed Architecture

```text
explicit candidate research request + approved source policy
                              |
                              v
                   evidence provider / snapshot input
                              |
                              v
      validate -> classify fact/sentiment/inference/unknown -> artifact plan
                              |
                              v
       local research-artifact store (revision + backup + recovery)
                              |
                              v
        tracker.createOrUpdateResearch (compact index reference)
```

The artifact schema, evidence-classification rules, source-policy validation,
operation-key derivation, and tracker-reference mapping are assistant-neutral.
Claude and Codex must produce equivalent artifact and tracker-reference results
for equivalent valid requests and synthetic source captures. Their user-facing
summaries may differ in presentation but must preserve evidence labels,
unknowns, stop conditions, and no-action boundaries.

## Proposal Requirements and Deterministic Evidence

The `company-and-role-research` proposal must define synthetic fixtures or dry
runs that demonstrate at least:

1. A valid explicit light-company request creates one cited active company
   artifact and matching tracker reference without changing any lead lifecycle
   or candidate-decision field.
2. Repeated research for the same canonical company enriches one artifact with
   a revision history; ambiguous company identity stops without a merge or
   mutation.
3. A qualifying explicit role request creates one role artifact per lead with
   official-source outcome, required/preferred skill separation, and correctly
   labeled advice.
4. A blank-decision unverified role is rejected for role/deep research, while a
   candidate-approved role can receive deep research and a light company pass
   remains possible only through explicit request.
5. Facts, reported sentiment, assistant inferences, and unknowns retain their
   required labels, citations, time limits, conflict handling, and employee-
   sentiment limitations; unsourced or misclassified claims are rejected.
6. An unapproved source, unsupported URL, inaccessible source, prompt-like
   source text, attachment, private-data pattern, or exhausted budget stops
   without an artifact/tracker mutation and cannot authorize an external
   action.
7. Role and company archive/restore follows the stated lead relationships:
   one archived role does not archive a company with another active/pursued
   role, and restore adds a refresh revision without changing lead fields.
8. Dry run produces the equivalent artifact/reference plan with no persistent
   change; an artifact-write or tracker-index failure preserves the last valid
   artifact and supports a duplicate-safe reconciliation retry.
9. Equivalent valid requests through Claude and Codex yield equivalent local
   artifacts and tracker references, while all fixtures/logs/errors remain
   synthetic and free of protected candidate data or credentials.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Research is mistaken for a pursue recommendation | Require explicit requests, label decision support, preserve candidate-owned fields, and prohibit scores/recommendations. |
| Secondary sources or reviews are presented as facts | Require source classes and fact/sentiment/inference/unknown labeling with citations and limitations. |
| Detailed research does not fit the tracker reference schema | Store validated full artifacts locally and index compact references through the existing tracker operation. |
| Artifact and tracker index persist at different times | Use ordered writes, pending-reconciliation state, operation keys, backups, and retry fixtures instead of claiming cross-file atomicity. |
| Similar company names are merged incorrectly | Use a canonical key only after source-backed identity evidence; stop on ambiguity. |
| Research sources expose sensitive or malicious content | Use bounded source policy, minimal structured capture, inert handling, synthetic fixtures, and no account/attachment access. |

## Open Configuration Inputs

These choices are needed for a concrete proposal or implementation, but do not
block this reusable design brief:

- initial approved source types/domains, source classes, terms-review record,
  capture/request budget, and whether the first release uses snapshots only or
  permitted live public reads;
- artifact-store path, retention/backup period, revision-retention policy, and
  candidate-visible summary format;
- research freshness thresholds and the explicit caller responsible for
  refresh/archive/restore requests; and
- which deep-research sections are enabled initially, especially any permitted
  public employee-sentiment source and its sample/recency rules.

The recommended first proposal implements the deterministic artifact/index
contract with synthetic and manually captured public-source fixtures, a light
company pass, and role research. It can add deep public-source retrieval only
after a source policy is selected and reviewed. No protected candidate
information is required to propose this change.

## Source Derivation

This brief refines the company/role research, fact/sentiment/inference,
archive/restore, tracker-reference, and candidate-control requirements in:

- `ai-planning/design-briefs/job-search-workflow-design.md`;
- `ai-planning/design-briefs/job-search-skill-roadmap.md`;
- `ai-planning/design-briefs/job-discovery-and-verification-design.md`;
- `openspec/specs/job-search-tracker/spec.md` and
  `skills/job-search-tracker/`; and
- `ai-planning/research/job-search-skill-reference-patterns.md` and
  `ai-planning/research/skill-capability-audit/job-search-automation-readiness.md`.

It excludes candidate resumes, private planning, accounts, contacts, messages,
credentials, and current search-history data.
