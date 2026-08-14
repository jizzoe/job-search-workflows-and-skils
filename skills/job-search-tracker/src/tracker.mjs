import { createHash, randomUUID } from 'node:crypto';
import { basename, dirname, extname, resolve } from 'node:path';
import { copyFile, readFile, rename, rm, writeFile, access, constants } from 'node:fs/promises';

export const DATA_VERSION = 1;

export const INTAKE_STAGES = Object.freeze([
  'First-Pass Potential Match',
  'Reviewed',
  'Researching',
  'Application Preparation',
  'Applied',
  'Archived',
]);

export const POSTING_STATUSES = Object.freeze([
  'Unverified',
  'Verified Active',
  'Needs Research',
  'Closed',
  'Expired',
  'Removed',
]);

export const PURSUE_DECISIONS = Object.freeze(['Yes', 'No', 'Maybe', 'Needs Research']);

const LEAD_FIELDS = Object.freeze([
  'record_id', 'company_name', 'role_title', 'source', 'source_detail', 'lead_url',
  'native_source_id', 'date_found', 'posted_text', 'date_posted', 'location',
  'remote_type', 'compensation', 'intake_stage', 'posting_status', 'verified_at',
  'verification_notes', 'pursue_decision', 'decision_reason', 'official_url',
  'application_status', 'next_action', 'next_action_at', 'evidence_links', 'notes',
  'source_provenance',
]);

const UPSERT_FIELDS = Object.freeze([
  'company_name', 'role_title', 'source', 'source_detail', 'lead_url',
  'native_source_id', 'date_found', 'posted_text', 'date_posted', 'location',
  'remote_type', 'compensation', 'evidence_links', 'notes',
]);

const VERIFICATION_FIELDS = Object.freeze([
  'record_id', 'posting_status', 'verified_at', 'verification_notes', 'official_url',
  'evidence_links',
]);

const OUTCOME_FIELDS = Object.freeze([
  'record_id', 'application_status', 'next_action', 'next_action_at', 'evidence_links',
  'notes', 'intake_stage',
]);

const PROHIBITED_PATTERNS = Object.freeze([
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bBearer\s+[A-Za-z0-9._-]{16,}\b/i,
  /(?:api[_-]?key|password|secret|token)\s*[:=]\s*[A-Za-z0-9._-]{12,}/i,
  /ai-planning\/(?:personal|resumes)\//i,
  /ai-planning\/resume-modern-draft-v3\.md/i,
]);

export class TrackerError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'TrackerError';
    this.code = code;
    this.details = details;
  }
}

function assertCondition(condition, code, message, details) {
  if (!condition) throw new TrackerError(code, message, details);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertPlainObject(value, label) {
  assertCondition(isPlainObject(value), 'INVALID_REQUEST', `${label} must be an object`);
}

function assertKnownKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    assertCondition(allowed.includes(key), 'UNAUTHORIZED_FIELD', `${label} contains unsupported field: ${key}`, { key });
  }
}

function assertString(value, label, { nullable = false, nonEmpty = false } = {}) {
  if (nullable && (value === null || value === undefined)) return;
  assertCondition(typeof value === 'string', 'INVALID_FIELD', `${label} must be a string`);
  if (nonEmpty) assertCondition(value.trim().length > 0, 'INVALID_FIELD', `${label} must not be empty`);
}

function assertStringArray(value, label) {
  assertCondition(Array.isArray(value), 'INVALID_FIELD', `${label} must be an array`);
  for (const item of value) assertString(item, `${label} item`, { nonEmpty: true });
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function nowIso(options) {
  return options.now ? new Date(options.now).toISOString() : new Date().toISOString();
}

function createEmptyData() {
  return { version: DATA_VERSION, leads: [], research: [], auditEvents: [] };
}

function normalizeText(value) {
  assertString(value, 'identity value', { nonEmpty: true });
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

export function canonicalizeDiscoveryUrl(value) {
  assertString(value, 'lead_url', { nonEmpty: true });
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new TrackerError('INVALID_IDENTITY', 'lead_url must be an absolute URL for fallback identity');
  }
  assertCondition(['http:', 'https:'].includes(parsed.protocol), 'INVALID_IDENTITY', 'lead_url must use http or https');
  parsed.hash = '';
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^(utm_[a-z]+|gclid|fbclid)$/i.test(key)) parsed.searchParams.delete(key);
  }
  parsed.searchParams.sort();
  if ((parsed.protocol === 'https:' && parsed.port === '443') || (parsed.protocol === 'http:' && parsed.port === '80')) parsed.port = '';
  return parsed.toString();
}

export function identityFrom(input) {
  assertPlainObject(input, 'identity');
  if (typeof input.native_source_id === 'string' && input.native_source_id.trim()) {
    return { kind: 'native', value: input.native_source_id.normalize('NFKC').trim() };
  }
  assertString(input.company_name, 'company_name', { nonEmpty: true });
  assertString(input.role_title, 'role_title', { nonEmpty: true });
  return {
    kind: 'fallback',
    value: `${normalizeText(input.company_name)}|${normalizeText(input.role_title)}|${canonicalizeDiscoveryUrl(input.lead_url)}`,
  };
}

function leadIdentity(lead) {
  return identityFrom(lead);
}

export function assertLocalDataPath(dataPath) {
  assertString(dataPath, 'dataPath', { nonEmpty: true });
  assertCondition(!/^[a-z][a-z0-9+.-]*:/i.test(dataPath) && !dataPath.includes('://'), 'EXTERNAL_TARGET_REJECTED', 'dataPath must be a local file path');
  const resolved = resolve(dataPath);
  assertCondition(extname(resolved).toLowerCase() === '.json', 'INVALID_TARGET', 'dataPath must name a local .json file');
  return resolved;
}

function validateLead(lead) {
  assertPlainObject(lead, 'lead');
  assertKnownKeys(lead, LEAD_FIELDS, 'lead');
  for (const field of LEAD_FIELDS) assertCondition(Object.hasOwn(lead, field), 'INVALID_RECORD', `lead is missing ${field}`);
  const requiredTextFields = ['record_id', 'company_name', 'role_title', 'source', 'date_found', 'intake_stage', 'posting_status'];
  for (const field of LEAD_FIELDS.filter((field) => !['evidence_links', 'source_provenance'].includes(field))) {
    assertString(lead[field], field, { nullable: !requiredTextFields.includes(field), nonEmpty: requiredTextFields.includes(field) });
  }
  assertStringArray(lead.evidence_links, 'evidence_links');
  assertCondition(Array.isArray(lead.source_provenance), 'INVALID_RECORD', 'source_provenance must be an array');
  for (const provenance of lead.source_provenance) {
    assertPlainObject(provenance, 'source provenance');
    assertKnownKeys(provenance, ['source', 'source_detail', 'lead_url', 'native_source_id'], 'source provenance');
    assertString(provenance.source, 'source provenance source', { nonEmpty: true });
    for (const field of ['source_detail', 'lead_url', 'native_source_id']) assertString(provenance[field], `source provenance ${field}`, { nullable: true });
  }
  assertCondition(INTAKE_STAGES.includes(lead.intake_stage), 'INVALID_LIFECYCLE', 'invalid intake_stage');
  assertCondition(POSTING_STATUSES.includes(lead.posting_status), 'INVALID_LIFECYCLE', 'invalid posting_status');
  assertCondition(lead.pursue_decision === null || PURSUE_DECISIONS.includes(lead.pursue_decision), 'INVALID_LIFECYCLE', 'invalid pursue_decision');
  if (lead.posting_status === 'Verified Active') {
    assertString(lead.verified_at, 'verified_at', { nonEmpty: true });
    assertString(lead.official_url, 'official_url', { nonEmpty: true });
  }
}

function validateResearch(reference) {
  assertPlainObject(reference, 'research reference');
  assertKnownKeys(reference, ['reference_id', 'kind', 'lead_record_id', 'company_name', 'role_title', 'status', 'source_links', 'notes', 'updated_at'], 'research reference');
  assertString(reference.reference_id, 'reference_id', { nonEmpty: true });
  assertString(reference.kind, 'kind', { nonEmpty: true });
  assertString(reference.status, 'status', { nonEmpty: true });
  for (const field of ['lead_record_id', 'company_name', 'role_title', 'notes', 'updated_at']) assertString(reference[field], field, { nullable: true });
  assertStringArray(reference.source_links, 'source_links');
}

function validateAuditEvent(event) {
  assertPlainObject(event, 'audit event');
  assertKnownKeys(event, ['event_id', 'semantic_key', 'operation', 'record_id', 'source', 'timestamp', 'intended_fields', 'result', 'error'], 'audit event');
  for (const field of ['event_id', 'semantic_key', 'operation', 'timestamp', 'result']) assertString(event[field], field, { nonEmpty: true });
  for (const field of ['record_id', 'source', 'error']) assertString(event[field], field, { nullable: true });
  assertStringArray(event.intended_fields, 'intended_fields');
  scanForProhibitedFixtureContent(event, 'audit event');
}

export function validateDataDocument(data) {
  assertPlainObject(data, 'data document');
  assertKnownKeys(data, ['version', 'leads', 'research', 'auditEvents'], 'data document');
  assertCondition(data.version === DATA_VERSION, 'INVALID_DOCUMENT', `data document version must be ${DATA_VERSION}`);
  for (const collection of ['leads', 'research', 'auditEvents']) assertCondition(Array.isArray(data[collection]), 'INVALID_DOCUMENT', `${collection} must be an array`);
  data.leads.forEach(validateLead);
  data.research.forEach(validateResearch);
  data.auditEvents.forEach(validateAuditEvent);
  const ids = new Set();
  for (const lead of data.leads) {
    assertCondition(!ids.has(lead.record_id), 'INVALID_DOCUMENT', 'record_id values must be unique');
    ids.add(lead.record_id);
  }
  const researchIds = new Set();
  for (const reference of data.research) {
    assertCondition(!researchIds.has(reference.reference_id), 'INVALID_DOCUMENT', 'research reference_id values must be unique');
    researchIds.add(reference.reference_id);
  }
  return data;
}

export function scanForProhibitedFixtureContent(value, label = 'fixture') {
  const rendered = typeof value === 'string' ? value : stableStringify(value);
  const matched = PROHIBITED_PATTERNS.find((pattern) => pattern.test(rendered));
  assertCondition(!matched, 'PROTECTED_DATA_REJECTED', `${label} contains a documented prohibited pattern`, { pattern: matched?.source });
  return true;
}

async function dataPathExists(dataPath) {
  try {
    await access(dataPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function loadData(dataPath, { allowMissing = false } = {}) {
  const exists = await dataPathExists(dataPath);
  if (!exists) {
    assertCondition(allowMissing, 'DATA_TARGET_NOT_FOUND', 'dataPath does not exist for this read operation');
    return createEmptyData();
  }
  let parsed;
  try {
    parsed = JSON.parse(await readFile(dataPath, 'utf8'));
  } catch (error) {
    throw new TrackerError('INVALID_DOCUMENT', `Unable to read a valid JSON tracker document: ${error.message}`);
  }
  return validateDataDocument(parsed);
}

function backupPathFor(dataPath, timestamp) {
  const base = basename(dataPath, '.json');
  const stamp = timestamp.replace(/[:.]/g, '-');
  return resolve(dirname(dataPath), `${base}.${stamp}.${randomUUID()}.backup.json`);
}

async function persistData(data, dataPath, options = {}) {
  validateDataDocument(data);
  const hadOriginal = await dataPathExists(dataPath);
  const timestamp = nowIso(options);
  const backupPath = hadOriginal ? backupPathFor(dataPath, timestamp) : null;
  const temporaryPath = resolve(dirname(dataPath), `.${basename(dataPath)}.${randomUUID()}.tmp`);
  let renamed = false;
  try {
    if (backupPath) await copyFile(dataPath, backupPath);
    if (options.failAt === 'after-backup') throw new TrackerError('SIMULATED_WRITE_FAILURE', 'Simulated failure after backup');
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    validateDataDocument(JSON.parse(await readFile(temporaryPath, 'utf8')));
    if (options.failAt === 'after-temp-write') throw new TrackerError('SIMULATED_WRITE_FAILURE', 'Simulated failure after temporary write');
    if (options.failAt === 'before-rename') throw new TrackerError('SIMULATED_WRITE_FAILURE', 'Simulated failure before replacement');
    await rename(temporaryPath, dataPath);
    renamed = true;
    if (options.failAt === 'after-rename' || options.failAt === 'post-write-validation') throw new TrackerError('SIMULATED_WRITE_FAILURE', 'Simulated failure after replacement');
    validateDataDocument(JSON.parse(await readFile(dataPath, 'utf8')));
    return { backupPath };
  } catch (error) {
    await rm(temporaryPath, { force: true });
    try {
      if (hadOriginal && backupPath) await copyFile(backupPath, dataPath);
      if (!hadOriginal && renamed) await rm(dataPath, { force: true });
    } catch (restoreError) {
      throw new TrackerError('RECOVERY_FAILED', 'Tracker write failed and restoration was unsuccessful', { cause: error.message, restoreCause: restoreError.message });
    }
    if (error instanceof TrackerError) throw new TrackerError('WRITE_RECOVERED', error.message, { stage: options.failAt ?? 'write', backupPath });
    throw new TrackerError('WRITE_RECOVERED', 'Tracker write failed and the previous data was restored', { cause: error.message, backupPath });
  }
}

function unionStrings(existing, proposed) {
  const values = [...(existing ?? []), ...(proposed ?? [])];
  return [...new Set(values)];
}

function sourceProvenanceFrom(payload) {
  return {
    source: payload.source,
    source_detail: payload.source_detail ?? null,
    lead_url: payload.lead_url ?? null,
    native_source_id: payload.native_source_id ?? null,
  };
}

function provenanceKey(value) {
  return stableStringify(value);
}

function unionProvenance(existing, proposed) {
  const byKey = new Map();
  for (const value of [...(existing ?? []), proposed]) byKey.set(provenanceKey(value), value);
  return [...byKey.values()];
}

function findMatches(leads, identity) {
  return leads.filter((lead) => {
    const candidate = leadIdentity(lead);
    return candidate.kind === identity.kind && candidate.value === identity.value;
  });
}

function findOneRecord(data, recordId) {
  assertString(recordId, 'record_id', { nonEmpty: true });
  const record = data.leads.find((lead) => lead.record_id === recordId);
  assertCondition(record, 'RECORD_NOT_FOUND', `No lead exists with record_id ${recordId}`);
  return record;
}

function makeLead(payload, options) {
  for (const required of ['company_name', 'role_title', 'source']) assertString(payload[required], required, { nonEmpty: true });
  identityFrom(payload);
  const nullFields = Object.fromEntries(LEAD_FIELDS.filter((field) => !['record_id', 'evidence_links', 'source_provenance', 'intake_stage', 'posting_status', 'date_found'].includes(field)).map((field) => [field, null]));
  const lead = {
    ...nullFields,
    record_id: options.recordId ?? randomUUID(),
    company_name: payload.company_name,
    role_title: payload.role_title,
    source: payload.source,
    source_detail: payload.source_detail ?? null,
    lead_url: payload.lead_url ?? null,
    native_source_id: payload.native_source_id ?? null,
    date_found: payload.date_found ?? nowIso(options),
    posted_text: payload.posted_text ?? null,
    date_posted: payload.date_posted ?? null,
    location: payload.location ?? null,
    remote_type: payload.remote_type ?? null,
    compensation: payload.compensation ?? null,
    intake_stage: 'First-Pass Potential Match',
    posting_status: 'Unverified',
    evidence_links: unionStrings([], payload.evidence_links ?? []),
    notes: payload.notes ?? null,
    source_provenance: [sourceProvenanceFrom(payload)],
  };
  validateLead(lead);
  return lead;
}

function updateLeadFromUpsert(lead, payload) {
  const changed = [];
  for (const field of UPSERT_FIELDS) {
    if (!Object.hasOwn(payload, field) || ['source', 'source_detail', 'lead_url', 'native_source_id', 'evidence_links'].includes(field)) continue;
    if (lead[field] !== payload[field]) {
      lead[field] = payload[field];
      changed.push(field);
    }
  }
  const evidence = unionStrings(lead.evidence_links, payload.evidence_links ?? []);
  if (stableStringify(evidence) !== stableStringify(lead.evidence_links)) {
    lead.evidence_links = evidence;
    changed.push('evidence_links');
  }
  const provenance = unionProvenance(lead.source_provenance, sourceProvenanceFrom(payload));
  if (stableStringify(provenance) !== stableStringify(lead.source_provenance)) {
    lead.source_provenance = provenance;
    changed.push('source_provenance');
  }
  return changed;
}

function addAudit(data, { operation, recordId = null, source = 'local-reference', intendedFields = [], result = 'succeeded', error = null, semanticKey, options }) {
  const event = {
    event_id: randomUUID(),
    semantic_key: semanticKey,
    operation,
    record_id: recordId,
    source,
    timestamp: nowIso(options),
    intended_fields: [...new Set(intendedFields)].sort(),
    result,
    error,
  };
  validateAuditEvent(event);
  data.auditEvents.push(event);
  return event;
}

function requestKey(request) {
  return request.operationKey ?? digest({ operation: request.operation, payload: request.payload });
}

function validateRequest(request) {
  assertPlainObject(request, 'request');
  assertKnownKeys(request, ['version', 'operation', 'dataPath', 'payload', 'dryRun', 'operationKey'], 'request');
  assertCondition(request.version === DATA_VERSION, 'INVALID_REQUEST', `request version must be ${DATA_VERSION}`);
  assertString(request.operation, 'operation', { nonEmpty: true });
  assertPlainObject(request.payload, 'payload');
  if (Object.hasOwn(request, 'dryRun')) assertCondition(typeof request.dryRun === 'boolean', 'INVALID_REQUEST', 'dryRun must be boolean');
  if (Object.hasOwn(request, 'operationKey')) assertString(request.operationKey, 'operationKey', { nonEmpty: true });
  return { ...request, dataPath: assertLocalDataPath(request.dataPath), dryRun: request.dryRun ?? false };
}

function validatePayload(operation, payload) {
  const allowed = {
    findByIdentity: ['native_source_id', 'company_name', 'role_title', 'lead_url'],
    readForReview: ['intake_stage', 'posting_status', 'pursue_decision'],
    upsertLead: UPSERT_FIELDS,
    updateCandidateDecision: ['record_id', 'pursue_decision', 'decision_reason', 'candidate_confirmed'],
    updateVerification: VERIFICATION_FIELDS,
    updateApplicationOutcome: OUTCOME_FIELDS,
    createOrUpdateResearch: ['reference_id', 'kind', 'lead_record_id', 'company_name', 'role_title', 'status', 'source_links', 'notes'],
    recordAuditEvent: ['operation', 'record_id', 'source', 'intended_fields', 'result', 'error'],
  }[operation];
  assertCondition(allowed, 'UNKNOWN_OPERATION', `Unsupported operation: ${operation}`);
  assertKnownKeys(payload, allowed, `${operation} payload`);
  if (operation === 'upsertLead') {
    for (const key of Object.keys(payload)) {
      if (key === 'evidence_links') assertStringArray(payload[key], key);
      else assertString(payload[key], key, { nullable: true, nonEmpty: ['company_name', 'role_title', 'source'].includes(key) });
    }
    identityFrom(payload);
  }
  if (operation === 'updateCandidateDecision') {
    assertString(payload.record_id, 'record_id', { nonEmpty: true });
    assertCondition(PURSUE_DECISIONS.includes(payload.pursue_decision), 'INVALID_LIFECYCLE', 'invalid pursue_decision');
    assertCondition(payload.candidate_confirmed === true, 'CANDIDATE_CONFIRMATION_REQUIRED', 'candidate_confirmed must be true for a decision update');
    assertString(payload.decision_reason, 'decision_reason', { nullable: true });
  }
  if (operation === 'updateVerification') {
    assertString(payload.record_id, 'record_id', { nonEmpty: true });
    assertCondition(POSTING_STATUSES.includes(payload.posting_status), 'INVALID_LIFECYCLE', 'invalid posting_status');
    for (const field of ['verified_at', 'verification_notes', 'official_url']) assertString(payload[field], field, { nullable: true });
    if (payload.evidence_links !== undefined) assertStringArray(payload.evidence_links, 'evidence_links');
    if (payload.posting_status === 'Verified Active') {
      assertString(payload.verified_at, 'verified_at', { nonEmpty: true });
      assertString(payload.official_url, 'official_url', { nonEmpty: true });
    }
  }
  if (operation === 'updateApplicationOutcome') {
    assertString(payload.record_id, 'record_id', { nonEmpty: true });
    for (const field of ['application_status', 'next_action', 'next_action_at', 'notes']) assertString(payload[field], field, { nullable: true });
    if (payload.evidence_links !== undefined) assertStringArray(payload.evidence_links, 'evidence_links');
    if (payload.intake_stage !== undefined) assertCondition(INTAKE_STAGES.includes(payload.intake_stage), 'INVALID_LIFECYCLE', 'invalid intake_stage');
  }
  if (operation === 'createOrUpdateResearch') {
    const candidate = { ...payload, updated_at: null, source_links: payload.source_links ?? [] };
    validateResearch(candidate);
  }
  if (operation === 'recordAuditEvent') {
    for (const field of ['operation', 'record_id', 'source', 'result', 'error']) assertString(payload[field], field, { nullable: field !== 'operation', nonEmpty: field === 'operation' });
    if (payload.intended_fields !== undefined) assertStringArray(payload.intended_fields, 'intended_fields');
    scanForProhibitedFixtureContent(payload, 'audit event payload');
  }
  return payload;
}

async function appendFailureAudit(dataPath, request, key, error, options) {
  try {
    const data = await loadData(dataPath, { allowMissing: true });
    addAudit(data, {
      operation: request.operation,
      source: typeof request.payload.source === 'string' ? request.payload.source : 'local-reference',
      intendedFields: Object.keys(request.payload),
      result: 'failed',
      error: `${error.code}: ${error.message}`,
      semanticKey: `${key}:failure:${digest({ code: error.code, message: error.message })}`,
      options,
    });
    await persistData(data, dataPath, { now: options.now });
  } catch {
    // The original canonical data has already been restored. Do not risk it to force an audit record.
  }
}

export async function execute(requestInput, options = {}) {
  const request = validateRequest(requestInput);
  const payload = validatePayload(request.operation, request.payload);
  const readOnly = ['findByIdentity', 'readForReview'].includes(request.operation);
  const data = await loadData(request.dataPath, { allowMissing: !readOnly });
  const semanticKey = requestKey(request);

  if (!readOnly) {
    const prior = data.auditEvents.find((event) => event.semantic_key === semanticKey && event.result === 'succeeded');
    if (prior) {
      return { ok: true, operation: request.operation, dryRun: false, action: 'idempotent-retry', recordId: prior.record_id, changedFields: [], idempotent: true, dataPath: request.dataPath };
    }
  }

  if (request.operation === 'findByIdentity') {
    const identity = identityFrom(payload);
    const matches = findMatches(data.leads, identity);
    assertCondition(matches.length <= 1, 'AMBIGUOUS_IDENTITY', 'More than one lead matches this identity');
    return { ok: true, operation: request.operation, dryRun: true, action: 'read', recordId: matches[0]?.record_id ?? null, record: matches[0] ?? null, changedFields: [], idempotent: true, dataPath: request.dataPath };
  }

  if (request.operation === 'readForReview') {
    const records = data.leads.filter((lead) => Object.entries(payload).every(([field, value]) => lead[field] === value));
    return { ok: true, operation: request.operation, dryRun: true, action: 'read', records, changedFields: [], idempotent: true, dataPath: request.dataPath };
  }

  const staged = structuredClone(data);
  let result;
  if (request.operation === 'upsertLead') {
    const identity = identityFrom(payload);
    const matches = findMatches(staged.leads, identity);
    assertCondition(matches.length <= 1, 'AMBIGUOUS_IDENTITY', 'More than one lead matches this identity');
    if (matches.length === 0) {
      const lead = makeLead(payload, options);
      staged.leads.push(lead);
      result = { action: 'created', recordId: lead.record_id, changedFields: LEAD_FIELDS.filter((field) => field !== 'record_id') };
    } else {
      const lead = matches[0];
      const changedFields = updateLeadFromUpsert(lead, payload);
      validateLead(lead);
      result = { action: changedFields.length ? 'updated' : 'unchanged', recordId: lead.record_id, changedFields };
    }
  } else if (request.operation === 'updateCandidateDecision') {
    const lead = findOneRecord(staged, payload.record_id);
    const changedFields = [];
    for (const field of ['pursue_decision', 'decision_reason']) {
      if (!Object.hasOwn(payload, field)) continue;
      const next = field === 'decision_reason' ? (payload[field] ?? null) : payload[field];
      if (lead[field] !== next) { lead[field] = next; changedFields.push(field); }
    }
    if (lead.intake_stage === 'First-Pass Potential Match') { lead.intake_stage = 'Reviewed'; changedFields.push('intake_stage'); }
    validateLead(lead);
    result = { action: changedFields.length ? 'updated' : 'unchanged', recordId: lead.record_id, changedFields };
  } else if (request.operation === 'updateVerification') {
    const lead = findOneRecord(staged, payload.record_id);
    const changedFields = [];
    for (const field of ['posting_status', 'verified_at', 'verification_notes', 'official_url']) {
      if (!Object.hasOwn(payload, field)) continue;
      const next = payload[field] ?? null;
      if (lead[field] !== next) { lead[field] = next; changedFields.push(field); }
    }
    const evidence = unionStrings(lead.evidence_links, payload.evidence_links ?? []);
    if (stableStringify(evidence) !== stableStringify(lead.evidence_links)) { lead.evidence_links = evidence; changedFields.push('evidence_links'); }
    validateLead(lead);
    result = { action: changedFields.length ? 'updated' : 'unchanged', recordId: lead.record_id, changedFields };
  } else if (request.operation === 'updateApplicationOutcome') {
    const lead = findOneRecord(staged, payload.record_id);
    const changedFields = [];
    for (const field of ['application_status', 'next_action', 'next_action_at', 'notes', 'intake_stage']) {
      if (!Object.hasOwn(payload, field)) continue;
      const next = payload[field] ?? null;
      if (lead[field] !== next) { lead[field] = next; changedFields.push(field); }
    }
    const evidence = unionStrings(lead.evidence_links, payload.evidence_links ?? []);
    if (stableStringify(evidence) !== stableStringify(lead.evidence_links)) { lead.evidence_links = evidence; changedFields.push('evidence_links'); }
    validateLead(lead);
    result = { action: changedFields.length ? 'updated' : 'unchanged', recordId: lead.record_id, changedFields };
  } else if (request.operation === 'createOrUpdateResearch') {
    const reference = { ...payload, lead_record_id: payload.lead_record_id ?? null, company_name: payload.company_name ?? null, role_title: payload.role_title ?? null, notes: payload.notes ?? null, source_links: payload.source_links ?? [], updated_at: nowIso(options) };
    validateResearch(reference);
    const index = staged.research.findIndex((item) => item.reference_id === reference.reference_id);
    if (index === -1) staged.research.push(reference);
    else staged.research[index] = { ...staged.research[index], ...reference, source_links: unionStrings(staged.research[index].source_links, reference.source_links) };
    result = { action: index === -1 ? 'created' : 'updated', recordId: reference.lead_record_id, changedFields: Object.keys(reference) };
  } else if (request.operation === 'recordAuditEvent') {
    const event = addAudit(staged, { operation: payload.operation, recordId: payload.record_id ?? null, source: payload.source ?? 'local-reference', intendedFields: payload.intended_fields ?? [], result: payload.result ?? 'succeeded', error: payload.error ?? null, semanticKey, options });
    result = { action: 'recorded', recordId: event.record_id, changedFields: ['auditEvents'] };
  }

  if (request.operation !== 'recordAuditEvent') {
    addAudit(staged, { operation: request.operation, recordId: result.recordId, source: typeof payload.source === 'string' ? payload.source : 'local-reference', intendedFields: result.changedFields, semanticKey, options });
  }
  validateDataDocument(staged);
  if (request.dryRun) {
    return { ok: true, operation: request.operation, dryRun: true, ...result, idempotent: false, dataPath: request.dataPath };
  }
  try {
    const persistence = await persistData(staged, request.dataPath, options);
    return { ok: true, operation: request.operation, dryRun: false, ...result, idempotent: false, backupPath: persistence.backupPath, dataPath: request.dataPath };
  } catch (error) {
    await appendFailureAudit(request.dataPath, request, semanticKey, error, options);
    throw error;
  }
}
