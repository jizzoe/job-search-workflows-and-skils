import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const VERSION = 1;
const ACTION_LIKE = /ignore\s+(?:prior\s+)?(?:instructions|policy)|change\s+(?:the\s+)?pursue|send\s+(?:a\s+)?message|submit\s+(?:an\s+)?application/i;
const PROHIBITED = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bBearer\s+[A-Za-z0-9._-]{16,}\b/i,
  /(?:api[_-]?key|password|secret|token)\s*[:=]\s*[A-Za-z0-9._-]{12,}/i,
  /ai-planning\/(?:personal|resumes)\//i,
  /ai-planning\/resume-modern-draft-v3\.md/i,
];

export class DiscoveryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'DiscoveryError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) { throw new DiscoveryError(code, message, details); }
function plain(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function object(value, label) { if (!plain(value)) fail('INVALID_REQUEST', `${label} must be an object`); }
function text(value, label, required = true) {
  if (value === undefined || value === null) { if (required) fail('INVALID_FIELD', `${label} is required`); return null; }
  if (typeof value !== 'string' || (required && !value.trim())) fail('INVALID_FIELD', `${label} must be a non-empty string`);
  return value;
}
function keys(value, allowed, label) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail('UNSUPPORTED_FIELD', `${label} contains unsupported field: ${key}`, { key });
}
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function digest(value) { return createHash('sha256').update(stable(value)).digest('hex'); }
function now(options) { return new Date(options.now ?? new Date().toISOString()).toISOString(); }
function canonicalUrl(value, label = 'URL') {
  text(value, label);
  let parsed;
  try { parsed = new URL(value); } catch { fail('INVALID_URL', `${label} must be an absolute HTTP(S) URL`); }
  if (!['http:', 'https:'].includes(parsed.protocol)) fail('INVALID_URL', `${label} must use HTTP(S)`);
  if (parsed.username || parsed.password) fail('INVALID_URL', `${label} must not contain credentials`);
  parsed.hash = '';
  for (const key of [...parsed.searchParams.keys()]) if (/^(utm_.+|gclid|fbclid)$/i.test(key)) parsed.searchParams.delete(key);
  parsed.searchParams.sort();
  return parsed.toString();
}
function normalized(value) { return text(value, 'identity value').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US'); }
function matchesPrefix(url, patterns = []) {
  const candidate = new URL(url);
  return patterns.some((pattern) => {
    if (typeof pattern !== 'string') return false;
    let allowed;
    try { allowed = new URL(pattern); } catch { return false; }
    if (candidate.protocol !== allowed.protocol || candidate.host !== allowed.host) return false;
    const base = allowed.pathname.endsWith('/') ? allowed.pathname : `${allowed.pathname}/`;
    return candidate.pathname === allowed.pathname || candidate.pathname.startsWith(base);
  });
}
function isoTimestamp(value, label) {
  text(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) fail('INVALID_FIELD', `${label} must be an ISO timestamp`);
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) fail('INVALID_FIELD', `${label} must be an ISO timestamp`);
  return new Date(parsed).toISOString();
}
function fixtureScan(value, label = 'input') {
  const rendered = typeof value === 'string' ? value : stable(value);
  const pattern = PROHIBITED.find((item) => item.test(rendered));
  if (pattern) fail('PROTECTED_DATA_REJECTED', `${label} contains documented protected data`, { pattern: pattern.source });
}
function sourcePolicy(policy) {
  object(policy, 'sourcePolicy');
  fixtureScan(policy, 'sourcePolicy');
  keys(policy, ['version', 'sources', 'officialUrlPatterns', 'recheckDays'], 'sourcePolicy');
  if (policy.version !== VERSION) fail('INVALID_POLICY', `sourcePolicy version must be ${VERSION}`);
  if (!Array.isArray(policy.sources) || policy.sources.length === 0) fail('INVALID_POLICY', 'sourcePolicy.sources must be a non-empty array');
  const sources = policy.sources.map((source) => {
    object(source, 'source policy');
    keys(source, ['name', 'version', 'allowedUrlPatterns', 'requestBudget', 'role', 'recheckDays'], 'source policy');
    text(source.name, 'source policy name'); text(source.version, 'source policy version');
    if (!Array.isArray(source.allowedUrlPatterns) || source.allowedUrlPatterns.length === 0) fail('INVALID_POLICY', 'source policy needs allowedUrlPatterns');
    source.allowedUrlPatterns = source.allowedUrlPatterns.map((item) => canonicalUrl(item, 'source policy allowedUrlPattern'));
    if (!Number.isInteger(source.requestBudget) || source.requestBudget < 0) fail('INVALID_POLICY', 'source policy requestBudget must be a non-negative integer');
    if (!['discovery', 'official'].includes(source.role)) fail('INVALID_POLICY', 'source policy role must be discovery or official');
    if (source.recheckDays !== undefined && (!Number.isInteger(source.recheckDays) || source.recheckDays < 1 || source.recheckDays > 365)) fail('INVALID_POLICY', 'source policy recheckDays must be 1-365');
    return structuredClone(source);
  });
  if (new Set(sources.map((item) => `${item.name}|${item.version}`)).size !== sources.length) fail('INVALID_POLICY', 'source policy source/version pairs must be unique');
  const officialUrlPatterns = policy.officialUrlPatterns ?? sources.filter((item) => item.role === 'official').flatMap((item) => item.allowedUrlPatterns);
  if (!Array.isArray(officialUrlPatterns) || officialUrlPatterns.length === 0) fail('INVALID_POLICY', 'sourcePolicy must declare officialUrlPatterns');
  const canonicalOfficialUrlPatterns = officialUrlPatterns.map((item) => canonicalUrl(item, 'sourcePolicy officialUrlPattern'));
  const recheckDays = policy.recheckDays ?? 7;
  if (!Number.isInteger(recheckDays) || recheckDays < 1 || recheckDays > 365) fail('INVALID_POLICY', 'sourcePolicy recheckDays must be 1-365');
  return { version: VERSION, sources, officialUrlPatterns: canonicalOfficialUrlPatterns, recheckDays };
}
function observation(value, policy, budget) {
  object(value, 'observation');
  keys(value, ['source', 'sourceVersion', 'sourceUrl', 'capturedAt', 'nativeSourceId', 'companyName', 'roleTitle', 'location', 'remoteType', 'compensation', 'postedText', 'datePosted', 'warnings', 'notes', 'evidenceRef'], 'observation');
  fixtureScan(value, 'observation');
  if (ACTION_LIKE.test(stable(value))) fail('UNTRUSTED_ACTION_CONTENT', 'observation contains action-like content');
  text(value.source, 'observation source'); text(value.sourceVersion, 'observation sourceVersion');
  const source = policy.sources.find((item) => item.name === value.source && item.version === value.sourceVersion && item.role === 'discovery');
  if (!source) fail('UNAPPROVED_SOURCE', 'observation source is not approved for discovery');
  const used = budget.get(`${source.name}|${source.version}`) ?? 0;
  if (used >= source.requestBudget) fail('REQUEST_BUDGET_EXHAUSTED', 'source request budget is exhausted');
  const sourceUrl = canonicalUrl(value.sourceUrl, 'observation sourceUrl');
  if (!matchesPrefix(sourceUrl, source.allowedUrlPatterns)) fail('UNSUPPORTED_SOURCE_URL', 'observation sourceUrl is outside source policy');
  const capturedAt = isoTimestamp(value.capturedAt, 'observation capturedAt');
  text(value.companyName, 'observation companyName'); text(value.roleTitle, 'observation roleTitle');
  if (value.nativeSourceId !== undefined && value.nativeSourceId !== null) text(value.nativeSourceId, 'observation nativeSourceId');
  if (!value.nativeSourceId && !sourceUrl) fail('INVALID_IDENTITY', 'observation needs nativeSourceId or sourceUrl');
  if (value.warnings !== undefined && (!Array.isArray(value.warnings) || !value.warnings.every((item) => typeof item === 'string'))) fail('INVALID_FIELD', 'observation warnings must be strings');
  budget.set(`${source.name}|${source.version}`, used + 1);
  return { ...structuredClone(value), sourceUrl, capturedAt, policySource: source };
}
function profile(value = {}) {
  object(value, 'filterProfile');
  keys(value, ['companyInclude', 'companyExclude', 'titleInclude', 'titleExclude', 'locationInclude', 'remoteTypes', 'minimumCompensation', 'requiredKeywords', 'excludedKeywords', 'unknownPolicy', 'minimumScore', 'maximumResults', 'rankingFactors'], 'filterProfile');
  const stringLists = ['companyInclude', 'companyExclude', 'titleInclude', 'titleExclude', 'locationInclude', 'remoteTypes', 'requiredKeywords', 'excludedKeywords'];
  for (const key of stringLists) if (value[key] !== undefined && (!Array.isArray(value[key]) || !value[key].every((item) => typeof item === 'string' && item.trim()))) fail('INVALID_FILTER', `${key} must be a string array`);
  if (value.unknownPolicy !== undefined && !['retain-with-warning', 'exclude'].includes(value.unknownPolicy)) fail('INVALID_FILTER', 'unknownPolicy must be retain-with-warning or exclude');
  if (value.minimumCompensation !== undefined && (!Number.isFinite(value.minimumCompensation) || value.minimumCompensation < 0)) fail('INVALID_FILTER', 'minimumCompensation must be non-negative');
  if (value.minimumScore !== undefined && !Number.isFinite(value.minimumScore)) fail('INVALID_FILTER', 'minimumScore must be numeric');
  if (value.maximumResults !== undefined && (!Number.isInteger(value.maximumResults) || value.maximumResults < 1)) fail('INVALID_FILTER', 'maximumResults must be a positive integer');
  if (value.rankingFactors !== undefined && (!Array.isArray(value.rankingFactors) || !value.rankingFactors.every((item) => plain(item) && typeof item.field === 'string' && typeof item.match === 'string' && Number.isFinite(item.weight)))) fail('INVALID_FILTER', 'rankingFactors need field, match, and numeric weight');
  return { unknownPolicy: 'retain-with-warning', maximumResults: Number.MAX_SAFE_INTEGER, minimumScore: -Infinity, rankingFactors: [], ...structuredClone(value) };
}
function includes(haystack, needles = []) { return needles.some((needle) => haystack.includes(normalized(needle))); }
function filterObservation(item, filters) {
  const warnings = [...(item.warnings ?? [])];
  const check = (field, values, actual) => {
    if (!values?.length) return null;
    if (!actual) { if (filters.unknownPolicy === 'exclude') return `missing-${field}`; warnings.push(`missing-${field}`); return null; }
    return null;
  };
  const company = normalized(item.companyName); const title = normalized(item.roleTitle); const location = item.location ? normalized(item.location) : null;
  if (includes(company, filters.companyExclude)) return { accepted: false, reason: 'company-excluded', warnings };
  if (filters.companyInclude?.length && !includes(company, filters.companyInclude)) return { accepted: false, reason: 'company-not-included', warnings };
  if (includes(title, filters.titleExclude)) return { accepted: false, reason: 'title-excluded', warnings };
  if (filters.titleInclude?.length && !includes(title, filters.titleInclude)) return { accepted: false, reason: 'title-not-included', warnings };
  const locationMissing = check('location', filters.locationInclude, location); if (locationMissing) return { accepted: false, reason: locationMissing, warnings };
  if (location && filters.locationInclude?.length && !includes(location, filters.locationInclude)) return { accepted: false, reason: 'location-not-included', warnings };
  const remoteMissing = check('remote-type', filters.remoteTypes, item.remoteType); if (remoteMissing) return { accepted: false, reason: remoteMissing, warnings };
  if (item.remoteType && filters.remoteTypes?.length && !filters.remoteTypes.map(normalized).includes(normalized(item.remoteType))) return { accepted: false, reason: 'remote-type-not-included', warnings };
  if (filters.minimumCompensation !== undefined) { const compensation = Number(item.compensation); if (!item.compensation) { if (filters.unknownPolicy === 'exclude') return { accepted: false, reason: 'missing-compensation', warnings }; warnings.push('missing-compensation'); } else if (!Number.isFinite(compensation) || compensation < filters.minimumCompensation) return { accepted: false, reason: 'compensation-below-minimum', warnings }; }
  const searchable = normalized([item.companyName, item.roleTitle, item.location ?? '', item.notes ?? ''].join(' '));
  if (filters.requiredKeywords?.some((word) => !searchable.includes(normalized(word)))) return { accepted: false, reason: 'required-keyword-missing', warnings };
  if (filters.excludedKeywords?.some((word) => searchable.includes(normalized(word)))) return { accepted: false, reason: 'excluded-keyword-present', warnings };
  const factors = filters.rankingFactors.map((factor) => ({ ...factor, matched: normalized(String(item[factor.field] ?? '')).includes(normalized(factor.match)), contribution: normalized(String(item[factor.field] ?? '')).includes(normalized(factor.match)) ? factor.weight : 0 }));
  const score = factors.reduce((sum, factor) => sum + factor.contribution, 0);
  if (score < filters.minimumScore) return { accepted: false, reason: 'score-below-threshold', warnings, score, factors };
  return { accepted: true, warnings, score, factors };
}
function trackerPayload(item) {
  return { company_name: item.companyName, role_title: item.roleTitle, source: item.source, source_detail: `snapshot:${item.sourceVersion}; evidence:${item.evidenceRef ?? item.sourceUrl}`, lead_url: item.sourceUrl, native_source_id: item.nativeSourceId ?? null, date_found: item.capturedAt.slice(0, 10), posted_text: item.postedText ?? null, date_posted: item.datePosted ?? null, location: item.location ?? null, remote_type: item.remoteType ?? null, compensation: item.compensation ?? null, evidence_links: [item.sourceUrl], notes: item.notes ?? null };
}
async function cliTracker(envelope) {
  const requestDir = await mkdtemp(join(tmpdir(), 'job-discovery-tracker-'));
  const requestPath = join(requestDir, 'request.json');
  const cli = resolve(dirname(new URL(import.meta.url).pathname), '../../job-search-tracker/src/cli.mjs');
  try {
    await writeFile(requestPath, `${JSON.stringify(envelope)}\n`);
    const { stdout } = await execFileAsync(process.execPath, [cli, '--request', requestPath]);
    return JSON.parse(stdout);
  } catch (error) {
    const raw = error.stderr?.toString() ?? error.message;
    try { const parsed = JSON.parse(raw); fail(parsed.code ?? 'TRACKER_REJECTED', parsed.message ?? 'tracker rejected request', parsed.details); } catch (parseError) { if (parseError instanceof DiscoveryError) throw parseError; fail('TRACKER_REJECTED', raw); }
  } finally { await rm(requestDir, { recursive: true, force: true }); }
}
async function callTracker(envelope, options) { return (options.trackerExecute ?? cliTracker)(envelope); }
function envelope(operation, request, payload, key) { return { version: VERSION, operation, dataPath: request.dataPath, dryRun: request.dryRun ?? false, operationKey: key, payload }; }
function reportItem(item, outcome) { return { source: item.source, sourceUrl: item.sourceUrl, nativeSourceId: item.nativeSourceId ?? null, companyName: item.companyName, roleTitle: item.roleTitle, ...outcome }; }
function sortAccepted(items) { return [...items].sort((left, right) => right.score - left.score || String(right.item.capturedAt).localeCompare(String(left.item.capturedAt)) || `${left.item.source}|${left.item.sourceVersion}`.localeCompare(`${right.item.source}|${right.item.sourceVersion}`) || left.item.sourceUrl.localeCompare(right.item.sourceUrl)); }

function validateRequest(request) {
  object(request, 'request');
  keys(request, ['version', 'operation', 'dataPath', 'dryRun', 'operationKey', 'sourcePolicy', 'filterProfile', 'observations', 'maxResults', 'excludeIdentities', 'recordId', 'candidateVerificationApproved', 'officialEvidence', 'now'], 'request');
  if (request.version !== VERSION) fail('INVALID_REQUEST', `request version must be ${VERSION}`);
  if (!['discover', 'replace', 'verify', 'recheck'].includes(request.operation)) fail('UNKNOWN_OPERATION', 'operation must be discover, replace, verify, or recheck');
  text(request.dataPath, 'dataPath'); if (/^[a-z][a-z0-9+.-]*:/i.test(request.dataPath)) fail('EXTERNAL_TARGET_REJECTED', 'dataPath must be local');
  if (request.dryRun !== undefined && typeof request.dryRun !== 'boolean') fail('INVALID_REQUEST', 'dryRun must be boolean');
  text(request.operationKey, 'operationKey');
  return { ...structuredClone(request), dryRun: request.dryRun ?? false, sourcePolicy: sourcePolicy(request.sourcePolicy), filterProfile: profile(request.filterProfile ?? {}) };
}

export async function discover(requestInput, options = {}) {
  const request = validateRequest(requestInput);
  if (!['discover', 'replace'].includes(request.operation)) fail('INVALID_REQUEST', 'discover accepts discover or replace operations');
  if (!Array.isArray(request.observations)) fail('INVALID_REQUEST', 'observations must be an array');
  const maximum = request.operation === 'replace' ? request.maxResults : request.filterProfile.maximumResults;
  if (!Number.isInteger(maximum) || maximum < 1) fail('INVALID_REQUEST', 'maxResults must be a positive integer');
  const exclusions = new Set((request.excludeIdentities ?? []).map((item) => normalized(item)));
  const budget = new Map(); const accepted = []; const filtered = []; const stopped = [];
  for (const raw of request.observations) {
    let item;
    try { item = observation(raw, request.sourcePolicy, budget); } catch (error) { stopped.push({ source: raw?.source ?? null, sourceUrl: raw?.sourceUrl ?? null, reason: error.code ?? 'INVALID_OBSERVATION' }); continue; }
    const identity = item.nativeSourceId ? normalized(item.nativeSourceId) : `${normalized(item.companyName)}|${normalized(item.roleTitle)}|${item.sourceUrl}`;
    if (exclusions.has(identity)) { filtered.push(reportItem(item, { reason: 'excluded-identity', warnings: [] })); continue; }
    const decision = filterObservation(item, request.filterProfile);
    if (!decision.accepted) { filtered.push(reportItem(item, decision)); continue; }
    accepted.push({ item, ...decision, identity });
  }
  const ordered = sortAccepted(accepted).slice(0, maximum);
  const results = [];
  for (const candidate of ordered) {
    const payload = trackerPayload(candidate.item);
    const key = `${request.operationKey}:${digest({ sourcePolicy: request.sourcePolicy.version, identity: candidate.identity, capturedAt: candidate.item.capturedAt, payload })}`;
    const result = await callTracker(envelope('upsertLead', request, payload, key), options);
    results.push(reportItem(candidate.item, { action: result.action, recordId: result.recordId, warnings: candidate.warnings, score: candidate.score, factors: candidate.factors, idempotent: result.idempotent }));
  }
  return { ok: true, operation: request.operation, dryRun: request.dryRun, accepted: results, filtered, stopped, counts: { accepted: results.length, filtered: filtered.length, stopped: stopped.length }, operationKey: request.operationKey };
}

function validateOfficialEvidence(value, policy) {
  object(value, 'officialEvidence');
  keys(value, ['officialUrl', 'companyName', 'roleTitle', 'activeApplyPath', 'availability', 'capturedAt', 'descriptionAvailable', 'evidenceLinks', 'redirectedTo', 'retrievalError', 'notes'], 'officialEvidence');
  fixtureScan(value, 'official evidence');
  if (ACTION_LIKE.test(stable(value))) fail('UNTRUSTED_ACTION_CONTENT', 'official evidence contains action-like content');
  if (value.retrievalError) return { status: 'Needs Research', reason: 'official-retrieval-failed', officialUrl: null, evidenceLinks: [] };
  const capturedAt = value.capturedAt === undefined ? new Date().toISOString() : isoTimestamp(value.capturedAt, 'officialEvidence capturedAt');
  const officialUrl = canonicalUrl(value.officialUrl, 'officialEvidence officialUrl');
  if (!matchesPrefix(officialUrl, policy.officialUrlPatterns)) return { status: 'Needs Research', reason: 'official-url-not-approved', officialUrl: null, evidenceLinks: [] };
  if (value.redirectedTo && !matchesPrefix(canonicalUrl(value.redirectedTo, 'officialEvidence redirectedTo'), policy.officialUrlPatterns)) return { status: 'Needs Research', reason: 'redirect-outside-official-policy', officialUrl: null, evidenceLinks: [] };
  if (!value.companyName || !value.roleTitle) return { status: 'Needs Research', reason: 'official-evidence-incomplete', officialUrl: null, evidenceLinks: [] };
  const availability = value.availability;
  if (!['active', 'closed', 'expired', 'removed'].includes(availability)) return { status: 'Needs Research', reason: 'official-availability-unknown', officialUrl: null, evidenceLinks: [] };
  const map = { active: 'Verified Active', closed: 'Closed', expired: 'Expired', removed: 'Removed' };
  if (availability === 'active' && (!value.descriptionAvailable || value.activeApplyPath !== true)) return { status: 'Needs Research', reason: 'official-evidence-incomplete', officialUrl: null, evidenceLinks: [] };
  if (value.evidenceLinks !== undefined && (!Array.isArray(value.evidenceLinks) || !value.evidenceLinks.every((link) => typeof link === 'string'))) fail('INVALID_FIELD', 'officialEvidence evidenceLinks must be a string array');
  const evidenceLinks = (value.evidenceLinks ?? []).map((link) => canonicalUrl(link, 'officialEvidence evidenceLink'));
  if (evidenceLinks.some((link) => !matchesPrefix(link, policy.officialUrlPatterns))) return { status: 'Needs Research', reason: 'evidence-link-not-approved', officialUrl: null, evidenceLinks: [] };
  return { status: map[availability], reason: null, officialUrl, evidenceLinks: [...new Set([officialUrl, ...evidenceLinks])], capturedAt, notes: value.notes ?? null };
}

export async function verify(requestInput, options = {}) {
  const request = validateRequest(requestInput);
  if (!['verify', 'recheck'].includes(request.operation)) fail('INVALID_REQUEST', 'verify accepts verify or recheck operations');
  text(request.recordId, 'recordId');
  const found = await callTracker(envelope('findByIdentity', request, { native_source_id: request.recordId }, `${request.operationKey}:lookup`), options);
  let lead = found.record;
  if (!lead) {
    const reviews = await callTracker(envelope('readForReview', request, {}, `${request.operationKey}:review`), options);
    lead = reviews.records?.find((item) => item.record_id === request.recordId) ?? null;
  }
  if (!lead) fail('LEAD_NOT_FOUND', 'recordId does not identify a tracker lead');
  if (request.operation === 'verify' && lead.pursue_decision !== 'Yes' && request.candidateVerificationApproved !== true) return { ok: false, operation: request.operation, code: 'CANDIDATE_VERIFICATION_REQUIRED', action: 'stopped', recordId: lead.record_id };
  if (request.operation === 'recheck') {
    const dueAt = lead.verified_at ? Date.parse(lead.verified_at) + request.sourcePolicy.recheckDays * 86400000 : 0;
    const incomplete = !lead.official_url || !lead.verified_at;
    if (!incomplete && dueAt > Date.parse(now(options))) return { ok: false, operation: request.operation, code: 'RECHECK_NOT_DUE', action: 'stopped', recordId: lead.record_id, recheckAt: new Date(dueAt).toISOString() };
  }
  let evidence = validateOfficialEvidence(request.officialEvidence, request.sourcePolicy);
  if (!evidence.reason && (normalized(request.officialEvidence.companyName) !== normalized(lead.company_name) || normalized(request.officialEvidence.roleTitle) !== normalized(lead.role_title))) {
    evidence = { status: 'Needs Research', reason: 'official-identity-mismatch', officialUrl: null, evidenceLinks: [] };
  }
  const payload = { record_id: lead.record_id, posting_status: evidence.status, verification_notes: evidence.reason ?? evidence.notes ?? `official evidence captured; recheck after ${request.sourcePolicy.recheckDays} days`, evidence_links: evidence.evidenceLinks };
  if (evidence.status === 'Verified Active') {
    payload.verified_at = evidence.capturedAt ?? now(options);
    payload.official_url = evidence.officialUrl;
  } else if (evidence.status !== 'Needs Research') {
    payload.verified_at = evidence.capturedAt ?? now(options);
    payload.official_url = evidence.officialUrl ?? lead.official_url;
  }
  const result = await callTracker(envelope('updateVerification', request, payload, `${request.operationKey}:${digest({ recordId: lead.record_id, evidence })}`), options);
  return { ok: true, operation: request.operation, recordId: lead.record_id, postingStatus: evidence.status, reason: evidence.reason, recheckAt: evidence.status === 'Verified Active' ? new Date(Date.parse(evidence.capturedAt) + request.sourcePolicy.recheckDays * 86400000).toISOString() : null, dryRun: request.dryRun, tracker: result };
}

export async function execute(request, options = {}) { return ['discover', 'replace'].includes(request?.operation) ? discover(request, options) : verify(request, options); }
export { VERSION as DISCOVERY_VERSION, fixtureScan, sourcePolicy as validateSourcePolicy };
