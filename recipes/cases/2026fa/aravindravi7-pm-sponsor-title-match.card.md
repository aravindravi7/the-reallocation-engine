# PM sponsor title-match — human card

**Audience:** an international student on STEM OPT deciding which product-manager postings deserve tailoring time today.
**Agent twin:** `recipes/cases/2026fa/aravindravi7-pm-sponsor-title-match.md`
**Engine layers:** 80 Days to Stay (sponsorship), Job-Ops (scan + liveness), Cognitive Pivot (wages, context only). Feeds the Ch.11 scorer unchanged.

## Executive summary

A company that sponsors hundreds of engineers may never have sponsored a product manager. This card explains how to read the recipe's report. It covers what each decision means, which parts come from records and which from your own inputs, and the five ways it can mislead you. The most important rule: a "Possible" sponsor is a reason to *ask someone*, not a reason to apply.

## Purpose

Answer: *for this posting, does the employer's sponsorship record show a product- or program-manager title, is the posting open, and does the timeline fit my STEM OPT allowance?* Where the record cannot answer, the tool says **HOLD** and tells you why. It never fills in a guess.

## What it can verify

- The exact sponsorship-dataset row it used, and whether it was matched by name or by a `csv_name` you supplied.
- That company's approvals, denials, and the stored sponsored-title strings, quoted in the report so you can read them yourself.
- How many titles the dataset stores for that company. "⚠ thin" means 2 or fewer.
- What the liveness checker said about that exact URL.
- Whether the company appears in the shipped SEC Form D sample, with accession numbers.
- BLS national median pay for each SOC code a PM role might be filed under.

## What it cannot verify

- A PM sponsorship that is not among the company's *top* stored titles. Over half of sponsors have only one title stored.
- That a company with no H-1B record does not sponsor. The dataset only covers companies matched to SEC filings.
- Which SOC code (and therefore which prevailing-wage level) the employer would use for a PM role.
- E-Verify enrollment. STEM OPT requires it, so **check it yourself before applying.**
- What the employer pays, or whether it will sponsor you now.

## Annotated commands

Sample run on fixtures plus real repo data, no network. Expect 10 evaluated: Apply 1, Consider 4, Skip 1, HOLD 4.

```bash
node scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/pm-sponsor-triage.mjs --sample
```

Offline tests. Expect 17 pass.

```bash
node --test scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/test/
```

Find real PM postings at the configured boards. This writes to `data/ats/`, which stays private.

```bash
REALLOCATION_ENGINE_PORTALS=scripts/contrib/2026fa/aravindravi7-pm-sponsor-title-match/fixtures/portals.pm-sponsors.yml npm run ats:scan
```

Liveness. It exits 1 if anything is not active. That is normal; keep the file.

```bash
npm run ats:liveness -- --file urls.txt > liveness.txt
```

## How to read a row

| You see | It means | You do |
|---|---|---|
| **Apply**, Proven | A PM-family title in the same family is on the company's sponsorship record, the posting is live, and the timeline fits | Check E-Verify, then tailor (2-hour block) |
| **Consider**, Possible | The company sponsors visas, but no PM title is stored | Message a PM there first (networking block). Ask how PM roles are filed. |
| **Consider**, Likely | The other PM family is on record (e.g. Product Manager sponsored, posting is Technical *Program* Manager) | Same: ask whether this title is filed the same way |
| Consider/Skip, None, "non-h1b-fallback" | No H-1B record in this dataset, but a live posting you rated a strong fit | Second tier, only after sponsor-tier roles. Your call. |
| **Skip**, gated timeline | The start date is beyond your remaining unemployment days | Revisit only if you're employed by then |
| **Skip**, gated liveness, Proven | The posting is dead, but the company is a PM sponsor | Add to the informational-interview list |
| Employer tier 1–4 | 1 frontier AI lab · 2 FAANG/top high-tech · 3 other tech · 4 non-tech. A plain number is *your* ranking; "(predicted)" or "(guess)" means an AI or a rule guessed it. | Use it to choose *within* a group; confirm guesses by adding the company to your list. It never moves a posting between Apply, Consider and Skip. |
| **HOLD** | Something couldn't be verified | Do exactly what the reason says, record it in the shortlist with your name, re-run |

## Named failure modes (domain-specific)

1. **Brand name ≠ legal name, and the investment-fund trap.** "Robinhood" is `ROBINHOOD MARKETS INC` in the data. "Anthropic" appears only inside an investment-fund series name. A loose name match would attach a fund's empty record to an AI lab and push a real employer into the non-sponsor tier. *Hardest to catch for:* a student who sees a confident "None" and never asks where it came from. *Mitigation:* exact matching only; anything else is a HOLD that you resolve and log.
2. **The thin-record trap.** "Possible" usually means "the dataset stored one title, and it was an engineering title", not "doesn't sponsor PMs". *Hardest to catch for:* anyone skimming tiers instead of reading the quoted titles. *Mitigation:* the ⚠ thin flag, plus the title strings printed in every row.
3. **The TPM ambiguity.** "TPM" is Technical Product Manager to one recruiter and Technical Program Manager to another. Sponsorship filings use both. *Mitigation:* a bare "TPM" or "PM" is counted as neither family and shown to you.
4. **A real sponsor with no record.** Ramp matches `RAMP BUSINESS CORP` with no approvals stored. If Ramp does sponsor, this tool still files it as non-sponsor fallback. *Hardest to catch for:* the student, because the report looks complete. *Mitigation:* the report says "absence, not proof"; the proposed LCA data source would close this.
5. **Liveness `uncertain` on company-hosted career pages.** In the worked run, Datadog and MongoDB came back `uncertain` (no visible apply button) on their own career sites, and again on the Greenhouse URLs. *Mitigation:* HOLD until a named person opens the page.

## Where it fits the day

This replaces the per-posting sponsorship research inside the two research-and-apply hours, and turns "Consider" results into specific networking asks for the three networking hours. Time saved is an estimate, not a measurement: see the domain justification.
