## 2026-10-03 — pm-sponsor-title-match v0.1.1 — re-run after adding the employer tier

### Executive summary
Same inputs as run 1, re-run after the recipe gained an employer-tier ordering (the student's own ranking, AI predictions labeled as model judgment, and a fallback rule). Every decision and score is identical to run 1; only the order within each decision changed. The scorer's input and output files are byte-identical.

- **Recipe:** recipes/cases/2026fa/aravindravi7-pm-sponsor-title-match.md v0.1.1 (DRAFT — 3 open typed TODOs)
- **Change:** employer tier 1–4. Lookup: persona.employer_tiers (your-input) → fixtures/employer_tiers.predicted.json (model-judgment, AI-predicted, unconfirmed) → CSV-industry fallback (model-judgment, never 1 or 2). Ordering only; never a scorer term.
- **Inputs:** identical to run 1 (shortlists, liveness files, persona plus `employer_tiers`).
- **Commands:** the sample, pass 1 and pass 2 commands from run 1, verbatim.
- **Outputs:** runs/{sample,worked-2026-10-03/pass1,pass2}/ regenerated. roles.json, role-scores.json and role-scores.md are unchanged (empty git diff); the pm-triage-log/report gain `employer_tier` and the "Employer tiers to confirm" section.
- **Result:** sample 10 → Apply 1 · Consider 4 · Skip 1 · HOLD 4; pass 2 14 → Apply 2 · Consider 7 · Skip 1 · HOLD 4 (same as run 1). Tests 16/16 at re-run time (17/17 after the scorer-finding test).
- **Gate decisions:** G1 — Aravind Ravi confirmed the Robinhood→ROBINHOOD MARKETS INC, Notion→NOTION LABS INC and Ramp→RAMP BUSINESS CORP matches and the refusal to map Anthropic (2026-10-03). G2 — the 3 uncertain postings deliberately left on HOLD by Aravind Ravi (2026-10-03). G4 — open.
- **Tier confirmation:** the AI-predicted tier list (53 companies: 4 in tier 1, 14 in tier 2, 22 in tier 3, 13 in tier 4) was reviewed and confirmed by Aravind Ravi on 2026-10-03 and copied into persona.employer_tiers (your-input).
- **Open issues:** the tier predictions reflect model knowledge as of mid-2026 and may go stale. Scorer finding by Aravind Ravi: a missing sponsorship term still yields Consider (0.21); guarded by HOLD, pinned by test.
- **Tests:** 17/17.
