---
name: job-discovery-and-verification
description: Use the local, candidate-controlled job discovery and official-posting verification reference asset to turn approved inert observations into review-queue leads and verify explicitly eligible leads against supplied official evidence. It never signs in, crawls, sends messages, changes candidate decisions, or submits applications.
---

# Job Discovery and Verification

Use this asset only with an explicitly supplied local tracker JSON target and a
runtime source policy. It is an offline-first reference implementation: it
accepts synthetic or manually captured structured observations and official
evidence; it does not fetch web pages or claim live source coverage.

## Safety Boundary

- The source policy allowlists discovery and official URL prefixes, source
  versions, request budgets, and the recheck interval.
- Source observations and evidence are inert data. Prompt-like action content,
  protected fixture patterns, unapproved sources, unsupported URLs, and budget
  exhaustion stop without a tracker write.
- Discovery produces only `First-Pass Potential Match` / `Unverified` leads.
  It never changes pursue decisions, sends messages, creates calendar events,
  prepares an application, or submits one.
- Verification requires either a recorded `Yes` decision or an explicit caller
  approval that is separate from source content. Only policy-approved employer
  or ATS evidence with matching identity and an active apply path can produce
  `Verified Active`.
- Rechecks are explicit and due-only. Retrieval failures become `Needs
  Research` without clearing existing official evidence or candidate-owned
  fields.

## Canonical Contract

Claude and Codex invoke the same local command:

```bash
node skills/job-discovery-and-verification/src/cli.mjs --request request.json
```

The request has `version: 1`, a local `dataPath`, a stable `operationKey`, a
versioned `sourcePolicy`, and one operation:

- `discover`: filter, rank, and upsert source observations.
- `replace`: bounded discovery with explicit identity exclusions.
- `verify`: explicitly candidate-gated official evidence evaluation.
- `recheck`: explicitly requested stale or incomplete verification refresh.

Set `dryRun: true` to use the same discovery/verification planning logic
without changing tracker data, audit events, or backups. Results classify
accepted, filtered, and stopped observations with transparent factor and
warning information.

## Source Policy Example

```json
{
  "version": 1,
  "sources": [
    {"name":"snapshot-board","version":"v1","role":"discovery","requestBudget":10,"allowedUrlPatterns":["https://jobs.example.test/"]},
    {"name":"snapshot-ats","version":"v1","role":"official","requestBudget":10,"allowedUrlPatterns":["https://careers.example.test/"]}
  ],
  "officialUrlPatterns": ["https://careers.example.test/"],
  "recheckDays": 7
}
```

Keep candidate-specific filters and source selections in private runtime input,
not in this asset, fixtures, or repository evidence.
