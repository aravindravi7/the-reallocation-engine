// Offline tests for pm-sponsor-triage.mjs. No network: every input is a fixture in ../fixtures/,
// and the only subprocess is the repo's own scorer (scripts/score/role-scorer.mjs), run locally.
//   node --test scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/test/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  REPO, classifyTitle, parseTitleList, normalizeName, parseLiveness, timelineFactor, registrationWindows,
  loadSponsorIndex, loadBls, run, InputError, parseDate,
} from '../pm-sponsor-triage.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FX = path.join(HERE, '../fixtures');
const fx = (f) => path.join(FX, f);
const ALLOWED = new Set(['record', 'model-judgment', 'your-input']);

function tmpdir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'pm-triage-')); }
function baseOpts(out, over = {}) {
  return {
    mode: 'test', shortlist: fx('shortlist.sample.json'), persona: fx('persona.sample.json'), liveness: fx('liveness.sample.txt'),
    csv: fx('sponsors.slice.csv'), bls: fx('bls.slice.csv'), formdDir: fx('formd'), out, asOf: '2026-10-03', ...over,
  };
}
function personaWith(over) {
  const p = { ...JSON.parse(fs.readFileSync(fx('persona.sample.json'), 'utf8')), ...over };
  const f = path.join(tmpdir(), 'persona.json'); fs.writeFileSync(f, JSON.stringify(p)); return f;
}
function walkSources(obj, bad, where = '$') {
  if (Array.isArray(obj)) obj.forEach((v, i) => walkSources(v, bad, `${where}[${i}]`));
  else if (obj && typeof obj === 'object') {
    if ('source' in obj && !ALLOWED.has(obj.source)) bad.push(`${where}.source=${obj.source}`);
    for (const [k, v] of Object.entries(obj)) walkSources(v, bad, `${where}.${k}`);
  }
}

test('title classifier: product vs program vs ambiguous vs excluded', () => {
  const cases = {
    'Product Manager': 'product', 'Sr. Product Manager, PhenoCycler Instruments': 'product', 'Director, Product Management': 'product',
    'TECHNICAL PRODUCT MANAGER/PRODUCT OWNER': 'product', 'Associate Product Manager (New Grad)': 'product',
    'Technical Program Manager': 'program', 'Senior Program Manager': 'program',
    'Advertiser Optimization PM': 'ambiguous-pm', 'TPM': 'ambiguous-pm',
    'Product Marketing Manager II': 'other', 'Product Designer': 'other', 'Senior Manager, Product Strategy': 'other', 'Software Engineer': 'other', '': 'other',
  };
  for (const [t, want] of Object.entries(cases)) assert.equal(classifyTitle(t), want, t);
});

test('sponsored-title list parser handles a double-quoted title with an apostrophe', () => {
  assert.deepEqual(parseTitleList(`['Senior Machine Learning Engineer ', "Senior Director, Men's Category"]`),
    ['Senior Machine Learning Engineer', "Senior Director, Men's Category"]);
  assert.deepEqual(parseTitleList(''), []);
});

test('company matching is exact after normalization — an SPV fund name never matches the brand', () => {
  assert.equal(normalizeName('Stripe, Inc.'), normalizeName('STRIPE INC'));
  assert.notEqual(normalizeName('Anthropic'), normalizeName('ANTHROPIC - A SERIES OF AURUM VP FUND LLC'));
  const idx = loadSponsorIndex(fx('sponsors.slice.csv'));
  assert.equal((idx.byNorm.get('ANTHROPIC') || []).length, 0);
  assert.equal(idx.byNorm.get('PELOTON INTERACTIVE').length, 2);
});

test('liveness parser reads the checker\'s own output format, including reason lines', () => {
  const m = parseLiveness(fs.readFileSync(fx('liveness.sample.txt'), 'utf8'));
  assert.equal(m.get('https://jobs.example.com/stripe/pm-new-grad').status, 'active');
  assert.equal(m.get('https://jobs.example.com/mongodb/spm').status, 'expired');
  assert.match(m.get('https://jobs.example.com/stripe/pm-payments').reason, /no visible apply control/);
  assert.equal(m.has('https://jobs.example.com/figma/tpm-not-in-liveness-file'), false);
});

test('timeline gate: steps, unemployment allowance, and refusal when OPT end is past', () => {
  const asOf = parseDate('2026-10-03', 'x');
  const far = timelineFactor({ asOf, optEnd: parseDate('2029-05-31', 'x'), lagDays: 75, unemploymentLeft: 110, employed: false });
  assert.equal(far.factor, 1.0);
  const near = timelineFactor({ asOf, optEnd: parseDate('2027-01-31', 'x'), lagDays: 75, unemploymentLeft: 110, employed: false });
  assert.equal(near.factor, 0.3); // 120 days left − 75 lag = 45 days slack
  const overAllowance = timelineFactor({ asOf, optEnd: parseDate('2029-05-31', 'x'), lagDays: 75, unemploymentLeft: 20, employed: false });
  assert.equal(overAllowance.factor, 0);
  assert.throws(() => timelineFactor({ asOf, optEnd: parseDate('2026-09-30', 'x'), lagDays: 0, unemploymentLeft: 110, employed: true }),
    (e) => e instanceof InputError && e.code === 3);
  assert.throws(() => parseDate('2026-02-30', 'opt_end_date'), InputError);
});

test('H-1B registration windows are counted from dates only', () => {
  assert.equal(registrationWindows(parseDate('2026-12-17', 'x'), parseDate('2029-05-31', 'x')), 3); // Mar 2027, 2028, 2029
  assert.equal(registrationWindows(parseDate('2029-04-01', 'x'), parseDate('2029-05-31', 'x')), 0);
});

test('schema drift in the 80 Days CSV halts instead of reading the wrong column', () => {
  const f = path.join(tmpdir(), 'drift.csv');
  fs.writeFileSync(f, 'company_name,industry,Total Approvals\nSTRIPE INC,Other,1\n');
  assert.throws(() => loadSponsorIndex(f), (e) => e instanceof InputError && /schema drift/.test(e.message));
});

test('a SOC code with no BLS row is reported missing, never zero', () => {
  const [q] = loadBls(fx('bls.slice.csv'), ['15-1199']);
  assert.equal(q.status, 'missing');
  assert.equal(q.missing_reason, 'no-occupation-row');
  assert.equal(q.median_wage, null);
});

test('end to end on fixtures through the real scorer: holds, gates, labels, report shape', () => {
  const out = tmpdir();
  const log = run(baseOpts(out));
  const byId = Object.fromEntries(log.roles.map((r) => [r.role_id, r]));

  // named failure cases → HOLD with the right reason, never scored
  assert.equal(byId['s06-anthropic-pm'].holds[0].reason, 'company-not-in-csv');
  assert.equal(byId['s08-peloton-pm'].holds[0].reason, 'ambiguous-company-match');
  assert.equal(byId['s09-figma-tpm-unchecked'].holds[0].reason, 'liveness-unchecked');
  assert.equal(byId['s10-stripe-pm-payments-uncertain'].holds[0].reason, 'liveness-uncertain');
  const held = log.roles.filter((r) => r.decision === 'HOLD').map((r) => r.role_id).sort();
  const sent = JSON.parse(fs.readFileSync(path.join(out, 'roles.json'), 'utf8'));
  for (const id of held) assert.ok(!sent.some((r) => r.role_id === id), `${id} must not reach the scorer`);
  assert.equal(byId['s06-anthropic-pm'].sponsorship, null, 'no sponsorship value invented for an unmatched company');

  // every scorer term carries a source label; liveness is never absent (the scorer would default it to 1)
  for (const r of sent) {
    for (const k of ['sponsorship', 'fit', 'liveness', 'timeline']) assert.ok(ALLOWED.has(r[k].source), `${r.role_id}.${k}`);
    assert.equal(typeof r.liveness.factor, 'number');
  }
  const bad = []; walkSources(log, bad); assert.deepEqual(bad, []);

  // the liveness gate is a multiplier: expired → composite 0 → Skip, regardless of a Proven sponsor
  assert.equal(byId['s04-mongodb-pm-expired'].decision, 'Skip');
  assert.equal(byId['s04-mongodb-pm-expired'].composite, 0);
  assert.equal(byId['s04-mongodb-pm-expired'].sponsorship.tier.value, 'Proven');

  // tier logic is driven by the record strings
  assert.equal(byId['s02-datadog-tpm'].sponsorship.rule.value, 'adjacent-family');
  assert.equal(byId['s03-databricks-apm'].sponsorship.rule.value, 'sponsor-not-pm');
  assert.equal(byId['s07-ramp-pm'].sponsorship.rule.value, 'no-h1b-record');
  assert.equal(byId['s07-ramp-pm'].sponsorship.csv_row.matched_by.source, 'your-input');
  assert.deepEqual(byId['s05-reddit-pm'].sponsorship.ambiguous_titles.value, ['Advertiser Optimization PM']);

  // the scorer's own outputs exist and agree on the profile
  assert.ok(fs.existsSync(path.join(out, 'role-scores.json')));
  assert.equal(log.scorer.profile_needs_sponsorship, true);

  // two outputs, two readers: JSON log for the agent, Markdown report for the person (exec summary first)
  const md = fs.readFileSync(path.join(out, 'pm-triage-report.md'), 'utf8');
  assert.match(md.split('\n').filter((l) => l.startsWith('## '))[0], /^## Executive summary$/);
  assert.doesNotMatch(md + JSON.stringify(log), /\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}/, 'no phone-number-shaped strings leak into outputs');
});

test('OPT end date already past: the whole run is refused and nothing is scored', () => {
  const out = tmpdir();
  assert.throws(() => run(baseOpts(out, { persona: personaWith({ opt_end_date: '2026-06-30' }) })), (e) => e.code === 3);
  assert.equal(fs.existsSync(path.join(out, 'role-scores.json')), false);
  assert.equal(fs.existsSync(path.join(out, 'pm-triage-report.md')), false);
});

test('break attempt: an authorization string with "authorized" makes the scorer drop sponsorship — the prototype refuses', () => {
  const out = tmpdir();
  assert.throws(() => run(baseOpts(out, { persona: personaWith({ authorization: 'F-1 OPT, authorized to work' }) })),
    (e) => e.code === 4 && /NOT needing sponsorship/.test(e.message));
});

test('characterization of the engine: the scorer treats a missing liveness factor as an open gate', () => {
  // BROKEN-no-liveness-roles.json omits liveness. This is why the prototype HOLDs unchecked roles.
  const out = tmpdir();
  const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/score/role-scorer.mjs'), fx('BROKEN-no-liveness-roles.json'), '--out-dir', out], { cwd: REPO, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const s = JSON.parse(fs.readFileSync(path.join(out, 'role-scores.json'), 'utf8')).roles[0];
  assert.equal(s.trace.gates.find((g) => g.factor === 'liveness').multiplier, 1);
  assert.equal(s.recommendation, 'Apply');
});

test('a named human can clear an uncertain liveness gate, but cannot reopen an expired one', () => {
  const sl = JSON.parse(fs.readFileSync(fx('shortlist.sample.json'), 'utf8'));
  const human = { status: 'active', by: 'Test Reviewer', date: '2026-10-03', note: 'opened the page; apply button present' };
  for (const r of sl.roles) if (r.role_id === 's10-stripe-pm-payments-uncertain' || r.role_id === 's04-mongodb-pm-expired') r.liveness_human = human;
  const f = path.join(tmpdir(), 'shortlist.json'); fs.writeFileSync(f, JSON.stringify(sl));
  const out = tmpdir();
  const byId = Object.fromEntries(run(baseOpts(out, { shortlist: f })).roles.map((r) => [r.role_id, r]));
  const cleared = byId['s10-stripe-pm-payments-uncertain'];
  assert.notEqual(cleared.decision, 'HOLD');
  assert.equal(cleared.liveness.source, 'your-input');
  assert.equal(cleared.liveness.checked_by, 'Test Reviewer');
  const sent = JSON.parse(fs.readFileSync(path.join(out, 'roles.json'), 'utf8'));
  assert.equal(sent.find((r) => r.role_id === 's10-stripe-pm-payments-uncertain').liveness.source, 'your-input');
  assert.equal(byId['s04-mongodb-pm-expired'].liveness.status, 'expired');
  assert.equal(byId['s04-mongodb-pm-expired'].decision, 'Skip');
});

test('a liveness_human note without a name does not clear the gate', () => {
  const sl = JSON.parse(fs.readFileSync(fx('shortlist.sample.json'), 'utf8'));
  sl.roles.find((r) => r.role_id === 's10-stripe-pm-payments-uncertain').liveness_human = { status: 'active', date: '2026-10-03' };
  const f = path.join(tmpdir(), 'shortlist.json'); fs.writeFileSync(f, JSON.stringify(sl));
  const r = run(baseOpts(tmpdir(), { shortlist: f })).roles.find((x) => x.role_id === 's10-stripe-pm-payments-uncertain');
  assert.equal(r.decision, 'HOLD');
});
