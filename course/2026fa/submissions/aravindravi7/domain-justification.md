# Domain justification — PM sponsor title-match

## Executive summary

This page explains who the recipe is for, what they can't see without it, and where it saves time in a job-search day. The short answer: an international master's student aiming for product-manager jobs can easily find out *whether a company sponsors visas*. What they can't easily find out is *whether it sponsors product managers*. That is a different, rarer fact, and getting it wrong costs tailoring hours.

## Who, exactly

An international MS in Information Systems student (Boston) on F-1 OPT with a STEM extension running into 2029. They target **Product Manager, Technical Product Manager, and AI Product Manager** roles. They want H-1B-sponsoring employers first, and will take a non-sponsor role as a second tier because STEM OPT gives them time. They are not a software engineer, and that is the point: engineer-shaped sponsor lists mislead them.

## The information asymmetry

From outside, this student can see that Databricks has 1,640 H-1B approvals and Robinhood 824. They cannot see that every title the dataset stores for those two companies is an engineering, solutions, or accounting title. Stripe, with fewer approvals, has "Product Manager" on record. In the repo's 80 Days CSV:
- 1,552 companies have at least one approval.
- Only 151 (9.7%) list any product- or program-manager title: 129 product, 25 program, some both.
- 862 store just one title, so for most companies the honest answer is "unknown for PMs".

Three more things they can't see:
- "TPM" means two different jobs.
- A PM role can be filed under SOC codes whose national medians range from $100,750 to $171,200, and the posting never says which.
- On STEM OPT, the deadline that actually binds is the 150-day unemployment allowance, not the OPT end date.

## Engine layers

- **80 Days to Stay:** approvals, denials, sponsored titles, and funding from the mapped CSV; Form D samples for recency.
- **Job-Ops:** `ats:scan` to find PM postings and `ats:liveness` as the liveness gate.
- **Cognitive Pivot:** BLS medians, shown as context with weight 0. Fact 1 is addressed rather than ignored.

All of it flows into the existing Ch.11 scorer, unmodified.

## Where it fits the 3-3-2 day

It takes over the **research half of the two research-and-apply hours**: the per-posting "do they sponsor people like me, is this posting real, can I start in time" check. It also **feeds the three networking hours**. Every "Consider: Possible" row becomes a concrete question for a PM at that company ("are PM roles filed for H-1B here?"), and every dead posting at a proven PM sponsor becomes an informational-interview target.

**Time saved (my estimate, not measured).** By hand, I'd spend about 15–20 minutes per posting on sponsorship research (searching an H-1B database, reading title lists, checking the posting is open). At about 30 postings a week, that's 7.5–10 hours. With the recipe, a 30-posting run plus resolving holds is about 45–60 minutes, so it saves roughly **6–9 hours a week**. That figure assumes the shortlist is already chosen and doesn't count the networking time it creates. I have not timed a real week.

## Domain-specific failure modes

1. **A real PM sponsor shown as "Possible" or "None"** because the dataset stores only top titles, or no record at all (Ramp). The error makes a good employer look like a non-sponsor, pushing it to the networking or fallback tier. *Hardest to catch for* the student under time pressure, because the report looks complete and sorted. The ⚠ thin flag and the "absence, not proof" wording are the only defenses until per-filing LCA data is added.
2. **Entity confusion that looks like evidence.** A brand name matching an investment-fund vehicle (Anthropic), or one DOL record joined onto both an INC and an LLC (Peloton Interactive, 310 approvals each). A fuzzy matcher would produce a confident, sourced-looking number that's wrong. *Hardest to catch for* anyone who trusts "record" labels without opening the row. The recipe allows exact matches only and puts everything else on hold.
