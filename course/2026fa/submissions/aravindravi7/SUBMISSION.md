# SUBMISSION

## Executive summary

This cover sheet ties the Canvas ZIP to the GitHub pull request. They are the same work at the same commit. The submission is a recipe and a working prototype that check whether employers have sponsored H-1B visas for product-manager titles specifically, for an international MS student targeting PM roles on STEM OPT.

- **Assignment:** The Reallocation Engine — Recipe Design Assignment
- **Student:** Aravind Ravi
- **GitHub handle:** aravindravi7
- **Domain / situation:** International MS in Information Systems student (Boston) on F-1 STEM OPT into 2029, targeting Product Manager / Technical Product Manager / AI Product Manager roles; H-1B-sponsoring employers first, non-sponsors as a second tier. The asymmetry: "sponsors H-1B" ≠ "sponsors product managers".
- **Recipe path:** `recipes/cases/2026fa/aravindravi7-pm-sponsor-title-match.md` (+ `.card.md`)
- **Prototype command:** `node scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/pm-sponsor-triage.mjs --sample` (tests: `node --test scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/test/`)
- **GitHub repository / branch / PR URL:** `https://github.com/aravindravi7/the-reallocation-engine` / `contrib/2026fa-aravindravi7-pm-sponsor-title-match` / https://github.com/nikbearbrown/the-reallocation-engine/pull/23
- **Submitted commit SHA:** recorded in the copy of this file at the root of the Canvas ZIP (a commit cannot contain its own hash).
- **Lifecycle stage claimed:** DRAFT. The sample path runs end to end and is logged, but 3 typed TODOs (proposed data sources and a liveness JSON mode) are open, and SNICKERDOODLE requires zero before SPECIFIED.
- **Summary of my changes:** New files only, all in assigned namespaces:
  - a prototype that matches companies exactly in the 80 Days CSV, classifies their sponsored titles into product / program / ambiguous, applies liveness and STEM OPT timeline gates, and HOLDs anything unverifiable; roles are ordered within each decision by an employer tier (the student's own ranking, otherwise an AI prediction labeled model-judgment; never a score);
  - it writes a labeled `roles.json`, runs the unchanged Ch.11 scorer, and writes a JSON log plus a Markdown report with a 3-3-2 next action per role;
  - 17 offline tests;
  - recipe + card, worked run on 14 real postings, domain justification, test report, run log, frictional log, sources.
- **Known limitations:**
  - Only top sponsored titles are visible (862 of 1,552 sponsors store one title).
  - No-record ≠ non-sponsor.
  - The SOC code for PM roles is unknown, so role quality carries weight 0.
  - E-Verify is not checked.
  - Form D is samples only.
  - Liveness `uncertain` on company career sites needs a human.
  - The skip rate on a pre-filtered shortlist is low (10% of scored).
  - The scorer's open-default liveness and "authorized" regex are guarded in the prototype, not fixed in the scorer.
