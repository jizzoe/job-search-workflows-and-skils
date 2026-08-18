# Job Discovery and Official-Posting Verification Design

## Status

Proposal-ready design brief. It defines the `job-discovery-and-verification`
OpenSpec slice that follows the completed `job-search-tracker-foundation`.
It is reusable and candidate-controlled: candidate-specific source selections,
filters, and target records remain private configuration rather than committed
content.

## Goal

Turn observations from explicitly approved public job sources into
provenance-preserving first-pass leads, and turn only explicitly eligible leads
into evidence-backed official-posting verification results. The workflow helps
the candidate review a reliable queue; it does not choose which role to pursue,
apply, message, or otherwise act on.

## Dependency and Existing Contract

This slice depends on the living
[`job-search-tracker`](../../openspec/specs/job-search-tracker/spec.md)
capability. It MUST use its canonical local request/result contract and
operations rather than write tracker JSON directly.

The existing tracker supplies:

- stable native-ID-first identity and normalized company/title/discovery-URL
  fallback identity;
- provenance-preserving `upsertLead` behavior with blank candidate decisions;
- separate `updateVerification` ownership for official URL and posting state;
- field-level validation, audit events, dry runs, backups, and retry-safe
  operation keys; and
- a local-only reference target. A live spreadsheet/database adapter is a
  separate future change and is not introduced here.

## Scope

### Discovery

The change introduces a source-provider contract and deterministic discovery
pipeline that:

1. accepts observations only from an explicit, versioned approved-source
   allowlist supplied at run time;
2. validates source provenance, source URL, native ID when available, company,
   title, location/remote information, source date text, compensation when
   visible, and concise extraction warnings;
3. applies candidate-controlled, deterministic inclusion/exclusion filters
   without embedding candidate preferences in shared assets;
4. calculates an explainable ranking from only declared, source-grounded
   factors and records the factor results rather than an opaque model score;
5. upserts qualifying observations through the tracker as `First-Pass Potential
   Match` and `Unverified`, preserving source provenance and leaving all pursue
   fields untouched; and
6. produces a dry-run report containing accepted, filtered-out, duplicate,
   malformed, and unavailable observations with reasons.

An initial concrete provider MAY read an approved public, unauthenticated
source under its documented terms and rate policy. It MUST NOT sign in, bypass
access controls, scrape around technical restrictions, execute source content,
or treat any non-official listing as verification evidence. If no concrete
source can meet those constraints, the first implementation MUST provide the
same provider contract against synthetic and manually captured source
snapshots; that is valid deterministic evidence but is not a claim of live
discovery coverage.

### Candidate-controlled filters and ranking

Shared artifacts define a portable filter schema only. Candidate values belong
in an explicitly supplied private configuration or request and are never
committed. The schema supports:

- source allowlist and per-source request budget;
- company include/exclude lists;
- title include/exclude patterns;
- location and remote-policy constraints;
- optional compensation range only when a source supplies compensation;
- required and excluded technology or keyword terms; and
- maximum result count and minimum transparent ranking threshold.

An observation that is missing a requested field MUST remain eligible only
when the relevant filter declares an `unknown` policy. The default is
`unknown = retain-with-warning`; missing data is never silently treated as a
match. Ranking MAY prioritize declared positive factors, but it MUST NOT infer
fit from a resume, protected candidate data, demographic data, or an unstated
preference. A tie is ordered deterministically by source timestamp, source
identity, then canonical discovery URL; ties are not a pursue decision.

### Official-posting verification

Verification is a separate, explicitly requested operation. It accepts a lead
only when its candidate-owned decision is `Yes` or when the candidate provides
an equivalent explicit verification request; discovery, ranking, and source
content can never create that eligibility. The verifier resolves the lead to
an employer career site or official ATS page and captures a timestamped
evidence record for the visible facts below:

- exact role title and company identity;
- official URL and an active apply path;
- active or unavailable state, including closed, filled, expired, removed, or
  inaccessible outcomes;
- location and remote-policy information;
- enough position description to assess the role rather than only a title;
- posting date and compensation when the official source supplies them; and
- discrepancies between discovery and official information.

The verifier writes `Verified Active` only when title, official source, active
apply path, and availability checks all succeed. It writes `Needs Research`
with the precise missing or conflicting evidence when verification is
incomplete. It writes `Closed`, `Expired`, or `Removed` only from matching
official-source evidence. An aggregator, search snippet, cached page, or
unverified redirect can help discover a role but can never make it verified.

The verifier MUST preserve the original discovery URL and all prior source
provenance. It may enrich location, compensation, and date fields only with
source attribution and without overwriting a candidate-owned decision.

### Staleness and re-verification

Every verification result records `verified_at`, evidence capture time, and a
source-specific recheck deadline. The default deadline is seven calendar days
after a `Verified Active` result unless an approved source policy supplies a
shorter deadline. The workflow does not require a scheduler: a caller may ask
for a recheck batch, and a run selects only verified leads whose deadline has
passed or whose official URL/evidence is incomplete.

Reverification repeats the official checks and:

- preserves `Verified Active` when the listing remains active, refreshing
  evidence and deadline;
- changes only posting-status and verification-owned fields when the official
  listing is unavailable or materially changed;
- writes `Needs Research` when retrieval fails or evidence is insufficient;
- never changes `pursue_decision`, `decision_reason`, application status, or
  follow-up fields; and
- records a stable operation key so retrying a completed recheck does not
  duplicate audit effects.

### Replacement discovery

The change provides a bounded replacement-discovery request for a caller such
as the future post-review workflow. Its input names a source/filter profile,
an explicit maximum count, and identities to exclude. It runs the normal
discovery pipeline and excludes records that are duplicates, already archived
for the same canonical identity, or otherwise named in the request. Every
replacement is still a blank-decision first-pass lead; the workflow must not
decide whether the queue has an adequate replacement or alter decision history.

## Explicit Non-Goals

- Connecting to LinkedIn, Gmail, recruiter messages, saved jobs, or profile
  views; those belong to their dedicated intake changes.
- Signing in, using OAuth, storing credentials, or accessing a live private
  tracker.
- Generic web crawling, CAPTCHAs, bypassing anti-automation controls, or
  operating a source that lacks an approved terms/rate policy.
- Candidate-specific ranking data, resume reading, automated pursue decisions,
  outreach, application preparation, application submission, or calendar work.
- Deep company/role research; this slice captures only the position evidence
  needed to verify an official posting.
- A background scheduler or unattended retry worker. Runs are explicit and
  bounded, even when they process stale records.

## Proposed Architecture

```text
approved source policy + private filter profile
                    |
                    v
           source-provider observations
                    |
                    v
   validate -> filter -> explainable rank -> dry-run report
                    |
                    v
       tracker.upsertLead (blank decision, Unverified)
                    |
       explicit candidate verification gate
                    v
   official resolver -> evidence checks -> tracker.updateVerification
                    |
                    v
       verified / needs-research / unavailable result
```

### Source-provider boundary

The canonical provider returns inert structured observations and never passes
raw page instructions to downstream logic. Each observation contains a provider
name/version, fetch or capture time, original source URL, native identifier
when available, extracted fields, extraction warnings, and a source-evidence
reference. Providers expose a declared source policy with terms-review date,
request budget, allowed URL patterns, and whether the source is discovery-only
or may also be considered official.

The pipeline validates the observation before filtering. It must reject a
provider result that lacks required provenance, has an unsupported source, or
contains fields outside the source contract. It must store raw source text only
when required for minimal reproducible evidence, and fixtures MUST remain
synthetic.

### Official resolver boundary

The resolver accepts one tracker record and an explicit verification request.
It follows only declared official-domain/ATS URL patterns or a candidate-supplied
official URL. Redirects that leave an approved employer/ATS boundary return
`Needs Research`; they are not followed as authority. The resolver returns a
structured verification result, evidence references, and a reason code for
each failure or stop condition. Tracker mutation occurs only after that result
passes validation.

### Audit, idempotency, and recovery

Every discovery, replacement, verification, and recheck run uses a stable
operation key derived from source policy version, normalized request, source
identity, and evidence timestamp or content fingerprint. The result records
attempted fields, accepted/rejected counts, tracker record identities, stop
reasons, and errors without copying candidate-private configuration or secrets.

Dry-run evaluates the same source, filter, rank, identity, and verification
logic but does not write leads, verification state, audit events, or backups.
If a run fails after one tracker update, rerunning with the same keys must
converge: already-completed updates are recognized, while incomplete items are
safe to resume. A source or verification retrieval failure must leave existing
verified evidence intact until a valid result changes it.

## Proposal Requirements and Deterministic Evidence

The OpenSpec proposal for `job-discovery-and-verification` must specify at
least the following deterministic fixtures or dry runs:

1. A valid observation from an approved source becomes one `Unverified`,
   blank-decision first-pass lead with complete provenance.
2. A source observation that matches an existing native ID or fallback identity
   updates one record without erasing discovery provenance or a candidate
   decision.
3. Filters retain unknown fields with warnings by default, reject only explicit
   mismatch rules, and produce deterministic ranking/tie explanations.
4. An unapproved source, unsupported URL, malformed observation, prompt-like
   source content, or exhausted request budget produces a non-mutating stop
   result.
5. An aggregator or cached listing cannot yield `Verified Active`.
6. A matching official active posting records official URL and evidence, while
   a closed, missing, mismatched, redirected, or insufficient official posting
   receives the correct non-active status and reason.
7. Discovery cannot initiate verification or modify a candidate decision;
   verification rejects a lead without the explicit candidate gate.
8. Reverification updates stale evidence without changing candidate or
   application-owned fields, and a retry after partial failure is duplicate-safe
   and auditable.
9. Replacement discovery excludes supplied/archive identities, creates only
   fresh blank-decision leads, honors its count bound, and is safe to rerun.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Platform terms or technical controls prohibit collection | Require source-policy terms evidence, a strict request budget, and a snapshot-only provider fallback; do not bypass controls. |
| Aggregator data is stale or wrong | Retain it only as discovery provenance; require an official employer/ATS result before verified status. |
| Ranking appears to make a candidate decision | Use declared factor explanations, deterministic ties, and blank pursue fields; ranking orders a review queue only. |
| Official pages vary or redirect unpredictably | Treat unsupported redirects, missing evidence, and parsing uncertainty as `Needs Research`, never as active verification. |
| Source inputs contain prompt injection or malicious links | Handle source content as inert data, validate provider fields/URLs, and never execute instructions or follow unapproved links. |
| Rechecks overwrite useful evidence during an outage | Preserve prior evidence, write a structured retrieval failure, and retry through idempotent operation keys. |

## Open Configuration Inputs

These inputs are required when a concrete provider is proposed or run, but do
not block this reusable design brief:

- the first public source or sources, their URL patterns, terms-review dates,
  and request budgets;
- the exact private filter profile and ranking factors for a candidate or run;
- whether the first implementation exercises a permitted live public source or
  only the provider contract and source snapshots; and
- the cadence or caller that submits recheck batches (a scheduler remains out
  of scope).

The recommended first proposal uses a provider contract plus synthetic and
manually captured snapshots as deterministic evidence, and adds a live provider
only after its source policy has been reviewed and recorded. That retains the
full discovery/verification behavior contract without treating a platform or
aggregator as an unexamined dependency.

## Source Derivation

This brief refines the discovery, verification, replacement, stale-posting,
and candidate-control requirements in:

- `ai-planning/design-briefs/job-search-workflow-design.md`;
- `ai-planning/design-briefs/job-search-skill-roadmap.md`;
- `openspec/specs/job-search-tracker/spec.md`; and
- `ai-planning/research/skill-capability-audit/job-search-automation-readiness.md`.

It also preserves the public-reference cautions in
`ai-planning/research/job-search-skill-reference-patterns.md`. It does not
copy protected candidate planning, resume, account, contact, or search-history
data.
