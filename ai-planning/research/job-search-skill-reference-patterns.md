# Job-Search Skill Reference Patterns

## Purpose

This is a shortlist of public projects worth studying while designing
supervised job-search workflows. They are reference material, not dependencies
or behavior to copy wholesale.

Review licensing, maintenance, security, platform terms, and actual behavior
before adapting any pattern. Revalidate repository status and product claims at
implementation time.

## Purpose-Built Job-Search Projects

| Project | Useful patterns to study |
|---|---|
| [`theaayushstha1/job-applier-agent`](https://github.com/theaayushstha1/job-applier-agent) | End-to-end organization of resume tailoring, outreach, ATS preparation, interview preparation, and analytics; confirmation before sending or submitting. |
| [`suxrobGM/jobpilot`](https://github.com/suxrobGM/jobpilot) | Job-board search, resume tailoring, application preparation, recruiter messaging, and tracker/dashboard flow. |
| [`neonwatty/job-apply-plugin`](https://github.com/neonwatty/job-apply-plugin) | Confidence-aware answer reuse and review of inferred or sensitive fields across common ATS platforms. |
| [`MadsLorentzen/ai-job-search`](https://github.com/MadsLorentzen/ai-job-search) | Fit evaluation, drafter-reviewer application flow, and interview-preparation architecture. |
| [`proficientlyjobs/proficiently-claude-skills`](https://github.com/proficientlyjobs/proficiently-claude-skills) | Job-search, resume-tailoring, and cover-letter workflow decomposition. |

## Adjacent Patterns

| Project | Useful patterns to study |
|---|---|
| [`aiagentwithdhruv/skills`](https://github.com/aiagentwithdhruv/skills) | Lead discovery, tracking, and browser-automation patterns that may inform intake design. |

Potential additional discovery sources include the GitHub topics for
[LinkedIn outreach](https://github.com/topics/linkedin-outreach) and
[lead generation](https://github.com/topics/lead-generation). Treat any project
found there as unreviewed until its owner, license, behavior, and platform fit
are verified.

## Design Lessons To Preserve

- Prefer a human-in-the-loop workflow: prepare, validate, and present a clear
  review state rather than sending or submitting by default.
- Flag inferred, sensitive, or low-confidence answers instead of silently
  reusing them.
- Keep lead intake, official-posting verification, application preparation,
  and final submission as distinct states.
- Store source provenance and use native platform identifiers to avoid duplicate
  tracker records.
- Use small, independently verifiable workflow steps with explicit pass/fail
  gates rather than treating a long automated run as proof of correctness.

## Platform And Safety Caveats

Automated access, scraping, or high-volume applications may conflict with the
terms of service of LinkedIn, applicant-tracking systems, job boards, or other
platforms. A technically possible automation pattern is not approval to use it.

Any future workflow must confirm its applicable platform rules, preserve
candidate control, protect personal data, and require explicit approval for
external sends, profile changes, applications, and other consequential actions.

## Provenance

This shortlist was selectively extracted from the prior shared AI-skills
repository's job-search research, captured on 2026-08-06. The SDLC, language,
code-review, and generalized guardrail research from that source is intentionally
excluded because it does not belong in this job-search planning document.
