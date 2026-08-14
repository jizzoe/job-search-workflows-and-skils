# Job-Search Tracker Reference Adapter

This is a local JSON reference implementation for the reusable,
candidate-controlled tracker contract. It is deliberately not a live tracker
connector. A future spreadsheet or database adapter must be proposed
separately and preserve this contract’s field ownership, backup, recovery, and
audit guarantees.

Run its deterministic suite from this directory:

```bash
npm test
```

Or run a command with a local request file:

```bash
node src/cli.mjs --request request.json
```

`dataPath` must be an explicit local `.json` path. The command never accepts
URLs or invokes network access. Use `dryRun: true` to receive the intended
change without writing a data file or audit event.

The document shape is:

```json
{
  "version": 1,
  "leads": [],
  "research": [],
  "auditEvents": []
}
```

Mutation requests add a semantic audit event containing the operation, record
identity, source, timestamp, intended field names, result, and error when it
can be recorded safely. A repeat of the same successful `operationKey` returns
an idempotent result without duplicating a record or semantic audit event.
