---
owner: aravindravi7
term: 2026fa
component: pm-sponsor-title-match
status: RUNNABLE-SAMPLE prototype (recipe status is DRAFT — see recipe frontmatter)
promoted_to: null
---

# pm-sponsor-triage — PM sponsor title-match prototype

## Executive summary

This is a small program for international students looking for product-manager jobs. It answers a question most sponsor lists don't: has a company sponsored work visas **for product-manager titles**, or only for engineers? For each posting on a shortlist, it checks the company's sponsorship record, whether the posting is still open, and whether the hiring timeline fits a STEM OPT student's remaining time. It then hands the evidence to the engine's existing scorer and writes two files: a detailed log for software and a readable report for the person. Postings it cannot verify are put on hold rather than guessed at. It runs offline on local data and has 12 offline tests.

## Run it (one command, from the repo root)

```bash
node scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/pm-sponsor-triage.mjs --sample
```

This reads the real 80 Days CSV, BLS compact CSV, and Form D samples from `data/`, plus the fixture shortlist, persona, and liveness file in `fixtures/`. It writes to `course/2026fa/submissions/aravindravi7/runs/sample/`:

| File | Reader | Written by |
|---|---|---|
| `pm-triage-log.json` | agent — every value with its `record` / `your-input` / `model-judgment` label, holds, rules, input SHA-256s | this script |
| `pm-triage-report.md` | person — executive summary, decision + next action per role, holds, verified vs. assumed | this script |
| `roles.json` | scorer input, shaped like `data/examples/ch11-roles.json` | this script |
| `role-scores.json`, `role-scores.md` | scorer output + its own audit | `scripts/score/role-scorer.mjs` (unchanged, run as a CLI) |

## Tests (offline, fixtures only)

```bash
node --test scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/test/
```

14 tests. No network calls. The only subprocess is the repo's own scorer.

## Custom run (real postings)

```bash
REALLOCATION_ENGINE_PORTALS=scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/fixtures/portals.pm-sponsors.yml npm run ats:scan
npm run ats:liveness -- --file <urls.txt> > <liveness.txt>
node scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/pm-sponsor-triage.mjs --shortlist <shortlist.json> --persona <persona.json> --liveness <liveness.txt> --out <dir> [--as-of YYYY-MM-DD]
```

`npm run ats:scan` writes to `data/ats/` (gitignored). `npm run ats:liveness` exits 1 whenever any URL is not `active`. That is expected; the saved text is still the input.

## Exit codes

`0` ok · `2` input/usage error (bad JSON, bad date, CSV schema drift) · `3` timeline gate refuses the whole run (OPT end not after as-of) · `4` scorer failed, or read the profile as not needing sponsorship.

## Files

- `pm-sponsor-triage.mjs` — the prototype (exports its pure functions for the tests).
- `test/pm-sponsor-triage.test.mjs` — offline tests.
- `fixtures/persona.sample.json` — **fictional** persona (example.com address).
- `fixtures/shortlist.sample.json`, `fixtures/liveness.sample.txt` — sample inputs (example.com URLs, never fetched).
- `fixtures/sponsors.slice.csv`, `fixtures/bls.slice.csv`, `fixtures/formd/` — trimmed copies of real repo rows for the tests (phone, officer, and related-person fields removed).
- `fixtures/BROKEN-no-liveness-roles.json` — scorer input with no liveness term; shows that the scorer opens a missing gate.
- `fixtures/portals.pm-sponsors.yml` — scan config used for the worked run.
