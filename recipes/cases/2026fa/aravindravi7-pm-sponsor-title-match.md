---
status: DRAFT
todos_open: 3
last_gate: null
attestation: null
recipe_version: 0.1.0
---

# pm-sponsor-title-match — has this company sponsored *product managers*?

## Executive summary

**What it does.** Before a student spends two hours tailoring an application for a product-manager job, this recipe checks one thing most sponsor lists skip: has this employer sponsored H-1B visas *for product-manager-type titles*, or only for engineers? It also checks whether the posting is still open, and whether the hiring timeline fits the student's remaining time on STEM OPT. Then it gives each posting a decision (Apply, Consider, Skip, or Hold) and a next action: tailor an application, network first, keep it as a non-sponsor fallback, or skip.

**Who it is for.** An international master's student (for example, MS in Information Systems) on F-1 OPT with a STEM extension who is targeting Product Manager, Technical Product Manager, or AI Product Manager roles. H-1B-sponsoring employers come first. Non-sponsors are a second tier, not an automatic skip.

**Why it matters.** "This company sponsors visas" and "this company sponsors product managers" are different facts. In the sponsorship dataset this recipe reads, 1,552 companies have H-1B approvals on record. Only 151 of them (under one in ten) show any product- or program-manager title among the titles they sponsored. More than half (862) have just one sponsored title stored at all, so for most companies the record is too thin to say either way. This recipe shows that difference instead of hiding it.

**What it decides and what it does not.** It decides what to look at next and why, with every number labeled as a record, the student's own input, or a model judgment (this version uses no model). It does not decide whether an employer will sponsor *this* hire, does not check E-Verify enrollment (required for STEM OPT), and puts any posting it cannot verify on hold for a person to resolve.

## Lifecycle claim (why DRAFT)

The sample path runs end to end. The prototype reads real repo data, runs the existing scorer, writes both outputs, passes 14 offline tests and conformance, and its run is logged in `logs/runs/2026fa-aravindravi7-1.md`. On run evidence alone, that would meet the SPECIFIED → RUNNABLE-SAMPLE run test. It is still **DRAFT**, because SNICKERDOODLE requires zero open typed TODOs before SPECIFIED, and this recipe carries three (§Proposed additions). All three sit outside the v0.1 run path. Nothing in the run depends on them, but they are open. `last_gate` stays null until a named human clears the sample-run gate in a run log, and `attestation` stays null (it is set only at VERIFIED).

## Required reads

1. `SNICKERDOODLE.md` — gates, provenance, TODO closure.
2. `DOMAIN.md` — layout; known gaps 3 and 9 (role-quality weight 0; local wage feeds nothing).
3. `scripts/score/role-scorer.mjs` — the composite this recipe feeds, unchanged.
4. This recipe and `recipes/cases/2026fa/aravindravi7-pm-sponsor-title-match.card.md`.

## Source inventory

| Source | Exact path / command | Used for | Label |
|---|---|---|---|
| 80 Days CSV | `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv` (30,369 rows) | `Total Approvals`, `Total Denials`, `Approval_Rate`, `top_job_titles_sponsored`, `latest_funding_*`, `median_salary_offered` | record |
| Form D samples | `data/sec/form-d/processed/sample/companies-sec-{2025q2,2025q3,2025q4,2026q1}-d.sample.json` | funding-recency context only (200 of 58,329 filings ship) | record |
| BLS compact | `data/bls/compact/soc_occupation_compact.csv` | national median wage per candidate SOC — context, not a vote | record |
| ATS scan | `REALLOCATION_ENGINE_PORTALS=scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/fixtures/portals.pm-sponsors.yml npm run ats:scan` | find PM postings at named Greenhouse/Ashby boards (writes only to gitignored `data/ats/`) | record |
| Liveness | `npm run ats:liveness -- --file <urls.txt> > <liveness.txt>` | liveness gate input (the saved stdout is parsed) | record |
| Scorer | `scripts/score/role-scorer.mjs` (`npm run score`) | composite + per-term audit. Run as a CLI: the file has no exports and runs `main()` on import, so CONTRIBUTING's "import its exports" does not work today | — |
| Prototype | `node scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/pm-sponsor-triage.mjs --sample` | builds `roles.json`, runs the scorer, writes log + report | — |
| Tests | `node --test scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/test/` | 14 offline tests on trimmed fixtures | — |
| Persona | `scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/fixtures/persona.sample.json` | **fictional** profile: OPT end date, unemployment days, hiring lag, candidate SOCs | your-input |

Network hosts touched: only those `ats:scan` / `ats:liveness` already use (the Greenhouse and Ashby job-board APIs, plus the posting pages themselves). The prototype makes no network calls.

## Facts that bite — how this recipe handles each

| Fact | Handling |
|---|---|
| Role quality carries weight 0 in the scorer | **Kept at 0, on purpose.** There is no O*NET occupation "Product Manager". The SOC an employer files under is chosen at LCA time and is not on the posting. Across the candidate SOCs (11-3021, 11-2021, 15-1299, 13-1111, 13-1082) the national median runs **$100,750 – $171,200**. Any role-quality vote would rest on a guessed SOC. The report shows all of them as labeled context. Revisit once the LCA data source below exists. |
| `bls:local-wage` feeds nothing / fails on a fresh clone | Not used. |
| Only Form D samples ship | Joined, and reported as `not-in-sample` with the 200-of-58,329 denominator. Absence is never read as "no funding". Funding is context, not a scorer term (the scorer has none). |
| Planned dirs (`data/raw/`, `data/verified/`, `logs/gate-decisions/`) don't exist | Not referenced. Outputs go to `course/2026fa/submissions/aravindravi7/runs/<run>/`. Gate decisions go in `logs/runs/2026fa-aravindravi7-<n>.md`. |
| `snickerdoodle` CLI is roadmap | Not used. Every command here runs today. |
| `validate-h1b-join-sample.py` needs full data | Not used. The shipped CSV is the sponsorship source. |
| **New:** the scorer reads a missing liveness factor as 1 (open gate) | Found while building (`fixtures/BROKEN-no-liveness-roles.json` → Apply). The prototype never sends a role without a checked liveness value: it HOLDs it. |
| **New:** the scorer's profile regex treats any authorization containing "authorized" as not needing sponsorship (weight → 0) | "F-1 OPT, authorized to work" would silently zero sponsorship. The prototype reads `profile_needs_sponsorship` back from `role-scores.json` and exits 4 if it is not `true`. |

## Phase gates

Hard stops. Each one names its testable condition and who clears it.

| Gate | Kind | Testable condition | On fail | Cleared by |
|---|---|---|---|---|
| G0 input / OPT window | machine, run-level | persona `opt_end_date` parses as a real date and is after `--as-of`; `unemployment_days_used` ≤ `_cap` | whole run refused, exit 3 (or 2), **no scores written** | human fixes inputs |
| G1 entity match | machine + human | exactly one CSV row whose normalized name (uppercase, punctuation dropped, trailing INC/LLC/CORP/… stripped) equals the company, or a human-supplied `csv_name` that exists verbatim | HOLD `company-not-in-csv` / `ambiguous-company-match` / `csv-name-not-found`. No fuzzy match, ever. | named human adds `csv_name` + `_resolution` note to the shortlist |
| G2 liveness | machine + human | the posting URL appears in a liveness file as `active` or `expired` | `uncertain` or absent → HOLD `liveness-uncertain` / `liveness-unchecked`; `expired` → factor 0 → scorer Skip | named human opens the page and adds `liveness_human: {status, by, date, note}` (labeled your-input; never reopens `expired`) |
| G3 timeline | machine, per role | if not employed: hiring lag ≤ remaining unemployment days (150-day STEM OPT cap − used); then slack = days to OPT end − lag mapped by `TIMELINE_STEPS` | factor 0 → scorer Skip (`skip-timeline`) | — (inputs are your-input) |
| G4 decision | human | before any tailoring: the person reads the matched sponsored-title strings in the report, and checks E-Verify enrollment by hand | not tailored | named human, logged in the run log |

Gates are multipliers in the scorer (liveness × timeline), so a closed gate zeroes the composite whatever the votes say.

## Sponsorship rules (declared, your-input)

Title classifier v1 (`classifyTitle`). Excluded phrases are blanked first: `product marketing|design|designer|specialist|support|engineer|analyst|counsel|operations|strategy`. Then:
- `product`: `product manager|owner|management|lead`, `APM`
- `program`: `(technical) program manager`
- `ambiguous-pm`: a bare `PM` or `TPM` (product *or* program). Counted as **neither** family and listed in the report for a human.

Tier rule, in decision order (`TIER_RULES`):

| Rule | Condition (all on record strings) | Tier | p | Why this p |
|---|---|---|---|---|
| `no-h1b-record` | `Total Approvals` empty or 0 | None | 0.0 | no record in *this dataset*. Absence, not proof. |
| `title-family-match` | a sponsored title in the posting's family | Proven | 0.9 | mirrors Ch.11's Proven example |
| `adjacent-family` | PM-family title sponsored, but the other family (product vs program) | Likely | 0.6 | mirrors Ch.11's Likely example; TPM ambiguity |
| `sponsor-not-pm` | approvals > 0, no PM-family title stored | Possible | 0.5 | below Likely: the record says nothing about PMs |

The tier is derived from records. The **p numbers are a mapping I chose**, and the log labels them `your-input`. Likely and Possible are in the scorer's soft-tier list, so neither can reach Apply. Fit is the person's own 0–1 rating (your-input). No model is called.

## Workflow (verbatim)

1. Find postings (writes to gitignored `data/ats/pipeline.md`):

```bash
REALLOCATION_ENGINE_PORTALS=scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/fixtures/portals.pm-sponsors.yml npm run ats:scan
```

2. A human picks the shortlist (`role_id, company, title, url, fit`, optional `hiring_lag_days`, `csv_name`) and saves the URLs to `urls.txt`.
3. Liveness (exits 1 if any URL is not active; the saved file is still the input):

```bash
npm run ats:liveness -- --file <run>/urls.txt > <run>/liveness.txt
```

4. Triage + score:

```bash
node scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/pm-sponsor-triage.mjs --shortlist <run>/shortlist.json --persona scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/fixtures/persona.sample.json --liveness <run>/liveness.txt --out <run>/pass1 --as-of YYYY-MM-DD
```

5. **Stop.** A human reads `pm-triage-report.md` and resolves the holds (G1 `csv_name`, G2 `liveness_human`) in a copy of the shortlist.
6. Re-run into `<run>/pass2` (repeat `--liveness` for extra liveness files).
7. G4 for each Apply/Consider. Log the run and the gate decisions in `logs/runs/2026fa-aravindravi7-<n>.md`.

Sample mode (fixtures, real repo data, no network): `node scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/pm-sponsor-triage.mjs --sample`.

## What it can and cannot verify

**Can verify (record):**
- The CSV row matched, exactly, and how: by the normalized name, or by a human-supplied `csv_name`.
- That company's approvals, denials, approval rate, and the *stored* sponsored-title strings, plus which of them the classifier read as product, program, or ambiguous.
- How many titles were stored (≤ 2 is flagged as thin evidence).
- The liveness checker's verdict for that exact URL.
- The Form D sample filings for the company, with accession numbers, or that it is not in the 200-filing sample.
- The BLS national median for each candidate SOC, or `missing: no-occupation-row`.

**Computed from the person's inputs (your-input):** the timeline factor, days to OPT end, unemployment slack, H-1B registration windows remaining, fit, the tier→p mapping.

**Cannot verify:**
- Whether a PM was sponsored if that title is not among the company's *top* stored titles. This is the biggest blind spot: 862 of 1,552 sponsors list only one title.
- Whether a company with no record really doesn't sponsor. The dataset covers companies matched to Form D filings, and absence is not refusal.
- Which SOC code (and therefore which wage level) an employer would file a PM role under.
- E-Verify enrollment (required for STEM OPT).
- What this employer pays, or whether it will sponsor *this* hire now.
- Whether an INC/LLC pair sharing identical approval counts (e.g. Peloton Interactive INC and LLC, 310 each) reflects one DOL record joined twice upstream.
- Lottery odds.

## Output contract

Two files per run, two readers (P5). Both go into the `--out` directory, never over a tracked repo file.

**Agent log — `pm-triage-log.json`:**
`recipe, recipe_version, prototype, as_of, mode, generated_at, inputs{shortlist, persona, liveness[], csv{path,sha256,rows}, bls{path,sha256}, form_d_samples{dir,files,companies_shipped,companies_in_full_quarters}}, persona_inputs{…each {value,source}}, rules{TIER_RULES,TIMELINE_STEPS,THIN_TITLE_EVIDENCE,classifier}, role_quality_context{vote_weight_in_scorer,why,candidate_socs[],median_wage_spread}, summary{evaluated,scored,apply,consider,skip,hold}, scorer{command,stdout,profile_needs_sponsorship,outputs}, roles[]{role_id,company,title,url,fit,sponsorship{csv_row{…},posting_family,title_families,matched_pm_titles,ambiguous_titles,thin_evidence,rule,tier,p},liveness,timeline,h1b_registration_windows,funding_form_d_sample,e_verify,holds[],decision,composite,scorer_reason,scorer_trace,next_action{action,hours,text}}, stop_conditions_hit[]`. Every labeled value is an object `{value, source, …}` with `source ∈ {record, model-judgment, your-input}`. A test walks the whole log and fails on any other label. (It checks the labels that exist; it does not prove that every number has one. That is a code-review check.)

**Human report — `pm-triage-report.md`:**
- Executive summary (counts in plain words, no paths).
- Decisions and next actions table (decision, role, composite, sponsorship evidence with the actual title strings, liveness, next action + 3-3-2 block).
- Holds, with the reason and what a human must do.
- Funding context.
- Role quality (context only).
- What was verified vs. assumed.
- Run record.

**Reader:** the student. **Decision enabled:** which postings get tailoring time today, which companies get a networking message, and what to resolve first.

**Also written:** `roles.json` (scorer input, shaped like `data/examples/ch11-roles.json`), `scorer-profile.json`, and the scorer's own `role-scores.json` + `role-scores.md`.

## Stop conditions

Refuse and invent nothing when:
- G0 fails: the OPT end date is not in the future, or a date is malformed. Exit 3 or 2; nothing is scored.
- The 80 Days CSV header is missing any column the recipe reads (schema drift). Exit 2.
- The scorer exits nonzero, or reports `profile_needs_sponsorship != true`. Exit 4.
- Asked to fuzzy-match a company name. Refuse. A substring match would join "Anthropic" to an investment-fund series.
- Asked to give role quality a weight without the LCA SOC data. Refuse in this version (§Facts that bite).
- Asked to treat an `uncertain` posting as live without a named human. Refuse.

## Next action per result (where it meets the 3-3-2 day)

| Result | Next action | 3-3-2 block |
|---|---|---|
| Apply (Proven, gates open) | `tailor` — tailor and apply, after checking E-Verify by hand | 2 h research-and-apply |
| Consider + `sponsor-not-pm` | `network-first` — ask a PM there whether PM roles have been sponsored | 3 h networking |
| Consider + `adjacent-family` | `network-first` — ask whether this title (product vs program) is filed like the sponsored one | 3 h networking |
| `no-h1b-record`, live, fit ≥ `fallback_fit_floor` | `non-h1b-fallback` — second-tier list. The scorer's verdict is unchanged; a human decides. | 2 h, only after H-1B-tier roles |
| Skip, liveness-gated, Proven sponsor | `network-list` — informational interview before the next opening | 3 h networking |
| Skip, timeline-gated | `skip-timeline` — revisit only if employed on STEM OPT by the start date | 0 |
| Skip otherwise | `skip` | 0 |
| HOLD | `resolve-hold` — the stated reason says exactly what a human must check | — |

## Proposed additions

1. **DOL LCA disclosure data** (`JOB_TITLE`, `SOC_CODE`, `EMPLOYER_NAME`, `CASE_STATUS` per filing), compacted into `data/dol/lca/` with a provenance note. **[TODO: DATA SOURCE]** *Why:* the CSV stores only a company's top sponsored titles, so "no PM title" mostly means "not in the top list". Per-filing data would turn the Possible tier into a count of PM filings. It would also give the SOC actually used for PM titles at that employer, which is what role quality needs before it can carry weight.
2. **E-Verify employer enrollment list**, stored under `data/` with origin and date. **[TODO: DATA SOURCE]** *Why:* STEM OPT employment requires an E-Verify employer. Today G4 asks a human to check this by hand for every Apply.
3. **JSON output mode for `scripts/ats/check-liveness.mjs`** (`--json`: `{url, result, reason}` per line). **[TODO: DEV]** *Why:* this recipe parses emoji-prefixed text. A format change in the checker would silently turn every role into `liveness-unchecked` (safe, but useless). The handoff condition is that the parser reads `--json` output and the offline liveness-parser test passes on a JSON fixture.

## Run-log template (`logs/runs/2026fa-<handle>-<n>.md`)

```markdown
## YYYY-MM-DD — pm-sponsor-title-match v0.1.0 — <sample | worked run>

### Executive summary
<two or three plain sentences: what was run, what it found, what a human still has to do>

- **Recipe:** recipes/cases/2026fa/aravindravi7-pm-sponsor-title-match.md v0.1.0
- **Mode:** sample | live-postings (liveness live, data samples)
- **Inputs:** shortlist <path>, persona <path> (fictional), liveness <path(s)>, CSV sha256 <first 12>
- **Commands:** <verbatim>
- **Outputs:** <run dir>/pm-triage-log.json, pm-triage-report.md, roles.json, role-scores.{json,md}
- **Result:** evaluated N → Apply a · Consider c · Skip s · HOLD h (scored k; scorer skip rate x%)
- **Holds:** <role_id: reason> …
- **Gate decisions:** G1 <who, date, csv_name decisions> · G2 <who, date, liveness_human> · G4 <who, date, E-Verify checked?>
- **Open issues:** <what did not work or is still missing>
```
