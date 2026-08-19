# Job Discovery and Verification Reference Asset

This Node reference asset implements the reusable discovery and
official-posting-verification contract in
`openspec/changes/job-discovery-and-verification/`. It uses the existing
`job-search-tracker` command contract rather than editing tracker JSON
directly.

Run deterministic tests:

```bash
npm test --prefix skills/job-discovery-and-verification
```

Use only synthetic or explicitly authorized local data. A later change must
separately propose any live provider, account access, terms/rate-policy review,
credential handling, scheduler, or tracker-vendor adapter.
