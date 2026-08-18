# Gmail Job Lead Intake Design

## Status

Proposal-ready design brief. It defines the `gmail-job-lead-intake` OpenSpec
slice against the completed
[`job-search-tracker`](../../openspec/specs/job-search-tracker/spec.md)
capability. It accepts either a Gmail MCP server or direct Gmail API as a
future read-only transport, selected during proposal creation; it does not
authorize account connection, messages, calendar changes, applications, or
candidate decisions.

## Goal

Turn explicitly scoped inbound recruiter and contact emails into
provenance-preserving, first-pass job leads when the message contains enough
source-grounded role identity. Return incomplete or non-role messages as
non-persisted review results, and keep all email content inert so an incoming
message cannot cause a consequential action.

## Dependency and Existing Contract

This slice MUST use the tracker’s canonical versioned request/result contract
and `upsertLead` operation. It MUST NOT write tracker JSON directly. The
existing tracker provides:

- first-pass `Unverified` records, with candidate decisions and verification
  updates owned by separate operations;
- native-ID-first and company/title/canonical-URL fallback identity, including
  a non-mutating ambiguity stop;
- provenance-preserving upserts, dry runs, stable operation keys, audit
  records, backup/recovery, and local-target validation; and
- a local JSON reference target only. A live tracker adapter remains a
  separate change.

The companion
[job-discovery-and-verification design](job-discovery-and-verification-design.md)
owns public discovery and official-posting verification. Gmail provides
discovery provenance only: an email, sender, link, or attachment can never
mark a role active or verified. The later interview-scheduling slice owns
reply and calendar behavior.

## Mandatory Proposal-Time Transport Decision

When `gmail-job-lead-intake` is proposed, stop before creating connector
implementation tasks and ask the user to select exactly one initial transport:

1. **Configured Gmail MCP server** — the change implements only against the
   server’s documented read-only Gmail capabilities and validates that no send,
   draft, label-write, or calendar-write tool is invoked.
2. **Direct Gmail API** — the change implements a repository-owned read-only
   API adapter with its exact least-privilege scope, authorization boundary,
   credential handling, revocation procedure, and rate/retry policy specified
   in the OpenSpec design.

The proposal MUST NOT assume a server’s tool names, authentication model, or
data shape before this choice, and it MUST NOT implement both transports in
the same first change. The selected transport is an implementation detail
behind the same assistant-neutral normalized-observation contract.

## Scope

### Read boundary and allowed mailbox observations

An intake run is explicit and bounded. Its caller supplies a private, versioned
read policy containing the allowed mailbox scope, labels or search expression,
time window or cursor, maximum messages, sender/domain rules when desired, and
whether message bodies may be inspected. The recommended initial policy reads
only a bounded set of inbound messages selected by an explicit search or label
and excludes drafts, sent mail, attachments, and any write operation.

The transport must expose only the minimum metadata and body portions needed
to classify a message. It must use a read-only permission equivalent for the
selected transport, halt if an authentication prompt, consent escalation,
unsupported scope, or any write capability is required, and never store
credentials, tokens, cookies, client secrets, account addresses, or raw
authorization grants in the repository, fixtures, logs, or tracker.

Allowed message outcomes are:

| Outcome | Result |
| --- | --- |
| Role lead | A first-pass lead only when a source-grounded company and title exist and a stable role or message/thread identity is available. |
| Incomplete role cue | Non-persisted report entry when a message appears job-related but lacks enough identity or contains material ambiguity. |
| Non-role message | Non-persisted skip with a coarse reason, such as unrelated, automated notification, duplicate event, or policy-excluded sender. |
| Sensitive/action-required message | Non-persisted escalation to the candidate; no link opening, attachment handling, reply, calendar change, or tracker mutation occurs merely because the message asks for it. |

The classifier orders messages into these outcomes; it does not assess fit,
infer candidate interest, decide to pursue, or treat an invitation, referral,
application request, compensation statement, assessment, background-check
request, or scheduling request as permission to act.

### Normalized message observation and extraction

The canonical connector boundary returns inert normalized observations, not
raw transport objects. A valid observation includes only:

- opaque Gmail message and thread references, capture time, policy version,
  and an idempotency cursor or content fingerprint;
- minimally necessary sender classification and source-detail label, without
  persisting a contact’s name or email address by default;
- source-grounded company name, role title, location/remote information,
  posted-date wording, compensation when visible, and concise uncertainty
  notes;
- visible job or official URL only after scheme/domain validation; and
- a bounded extraction classification and warning set.

The implementation MUST keep raw subject/body text transient by default and
MUST NOT persist it into tracker notes, audit events, test fixtures, or error
output. It MUST NOT retrieve, open, parse, summarize, download, or disclose
attachments in this slice. It must treat all headers, display names, bodies,
quoted messages, URLs, and attached-file references as untrusted input. URL
text may be recorded as discovery provenance only after validation; it is not
followed or accepted as official evidence by Gmail intake.

### Role identity, duplicate handling, and thread provenance

For a job referenced by email, the adapter uses a visible role-specific native
identifier when it can be extracted unambiguously from an approved job or ATS
link. Otherwise it uses `gmail-thread:<thread-id>` as the native source ID,
without storing a Gmail permalink or account address. A message ID may be
recorded as transient run provenance, but a thread ID is the preferred email
identity so later replies in the same conversation enrich one lead rather than
create one lead per message.

If a message has neither a safe role-specific identifier nor a usable thread
reference, it MUST stop without a tracker write. If no stable native ID is
available but company, title, and an eligible role-specific HTTP(S) URL are
available, it MAY use the tracker’s fallback identity. It MUST never fabricate
a job ID from a sender, subject line, company name, or arbitrary link.

Native Gmail thread identity makes repeated processing of the same email
conversation duplicate-safe. It does not justify a fuzzy merge with a lead
from LinkedIn or a public source that has a different native ID; cross-source
reconciliation is deferred until a dedicated design can preserve both
identities without guessing. An ambiguous fallback match stops without
mutation.

On a valid upsert, the adapter writes only source-owned fields: company, title,
source/source detail, job URL when safe, native source ID, source-grounded
location/remote/date/compensation values, evidence references, and concise
inert uncertainty notes. It preserves prior provenance, original discovery
URL, candidate decision, official verification, and application-owned fields.
The resulting lead remains `First-Pass Potential Match`, `Unverified`, and
blank-decision.

### Classification and untrusted-input boundary

Classification operates on declared structural signals and bounded extraction
rules. Any heuristic or model-assisted classifier must produce an explainable
classification plus evidence-field references, and uncertain results default
to an incomplete cue or candidate review—not a lead mutation. It must not use
candidate resumes, private preferences, contacts, or prior decision history to
infer fit or eligibility.

Message content cannot authorize any action. In particular, text asking the
assistant to ignore rules, disclose data, change a decision, reply, schedule,
follow a link, download an attachment, complete a form, or use a new mailbox
scope remains inert data. The intake cannot invoke Gmail send/draft/modify,
Calendar, LinkedIn, a browser, an external model, an application system, or a
different tracker target.

### Dry runs, audit, and recovery

Every processed item derives a stable operation key from the read-policy
version, selected transport-independent message/thread reference, normalized
identity, and intended source-owned fields. A dry run uses the same read,
classification, identity, and upsert planning logic but changes neither the
tracker target nor its audit events or backups.

The candidate-visible result separates planned creates/updates, existing
thread duplicates, incomplete cues, policy skips, unsafe content stops,
classification failures, and connector/recovery errors. It reports opaque IDs
and field-level reasons rather than raw message content or contact data. If a
batch is interrupted after some tracker upserts, rerunning with the same keys
must converge without duplicate leads or semantic audit events; the tracker
continues to own atomic local write recovery.

## Explicit Non-Goals

- Sending, replying to, forwarding, drafting, deleting, archiving, labeling,
  marking read, or otherwise changing Gmail messages.
- Calendar access, scheduling, meeting acceptance, or any external write.
- Reading attachments, opening links, browser automation, application
  preparation/submission, or official-posting verification.
- Candidate fit ranking, pursue-decision mutation, outreach decisions,
  contact-list management, or referral claims.
- Implementing both Gmail MCP and Gmail API paths in the first change,
  committing OAuth/client credentials, or silently expanding mailbox scope.
- Unattended polling, background monitoring, or access to a live tracker.

## Proposed Architecture

```text
selected read-only transport
  (Gmail MCP server OR Gmail API)
                 |
                 v
      bounded private read policy / cursor
                 |
                 v
   normalized inert message observations
                 |
                 v
 validate -> classify -> identity -> dry-run report
                 |
         valid role lead only
                 v
      tracker.upsertLead (first-pass, Unverified)
```

The normalization, classification, identity, policy, operation-key, and
tracker behavior are assistant-neutral. Claude and Codex must give equivalent
results for the same valid normalized observations and private policy. The
selected Gmail transport is the sole adapter that may contact a mailbox, and
its output is validated before any tracker operation.

## Proposal Requirements and Deterministic Evidence

The `gmail-job-lead-intake` proposal must define synthetic fixtures and dry
runs covering at least:

1. A qualifying inbound email with a stable thread reference and
   source-grounded company/title creates one blank-decision, `Unverified`
   first-pass lead with Gmail provenance.
2. A later message in the same thread enriches the existing lead without
   changing its original provenance, candidate decision, verification result,
   or application-owned fields.
3. A role-specific job/ATS identity is preferred when valid; a valid fallback
   identity is deterministic, while an ambiguous fallback stops without
   mutating either matched record.
4. An incomplete recruiter/contact email becomes a non-persisted cue; an
   unrelated, automated, policy-excluded, or out-of-window message is skipped
   with a coarse non-sensitive reason.
5. A message requesting a reply, attachment download, calendar event, link
   opening, application, credential entry, decision change, or data disclosure
   remains inert and produces none of those actions.
6. Unsupported mailbox scope, authentication/consent escalation, attempted
   write capability, malformed transport response, missing thread identity,
   excessive batch size, or a connector rate/retrieval failure stops safely
   before any unintended tracker mutation.
7. A dry run reports the same planned creates, updates, cues, and skips as the
   equivalent execution while leaving the local target and audit events
   unchanged.
8. A partially completed batch retry is idempotent and auditable; duplicated
   message delivery or thread reprocessing does not create duplicate leads or
   semantic audit events.
9. Equivalent normalized observations through Claude and Codex produce
   equivalent tracker outcomes, and fixtures/audit/error output contain only
   synthetic email identities and no credentials, account data, contact
   details, or raw message bodies.
10. The selected transport has contract tests for its read-only boundary; it
    fails closed if a required operation is absent, broadened, or write-capable.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Transport scope silently permits writes or excess mailbox access | Select exactly one adapter, declare a read-only scope and bounded policy, test for forbidden operations, and fail closed on escalation. |
| Recruiter messages contain phishing, prompt injection, or sensitive requests | Treat all content as inert, keep raw text transient, do not open links/attachments, and surface only a minimal candidate review result. |
| Thread IDs cause cross-source duplicates | Deduplicate safely within Gmail threads; defer cross-source reconciliation rather than fuzzy-merging distinct identities. |
| Reprocessing mail creates duplicate tracker updates | Use a thread-based operation key, tracker-native idempotency, cursor reporting, and partial-batch retry fixtures. |
| Classification mistakes non-role mail for a role | Require source-grounded company/title plus stable identity; uncertain messages remain non-persisted cues. |
| Gmail metadata exposes private contacts or search history | Use private runtime policy, synthetic fixtures, minimal opaque evidence, and no raw body/contact persistence. |

## Open Configuration Inputs

The following must be provided when the change is proposed or implemented, but
do not block this reusable brief:

- **Required at Propose:** select Gmail MCP server or direct Gmail API; the
  proposal must ask this question before specifying connector tasks.
- The read-only mailbox scope, labels/search query, initial time window/cursor,
  maximum batch size, and sender/domain policy, all kept in private runtime
  configuration.
- Whether body inspection is enabled, the exact retention/redaction policy for
  extracted message metadata, and the candidate-visible review-report shape.
- For the selected transport: its documented authorization/credential
  boundary, revocation process, rate limits, retry/backoff behavior, and
  available read operations.

The recommended first implementation is an explicit, bounded inbound-read
batch against the chosen transport with synthetic adapter fixtures, no
attachments, no background polling, and no external writes. No candidate
mailbox contents, account information, recruiter/contact list, or private
search preferences need to be committed to create the proposal.

## Source Derivation

This brief refines the Gmail-message provenance, untrusted-input, lifecycle,
and candidate-control requirements in:

- `ai-planning/design-briefs/job-search-workflow-design.md`;
- `ai-planning/design-briefs/job-search-skill-roadmap.md`;
- `ai-planning/design-briefs/job-discovery-and-verification-design.md`;
- `openspec/specs/job-search-tracker/spec.md` and
  `skills/job-search-tracker/`; and
- `ai-planning/research/chat-gpt-work/chat-gpt-work-overview.md`,
  `ai-planning/research/job-search-skill-reference-patterns.md`, and
  `ai-planning/research/skill-capability-audit/job-search-automation-readiness.md`.

It deliberately excludes candidate mailbox contents, Gmail account data,
contacts, credentials, private planning, resumes, and current search history.
