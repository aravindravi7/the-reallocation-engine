# SOURCES

## Executive summary

This lists everything the submission was built on (the repository, its rules, its data, and its tools) and says plainly what an AI contributed and what I decided or checked myself.

## Repository and governing documents

- *The Reallocation Engine* repository (nikbearbrown/the-reallocation-engine), MIT (code) / CC BY 4.0 (book), by Nik Bear Brown.
- `SNICKERDOODLE.md` (constitution: gates, provenance, lifecycle, attestation format), `DOMAIN.md` (known gaps), `CONTRIBUTING.md` (namespaces, scorer API), `DATA_CONTRACT.md` §Zero-Conditions, `recipes/README.md`, `recipes/_shared.md` (run-log shape).
- Style references: `recipes/local-wage-adjustment.md` and `recipes/local-wage-adjustment.card.md`; `recipes/scan.md`.
- Scorer: `scripts/score/role-scorer.mjs` (Ch.11), used unchanged; tier p values 0.9/0.6 mirror `data/examples/ch11-roles.json`.

## Data (all already in the repo; none added except trimmed test fixtures)

- 80 Days to Stay mapped CSV: `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv` (SEC Form D × DOL H-1B join, Humanitarians AI).
- SEC Form D processed samples: `data/sec/form-d/processed/sample/*.sample.json` (50 per quarter, 2025Q2–2026Q1).
- BLS OEWS May 2024 + O*NET compact: `data/bls/compact/soc_occupation_compact.csv`.
- Live job postings: public Greenhouse and Ashby job-board APIs, reached only through `npm run ats:scan` and `npm run ats:liveness`, 2026-10-03.
- Fixtures in `scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/fixtures/` are trimmed copies of the rows above. Phone, officer, director, and related-person fields were removed.
- Persona: fictional, invented for this submission ("Kavya Rao", example.com). No real personal data is used anywhere.

## Course material

- Assignment brief: *The Reallocation Engine — Recipe Design Assignment*, INFO 7375, Fall 2026.
- Nik Bear Brown, *The 3-3-2 Split: Why Your Job Search Is Probably Backwards*, used for the time-block framing only. No figure from the essay is cited as a record.

## Tools

- Node 20.20.2, Python 3.13.0, Playwright 1.62.1 (Chromium headless shell), npm.
- **Claude Code (Anthropic, model Claude Opus 5.5)** in the Claude desktop app, one session on 2026-10-03.

## What the AI contributed vs. what I did

**The AI did:**
- explored the repo and data;
- proposed the recipe angle;
- wrote the prototype, tests, and fixtures;
- ran every command whose output is pasted here;
- drafted the recipe, card, and all documents in this folder;
- drafted the fit ratings, tier→p mapping, timeline steps, and entity resolutions;
- predicted the 53-company employer-tier list (`fixtures/employer_tiers.predicted.json`) from my examples, using its own general knowledge (labeled model-judgment; I reviewed and confirmed all 53 on 2026-10-03, so they are now my input).

**I did:**
- chose the career situation and constraints (PM/TPM/AI PM; H-1B first, non-H1B as second tier; STEM OPT into 2029);
- chose my handle;
- gave my own employer ranking (tiers 1–3), and chose tier 4 for non-tech, an AI-predicted list to confirm, and a fallback rule;
- confirmed the company-name matches (G1) and chose to leave the 3 uncertain postings on HOLD (G2);
- decided the recipe would claim DRAFT rather than RUNNABLE-SAMPLE;
- asked for the employer tier and rejected leaving unknown employers "untiered";
- reviewed and confirmed the 53 AI-predicted employer tiers;
- reported the scorer finding that a missing sponsorship term still yields Consider (0.21);
- edited the PR title and description.

**Checked by me (required before submission):**
- re-ran the sample and the test suite in my own terminal (both matched);
- reviewed the fit ratings (kept) and the company-name matches (confirmed);
- chose to leave the 3 uncertain postings on HOLD rather than clear them unseen.

I can explain every gate, every number in the worked run, and every line of the prototype.
