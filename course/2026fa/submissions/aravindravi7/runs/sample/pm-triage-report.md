# PM sponsor title-match — triage report (2026-10-03)

## Executive summary

This report checks 10 product-manager job postings for one question most sponsor lists skip: has the company sponsored work visas *for product-manager titles*, or only for other jobs? It also checks whether each posting is still open and whether the hiring timeline fits the student's remaining work-authorization allowance, then says what to do next with each one.

Read it before spending tailoring time: of 10 postings, **1 is worth applying to now, 4 need a human look or a networking conversation first, 1 is a skip, and 4 are on hold** because something could not be verified (the company could not be matched to a record, or the posting's status was uncertain). Held postings were not scored. 3 postings are at companies whose sponsorship record shows a product-manager-family title; 3 are at companies that sponsor visas but show no such title in the record. Within each group, postings are ordered by the employer tier you set (your preference, not a record); the tier never changes a decision.

Nothing here is a guarantee of sponsorship. The record shows past filings, not future intent. Every "apply" still needs a human to confirm the employer uses E-Verify (required for STEM OPT), which this tool cannot check.

## Decisions and next actions

| Decision | Employer tier (yours unless marked) | Company — role | Composite | Sponsorship evidence | Liveness | Next action (3-3-2 block) |
|---|---|---|---|---|---|---|
| **Apply** | 3 | Stripe — Product Manager: New Grad Accelerator | 0.570 | Proven (title-family-match); approvals 1250; PM titles on record: "Product Manager" | active | tailor [2 (research-and-apply)]: Tailor and apply. First check E-Verify enrollment by hand (STEM OPT requirement — not in repo data). |
| **Consider** | 3 | Databricks — Associate Product Manager, New Grad | 0.430 | Possible (sponsor-not-pm); approvals 1640; PM titles on record: none | active | network-first [3 (networking)]: Network before applying: ask a PM at the company whether PM roles have been sponsored. The record shows H-1B sponsorship, but no product- or program-manager title. |
| **Consider** | 3 | Datadog — Technical Program Manager II | 0.420 | Likely (adjacent-family); approvals 340; PM titles on record: "PRODUCT MANAGER" | active | network-first [3 (networking)]: Network before applying: the record shows the other PM family sponsored ("PRODUCT MANAGER"), not a "program" title. Ask whether this title is filed the same way. |
| **Consider** | 3 | Reddit — Product Manager, Ads | 0.355 | Possible (sponsor-not-pm); approvals 408; PM titles on record: none; ambiguous, not counted: "Advertiser Optimization PM" | active | network-first [3 (networking)]: Network before applying: ask a PM at the company whether PM roles have been sponsored. The record shows H-1B sponsorship, but no product- or program-manager title. |
| **Consider** | 3 | Ramp — Product Manager, Vendor Intelligence | 0.240 | None (no H-1B record in this dataset — absence, not proof of non-sponsorship); matched RAMP BUSINESS CORP | active | non-h1b-fallback [2 (only after H-1B-tier roles)]: Second-tier list (persona preference: H-1B first). The scorer's verdict (Consider) is unchanged; a human decides whether to spend time here. |
| **HOLD** | 1 | Anthropic — Product Manager, Claude Science | — | not matched | active | resolve-hold [—]: company-not-in-csv: no CSV row whose normalized name equals "ANTHROPIC"; supply csv_name after checking by hand |
| **HOLD** | 3 | Figma — Technical Program Manager - Infrastructure | — | Possible (sponsor-not-pm); approvals 188; PM titles on record: none | unchecked | resolve-hold [—]: liveness-unchecked: URL not in liveness file — run npm run ats:liveness on it |
| **HOLD** | 3 | Stripe — Product Manager, Payments | — | Proven (title-family-match); approvals 1250; PM titles on record: "Product Manager" | uncertain | resolve-hold [—]: liveness-uncertain: checker: content present but no visible apply control found — a human opens the posting |
| **HOLD** | 4 | Peloton Interactive — Product Manager, Connected Fitness | — | not matched | active | resolve-hold [—]: ambiguous-company-match: matches PELOTON INTERACTIVE INC / PELOTON INTERACTIVE LLC |
| **Skip** | 3 | MongoDB — Senior Product Manager | 0.000 | Proven (title-family-match); approvals 462; PM titles on record: "Senior Product Manager" | expired | network-list [3 (networking)]: No live posting, but a proven PM sponsor: add to the informational-interview list for the next opening. |

## Holds — a human must resolve these

- **Anthropic — Product Manager, Claude Science** (tier 1): `company-not-in-csv` no CSV row whose normalized name equals "ANTHROPIC"; supply csv_name after checking by hand
- **Figma — Technical Program Manager - Infrastructure** (tier 3): `liveness-unchecked` URL not in liveness file — run npm run ats:liveness on it
- **Stripe — Product Manager, Payments** (tier 3): `liveness-uncertain` checker: content present but no visible apply control found — a human opens the posting
- **Peloton Interactive — Product Manager, Connected Fitness** (tier 4): `ambiguous-company-match` matches PELOTON INTERACTIVE INC | PELOTON INTERACTIVE LLC

## Funding context (record — not a vote in the scorer)

| Company (CSV row) | Latest funding date | Stage | Amount | In Form D samples? |
|---|---|---|---|---|
| STRIPE INC | 2024-04-08 | Series D+ | $694,159,778 | not-in-sample |
| DATADOG INC | 2015-12-28 | Series C | $94,507,338 | not-in-sample |
| DATABRICKS INC | 2025-09-08 | Series D+ | $1,074,999,900 | 2025Q4_d filed 31-DEC-2025, sold $4,082,050,250 (acc. 0001587468-25-000010); 2025Q4_d filed 31-DEC-2025, sold $23,017,200 (acc. 0001587468-25-000009) |
| MONGODB INC | 2014-12-10 | Series C | $100,000,000 | not-in-sample |
| REDDIT INC | 2021-08-11 | Series D+ | $700,000,000 | not-in-sample |
| RAMP BUSINESS CORP | 2025-07-28 | Series D+ | $599,999,270 | not-in-sample |
| FIGMA INC | 2024-05-15 | Series D+ | $415,749,740 | not-in-sample |

The Form D samples hold 200 of 58329 filings, so "not-in-sample" says nothing about whether a company raised money.

## Role quality (context only — carries no weight)

There is no O*NET occupation called "Product Manager". The SOC code a company files under is chosen at visa-filing time and is not on the posting, so the national median wage below is shown for each plausible code rather than picked for you.

| SOC (your-input candidate) | BLS title | National median (record) |
|---|---|---|
| 11-3021 | Computer and Information Systems Managers | $171,200 |
| 11-2021 | Marketing Managers | $161,030 |
| 15-1299 | Computer Occupations, All Other | $108,970 |
| 13-1111 | Management Analysts | $101,190 |
| 13-1082 | Project Management Specialists | $100,750 |
| 15-1199 | — | missing: no-occupation-row |

Spread across candidate codes: $100,750 – $171,200. That spread is why this recipe keeps the scorer's role-quality weight at 0.

## What was verified vs. what was assumed

- **Record** (read from a file in the repo): approvals, denials, sponsored-title strings, funding dates, BLS medians, the liveness checker's verdict, the title-family classification (a fixed rule applied to record strings).
- **Your input** (the person decided): fit ratings, OPT end date, unemployment days used, hiring-lag assumption, candidate SOC codes, any `csv_name` used to resolve a company match, the tier→number mapping and the timeline steps.
- **Model judgment**: none. Every employer tier here is your own, and no language model was called during this run.
- **Not checked at all**: E-Verify enrollment; whether a PM sponsorship exists beyond the top titles the CSV stores; what this employer pays; whether the posting will sponsor *this* hire.

## Run record

- As-of: 2026-10-03 · mode: sample · recipe v0.1.1
- 80 Days CSV: `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv` (30369 rows, sha256 eccdee2addf4…)
- Form D: 4 sample files, 200 of 58329 companies shipped
- Scorer: `node scripts/score/role-scorer.mjs course/2026fa/submissions/aravindravi7/runs/sample/roles.json --profile course/2026fa/submissions/aravindravi7/runs/sample/scorer-profile.json --out-dir course/2026fa/submissions/aravindravi7/runs/sample` → ✓ scored 6 roles → Apply 1 · Consider 4 · Skip 1 (skip 17%)
- Full per-term trace: `pm-triage-log.json` (agent log) and `role-scores.md` (scorer's own audit).

*Gate status: open. No human has cleared this run until a named person records it in the run log.*
