# TEST-REPORT — pm-sponsor-title-match

## Executive summary

This records how the prototype was tested. The program runs from one command. Its offline tests pass: 14 at first submission, 17 after the v0.1.1 revision (section C). It refuses to guess on each of the failure cases it names, and it changes nothing outside its own folders. Section A is what happened in the build session on 3 October 2026, in a downloaded (non-git) copy of the repo. Section B is the clean-clone re-run the assignment requires. It is only valid once the commands are actually run in a fresh clone of the branch and their real output is pasted in.

## A. Build session (2026-10-03, unzipped copy, macOS, Node 20.20.2, Python 3.13.0)

### Toolchain baseline — before any change

`npm run doctor` → `environment: ✓ runnable`; `PRIVACY — not a git repo (skipped)`; `RECIPES (33) … open TODOs: 318 declared · 318 [TODO markers`.

`npm run verify` → **failed**:

```text
conformance: 158 files (85 md · 36 py · 30 js · 4 sh · 3 json)
✓ all conform (machine half of P4). Adequacy is still the human gate.
...
ModuleNotFoundError: No module named 'yaml'
ERROR (1):
  E1 .ai/manifest.yaml does not parse
✗ manifest check FAILED (1 error)
```

Cause: no PyYAML, and Homebrew Python refuses `pip install --user` (PEP 668). Fix (local, gitignored): `python3 -m venv .venv && .venv/bin/pip install pyyaml`, then run with `PATH="$PWD/.venv/bin:$PATH"`. CI installs PyYAML itself, so this is environment-only.

### After

```text
$ PATH="$PWD/.venv/bin:$PATH" node scripts/conformance.mjs scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/ recipes/cases/2026fa/ course/2026fa/submissions/aravindravi7/ logs/runs/
conformance: 31 files (10 md · 18 json · 1 yaml · 2 js)
✓ all conform (machine half of P4). Adequacy is still the human gate.

$ PATH="$PWD/.venv/bin:$PATH" npm run verify   (tail)
WARN (3):
  W1 ignore path not in .gitignore: archive/
  W2 private path not gitignored (PII/secret risk): private/
  W2 private path not gitignored (PII/secret risk): data/ats/
✓ manifest check passed (3 warnings)

$ npm run doctor   (tail)
RECIPES (33)
  open TODOs: 318 declared (in frontmatter) · 318 [TODO markers in bodies
SUMMARY
  environment: ✓ runnable
```

The three manifest warnings were present before my change. In this copy they appear because it is not a git repo, so `git check-ignore` can't run. Doctor counts top-level recipes only (33), so my case recipe doesn't change its numbers.

### Sample run

```text
$ node scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/pm-sponsor-triage.mjs --sample
✓ pm-sponsor-triage 2026-10-03: 10 evaluated → Apply 1 · Consider 4 · Skip 1 · HOLD 4 (6 sent to scorer)
  scorer: ✓ scored 6 roles → Apply 1 · Consider 4 · Skip 1 (skip 17%)
  course/2026fa/submissions/aravindravi7/runs/sample/pm-triage-log.json  +  course/2026fa/submissions/aravindravi7/runs/sample/pm-triage-report.md
  HOLD s06-anthropic-pm: company-not-in-csv
  HOLD s08-peloton-pm: ambiguous-company-match
  HOLD s09-figma-tpm-unchecked: liveness-unchecked
  HOLD s10-stripe-pm-payments-uncertain: liveness-uncertain
```

### Tests

```text
$ node --test scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/test/
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

Mutation check of the suite: (a) unchecked liveness passed through as 1.0, and (b) substring company matching. Each produced `not ok 9` / `# fail 1`. Both mutants were reverted.

### Each named failure case, exercised

| Failure case (from CHANGE-BRIEF) | How exercised | Observed |
|---|---|---|
| Company missing from the CSV under its brand name | sample s06 Anthropic; worked pass 1 Robinhood/Ramp/Notion/Anthropic | HOLD `company-not-in-csv`, `sponsorship: null`, not sent to scorer |
| Name only matches an investment vehicle | test 3; Anthropic in both runs | no match; never joined to `ANTHROPIC - A SERIES OF AURUM VP FUND LLC` |
| Ambiguous company match | sample s08 Peloton Interactive (INC + LLC) | HOLD `ambiguous-company-match`, both candidates listed |
| Posting 404 / expired | sample s04 MongoDB (fixture `expired`) | liveness 0 → composite 0.000 → Skip, sponsor still Proven |
| Posting uncertain / unchecked | sample s09, s10; worked w03–w05 (real) | HOLD, not scored |
| OPT end date already past | test 10 (opt_end 2026-06-30, as-of 2026-10-03) | exit code 3; no `role-scores.json`, no report written |
| SOC code with no row | persona candidate 15-1199; test 8 | `missing: no-occupation-row`, `median_wage: null` |
| CSV schema drift | test 7 | `InputError` "schema drift", exit 2 |

### What the gates require a human to judge

- **G1:** whether a brand name is the same employer as a CSV row (and when to refuse, e.g. an investment-fund series).
- **G2:** whether an `uncertain` posting is really open, judged by opening it, with the person's name and date recorded.
- **G4:** before tailoring, whether the quoted sponsored titles really cover this role, and whether the employer is E-Verify enrolled.

None of these were cleared by a human in the build session.

### Scope of change

Every file I created is under these paths: `scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/`, `recipes/cases/2026fa/aravindravi7-pm-sponsor-title-match{.md,.card.md}`, `logs/runs/2026fa-aravindravi7-1.md`, `course/2026fa/submissions/aravindravi7/`. **Not to be committed:**
- `package-lock.json`. `npm install` rewrote it in the unzipped copy; `npm ci` in the clone does not. (The PII-scan hit on it, an npm maintainer's address in a deprecation notice, is in upstream HEAD already — see section B.)
- `.venv/` and `data/ats/*`, which are gitignored.

## B. Clean-clone re-run (2026-10-03)

Fresh `git clone https://github.com/aravindravi7/the-reallocation-engine.git`, branch `contrib/2026fa-aravindravi7-pm-sponsor-title-match`, fork HEAD = upstream main = `015843d`. My files were copied in, then:
- `npm ci`: the lockfile is unchanged (`git diff --quiet package-lock.json` passes).
- PyYAML installed in a gitignored `.venv` on `PATH`.
- The data and scorer files are byte-identical to the build copy. The SHA-256 prefixes match: CSV `eccdee2addf472b1`, BLS `bac5acf77ca2d252`, scorer `8655e182c3c2256c`.

### npm run doctor (exit 0; PRIVACY now runs, because this is a git repo)

```text
  ✓ data/bls
  ✓ data/ats
  ✓ data/80-days-to-stay
  ✓ scripts/sec
  ✓ scripts/bls
  ✓ scripts/ats
  ✓ scripts/resumes

PRIVACY (no personal data committed)
  ✓ no private/PII paths are tracked

RECIPES (33)
  with lifecycle frontmatter: 33   missing: 0
  by status: DRAFT 28 · RUNNABLE-SAMPLE 4 · RUNNABLE-LIVE  # DRAFT | SPECIFIED | RUNNABLE-SAMPLE | RUNNABLE-LIVE | VERIFIED 1
  open TODOs: 318 declared (in frontmatter) · 318 [TODO markers in bodies

SUMMARY
  environment: ✓ runnable
  recipes: 33/33 carry lifecycle frontmatter — all tracked
  next: continue
```

### npm run verify (exit 0)

```text
conformance: 168 files (88 md · 36 py · 32 js · 7 json · 1 yaml · 4 sh)
✓ all conform (machine half of P4). Adequacy is still the human gate.
MANIFEST CHECK — The Reallocation Engine
==========================================
WARN (3):
  W1 ignore path not in .gitignore: archive/
  W2 private path not gitignored (PII/secret risk): private/
  W2 private path not gitignored (PII/secret risk): data/ats/
✓ manifest check passed (3 warnings)
```

### Sample run (exit 0)

```text
✓ pm-sponsor-triage 2026-10-03: 10 evaluated → Apply 1 · Consider 4 · Skip 1 · HOLD 4 (6 sent to scorer)
  scorer: ✓ scored 6 roles → Apply 1 · Consider 4 · Skip 1 (skip 17%)
  course/2026fa/submissions/aravindravi7/runs/sample/pm-triage-log.json  +  course/2026fa/submissions/aravindravi7/runs/sample/pm-triage-report.md
  HOLD s06-anthropic-pm: company-not-in-csv
  HOLD s08-peloton-pm: ambiguous-company-match
  HOLD s09-figma-tpm-unchecked: liveness-unchecked
  HOLD s10-stripe-pm-payments-uncertain: liveness-uncertain
```

### Tests (exit 0)

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

### node scripts/pii-scan.mjs (working tree; exit 1, pre-existing finding)

```text
pii-scan: 1 finding(s) — see DATA_CONTRACT.md §Zero-Conditions

  [email] package-lock.json — [address redacted here — an npm maintainer's email in a deprecation notice]

If a finding is a false positive (fictional data outside the sanctioned dirs),
move it under search/examples/ or resumes/ rather than allowlisting it here.
```

This finding is **not from this branch**. `git grep -n "izs.me" HEAD -- package-lock.json` finds it in upstream HEAD (last changed in `d08afdd Fall 2026 fresh cut`), and this branch does not touch `package-lock.json`. The branch-history scan and `git diff --stat` follow below, run after committing.

### After committing

```text
$ git diff --stat upstream/main...HEAD | tail -1
 47 files changed, 11600 insertions(+)

$ git diff --name-only upstream/main...HEAD | grep -vE '<my four namespaces>'
(none)

$ node scripts/pii-scan.mjs --diff upstream/main
pii-scan: clean ✓
```

Every changed file is a new file in my four namespaces; nothing existing is modified. The first history scan was **not** clean. My own documents quoted the flagged lockfile address verbatim (including the pasted scan output above), which made it look like a new finding on this branch. I redacted it and amended the unpushed commit, so the address never entered this branch's published history. The scan above is the re-run after the amend.

## C. v0.1.1 re-run (employer tier), same clone, 2026-10-03

- `node --test …/test/` → `# tests 17 · # pass 17 · # fail 0`. The three new tests: (a) with vs. without tiers → identical decisions and composites; (b) lookup order your list > predicted list > fallback rule, and the rule never predicts 1 or 2; (c) a role with no sponsorship term → scorer Consider at 0.21 (finding by Aravind Ravi).
- Sample and pass 1 / pass 2 re-run with identical inputs. `git diff --stat` on every `roles.json`, `role-scores.json` and `role-scores.md` is **empty**, and each role's decision and composite equals v0.1.0.
- Aravind Ravi re-ran the sample and the tests in a personal terminal on 2026-10-03: both matched (10 evaluated → Apply 1 · Consider 4 · Skip 1 · HOLD 4; 16 pass / 0 fail at that point, before the 17th test was added).
