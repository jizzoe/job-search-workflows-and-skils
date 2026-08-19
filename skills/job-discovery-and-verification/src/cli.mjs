#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { DiscoveryError, execute } from './discovery.mjs';

const args = process.argv.slice(2);
const index = args.indexOf('--request');
if (index === -1 || !args[index + 1] || args.length !== 2) {
  process.stderr.write('Usage: node src/cli.mjs --request <local-request.json>\n');
  process.exitCode = 2;
} else {
  try { process.stdout.write(`${JSON.stringify(await execute(JSON.parse(await readFile(args[index + 1], 'utf8'))), null, 2)}\n`); }
  catch (error) { process.stderr.write(`${JSON.stringify({ ok: false, code: error instanceof DiscoveryError ? error.code : 'UNEXPECTED_ERROR', message: error.message, details: error.details ?? {} }, null, 2)}\n`); process.exitCode = 1; }
}
