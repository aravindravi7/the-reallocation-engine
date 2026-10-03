# FRICTIONAL — honest log

## Executive summary

This is the working log for the assignment. It records what was tried, what was expected, what actually happened, and what changed in response. It is explicit about who did what: I (the student) set the scope and made the judgment calls, and an AI coding agent (Claude Code, model Claude Opus 5.5) did most of the execution in one session on 2026-10-03. Entries marked **[AI]** were done by the agent and reviewed by me. Entries marked **[ME]** are my own decisions or work. The section at the end is for entries only I can write.

## Who did what

| Decision / work | By | Accepted, modified, or rejected |
|---|---|---|
| Career situation: MS IS, PM/TPM/AI PM, H-1B first with non-H1B as second tier, STEM OPT into 2029 | **[ME]** | — (my own situation) |
| GitHub handle `aravindravi7`; fork and push | **[ME]** | — |
| Recipe idea: "company sponsors ≠ sponsors PMs", read from `top_job_titles_sponsored` | **[AI]** proposed it after profiling the CSV; **[ME]** chose the situation that made it relevant | accepted |
| Lifecycle status: DRAFT rather than RUNNABLE-SAMPLE | **[AI]** laid out both options; **[ME]** chose DRAFT | my decision |
| Prototype code, tests, fixtures, recipe, card, these documents | **[AI]** drafted all of them | `<fill in: what you changed after reading them>` |
| Fit ratings in the shortlists (0–1 per posting for the fictional persona) | **[AI]** drafted the numbers | `<fill in: kept / changed which>` |
| Tier→p mapping (0.9 / 0.6 / 0.5 / 0.0) and timeline steps | **[AI]** proposed them, tied to the Ch.11 example values | `<fill in: do you agree? why?>` |
| G1 entity resolutions (Robinhood, Notion, Ramp mapped; Anthropic refused) | **[AI]** proposed them with reasons | `<fill in: confirm or change>` |
| Hiring-lag 270 days for the "2027 Start" posting | **[AI]** estimated it | `<fill in>` |

## Log (chronological, 2026-10-03)

1. **[AI] Read the governing docs** (SNICKERDOODLE, DOMAIN, CONTRIBUTING, DATA_CONTRACT, the scorer) and profiled the data. *Expected:* a Form D join to carry the funding signal. *Saw:* only 200 of 58,329 filings ship, mostly pooled funds. *Response:* funding became context, not a vote, and the denominator is printed.
2. **[AI] `npm run verify` failed** with `ModuleNotFoundError: No module named 'yaml'`. `pip install --user pyyaml` was refused because Homebrew Python is externally managed (PEP 668). *Response:* a gitignored `.venv` with PyYAML on `PATH`. *Learned:* CI installs PyYAML itself, so this is a fresh-machine problem, not a repo bug.
3. **[AI] `npm run ats:scan -- --dry-run` failed** with `portals.yml not found`. *Response:* used the documented `REALLOCATION_ENGINE_PORTALS=` override instead of creating a private config file.
4. **[AI] Profiled sponsored titles.** The first regex count was "152 of 1,557 sponsors list a PM-family title". *Later correction (step 15):* recounted with the prototype's own classifier, the figures are 151 of 1,552. Five rows have approvals recorded as `0.0`, which the first count included. Documents use the corrected numbers.
5. **[AI] Found that PM has no O*NET occupation.** Candidate SOC medians span $100,750–$171,200. *Decision:* keep the role-quality weight at 0 and show the spread as context (fact 1).
6. **[AI] First liveness run failed:** Playwright's pinned Chromium build was missing. *Response:* `npx playwright install chromium` (about 95 MB). Then 11 active, 3 uncertain.
7. **[AI] Wrote CHANGE-BRIEF before the prototype.** On review, the agent marked which "predictions" weren't blind: failure cases 1–2 came from the data exploration, and the liveness `uncertain` branch came from step 6.
8. **[AI] Discovered that the scorer treats a missing liveness factor as 1.** This came from reading `role-scorer.mjs` (`num(role.liveness?.factor) ?? 1`). *Response:* the prototype HOLDs unchecked roles. Test 12 pins the scorer behavior with `fixtures/BROKEN-no-liveness-roles.json`.
9. **[AI] Discovered that the scorer's profile regex matches "authorized".** "F-1 OPT, authorized to work" would set sponsorship weight to 0. *Response:* the prototype reads `profile_needs_sponsorship` back and exits 4 (test 11).
10. **[AI] CONTRIBUTING says "import the scorer's exports".** The file has no exports and runs `main()` on import. *Response:* call it as a CLI. Logged in the recipe.
11. **[AI] First sample report problems:**
    - "1 are worth applying". Fixed.
    - Reddit's "Advertiser Optimization PM" was silently dropped. It is now listed as ambiguous.
    - The candidate SOC 15-1255 exists, so the missing-row case was never exercised. Swapped to 15-1199.
    - The adjacent-family next action told the user to ask about PMs when the record already showed PM sponsorship. Reworded.
12. **[AI] Classifier change before the first real run:** bare "TPM" moved from *program* to *ambiguous*, because for my target role it usually means Technical *Product* Manager.
13. **[AI] All 12 tests passed on the first run.** That seemed too easy, so the agent mutation-tested the suite: fuzzy matching, and unchecked liveness passed as 1. Test 9 caught both.
14. **[AI] Tried to resolve `uncertain` liveness** by re-checking the same job IDs on Greenhouse-hosted URLs. *Expected:* `active`. *Saw:* still `uncertain` ×3. *Response:* added `liveness_human` (named-human clearance, never reopens `expired`) plus tests 13–14. **Unresolved:** I still have to open those three pages myself.
15. **[AI] Caught two of its own hand-typed numbers:**
    - "970 days" in the worked run was 971 in the log.
    - The 152/1,557/867 counts became 151/1,552/862.
    Both fixed from the log and the code, not by recalculating by hand.
16. **[AI] The PII scan flagged `package-lock.json` (an npm maintainer's address in a deprecation notice).** *First explanation (wrong):* `npm install` had rewritten the lockfile and added it. *Checked in the clean clone:* after `npm ci` the lockfile is unchanged, and `git grep` finds the string in upstream HEAD (commit d08afdd "Fall 2026 fresh cut"). It is a pre-existing finding that CI's working-tree scan will report on every PR. *Response:* left untouched (not my namespace), reported in the PR; the branch-history scan `pii-scan.mjs --diff upstream/main` is the check that covers my contribution.
17. **[AI] My own documents tripped the branch-history PII scan.** While explaining the lockfile finding, the agent quoted the flagged address verbatim in three files, so `pii-scan.mjs --diff upstream/main` reported 3 findings on this branch. *Response:* redacted, then amended the commit *before any push*, so the address is not in published history. Re-scan: clean. *Learned:* explaining a privacy finding must not reproduce it.
18. **[AI] Observed, not fixed (outside my namespace):** the scan's location filter let "Toronto, Remote Canada" through because "Remote" is on the allow list.

## Unresolved questions

- Does "Possible → p 0.5 → Consider" make the Consider band too crowded (7 of 10 scored)? Would a lower p, so these become Skips plus a networking list, serve the 3-3-2 day better? It was deliberately not changed to improve the skip rate.
- Is the 150-day STEM OPT unemployment rule the right per-role gate when a student might be employed by the start date?
- Should "listed in today's ATS API feed" count as liveness evidence when the page check is `uncertain`?

## Student's own entries (only I can write these — required before submission)

- What I checked myself, and how (e.g. opened the 3 uncertain postings; re-ran the commands in my clone):
  - `<fill in>`
- What I changed in the AI's drafts, and why:
  - `<fill in>`
- What I rejected:
  - `<fill in>`
- What I learned that I didn't know before:
  - `<fill in>`

## Traceability

- Commits: `<fill in SHAs after committing>`
- Run artifacts: `course/2026fa/submissions/aravindravi7/runs/` (sample, worked-2026-10-03/pass1, pass2, ch11-example)
- Tests: `scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/test/pm-sponsor-triage.test.mjs`
- Session transcript: Claude Code desktop session, 2026-10-03 (can be exported on request)
