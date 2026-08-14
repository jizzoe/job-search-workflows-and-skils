#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { execute, TrackerError } from './tracker.mjs';

function usage() {
  return 'Usage: node src/cli.mjs --request <local-request.json>';
}

const argumentsList = process.argv.slice(2);
const requestIndex = argumentsList.indexOf('--request');

if (requestIndex === -1 || !argumentsList[requestIndex + 1] || argumentsList.length !== 2) {
  process.stderr.write(`${usage()}\n`);
  process.exitCode = 2;
} else {
  try {
    const input = JSON.parse(await readFile(argumentsList[requestIndex + 1], 'utf8'));
    const result = await execute(input);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    const result = error instanceof TrackerError
      ? { ok: false, code: error.code, message: error.message, details: error.details }
      : { ok: false, code: 'UNEXPECTED_ERROR', message: error.message };
    process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = 1;
  }
}
