#!/usr/bin/env node
// pm-sponsor-triage.mjs — PM sponsor title-match (Fall 2026 contribution, aravindravi7).
//
// Question it answers: has this company sponsored H-1B visas for PRODUCT-MANAGER-family
// titles — not just "does it sponsor anyone"? Then: is the posting live, does the hiring
// timeline fit a STEM OPT student's unemployment allowance, and what should the person do
// next (tailor / network first / non-H1B fallback / skip / resolve a hold)?
//
// It COMBINES nothing itself. It looks up records, labels every value
// (record / model-judgment / your-input), writes a roles.json shaped like
// data/examples/ch11-roles.json, and runs the existing scorer
// (scripts/score/role-scorer.mjs) as a CLI. Roles it cannot evidence are HELD and never
// reach the scorer — the scorer treats a missing liveness factor as 1 (open), so passing an
// unchecked role through would open a gate nobody checked.
//
//   node scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/pm-sponsor-triage.mjs --sample
//   node .../pm-sponsor-triage.mjs --shortlist s.json --persona p.json --liveness l.txt [--liveness l2.txt] --out dir [--as-of YYYY-MM-DD]
//
// Exit: 0 ok · 2 usage/input error · 3 timeline gate refuses the whole run (OPT end not in future)
//       · 4 scorer failed or disagreed with the profile.
// No network calls. Reads only local repo files.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '../../../..');

export const DEFAULTS = {
  csv: 'data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv',
  bls: 'data/bls/compact/soc_occupation_compact.csv',
  formdDir: 'data/sec/form-d/processed/sample',
  scorer: 'scripts/score/role-scorer.mjs',
};

export const SRC = { record: 'record', model: 'model-judgment', input: 'your-input' };

// ─── Declared rules. Every number here is a design choice (your-input), not a measurement. ───
// Tier → sponsorship p. 0.9 (Proven) and 0.6 (Likely) mirror Ch.11's worked example
// (data/examples/ch11-roles.json); 0.5 for "sponsors, but no PM-family title on record" is my
// choice, placed below Likely because the record says nothing about PMs. All three non-Proven
// tiers are in the scorer's soft list or zero, so none can reach Apply on sponsorship alone.
export const TIER_RULES = {
  'title-family-match': { p: 0.9, tier: 'Proven' },
  'adjacent-family':    { p: 0.6, tier: 'Likely' },
  'sponsor-not-pm':     { p: 0.5, tier: 'Possible' },
  'no-h1b-record':      { p: 0.0, tier: 'None' },
};
// Slack = days to OPT end − hiring lag. Stepped, not fitted; see recipe §Timeline gate.
export const TIMELINE_STEPS = [[365, 1.0], [180, 0.85], [90, 0.6], [1, 0.3]];
export const THIN_TITLE_EVIDENCE = 2; // ≤ this many sponsored titles listed → flag as thin

// ─── Title-family classifier (deterministic regex, v1) ───
// Excluded phrases are blanked out first, so "Product Marketing Manager" cannot match "product … manager".
const EXCLUDE = /\bproduct\s+(marketing|design|designer|specialist|support|engineer|analyst|counsel|operations|strategy)\b/gi;
const PRODUCT = /\bproduct\s+(manager|owner|management|lead)\b|\bAPM\b/i;
const PROGRAM = /\b(technical\s+)?program\s+manager\b/i;
const BARE_PM = /\bT?PM\b/; // bare "TPM" is product OR program — ambiguous on purpose

export function classifyTitle(title) {
  const t = String(title || '').replace(EXCLUDE, ' ').trim();
  if (!t) return 'other';
  if (PRODUCT.test(t)) return 'product';
  if (PROGRAM.test(t)) return 'program';
  if (BARE_PM.test(t)) return 'ambiguous-pm'; // "Advertiser Optimization PM", bare "TPM": counted as neither family
  return 'other';
}

// Python-list repr from the CSV, e.g. "['Software Engineer', \"Men's Category\"]"
export function parseTitleList(s) {
  const out = [];
  const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(String(s || '')))) out.push((m[1] ?? m[2]).trim());
  return out.filter(Boolean);
}

// ─── Exact normalized company-name matching. No fuzzy matching, by design. ───
const SUFFIX = new Set(['INC', 'INCORPORATED', 'LLC', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'LTD', 'LIMITED', 'PBC', 'LP', 'LLP', 'PLC']);
export function normalizeName(name) {
  let toks = String(name || '').toUpperCase().replace(/&/g, ' AND ').replace(/[^A-Z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  while (toks.length > 1 && SUFFIX.has(toks[toks.length - 1])) toks.pop();
  return toks.join(' ');
}

// ─── Minimal RFC-4180 CSV parser (quoted fields, embedded commas/newlines). ───
export function parseCsv(text) {
  const rows = []; let row = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); f = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = [];
    } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// Columns this recipe reads. Phone / officer / director columns are never read or echoed.
export const CSV_COLUMNS = ['company_name', 'industry', 'state', 'latest_funding_amount', 'latest_funding_stage', 'latest_funding_date',
  'Total Approvals', 'Total Denials', 'Approval_Rate', 'median_salary_offered', 'top_job_titles_sponsored'];

export class InputError extends Error { constructor(msg, code = 2) { super(msg); this.code = code; } }

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
const numOrNull = (s) => { const t = String(s ?? '').trim(); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : null; };
const lab = (value, source, extra = {}) => ({ value, source, ...extra });

export function loadSponsorIndex(csvPath) {
  const text = fs.readFileSync(csvPath, 'utf8');
  const header = text.slice(0, text.indexOf('\n')).replace(/\r$/, '').split(',');
  const missing = CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) throw new InputError(`80 Days CSV schema drift: missing column(s) ${missing.join(', ')} in ${csvPath}`);
  const rows = parseCsv(text).map((r) => Object.fromEntries(CSV_COLUMNS.map((c) => [c, r[c]])));
  const byNorm = new Map(); const byRaw = new Map();
  for (const r of rows) {
    const k = normalizeName(r.company_name);
    if (!byNorm.has(k)) byNorm.set(k, []);
    byNorm.get(k).push(r);
    byRaw.set(String(r.company_name).trim().toUpperCase(), r);
  }
  return { rows: rows.length, byNorm, byRaw };
}

export function loadFormD(dir) {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.sample\.json$/.test(f)).sort() : [];
  const byNorm = new Map(); let shipped = 0; let total = 0;
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    shipped += (j.companies || []).length; total += j.metadata?.total_companies ?? 0;
    for (const c of j.companies || []) {
      const k = normalizeName(c.company?.name);
      if (!byNorm.has(k)) byNorm.set(k, []);
      byNorm.get(k).push({ accession_number: c.accession_number ?? null, quarter: c.filing?.quarter, date_filed: c.filing?.date_filed, total_amount_sold: c.funding?.total_amount_sold ?? null, industry: c.company?.industry ?? null, file: f });
    }
  }
  return { files, shipped, total, byNorm };
}

export function loadBls(blsPath, socs) {
  const rows = parseCsv(fs.readFileSync(blsPath, 'utf8'));
  return socs.map((soc) => {
    const hits = rows.filter((r) => r.bls_soc_code === soc);
    if (!hits.length) return { soc, status: 'missing', missing_reason: 'no-occupation-row', median_wage: null, source: SRC.record };
    const row = hits.find((r) => r.onet_soc_code === `${soc}.00`) || hits[0];
    const w = numOrNull(row.annual_median_wage);
    if (w == null) return { soc, title: row.title, status: 'missing', missing_reason: 'no-wage-value', median_wage: null, source: SRC.record };
    return { soc, title: row.title, status: 'ok', median_wage: w, oews_year: row.oews_year, source: SRC.record };
  });
}

// Parses the saved stdout of `npm run ats:liveness -- --file urls.txt`.
export function parseLiveness(text) {
  const map = new Map(); let last = null;
  for (const line of String(text || '').split('\n')) {
    const m = line.match(/^\S+\s+(active|expired|uncertain)\s+(\S+)\s*$/);
    if (m) { last = { status: m[1], url: m[2], reason: null }; map.set(m[2], last); continue; }
    if (last && /^\s{4,}\S/.test(line) && !last.reason) last.reason = line.trim();
  }
  return map;
}

const DAY = 86400000;
export function parseDate(s, field) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) throw new InputError(`${field}: expected YYYY-MM-DD, got ${JSON.stringify(s)}`);
  const d = new Date(`${s}T00:00:00Z`);
  if (isNaN(d) || d.toISOString().slice(0, 10) !== s) throw new InputError(`${field}: not a real date: ${s}`);
  return d;
}

export function timelineFactor({ asOf, optEnd, lagDays, unemploymentLeft, employed }) {
  const daysToEnd = Math.round((optEnd - asOf) / DAY);
  if (daysToEnd <= 0) throw new InputError(`OPT end date ${optEnd.toISOString().slice(0, 10)} is not after as-of ${asOf.toISOString().slice(0, 10)}; refusing to score — no timeline factor can be computed honestly.`, 3);
  if (!employed && lagDays > unemploymentLeft)
    return { factor: 0, days_to_opt_end: daysToEnd, slack_days: daysToEnd - lagDays, reason: `hiring lag ${lagDays}d exceeds remaining unemployment allowance ${unemploymentLeft}d` };
  const slack = daysToEnd - lagDays;
  const step = TIMELINE_STEPS.find(([min]) => slack >= min);
  return { factor: step ? step[1] : 0, days_to_opt_end: daysToEnd, slack_days: slack, reason: step ? `slack ${slack}d ≥ ${step[0]}d step` : `slack ${slack}d ≤ 0 — start would fall after OPT end` };
}

// March H-1B registration windows between estimated start and OPT end (count only; odds not in repo).
export function registrationWindows(start, end) {
  let n = 0;
  for (let y = start.getUTCFullYear(); y <= end.getUTCFullYear(); y++) {
    const open = Date.UTC(y, 2, 1), close = Date.UTC(y, 2, 31);
    if (close >= start.getTime() && open <= end.getTime()) n++;
  }
  return n;
}

export function sponsorshipEvidence(role, persona, idx) {
  let row = null;
  if (role.csv_name) {
    row = idx.byRaw.get(String(role.csv_name).trim().toUpperCase()) || null;
    if (!row) return { hold: 'csv-name-not-found', detail: `csv_name "${role.csv_name}" is not a company_name in the CSV` };
  } else {
    const hits = idx.byNorm.get(normalizeName(role.company)) || [];
    if (hits.length === 0) return { hold: 'company-not-in-csv', detail: `no CSV row whose normalized name equals "${normalizeName(role.company)}"; supply csv_name after checking by hand` };
    if (hits.length > 1) return { hold: 'ambiguous-company-match', detail: `matches ${hits.map((h) => h.company_name).join(' | ')}` };
    row = hits[0];
  }
  const approvals = numOrNull(row['Total Approvals']);
  const titles = parseTitleList(row.top_job_titles_sponsored);
  const families = titles.map((t) => ({ title: t, family: classifyTitle(t) }));
  const postingFamily = classifyTitle(role.title);
  const targets = new Set(persona.target_families || ['product', 'program']);
  const pmTitles = families.filter((f) => targets.has(f.family));
  const sameFamily = families.filter((f) => f.family === postingFamily && targets.has(f.family));

  let rule;
  if (!approvals) rule = 'no-h1b-record';
  else if (sameFamily.length) rule = 'title-family-match';
  else if (pmTitles.length) rule = 'adjacent-family';
  else rule = 'sponsor-not-pm';
  const { p, tier } = TIER_RULES[rule];

  return {
    hold: null,
    csv_row: {
      company_name: lab(row.company_name, SRC.record),
      matched_by: lab(role.csv_name ? 'csv_name (human-supplied)' : 'exact normalized name', role.csv_name ? SRC.input : SRC.record),
      industry: lab(row.industry || null, SRC.record),
      total_approvals: lab(approvals, SRC.record),
      total_denials: lab(numOrNull(row['Total Denials']), SRC.record),
      approval_rate: lab(numOrNull(row.Approval_Rate), SRC.record),
      median_salary_offered: lab(numOrNull(row.median_salary_offered), SRC.record, { note: 'company-wide median over sponsored filings, all titles — not a PM wage' }),
      top_titles_sponsored: lab(titles, SRC.record, { note: 'the CSV stores only top titles, not every filing' }),
      titles_listed: lab(titles.length, SRC.record),
      latest_funding_date: lab(row.latest_funding_date || null, SRC.record),
      latest_funding_amount: lab(numOrNull(row.latest_funding_amount), SRC.record),
      latest_funding_stage: lab(row.latest_funding_stage || null, SRC.record),
    },
    posting_family: lab(postingFamily, SRC.record, { derived_by: 'classifyTitle v1 on the posting title' }),
    title_families: lab(families, SRC.record, { derived_by: 'classifyTitle v1' }),
    matched_pm_titles: lab(sameFamily.length ? sameFamily.map((f) => f.title) : pmTitles.map((f) => f.title), SRC.record),
    ambiguous_titles: lab(families.filter((f) => f.family === 'ambiguous-pm').map((f) => f.title), SRC.record, { note: 'counted as neither family; a human reads them' }),
    thin_evidence: !!approvals && titles.length <= THIN_TITLE_EVIDENCE,
    rule: lab(rule, SRC.record, { derived_by: 'TIER_RULES decision order' }),
    tier: lab(tier, SRC.record),
    p: lab(p, SRC.input, { note: 'tier→p is a declared mapping (TIER_RULES), not a measured probability' }),
  };
}

// Employer tier (1 frontier AI lab · 2 FAANG/top high-tech · 3 other tech · 4 non-tech). No repo record
// measures "how bleeding-edge" an employer is, so the tier is NEVER a scorer term: it only orders roles
// within a decision. Lookup order, each labeled honestly:
//   1. persona.employer_tiers            → your-input (the person's own ranking)
//   2. employer_tiers.predicted.json     → model-judgment (AI-predicted list, unconfirmed)
//   3. fallback rule on the CSV industry → model-judgment, flagged "confirm"; never predicts tier 1 or 2
export const TECH_INDUSTRIES = new Set(['Other Technology', 'Computers', 'Telecommunications']);
export function employerTier(company, persona, predicted, industry) {
  const k = normalizeName(company);
  for (const [tier, names] of Object.entries(persona.employer_tiers || {}))
    if ((names || []).some((n) => normalizeName(n) === k)) return lab(Number(tier), SRC.input, { basis: 'your tier list', confirm: false });
  const hit = (predicted?.companies || []).find((c) => normalizeName(c.name) === k);
  if (hit) return lab(hit.tier, SRC.model, { basis: `AI-predicted list (${predicted.predicted_by}, ${predicted.predicted_on}), unconfirmed`, reason: hit.reason, confirm: true });
  if (industry == null) return lab(3, SRC.model, { basis: 'fallback rule', reason: 'no CSV row and no prediction — defaulted to other tech', confirm: true });
  if (TECH_INDUSTRIES.has(industry)) return lab(3, SRC.model, { basis: 'fallback rule', reason: `CSV industry "${industry}" is a tech category`, confirm: true });
  if (industry === 'Other') return lab(3, SRC.model, { basis: 'fallback rule', reason: 'CSV industry "Other" mixes tech and non-tech (Stripe and Reddit are "Other") — defaulted to other tech', confirm: true });
  return lab(4, SRC.model, { basis: 'fallback rule', reason: `CSV industry "${industry}" is not a tech category`, confirm: true });
}

function nextAction(scored, ev, live, persona) {
  const rec = scored.recommendation;
  const rule = ev.rule.value;
  if (rec === 'Apply') return { action: 'tailor', hours: '2 (research-and-apply)', text: 'Tailor and apply. First check E-Verify enrollment by hand (STEM OPT requirement — not in repo data).' };
  if (rec === 'Consider' && rule === 'sponsor-not-pm')
    return { action: 'network-first', hours: '3 (networking)', text: 'Network before applying: ask a PM at the company whether PM roles have been sponsored. The record shows H-1B sponsorship, but no product- or program-manager title.' };
  if (rec === 'Consider' && rule === 'adjacent-family')
    return { action: 'network-first', hours: '3 (networking)', text: `Network before applying: the record shows the other PM family sponsored (${ev.matched_pm_titles.value.map((t) => `"${t}"`).join(', ')}), not a "${ev.posting_family.value}" title. Ask whether this title is filed the same way.` };
  if (rule === 'no-h1b-record' && String(live).startsWith('active') && (scored.trace.votes.find((v) => v.factor === 'fit')?.value ?? 0) >= (persona.fallback_fit_floor ?? 1))
    return { action: 'non-h1b-fallback', hours: '2 (only after H-1B-tier roles)', text: `Second-tier list (persona preference: H-1B first). The scorer's verdict (${rec}) is unchanged; a human decides whether to spend time here.` };
  if (rec === 'Skip' && scored.reason.startsWith('gated: timeline'))
    return { action: 'skip-timeline', hours: '0', text: 'Timeline gate closed: the start date is further away than the remaining unemployment allowance. Revisit only if you are employed on STEM OPT by then.' };
  if (rec === 'Skip' && scored.reason.startsWith('gated: liveness') && rule === 'title-family-match')
    return { action: 'network-list', hours: '3 (networking)', text: 'No live posting, but a proven PM sponsor: add to the informational-interview list for the next opening.' };
  if (rec === 'Consider') return { action: 'human-review', hours: '—', text: 'Consider band: a human reads the trace and decides.' };
  return { action: 'skip', hours: '0', text: 'Skip. Time is better spent elsewhere.' };
}

export function run(opts) {
  const R = (p) => path.resolve(REPO, p);
  const asOfStr = opts.asOf || new Date().toISOString().slice(0, 10);
  const asOf = parseDate(asOfStr, '--as-of');
  const persona = JSON.parse(fs.readFileSync(opts.persona, 'utf8'));
  const shortlistRaw = JSON.parse(fs.readFileSync(opts.shortlist, 'utf8'));
  const roles = Array.isArray(shortlistRaw) ? shortlistRaw : shortlistRaw.roles;
  if (!Array.isArray(roles) || roles.length === 0) throw new InputError('shortlist has no roles');

  // Timeline gate, run-level part: refuse the whole run if OPT end is not in the future.
  const optEnd = parseDate(persona.opt_end_date, 'persona.opt_end_date');
  const cap = numOrNull(persona.unemployment_days_cap), used = numOrNull(persona.unemployment_days_used);
  if (cap == null || used == null || used < 0 || used > cap) throw new InputError('persona.unemployment_days_cap / _used missing or inconsistent');
  timelineFactor({ asOf, optEnd, lagDays: 0, unemploymentLeft: cap - used, employed: true }); // throws code 3 if past

  const csvPath = R(opts.csv || DEFAULTS.csv), blsPath = R(opts.bls || DEFAULTS.bls), formdDir = R(opts.formdDir || DEFAULTS.formdDir);
  const idx = loadSponsorIndex(csvPath);
  const formd = loadFormD(formdDir);
  const roleQuality = loadBls(blsPath, persona.candidate_socs || []);
  const okWages = roleQuality.filter((r) => r.status === 'ok').map((r) => r.median_wage);
  const tiersPath = opts.tiersPredicted || path.join(HERE, 'fixtures/employer_tiers.predicted.json');
  const predictedTiers = fs.existsSync(tiersPath) ? JSON.parse(fs.readFileSync(tiersPath, 'utf8')) : null;
  const livenessFiles = [].concat(opts.liveness || []);
  for (const f of livenessFiles) if (!fs.existsSync(f)) throw new InputError(`liveness file not found: ${f}`);
  const livenessText = livenessFiles.length ? livenessFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n') : null;
  const live = parseLiveness(livenessText);

  const evaluated = []; const scorerInput = [];
  for (const role of roles) {
    const holds = [];
    const missing = ['role_id', 'company', 'title', 'url'].filter((k) => !role[k]);
    const fit = numOrNull(role.fit);
    if (missing.length) holds.push({ reason: 'invalid-input', detail: `missing ${missing.join(', ')}` });
    if (fit == null || fit < 0 || fit > 1) holds.push({ reason: 'invalid-input', detail: 'fit must be a number in [0,1] (your-input)' });

    const ev = sponsorshipEvidence(role, persona, idx);
    if (ev.hold) holds.push({ reason: ev.hold, detail: ev.detail });

    const l = role.url ? live.get(role.url) : null;
    let liveness;
    if (!livenessText) { liveness = lab(null, SRC.record, { status: 'unchecked' }); holds.push({ reason: 'liveness-unchecked', detail: 'no liveness file supplied' }); }
    else if (!l) { liveness = lab(null, SRC.record, { status: 'unchecked' }); holds.push({ reason: 'liveness-unchecked', detail: 'URL not in liveness file — run npm run ats:liveness on it' }); }
    else if (l.status === 'uncertain') { liveness = lab(null, SRC.record, { status: 'uncertain', checker_reason: l.reason }); holds.push({ reason: 'liveness-uncertain', detail: `checker: ${l.reason || 'uncertain'} — a human opens the posting` }); }
    else liveness = lab(l.status === 'active' ? 1.0 : 0.0, SRC.record, { status: l.status, checker_reason: l.reason });

    // Liveness gate cleared by a NAMED human who opened the posting. Only for uncertain/unchecked —
    // a human note never reopens a posting the checker found expired.
    const h = role.liveness_human;
    const hi = holds.findIndex((x) => x.reason === 'liveness-uncertain' || x.reason === 'liveness-unchecked');
    if (h && hi >= 0) {
      if (!['active', 'expired'].includes(h.status) || !h.by || !h.date) holds.push({ reason: 'invalid-input', detail: 'liveness_human needs status (active|expired), by (a name) and date' });
      else {
        holds.splice(hi, 1);
        liveness = lab(h.status === 'active' ? 1.0 : 0.0, SRC.input, { status: `${h.status} (human-checked)`, checker_status: liveness.status, checked_by: h.by, checked_on: h.date, note: h.note || null });
      }
    }

    const lag = numOrNull(role.hiring_lag_days) ?? numOrNull(persona.default_hiring_lag_days);
    if (lag == null || lag < 0) holds.push({ reason: 'invalid-input', detail: 'no hiring_lag_days on role or persona.default_hiring_lag_days' });
    const tl = lag == null ? null : timelineFactor({ asOf, optEnd, lagDays: lag, unemploymentLeft: cap - used, employed: !!persona.currently_employed });
    const estStart = lag == null ? null : new Date(asOf.getTime() + lag * DAY);

    const fd = ev.hold ? [] : (formd.byNorm.get(normalizeName(ev.csv_row.company_name.value)) || []);
    const entry = {
      role_id: role.role_id, company: role.company, title: role.title, url: role.url,
      fit: lab(fit, SRC.input, { note: role.fit_note || null }),
      sponsorship: ev.hold ? null : ev,
      liveness,
      timeline: tl && lab(tl.factor, SRC.input, { derived_from: 'persona dates + hiring-lag assumption (your-input) via TIMELINE_STEPS', hiring_lag_days: lab(lag, SRC.input), days_to_opt_end: tl.days_to_opt_end, slack_days: tl.slack_days, reason: tl.reason }),
      h1b_registration_windows: estStart && lab(registrationWindows(estStart, optEnd), SRC.input, { note: 'count of March windows between estimated start and OPT end, from your-input dates; lottery odds are not in the repo' }),
      funding_form_d_sample: fd.length ? lab(fd, SRC.record) : lab(null, SRC.record, { status: 'not-in-sample', note: `Form D samples ship ${formd.shipped} of ${formd.total} filings; absence here says nothing about funding` }),
      employer_tier: employerTier(role.company, persona, predictedTiers, ev.hold ? null : ev.csv_row.industry.value),
      e_verify: lab(null, SRC.input, { status: 'not-checked', note: 'STEM OPT requires an E-Verify employer; no local data — human checks' }),
      holds,
    };
    evaluated.push(entry);
    if (holds.length === 0) {
      scorerInput.push({
        role_id: role.role_id, company: role.company, title: role.title,
        sponsorship: { p: ev.p.value, tier: ev.tier.value, source: SRC.record },
        fit: { p: fit, source: SRC.input },
        liveness: { factor: liveness.value, source: liveness.source },
        timeline: { factor: tl.factor, source: SRC.input },
      });
    }
  }

  fs.mkdirSync(opts.out, { recursive: true });
  const rolesPath = path.join(opts.out, 'roles.json');
  fs.writeFileSync(rolesPath, JSON.stringify(scorerInput, null, 2) + '\n');

  let scores = null; let scorerStdout = '';
  if (scorerInput.length) {
    const profilePath = path.join(opts.out, 'scorer-profile.json');
    fs.writeFileSync(profilePath, JSON.stringify({ authorization: persona.authorization }, null, 2) + '\n');
    const r = spawnSync(process.execPath, [R(opts.scorer || DEFAULTS.scorer), rolesPath, '--profile', profilePath, '--out-dir', opts.out], { cwd: REPO, encoding: 'utf8' });
    scorerStdout = (r.stdout || '') + (r.stderr || '');
    if (r.status !== 0) throw new InputError(`scorer exited ${r.status}: ${scorerStdout.trim()}`, 4);
    scores = JSON.parse(fs.readFileSync(path.join(opts.out, 'role-scores.json'), 'utf8'));
    if (scores.profile_needs_sponsorship !== true)
      throw new InputError(`scorer read the profile authorization ${JSON.stringify(persona.authorization)} as NOT needing sponsorship — sponsorship weight would be 0. Refusing to report. (The scorer's regex matches words like "authorized".)`, 4);
  }

  const byId = new Map((scores?.roles || []).map((s) => [s.role_id, s]));
  for (const e of evaluated) {
    const s = byId.get(e.role_id);
    if (!s) { e.decision = 'HOLD'; e.next_action = { action: 'resolve-hold', hours: '—', text: e.holds.map((h) => `${h.reason}: ${h.detail}`).join('; ') }; continue; }
    e.decision = s.recommendation; e.composite = s.composite; e.scorer_reason = s.reason; e.scorer_trace = s.trace;
    e.next_action = nextAction(s, e.sponsorship, e.liveness.status, persona);
  }

  const count = (d) => evaluated.filter((e) => e.decision === d).length;
  const log = {
    recipe: 'pm-sponsor-title-match', recipe_version: '0.1.1', prototype: path.relative(REPO, fileURLToPath(import.meta.url)),
    as_of: asOfStr, mode: opts.mode || 'custom', generated_at: new Date().toISOString(),
    inputs: {
      shortlist: path.relative(REPO, path.resolve(opts.shortlist)), persona: path.relative(REPO, path.resolve(opts.persona)),
      liveness: livenessFiles.map((f) => path.relative(REPO, path.resolve(f))),
      employer_tiers_predicted: predictedTiers ? path.relative(REPO, tiersPath) : null,
      csv: { path: path.relative(REPO, csvPath), sha256: sha256(csvPath), rows: idx.rows },
      bls: { path: path.relative(REPO, blsPath), sha256: sha256(blsPath) },
      form_d_samples: { dir: path.relative(REPO, formdDir), files: formd.files, companies_shipped: formd.shipped, companies_in_full_quarters: formd.total },
    },
    persona_inputs: {
      authorization: lab(persona.authorization, SRC.input), opt_end_date: lab(persona.opt_end_date, SRC.input),
      unemployment_days_used: lab(used, SRC.input), unemployment_days_cap: lab(cap, SRC.input),
      currently_employed: lab(!!persona.currently_employed, SRC.input), default_hiring_lag_days: lab(persona.default_hiring_lag_days, SRC.input),
      employer_tiers: lab(persona.employer_tiers || {}, SRC.input, { note: 'ordering only — not a scorer term; companies not listed get a model-judgment tier (predicted list, then fallback rule)' }),
      candidate_socs: lab(persona.candidate_socs || [], SRC.input, { note: 'which SOC an employer files a PM role under is not visible from the posting' }),
    },
    rules: { TIER_RULES, TIMELINE_STEPS, THIN_TITLE_EVIDENCE, classifier: 'classifyTitle v1' },
    role_quality_context: {
      vote_weight_in_scorer: 0, why: 'role-scorer.mjs sets role_quality 0.0 [VERIFY]; this recipe keeps it 0 because the PM SOC code is unknown at posting time',
      candidate_socs: roleQuality,
      median_wage_spread: okWages.length ? lab({ min: Math.min(...okWages), max: Math.max(...okWages) }, SRC.record) : null,
    },
    summary: { evaluated: evaluated.length, scored: scorerInput.length, apply: count('Apply'), consider: count('Consider'), skip: count('Skip'), hold: count('HOLD') },
    scorer: scores ? { command: `node ${DEFAULTS.scorer} ${path.relative(REPO, rolesPath)} --profile ${path.relative(REPO, path.join(opts.out, 'scorer-profile.json'))} --out-dir ${path.relative(REPO, opts.out)}`, stdout: scorerStdout.trim(), profile_needs_sponsorship: scores.profile_needs_sponsorship, outputs: ['role-scores.json', 'role-scores.md'] } : { skipped: 'no role cleared every hold' },
    roles: evaluated,
    stop_conditions_hit: evaluated.filter((e) => e.decision === 'HOLD').map((e) => ({ role_id: e.role_id, holds: e.holds })),
  };
  fs.writeFileSync(path.join(opts.out, 'pm-triage-log.json'), JSON.stringify(log, null, 2) + '\n');
  fs.writeFileSync(path.join(opts.out, 'pm-triage-report.md'), renderReport(log));
  return log;
}

const tierCell = (t) => (t == null || t.value == null ? '—' : `${t.value}${t.source === SRC.input ? '' : t.basis === 'fallback rule' ? ' (guess)' : ' (predicted)'}`);
const money = (n) => (n == null ? '—' : `$${Math.round(n).toLocaleString('en-US')}`);
const cell = (s) => String(s ?? '—').replace(/\|/g, '/').replace(/\n/g, ' ');

export function renderReport(log) {
  const s = log.summary; const o = [];
  const order = { Apply: 0, Consider: 1, HOLD: 2, Skip: 3 };
  const tierKey = (r) => r.employer_tier?.value ?? 99;
  const roles = [...log.roles].sort((a, b) => (order[a.decision] - order[b.decision]) || (tierKey(a) - tierKey(b)) || ((b.composite ?? -1) - (a.composite ?? -1)));
  const tiers = (t) => log.roles.filter((r) => r.sponsorship?.tier.value === t).length;
  o.push(`# PM sponsor title-match — triage report (${log.as_of})`, '');
  o.push('## Executive summary', '');
  o.push(`This report checks ${s.evaluated} product-manager job postings for one question most sponsor lists skip: has the company sponsored work visas *for product-manager titles*, or only for other jobs? It also checks whether each posting is still open and whether the hiring timeline fits the student's remaining work-authorization allowance, then says what to do next with each one.`, '');
  const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  o.push(`Read it before spending tailoring time: of ${s.evaluated} postings, **${n(s.apply, 'is', 'are')} worth applying to now, ${n(s.consider, 'needs', 'need')} a human look or a networking conversation first, ${n(s.skip, 'is a skip', 'are skips')}, and ${n(s.hold, 'is', 'are')} on hold** because something could not be verified (the company could not be matched to a record, or the posting's status was uncertain). Held postings were not scored. ${tiers('Proven')} postings are at companies whose sponsorship record shows a product-manager-family title; ${tiers('Possible')} are at companies that sponsor visas but show no such title in the record. Within each group, postings are ordered by the employer tier you set (your preference, not a record); the tier never changes a decision.`, '');
  o.push('Nothing here is a guarantee of sponsorship. The record shows past filings, not future intent. Every "apply" still needs a human to confirm the employer uses E-Verify (required for STEM OPT), which this tool cannot check.', '');
  o.push('## Decisions and next actions', '');
  o.push('| Decision | Employer tier (yours unless marked) | Company — role | Composite | Sponsorship evidence | Liveness | Next action (3-3-2 block) |', '|---|---|---|---|---|---|---|');
  for (const r of roles) {
    const sp = r.sponsorship;
    const spCell = !sp ? 'not matched'
      : sp.rule.value === 'no-h1b-record' ? `None (no H-1B record in this dataset — absence, not proof of non-sponsorship); matched ${sp.csv_row.company_name.value}`
      : `${sp.tier.value} (${sp.rule.value}); approvals ${sp.csv_row.total_approvals.value}; PM titles on record: ${sp.matched_pm_titles.value.length ? sp.matched_pm_titles.value.map((t) => `"${t}"`).join(', ') : 'none'}${sp.ambiguous_titles.value.length ? '; ambiguous, not counted: ' + sp.ambiguous_titles.value.map((t) => `"${t}"`).join(', ') : ''}${sp.thin_evidence ? ` · ⚠ thin: only ${sp.csv_row.titles_listed.value} title(s) stored` : ''}`;
    o.push(`| **${r.decision}** | ${tierCell(r.employer_tier)} | ${cell(r.company)} — ${cell(r.title)} | ${r.composite == null ? '—' : r.composite.toFixed(3)} | ${cell(spCell)} | ${cell(r.liveness.status)} | ${cell(r.next_action.action)} [${cell(r.next_action.hours)}]: ${cell(r.next_action.text)} |`);
  }
  o.push('');
  const held = roles.filter((r) => r.decision === 'HOLD'); // tier-1 holds first: resolve those before the rest
  if (held.length) {
    o.push('## Holds — a human must resolve these', '');
    for (const r of held) o.push(`- **${r.company} — ${r.title}** (tier ${tierCell(r.employer_tier)}): ${r.holds.map((h) => `\`${h.reason}\` ${h.detail}`).join('; ')}`);
    o.push('');
  }
  const matched = log.roles.filter((r) => r.sponsorship);
  if (matched.length) {
    o.push('## Funding context (record — not a vote in the scorer)', '');
    o.push('| Company (CSV row) | Latest funding date | Stage | Amount | In Form D samples? |', '|---|---|---|---|---|');
    const seen = new Set();
    for (const r of matched) {
      const c = r.sponsorship.csv_row; if (seen.has(c.company_name.value)) continue; seen.add(c.company_name.value);
      const fd = r.funding_form_d_sample;
      o.push(`| ${cell(c.company_name.value)} | ${cell(c.latest_funding_date.value)} | ${cell(c.latest_funding_stage.value)} | ${money(c.latest_funding_amount.value)} | ${fd.value ? fd.value.map((x) => `${x.quarter} filed ${x.date_filed}, sold ${money(x.total_amount_sold)} (acc. ${x.accession_number})`).join('; ') : fd.status} |`);
    }
    o.push('', `The Form D samples hold ${log.inputs.form_d_samples.companies_shipped} of ${log.inputs.form_d_samples.companies_in_full_quarters} filings, so "not-in-sample" says nothing about whether a company raised money.`, '');
  }
  const toConfirm = []; const seenCo = new Set();
  for (const r of roles) if (r.employer_tier?.confirm && !seenCo.has(r.company)) { seenCo.add(r.company); toConfirm.push(r); }
  if (toConfirm.length) {
    o.push('## Employer tiers to confirm (model judgment — not yours yet)', '');
    o.push('These tiers were predicted, not set by you. Move a company into your own tier list to confirm or change it. Tiers only order postings within a decision.', '');
    o.push('| Company | Predicted tier | Basis | Reason |', '|---|---|---|---|');
    for (const r of toConfirm) o.push(`| ${cell(r.company)} | ${r.employer_tier.value} | ${cell(r.employer_tier.basis)} | ${cell(r.employer_tier.reason)} |`);
    o.push('');
  }
  o.push('## Role quality (context only — carries no weight)', '');
  o.push('There is no O*NET occupation called "Product Manager". The SOC code a company files under is chosen at visa-filing time and is not on the posting, so the national median wage below is shown for each plausible code rather than picked for you.', '');
  o.push('| SOC (your-input candidate) | BLS title | National median (record) |', '|---|---|---|');
  for (const q of log.role_quality_context.candidate_socs) o.push(`| ${q.soc} | ${cell(q.title)} | ${q.status === 'ok' ? money(q.median_wage) : `missing: ${q.missing_reason}`} |`);
  const sp = log.role_quality_context.median_wage_spread?.value;
  if (sp) o.push('', `Spread across candidate codes: ${money(sp.min)} – ${money(sp.max)}. That spread is why this recipe keeps the scorer's role-quality weight at 0.`);
  o.push('', '## What was verified vs. what was assumed', '');
  o.push('- **Record** (read from a file in the repo): approvals, denials, sponsored-title strings, funding dates, BLS medians, the liveness checker\'s verdict, the title-family classification (a fixed rule applied to record strings).');
  o.push('- **Your input** (the person decided): fit ratings, OPT end date, unemployment days used, hiring-lag assumption, candidate SOC codes, any `csv_name` used to resolve a company match, the tier→number mapping and the timeline steps.');
  const mj = log.roles.filter((r) => r.employer_tier?.source === SRC.model).length;
  o.push(mj ? `- **Model judgment**: ${mj} employer tier(s) marked "(predicted)" or "(guess)", not yet confirmed by you. They only order rows. No language model was called during this run.`
            : '- **Model judgment**: none. Every employer tier here is your own, and no language model was called during this run.');
  o.push('- **Not checked at all**: E-Verify enrollment; whether a PM sponsorship exists beyond the top titles the CSV stores; what this employer pays; whether the posting will sponsor *this* hire.', '');
  o.push('## Run record', '');
  o.push(`- As-of: ${log.as_of} · mode: ${log.mode} · recipe v${log.recipe_version}`);
  o.push(`- 80 Days CSV: \`${log.inputs.csv.path}\` (${log.inputs.csv.rows} rows, sha256 ${log.inputs.csv.sha256.slice(0, 12)}…)`);
  o.push(`- Form D: ${log.inputs.form_d_samples.files.length} sample files, ${log.inputs.form_d_samples.companies_shipped} of ${log.inputs.form_d_samples.companies_in_full_quarters} companies shipped`);
  o.push(`- Scorer: ${log.scorer.command ? '`' + log.scorer.command + '`' : log.scorer.skipped} → ${log.scorer.stdout ? cell(log.scorer.stdout.split('\n')[0]) : ''}`);
  o.push(`- Full per-term trace: \`pm-triage-log.json\` (agent log) and \`role-scores.md\` (scorer's own audit).`);
  o.push('', '*Gate status: open. No human has cleared this run until a named person records it in the run log.*');
  return o.join('\n') + '\n';
}

function parseArgs(argv) {
  const o = {}; const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  if (argv.includes('--sample')) {
    Object.assign(o, {
      mode: 'sample', shortlist: path.join(HERE, 'fixtures/shortlist.sample.json'), persona: path.join(HERE, 'fixtures/persona.sample.json'),
      liveness: path.join(HERE, 'fixtures/liveness.sample.txt'), out: path.join(REPO, 'course/2026fa/submissions/aravindravi7/runs/sample'), asOf: '2026-10-03',
    });
  }
  const lv = argv.flatMap((a, i) => (a === '--liveness' ? [argv[i + 1]] : []));
  if (lv.length) o.liveness = lv;
  for (const [k, f] of [['shortlist', '--shortlist'], ['persona', '--persona'], ['out', '--out'], ['tiersPredicted', '--tiers-predicted'], ['asOf', '--as-of'], ['csv', '--csv'], ['bls', '--bls'], ['formdDir', '--formd-dir']]) {
    const v = flag(f); if (v !== undefined) o[k] = v;
  }
  if (!o.mode) o.mode = 'custom';
  return o;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.shortlist || !opts.persona || !opts.out) {
    console.error('Usage: pm-sponsor-triage.mjs --sample\n       pm-sponsor-triage.mjs --shortlist s.json --persona p.json --liveness l.txt --out dir [--as-of YYYY-MM-DD]');
    process.exit(2);
  }
  try {
    const log = run(opts);
    const s = log.summary;
    console.log(`✓ pm-sponsor-triage ${log.as_of}: ${s.evaluated} evaluated → Apply ${s.apply} · Consider ${s.consider} · Skip ${s.skip} · HOLD ${s.hold} (${s.scored} sent to scorer)`);
    if (log.scorer.stdout) console.log('  scorer: ' + log.scorer.stdout.split('\n')[0]);
    console.log(`  ${path.relative(process.cwd(), path.join(opts.out, 'pm-triage-log.json'))}  +  ${path.relative(process.cwd(), path.join(opts.out, 'pm-triage-report.md'))}`);
    for (const e of log.stop_conditions_hit) console.log(`  HOLD ${e.role_id}: ${e.holds.map((h) => h.reason).join(', ')}`);
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(e instanceof InputError ? e.code : 1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
