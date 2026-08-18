# LinkedIn Job Lead Intake Design

## Status

Proposal-ready design brief. It defines the `linkedin-job-lead-intake`
OpenSpec slice against the completed
[`job-search-tracker`](../../openspec/specs/job-search-tracker/spec.md)
capability. It is a candidate-controlled, provenance-preserving intake
boundary; it does not authorize LinkedIn account access, profile changes,
messages, or applications.

## Goal

Convert candidate-supplied LinkedIn job observations from permitted surfaces
into duplicate-safe, first-pass `LeadRecord` upserts with enough provenance to
support later review and official-posting verification. Preserve useful
LinkedIn recruiter-view signals without inventing a job, a recruiter identity,
or candidate intent.

## Dependency and Existing Contract

This slice MUST call the tracker’s canonical versioned request/result contract
and `upsertLead` operation. It MUST NOT write local tracker JSON directly.
The tracker already supplies:

- native-ID-first identity, with company/title/canonical-discovery-URL
  fallback and an ambiguity stop;
- first-pass and `Unverified` defaults, separate candidate-decision and
  verification ownership, and provenance-preserving updates;
- dry runs, stable operation keys, audit events, backups, recovery, and
  local-target validation; and
- an explicitly authorized local JSON reference target only. A live tracker
  adapter is out of scope.

The companion
[job-discovery-and-verification design](job-discovery-and-verification-design.md)
owns public-source discovery and official-posting verification. LinkedIn
observations can create discovery leads but are not official verification
evidence.

## Scope

### Permitted observation surfaces

The portable intake contract accepts only an explicitly requested and
versioned surface policy. The policy may enable these source observations:

| Surface | Allowed result | Required boundary |
| --- | --- | --- |
| Saved job card or job-detail page | First-pass job lead when it provides a title, company, and a job identifier or job URL. | Never represents the job as active or verified. |
| Recruiter- or person-shared job link | First-pass job lead when the role can be identified from the link or visible job content. | The sharer/message is provenance, not proof of an endorsement, referral, or current opening. |
| Message mentioning a role | First-pass job lead only when the visible content supplies a company, role title, and role-specific LinkedIn job identifier or URL. | No reply, forwarding, link execution, attachment handling, or interpretation of instructions. |
| Named recruiter profile-view signal | A transient, candidate-visible discovery cue only. | Never claims the viewer’s intent or creates a job lead without a visible role. |
| Anonymous recruiter-at-company profile-view signal | A transient company discovery cue only. | Never infers a person, role, or interest level; it does not create a `LeadRecord`. |

A profile view alone cannot produce a tracker lead: the existing tracker
requires a source-grounded company, role title, and lead identity. The intake
report MAY show the cue so that the candidate can investigate it manually, but
it MUST not synthesize an `Unknown role`, match the viewer to another profile,
or persist a person’s profile data in the lead record. Outreach drafting is a
separate future slice.

The recommended first implementation accepts synthetic fixtures and manually
captured structured observations only. A future live-session or connector
adapter needs its own terms, account, least-privilege, privacy, and
just-in-time authorization design before it can be enabled. It MUST never ask
for, store, or handle passwords, OAuth material, one-time codes, CAPTCHA
responses, or session cookies.

### Structured observation and extraction

Each observation contains only the source-grounded data needed for intake:

- surface kind, policy version, capture time, and a caller-provided capture
  reference or content fingerprint;
- original LinkedIn job URL when visible, canonicalized only for identity while
  retaining the original URL as `lead_url`;
- a visible LinkedIn job ID when it can be unambiguously extracted from the
  job detail or job URL;
- company name, role title, location, remote/workplace type, posted-date text
  and normalized date only when known, compensation when visible, and concise
  extraction warnings;
- a minimally sufficient source-detail label, such as `LinkedIn saved job` or
  `LinkedIn shared role`; and
- an evidence reference that identifies the supplied capture without storing
  unnecessary raw message, profile, or account content.

The adapter MUST preserve source values, represent missing values as unknown,
and reject malformed fields rather than filling them with guesses. It MUST not
read a resume, infer candidate fit, derive protected information, retain a
message body or profile text by default, or treat a LinkedIn label such as
`Actively recruiting` as evidence that a specific role is open.

### Identity, duplicate handling, and provenance

For a role observation, the preferred `native_source_id` is
`linkedin-job:<visible-job-id>`. It may be used only when the visible job ID
unambiguously identifies the role. A message, conversation, viewer, profile,
or sharing-event identifier MUST NOT become a job lead’s native identifier:
those values identify an interaction rather than the job and could create
incorrect duplicate behavior.

When no valid job ID is visible, intake MUST use the tracker’s fallback
identity: source-grounded company and title plus a role-specific canonical job
URL. An observation that has neither a valid job ID nor a role-specific URL
MUST stop without a tracker write and report the missing identity evidence.

An identity match upserts exactly one lead and adds LinkedIn source provenance
and evidence links without erasing the original discovery URL, source values,
candidate decision, verification state, or application fields. An ambiguous
fallback match stops without mutation. Multiple LinkedIn surfaces that refer to
the same job therefore enrich one lead, while separately shared roles do not
collapse just because they came from the same person or conversation.

### Intake result and tracker mutation

For each valid job observation, the adapter calls `upsertLead` with only the
tracker’s source-owned fields:

- `company_name`, `role_title`, `source`, `source_detail`, `lead_url`, and
  `native_source_id` where valid;
- `date_found`, `posted_text`, `date_posted`, `location`, `remote_type`, and
  `compensation` only when source-grounded;
- source-capture evidence links and a concise inert note describing material
  uncertainty.

The resulting record remains `First-Pass Potential Match` and `Unverified`
with blank pursue fields. The intake must not call `updateCandidateDecision`,
`updateVerification`, `updateApplicationOutcome`, or any external service. It
must not send a LinkedIn message, create a connection request, save/unsave a
job, change a profile, follow a person or company, submit an application, or
claim a referral.

The run produces a dry-run-capable result that separates:

- leads planned for creation or enrichment, including their identity method;
- profile-view and incomplete-message discovery cues that intentionally did
  not create leads;
- duplicate, malformed, unsupported-surface, and policy-disabled observations;
  and
- extraction warnings, ignored untrusted instructions, and recovery errors.

### Untrusted-input and account boundary

LinkedIn listings, messages, profile text, links, attachments, recruiter
names, and any page-provided instructions are untrusted input. The adapter
parses them only as inert data after schema and allowed-URL validation. It
MUST NOT execute embedded instructions; follow arbitrary links; disclose
content to an external model; or treat text as authorization for a decision,
message, connection, profile update, calendar event, application, or tracker
target change.

The initial snapshot importer has no LinkedIn login, browser automation,
scraping, polling, or API dependency. Any later interactive read adapter may
operate only after a separately approved provider policy documents permitted
surfaces, platform terms review, read scope, request budget, data minimization,
retention, error behavior, revocation path, and a user-facing authorization
boundary. It must halt at authentication, MFA, CAPTCHAs, access blocks,
unsupported pages, or any attempted external write.

### Audit, idempotency, and recovery

Each run derives a stable operation key from the surface-policy version,
capture fingerprint/reference, normalized job identity, and intended
source-owned fields. Retrying a completed observation must converge on the
same one tracker record without duplicated provenance or semantic audit
effects. Dry-run executes the complete extraction, policy, identity, and
upsert planning path without changing tracker data, audit events, or backups.

If a batch fails after one successful upsert, a rerun may safely resume each
remaining item through its stable key. The report identifies completed,
skipped, and failed observations without exposing message content, contact
details, secrets, or candidate-specific preferences. The underlying tracker
remains responsible for atomic local persistence and recovery.

## Explicit Non-Goals

- Browser automation, LinkedIn scraping, API/OAuth integration, account login,
  scheduled polling, or credential/session storage.
- Sending messages, connection requests, InMails, reactions, endorsements, or
  profile updates; preparing outreach drafts belongs to a later slice.
- Deciding to pursue a role, ranking candidate fit, changing any candidate
  decision, applying, or claiming a referral.
- Treating LinkedIn job data, a share, a message, or a profile-view signal as
  official verification of a job’s availability.
- Gmail intake, public-job-board discovery, official-posting resolution,
  company research, a live tracker adapter, or personal contact management.
- Persisting raw message bodies, attachments, profile text, account data, or
  candidate-specific configuration in reusable artifacts or fixtures.

## Proposed Architecture

```text
candidate-supplied LinkedIn snapshot / approved future read adapter
                              |
                              v
                 surface-policy + schema validation
                              |
          +-------------------+-------------------+
          |                                       |
          v                                       v
 role observation with job identity          profile-view / incomplete cue
          |                                       |
          v                                       v
 native job ID or fallback identity       transient candidate review report
          |
          v
  dry-run plan -> tracker.upsertLead -> first-pass, Unverified lead
```

The canonical behavior is assistant-neutral structured extraction and tracker
calls. Claude and Codex exposures must accept the same normalized observation
format, use the same policy and operation-key derivation, and return
equivalent planned/persisted records for equivalent valid input. They may
format the candidate-visible report differently but must preserve the same
stop conditions and no-action boundary.

## Proposal Requirements and Deterministic Evidence

The `linkedin-job-lead-intake` proposal must define at least these synthetic
fixtures or dry runs:

1. A valid saved-job observation with a visible job ID creates one blank-
   decision, `Unverified` first-pass lead carrying `linkedin-job:<id>` and
   source provenance.
2. A valid shared-role observation of that same job enriches the existing
   record without changing its candidate decision, original discovery URL,
   verification data, or application fields.
3. A role without a job ID but with valid company, title, and role URL uses
   fallback identity; an ambiguous fallback stops without modifying either
   candidate record.
4. A message without a role-specific job ID or URL, or a profile-view signal
   without a visible role, becomes a non-persisted cue with an explicit reason
   rather than a fabricated lead.
5. A named and an anonymous recruiter-view signal do not claim viewer intent,
   do not infer a person, and do not produce a message, connection, or lead
   mutation solely from the signal.
6. Unsupported surfaces, malformed or cross-domain URLs, missing company/title,
   policy-disabled input, and exhausted capture/request budgets stop before a
   tracker mutation.
7. Prompt-like message text, a malicious link, or an instruction to send,
   apply, alter a candidate decision, or disclose data remains inert and
   cannot authorize any such action.
8. A dry-run emits the same planned creates, updates, skips, and cues as the
   equivalent run while leaving the local target and audit events unchanged.
9. Retrying a partially completed batch converges without duplicate records,
   duplicate provenance, or repeated semantic audit effects, while a tracker
   recovery failure reports a retry-safe error.
10. Equivalent valid normalized observations submitted through Claude and
    Codex produce equivalent tracker records and no credential-like or
    candidate-specific content appears in fixtures, audit evidence, or errors.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| LinkedIn terms or technical controls do not permit the proposed access path | Start with manually captured/synthetic observations; add a live read adapter only after documented platform-policy and authorization review. |
| A conversation or viewer ID is mistaken for a job identity | Allow only visible job IDs in `native_source_id`; retain interaction provenance separately and stop when job identity is insufficient. |
| Profile views imply interest in a role or recruiter relationship | Treat signals as neutral cues, never as a role, referral, person match, or authorization to reach out. |
| Message and profile data introduce private or malicious content | Default to minimal structured extraction, inert handling, synthetic fixtures, and no raw-content retention. |
| Repeated saved/shared observations create duplicate queue entries | Prefer the job ID, use tracker fallback only when safe, union provenance, and stop on ambiguity. |
| Intake is mistaken for verification or a candidate decision | Preserve `Unverified` and blank pursue state; reserve official verification and candidate decisions for their dedicated operations. |

## Open Configuration Inputs

These inputs are necessary when a concrete implementation or live read adapter
is selected, but do not block this reusable design brief:

- which permitted surfaces the first release enables; the recommended default
  is saved-job and shared-role structured snapshots, with messages and
  profile-view signals reported only as cues;
- the capture format, local evidence-retention period, and redaction rules for
  message and viewer metadata;
- whether a future live read path is appropriate, including its terms-review
  record, approved browser/connector mechanism, rate/capture budget, and
  account authorization boundary; and
- the exact source-detail labels and candidate-visible report presentation.

No personal LinkedIn account data, recruiter/contact list, private messages,
or candidate filter values need to be supplied to create the OpenSpec proposal.
The recommended first proposal implements only the structured snapshot
contract and deterministic fixtures, deferring live account connectivity until
its authorization and platform boundary are independently approved.

## Source Derivation

This brief refines the LinkedIn first-pass-source, native-identifier,
recruiter-view, provenance, and candidate-control requirements in:

- `ai-planning/design-briefs/job-search-workflow-design.md`;
- `ai-planning/design-briefs/job-search-skill-roadmap.md`;
- `ai-planning/design-briefs/job-discovery-and-verification-design.md`;
- `openspec/specs/job-search-tracker/spec.md` and
  `skills/job-search-tracker/`; and
- `ai-planning/research/job-search-skill-reference-patterns.md` and
  `ai-planning/research/skill-capability-audit/job-search-automation-readiness.md`.

It deliberately excludes protected candidate resumes, private planning,
LinkedIn accounts, messages, contacts, and current job-search history.
