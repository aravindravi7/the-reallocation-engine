# Worked run — PM sponsor title-match on 14 real postings (2026-10-03)

## Executive summary

This is a record of running the recipe once, end to end, on real product-manager job postings found on 3 October 2026, for a fictional student whose situation mirrors mine. It shows the exact commands, the real output, which numbers came from records and which from my own inputs, and how I checked the output against the source files.

What happened: 14 live postings at 13 companies went in. The first pass held 7 of them because a company name couldn't be matched exactly or a posting's status was uncertain. I resolved 3 name matches by hand. The second pass ended with **2 Apply (both Stripe), 7 Consider (each with a networking next step), 1 Skip, and 4 still on hold**: three postings whose apply button the checker couldn't see, and one company with no usable record. The main thing I learned is that for most big sponsors the data can't say whether they sponsor product managers, so the recipe's most common answer is "network first", not "apply".

## Inputs

- **Persona:** `scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/fixtures/persona.sample.json`. **Fictional** ("Kavya Rao", example.com address). It is shaped on my situation (MS Information Systems, PM/TPM/AI PM, STEM OPT into 2029) with invented specifics: OPT end 2029-05-31, 40 of 150 unemployment days used, not currently employed, 75-day default hiring lag. All are your-input.
- **Postings:** found by `npm run ats:scan` with `fixtures/portals.pm-sponsors.yml` (13 Greenhouse/Ashby boards, PM title filter). I picked 14 to cover every path. Shortlists: `runs/worked-2026-10-03/shortlist.pass1.json`, `shortlist.pass2.json`.
- **Fit:** a 0–1 rating per posting for the fictional persona (your-input, in the shortlist with notes). No model rated anything.
- **Data:** the full 80 Days CSV (30,369 rows; sha256 `eccdee2addf472b1…`), the 4 Form D sample files, and the BLS compact CSV.

## Commands and real output

### 0. Engine baseline (the assignment's "run it once")

```text
$ npm run score -- data/examples/ch11-roles.json --out-dir course/2026fa/submissions/aravindravi7/runs/ch11-example

> the-reallocation-engine@1.0.0 score
> node scripts/score/role-scorer.mjs data/examples/ch11-roles.json --out-dir course/2026fa/submissions/aravindravi7/runs/ch11-example

✓ scored 5 roles → Apply 2 · Consider 1 · Skip 2 (skip 40%)
  course/2026fa/submissions/aravindravi7/runs/ch11-example/role-scores.json  +  course/2026fa/submissions/aravindravi7/runs/ch11-example/role-scores.md
```

### 1. Find postings

```text
$ REALLOCATION_ENGINE_PORTALS=scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/fixtures/portals.pm-sponsors.yml npm run ats:scan -- --dry-run
> the-reallocation-engine@1.0.0 ats:scan
> node scripts/ats/scan.mjs --dry-run
Scanning 10 companies via providers (0 local parser; 0 skipped — no provider matched)
(dry run — no files will be written)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Portal Scan — 2026-10-03
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Companies scanned:     10
Total jobs found:      3155
Filtered by title:     3058 removed
Filtered by location:  25 removed
Duplicates:            5 skipped
New offers added:      67
New offers:
(dry run — run without --dry-run to save results)
Review new offers in data/ats/pipeline.md.
```

(Per-posting lines omitted here. The non-dry run that produced URLs wrote to gitignored `data/ats/pipeline.md`. On a second pass I added Anthropic, Ramp, and Notion to exercise the failure paths.)

### 2. Liveness (real Playwright check)

```text
$ npm run ats:liveness -- --file course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/urls.txt > course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/liveness.txt

> the-reallocation-engine@1.0.0 ats:liveness
> node scripts/ats/check-liveness.mjs --file course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/urls.txt

Checking 14 URL(s)...

✅ active     https://stripe.com/jobs/search?gh_jid=7737124
✅ active     https://stripe.com/jobs/search?gh_jid=7176530
⚠️ uncertain  https://careers.datadoghq.com/detail/7982288/?gh_jid=7982288
           content present but no visible apply control found
⚠️ uncertain  https://careers.datadoghq.com/detail/8144018/?gh_jid=8144018
           content present but no visible apply control found
⚠️ uncertain  https://www.mongodb.com/careers/job/?gh_jid=8143805
           content present but no visible apply control found
✅ active     https://databricks.com/company/careers/open-positions/job?gh_jid=7586263002
✅ active     https://databricks.com/company/careers/open-positions/job?gh_jid=8136071002
✅ active     https://boards.greenhouse.io/robinhood/jobs/8199973?t=gh_src=&gh_jid=8199973
✅ active     https://boards.greenhouse.io/figma/jobs/6020719004?gh_jid=6020719004
✅ active     https://job-boards.greenhouse.io/reddit/jobs/8237639
✅ active     https://www.asana.com/jobs/apply/8180874?gh_jid=8180874
✅ active     https://job-boards.greenhouse.io/anthropic/jobs/5394887008
✅ active     https://jobs.ashbyhq.com/ramp/cf3516f6-4d6b-4872-831f-c8ef4a3078ee
✅ active     https://jobs.ashbyhq.com/notion/7ec83090-7c5b-4691-bf20-e11e892cede1

Results: 11 active  0 expired  3 uncertain
```

### 3. Pass 1 — brand names as typed

```text
$ node scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/pm-sponsor-triage.mjs --shortlist course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/shortlist.pass1.json --persona scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/fixtures/persona.sample.json --liveness course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/liveness.txt --out course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/pass1 --as-of 2026-10-03
✓ pm-sponsor-triage 2026-10-03: 14 evaluated → Apply 2 · Consider 4 · Skip 1 · HOLD 7 (7 sent to scorer)
  scorer: ✓ scored 7 roles → Apply 2 · Consider 4 · Skip 1 (skip 14%)
  course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/pass1/pm-triage-log.json  +  course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/pass1/pm-triage-report.md
  HOLD w03-datadog-pm2-ai-security: liveness-uncertain
  HOLD w04-datadog-tpm2: liveness-uncertain
  HOLD w05-mongodb-spm-client-libs: liveness-uncertain
  HOLD w08-robinhood-apm-newgrad: company-not-in-csv
  HOLD w12-anthropic-pm-science: company-not-in-csv
  HOLD w13-ramp-pm-vendor: company-not-in-csv
  HOLD w14-notion-tpm-finsys: company-not-in-csv
```

### 4. Resolving holds (human gate G1 and an attempt at G2)

- **Robinhood → `ROBINHOOD MARKETS INC`**, **Notion → `NOTION LABS INC`**, **Ramp → `RAMP BUSINESS CORP`**. Each was the only plausible row. I rejected `RAMP HOLDINGS INC`, `RAMP SERVICES INVESTORS LLC` and `NOTIONAL FINANCE INC`. Recorded as `csv_name` + `_resolution` in `shortlist.pass2.json`.
- **Anthropic: not mapped.** The only row containing the name is `ANTHROPIC - A SERIES OF AURUM VP FUND LLC`, an investment-fund series. Mapping it would attach a fund's empty record to the employer. It stays held.
- **Datadog ×2, MongoDB: re-checked on the Greenhouse-hosted URLs (same job IDs). This did not resolve them:**

```text
$ npm run ats:liveness -- --file course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/urls-recheck.txt > course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/liveness-recheck.txt

> the-reallocation-engine@1.0.0 ats:liveness
> node scripts/ats/check-liveness.mjs --file course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/urls-recheck.txt

Checking 3 URL(s)...

⚠️ uncertain  https://job-boards.greenhouse.io/datadog/jobs/7982288
           content present but no visible apply control found
⚠️ uncertain  https://job-boards.greenhouse.io/datadog/jobs/8144018
           content present but no visible apply control found
⚠️ uncertain  https://job-boards.greenhouse.io/mongodb/jobs/8143805
           content present but no visible apply control found

Results: 0 active  0 expired  3 uncertain
```

### 5. Pass 2

```text
$ node scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/pm-sponsor-triage.mjs --shortlist course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/shortlist.pass2.json --persona scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/fixtures/persona.sample.json --liveness course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/liveness.txt --liveness course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/liveness-recheck.txt --out course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/pass2 --as-of 2026-10-03
✓ pm-sponsor-triage 2026-10-03: 14 evaluated → Apply 2 · Consider 7 · Skip 1 · HOLD 4 (10 sent to scorer)
  scorer: ✓ scored 10 roles → Apply 2 · Consider 7 · Skip 1 (skip 10%)
  course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/pass2/pm-triage-log.json  +  course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/pass2/pm-triage-report.md
  HOLD w03-datadog-pm2-ai-security: liveness-uncertain
  HOLD w04-datadog-tpm2: liveness-uncertain
  HOLD w05-mongodb-spm-client-libs: liveness-uncertain
  HOLD w12-anthropic-pm-science: company-not-in-csv
```

#### Pass 2 decisions (pasted from `pass2/pm-triage-report.md`)

| Decision | Company — role | Composite | Sponsorship evidence | Liveness | Next action (3-3-2 block) |
|---|---|---|---|---|---|
| **Apply** | Stripe — Product Manager: New Grad Accelerator | 0.570 | Proven (title-family-match); approvals 1250; PM titles on record: "Product Manager" | active | tailor [2 (research-and-apply)]: Tailor and apply. First check E-Verify enrollment by hand (STEM OPT requirement — not in repo data). |
| **Apply** | Stripe — Product Manager, Payments | 0.495 | Proven (title-family-match); approvals 1250; PM titles on record: "Product Manager" | active | tailor [2 (research-and-apply)]: Tailor and apply. First check E-Verify enrollment by hand (STEM OPT requirement — not in repo data). |
| **Consider** | Robinhood — Associate Product Manager (New Grad) | 0.415 | Possible (sponsor-not-pm); approvals 824; PM titles on record: none | active | network-first [3 (networking)]: Network before applying: ask a PM at the company whether PM roles have been sponsored. The record shows H-1B sponsorship, but no product- or program-manager title. |
| **Consider** | Figma — Technical Program Manager - Infrastructure | 0.340 | Possible (sponsor-not-pm); approvals 188; PM titles on record: none | active | network-first [3 (networking)]: Network before applying: ask a PM at the company whether PM roles have been sponsored. The record shows H-1B sponsorship, but no product- or program-manager title. |
| **Consider** | Asana — Senior Product Manager, AI Studio | 0.340 | Possible (sponsor-not-pm); approvals 352; PM titles on record: none | active | network-first [3 (networking)]: Network before applying: ask a PM at the company whether PM roles have been sponsored. The record shows H-1B sponsorship, but no product- or program-manager title. |
| **Consider** | Databricks — Sr. Product Manager, Databricks AI | 0.325 | Possible (sponsor-not-pm); approvals 1640; PM titles on record: none | active | network-first [3 (networking)]: Network before applying: ask a PM at the company whether PM roles have been sponsored. The record shows H-1B sponsorship, but no product- or program-manager title. |
| **Consider** | Reddit — Senior Product Manager, Notifications | 0.325 | Possible (sponsor-not-pm); approvals 408; PM titles on record: none; ambiguous, not counted: "Advertiser Optimization PM" | active | network-first [3 (networking)]: Network before applying: ask a PM at the company whether PM roles have been sponsored. The record shows H-1B sponsorship, but no product- or program-manager title. |
| **Consider** | Notion — Technical Program Manager, Finance Systems & Compliance | 0.325 | Possible (sponsor-not-pm); approvals 98; PM titles on record: none · ⚠ thin: only 1 title(s) stored | active | network-first [3 (networking)]: Network before applying: ask a PM at the company whether PM roles have been sponsored. The record shows H-1B sponsorship, but no product- or program-manager title. |
| **Consider** | Ramp — Product Manager / Vendor Intelligence & Marketplace | 0.225 | None (no H-1B record in this dataset — absence, not proof of non-sponsorship); matched RAMP BUSINESS CORP | active | non-h1b-fallback [2 (only after H-1B-tier roles)]: Second-tier list (persona preference: H-1B first). The scorer's verdict (Consider) is unchanged; a human decides whether to spend time here. |
| **HOLD** | Datadog — Product Manager II, AI & Data Security | — | Proven (title-family-match); approvals 340; PM titles on record: "PRODUCT MANAGER" | uncertain | resolve-hold [—]: liveness-uncertain: checker: content present but no visible apply control found — a human opens the posting |
| **HOLD** | Datadog — Technical Program Manager II | — | Likely (adjacent-family); approvals 340; PM titles on record: "PRODUCT MANAGER" | uncertain | resolve-hold [—]: liveness-uncertain: checker: content present but no visible apply control found — a human opens the posting |
| **HOLD** | MongoDB — Senior Product Manager, Client Libraries | — | Proven (title-family-match); approvals 462; PM titles on record: "Senior Product Manager" | uncertain | resolve-hold [—]: liveness-uncertain: checker: content present but no visible apply control found — a human opens the posting |
| **HOLD** | Anthropic — Product Manager, Claude Science | — | not matched | active | resolve-hold [—]: company-not-in-csv: no CSV row whose normalized name equals "ANTHROPIC"; supply csv_name after checking by hand |
| **Skip** | Databricks — Associate Product Manager, New Grad (2027 Start) | 0.000 | Possible (sponsor-not-pm); approvals 1640; PM titles on record: none | active | skip-timeline [0]: Timeline gate closed: the start date is further away than the remaining unemployment allowance. Revisit only if you are employed on STEM OPT by then. |

Full outputs: `course/2026fa/submissions/aravindravi7/runs/worked-2026-10-03/pass2/` (`pm-triage-log.json`, `pm-triage-report.md`, `roles.json`, `role-scores.json`, `role-scores.md`).

## Verified vs. inferred, line by line

| Role | Value | Label | Where it came from |
|---|---|---|---|
| Stripe — PM New Grad (Apply) | approvals 1250, denials 22 | record | CSV row `STRIPE INC` |
| | sponsored titles incl. "Product Manager" → Proven | record (rule applied to record) | `top_job_titles_sponsored`, classifier v1 |
| | p = 0.9 | your-input | TIER_RULES mapping I chose (mirrors Ch.11) |
| | fit 0.85 | your-input | my rating for the persona |
| | liveness 1.0 | record | checker: `active` |
| | timeline 1.0 | your-input | 971 days to OPT end − 75 lag = 896 slack ≥ 365 (from the log) |
| | composite | scorer output | `(0.9·0.35 + 0.85·0.3) × 1 × 1 = 0.570` |
| Notion — TPM (Consider) | approvals 98; only "Software Engineer" stored | record | CSV `NOTION LABS INC` |
| | the match itself | your-input | I supplied `csv_name` |
| | ⚠ thin (1 title) | record | title count |
| | composite | scorer output | `(0.5·0.35 + 0.5·0.3) × 1 × 1 = 0.325` |
| Ramp — PM (Consider → non-H1B fallback) | approvals empty | record | CSV `RAMP BUSINESS CORP` |
| | "None" tier means "no record here", not "doesn't sponsor" | — | dataset coverage; **not verified either way** |
| | next action non-h1b-fallback | rule on record + your-input | fit 0.75 ≥ persona floor 0.7 |
| Databricks — APM 2027 start (Skip) | approvals 1640; no PM title stored | record | CSV |
| | hiring lag 270 days | your-input | my estimate from "2027 Start" in the title |
| | timeline factor 0 | your-input | 270 > 110 remaining unemployment days |
| Datadog — PM II (HOLD) | Proven (approvals 340; "PRODUCT MANAGER" stored) | record | CSV |
| | liveness | record = `uncertain` | checker, twice; **no score produced** |
| All | E-Verify | **not checked** | no data in repo |
| All | role quality ($100,750–$171,200 across candidate SOCs) | record per SOC; SOC choice your-input | BLS compact; weight 0 |
| All | model judgment | none | no model was called |

## Verification

**1. Hand cross-check against the source files** (real output):

```text
$ grep -E "^(STRIPE INC|NOTION LABS INC|RAMP BUSINESS CORP)," data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv | cut -d, -f1,16,17
NOTION LABS INC | Total Approvals: 98.0 | Total Denials: 2.0 | ['Software Engineer']
RAMP BUSINESS CORP | Total Approvals: (empty) | Total Denials: (empty) | (no titles)
STRIPE INC | Total Approvals: 1250.0 | Total Denials: 22.0 | ['Software Engineer', 'Backend Engineer', 'Risk Strategist', 'Product Manager', 'Engineering Manager']

$ node -e (pass2 log: stripe/notion/ramp values)
w01-stripe-pm-newgrad | STRIPE INC | approvals 1250 | denials 22 | ["Software Engineer","Backend Engineer","Risk Strategist","Product Manager","Engineering Manager"] | tier Proven
w13-ramp-pm-vendor | RAMP BUSINESS CORP | approvals null | denials null | [] | tier None
w14-notion-tpm-finsys | NOTION LABS INC | approvals 98 | denials 2 | ["Software Engineer"] | tier Possible

$ grep -E "^1[13]-(3021|2021|1111|1082)" BLS + 15-1299.00 + 15-1199
11-2021.00 Marketing Managers median 161030.0
11-3021.00 Computer and Information Systems Managers median 171200.0
13-1082.00 Project Management Specialists median 100750.0
13-1111.00 Management Analysts median 101190.0
15-1299.00 Computer Occupations, All Other median 108970.0
0

$ grep -c accession / Databricks in Form D 2025q4 sample
"accession_number": "0001587468-25-000010"

$ arithmetic: Stripe PM new grad composite
(0.9*0.35 + 0.85*0.30) * 1 * 1 = 0.570
"accession_number": "0001587468-25-000010"
"accession_number": "0001587468-25-000009"
```

The CSV rows, the log, and the report agree (Stripe 1250/22, Notion 98/2, Ramp empty). 15-1199 has 0 rows in the BLS file, which the report shows as `missing: no-occupation-row`. Both Databricks accession numbers exist in the shipped 2025Q4 sample. The composite arithmetic reproduces 0.570.

**2. Tests** (`node --test scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/test/`):

```text
ok 1 - title classifier: product vs program vs ambiguous vs excluded
ok 2 - sponsored-title list parser handles a double-quoted title with an apostrophe
ok 3 - company matching is exact after normalization — an SPV fund name never matches the brand
ok 4 - liveness parser reads the checker's own output format, including reason lines
ok 5 - timeline gate: steps, unemployment allowance, and refusal when OPT end is past
ok 6 - H-1B registration windows are counted from dates only
ok 7 - schema drift in the 80 Days CSV halts instead of reading the wrong column
ok 8 - a SOC code with no BLS row is reported missing, never zero
ok 9 - end to end on fixtures through the real scorer: holds, gates, labels, report shape
ok 10 - OPT end date already past: the whole run is refused and nothing is scored
ok 11 - break attempt: an authorization string with "authorized" makes the scorer drop sponsorship — the prototype refuses
ok 12 - characterization of the engine: the scorer treats a missing liveness factor as an open gate
ok 13 - a named human can clear an uncertain liveness gate, but cannot reopen an expired one
ok 14 - a liveness_human note without a name does not clear the gate
# tests 14
# pass 14
# fail 0
```

**3. Deliberate break attempts**: see the attestation below. I also mutation-tested the suite: I temporarily (a) let unchecked-liveness roles through with factor 1, and (b) replaced exact matching with substring matching. Test 9 failed both times (`# fail 1`). With the code restored, all tests pass.

## Reflection

**What worked.**
- Exact matching plus HOLD did what it was built for. It refused to attach the Anthropic fund row and made me look at Ramp's three candidate rows.
- The liveness gate caught real problems. Three postings at two of the strongest PM sponsors couldn't be confirmed, and the recipe refused to guess.
- Reading the sponsored titles exposed a pattern I wouldn't have seen by sponsor count. Databricks (1,640 approvals) and Robinhood (824) store only engineering-type titles, while Stripe stores "Product Manager".

**What the recipe got wrong or missed.**
- **Skip rate is 10%, not the ≥50% a healthy run shows.** Part of that is by construction: the scan already filtered 3,957 of 4,089 postings by title, and I hand-picked 14. Part of it is the recipe. With "Possible" mapped to p = 0.5, every sponsor-not-PM posting lands in Consider, so 7 of 10 scored roles are "network first". That's honest but crowded: three networking hours a day can't cover seven companies. I have not changed the rule to make the number look better.
- **My canonical-URL fix for `uncertain` failed.** The Greenhouse URLs still came back uncertain. I didn't predict that, and the three holds remain open until I open the pages myself.
- **The scorer itself had two surprises** I only found by testing: a missing liveness factor is treated as open, and an authorization string containing "authorized" turns off sponsorship weighting. My prototype guards against both, but other contributors' harnesses may not.
- **My first-pass classifier treated a bare "TPM" as program manager.** I changed it to ambiguous before the first run, because for my target role "TPM" usually means Technical *Product* Manager.

**One concrete next improvement.** Add the DOL LCA disclosure file (the first proposed addition). With per-filing `JOB_TITLE` and `SOC_CODE`, the 7 Consider rows would split into "has filed PM LCAs" and "has not". That is the decision the networking hours currently have to make by hand. The same data would also resolve the SOC ambiguity, so role quality could carry a real weight.

## Attestation
- Recipe: pm-sponsor-title-match v0.1.0
- By: `<YOUR FULL NAME>` · `<date you re-ran these in your clean clone>` *(the rows below were run in the build session on 2026-10-03; sign only after re-running them yourself)*

### Tested
| Ran | Saw | Expected |
|---|---|---|
| `pm-sponsor-triage.mjs --sample` | 10 evaluated → Apply 1 · Consider 4 · Skip 1 · HOLD 4 | holds for not-in-CSV, ambiguous, unchecked, uncertain; expired → Skip |
| Worked run pass 1 (14 real postings) | Apply 2 · Consider 4 · Skip 1 · HOLD 7 | brand-name mismatches and uncertain liveness held, not scored |
| Worked run pass 2 (3 `csv_name` resolutions) | Apply 2 · Consider 7 · Skip 1 · HOLD 4 | resolved companies scored; Anthropic still held |
| **Break:** persona OPT end 2026-06-30 (past) | exit 3, no `role-scores.json` or report written (test 10) | whole run refused |
| **Break:** authorization "F-1 OPT, authorized to work" | exit 4, "scorer read the profile … as NOT needing sponsorship" (test 11) | refuse rather than report with sponsorship weight 0 |
| **Break:** role with no liveness sent straight to the scorer (`BROKEN-no-liveness-roles.json`) | scorer → Apply, liveness multiplier 1 (test 12) | documents why the prototype HOLDs |
| **Break:** CSV missing required columns | exit 2 "schema drift" (test 7) | halt, don't read the wrong column |
| **Break:** `liveness_human` without a name; human "active" on an expired posting | still HOLD; expired stays Skip (tests 13–14) | a gate clears only with a named human and never reopens a dead posting |
| **Break:** mutants (fuzzy match; unchecked liveness = 1) | test 9 fails for each | the suite catches the regressions it exists for |
| Hand cross-check of Stripe/Notion/Ramp, 15-1199, Databricks Form D, Stripe composite | all match the source files | report = records |

### Did not test
- That any Apply company actually sponsors PMs today, or is E-Verify enrolled.
- Liveness of the 3 `uncertain` postings by opening them myself (gate G2 still open).
- Ashby/Lever postings beyond the two Ashby boards scanned; any non-US location handling (the scan's location filter let a "Toronto, Remote Canada" posting through on "Remote").
- Behavior on the full Form D quarters (only samples ship).
- Any persona other than the fictional one. In particular, the timeline gate with a near OPT end date only ran in unit tests.
- Windows line endings in the CSV, and very large shortlists.

### Broke during testing, fixed
- `npm run verify` failed on a fresh machine (no PyYAML; Homebrew Python refuses global pip). Fixed locally with a gitignored `.venv` + `PATH`.
- `npm run ats:liveness` failed: the Playwright Chromium build was not installed. Fixed with `npx playwright install chromium`.
- The PII scan flagged `package-lock.json`. I first blamed my `npm install`; the clean clone showed the string is already in upstream HEAD (d08afdd). It is not a change of mine and not fixed (outside my namespace); reported in the PR.
- Report said "1 are worth applying". Pluralization fixed in `renderReport`.
- Candidate SOC 15-1255 turned out to exist, so the "missing SOC row" case was never exercised. Replaced with retired SOC 15-1199.
- Reddit's "Advertiser Optimization PM" was silently dropped. It is now listed as an ambiguous title in the evidence.
- The adjacent-family next action told the user to ask about "PM roles" when the record already showed PM sponsorship. Reworded per rule.
