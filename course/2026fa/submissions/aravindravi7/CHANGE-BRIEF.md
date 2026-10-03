# CHANGE-BRIEF — PM sponsor title-match (aravindravi7)

## Executive summary

This is the plan I wrote before building anything. It says who the recipe is for, which data it reuses, where it stops for a human, and what I expect to go wrong. The predictions below are the original record: later revisions are added at the bottom and the originals are not edited.

The short version: an international MS student who wants product-manager roles needs to know whether a company has sponsored H-1B visas *for product managers*, not just whether it sponsors anyone. Most sponsor lists answer the second question. This recipe answers the first from the 80 Days CSV's sponsored-title field, then hands the result to the existing scorer.

---

**Written:** 2026-10-03, before any prototype code (predictions section frozen at this point).
**Recipe slug:** `pm-sponsor-title-match` · **Branch:** `contrib/2026fa-aravindravi7-pm-sponsor-title-match`

## 1. Career situation

International MS in Information Systems student (Northeastern, Boston) targeting **Product Manager, Technical Product Manager, and AI Product Manager** roles. On F-1 OPT with a STEM OPT extension, authorization running into 2029. H-1B-sponsoring employers are the first priority; roles at non-sponsors are acceptable as a second tier, not a skip.

What makes this different from a generic sponsor search:

- PM is a role family that many heavy H-1B sponsors do **not** sponsor. A company with 1,000+ approvals can have every one of them be engineers.
- "TPM" means two different jobs (Technical *Product* Manager vs Technical *Program* Manager), and sponsored-title records use both.
- There is no O*NET occupation called "Product Manager". The SOC code an employer files under is not visible from the posting, so wage-based role quality is ambiguous for this role family.
- On STEM OPT the binding timeline constraint is not "does the OPT window close" (it is years away) but the **150-day unemployment allowance** and the number of H-1B registration windows left.

Engine layers used: **80 Days to Stay** (sponsorship history + funding), **Job-Ops** (ATS scan + liveness), **Cognitive Pivot** (BLS wages, as context only).

## 2. What I reuse (exact paths) and what I propose

Reuse, read-only:

| Path | Use |
|---|---|
| `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv` | `Total Approvals`, `Total Denials`, `top_job_titles_sponsored`, `latest_funding_*` per company |
| `data/sec/form-d/processed/sample/companies-sec-*-d.sample.json` | Form D recency join (samples only — 50 per quarter) |
| `data/bls/compact/soc_occupation_compact.csv` | national median wage for each candidate PM SOC code (context, not a vote) |
| `scripts/ats/scan.mjs` (`npm run ats:scan`) | find live PM postings at sponsor companies |
| `scripts/ats/check-liveness.mjs` (`npm run ats:liveness`) | liveness gate input (its saved stdout) |
| `scripts/score/role-scorer.mjs` (`npm run score`) | the composite — called as a CLI, not re-implemented |

New, in my namespace only: `scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/` — a script that classifies sponsored titles into PM families, matches companies by exact normalized name, builds the scorer's `roles.json`, runs the scorer, and writes a JSON log + Markdown report.

Proposed but not built (would be typed TODOs in the recipe):

- DOL LCA disclosure data with `JOB_TITLE` and `SOC_CODE` per filing — the CSV only carries a company's *top* sponsored titles, so a PM sponsorship that is not in the top list is invisible. `[TODO: DATA SOURCE]`
- E-Verify employer enrollment — required for STEM OPT employment; no local data. `[TODO: DATA SOURCE]`
- Machine-readable (JSON) output from the liveness checker so nobody has to parse its emoji text. `[TODO: DEV]`

## 3. Gates and what a human needs to see

| Gate | Stops when | Human needs to see |
|---|---|---|
| Input / timeline | OPT end date not after run date; dates malformed | the persona's dates and the computed days left |
| Entity match | company not in CSV under its normalized name, or matches more than one row | the brand name, the candidate CSV rows; decides and records a `csv_name` |
| Liveness | posting `uncertain` or not checked | the posting page itself |
| Decision (before tailoring) | any Apply/Consider | the exact sponsored title strings that justified the tier; E-Verify status checked by hand |

## 4. Predicted failure cases and how I will check each

1. **Brand name ≠ legal name.** "Notion" vs `NOTION LABS INC`, "Ramp" vs `RAMP BUSINESS CORP`. Check: run with the brand name, expect HOLD `company-not-in-csv`, never a fuzzy guess.
2. **A name that only matches an investment vehicle.** "Anthropic" appears in the CSV only inside an SPV fund name. Check: exact match must refuse it; a substring match would wrongly attach the fund's (empty) record to the company.
3. **Posting that is dead or unverifiable.** Check: a fixture liveness line marked `expired` must produce a closed gate (Skip), and `uncertain` / missing must produce HOLD, not a default-open gate.
4. **OPT end date already past.** Check: the run must exit nonzero with a message and write no scores.
5. **SOC code with no BLS row.** Check: a candidate SOC that does not exist in the compact CSV is reported `missing: no-occupation-row`, not zero.

## 5. Prediction about what my first pass will get wrong

I predict the title classifier will be the weakest part: abbreviations like "PM" and titles like "Product Marketing Manager" or "Product Designer" will be misclassified on the first pass, and I will undercount PM sponsors because the CSV only stores a handful of top titles per company.

*Honesty note on timing:* failure cases 1 and 2 were not blind predictions. I saw `NOTION LABS INC`, `RAMP BUSINESS CORP`, and the Anthropic SPV row while exploring the CSV, before writing code. I had also already run `npm run ats:liveness` once on the worked-run URLs and seen 3 of 14 come back `uncertain`, so case 3's `uncertain` branch is designed from that observation, not predicted.

---

## Revisions (added after building — originals above unchanged)

*(see bottom of this file after the build; appended, not rewritten)*

### Revision 1 — 2026-10-03, after the first build and runs

- **Prediction 5 (classifier weakest): partly right.** "Product Marketing Manager", "Product Designer" and "Senior Director of Product Design" were handled by the exclusion list from the first run. The miss was the bare abbreviation: I first classified "TPM" as *program* manager. For my target role it usually means Technical *Product* Manager, so it is now counted as ambiguous (neither family). The undercount prediction was right and is bigger than I thought: 862 of 1,552 sponsors store only one title.
- **Failure case 3 (liveness): one real `uncertain` case did not resolve the way I planned.** Re-checking on the Greenhouse-hosted URL still returned `uncertain` for all three. I added a named-human clearance (`liveness_human`) instead.
- **Failure case 5 (SOC with no row): my first fixture didn't exercise it.** I had picked 15-1255, which exists. I replaced it with 15-1199 (a retired 2010 SOC code that older filings use), which has no row.
- **Not predicted:**
  - The scorer opens a missing liveness gate (`?? 1`) and reads any authorization containing "authorized" as no-sponsorship-needed.
  - CONTRIBUTING says to import the scorer's exports, but it has none and runs `main()` on import.
  - `npm run verify` fails without PyYAML, and `ats:liveness` fails without Playwright's own Chromium build.
- **Proposals unchanged** (the same 3 typed TODOs in the recipe). Scope added: the next-action mapping to the 3-3-2 day, and the non-H1B fallback tier (from the student's stated preference).
