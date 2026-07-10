# Fintech (B2B SaaS) — Account Executive simulation design brief

Same adapted pipeline as `creative-agencies-sim-brief.md`: stages end in a
**Simulation angle**; synthesis produces a simulation-archetype spec.

## Stage 0 — Ground truth

Simulation contract: identical to the creative-agencies brief (fictional
tool, locked contract fields, ONE numeric slider, 2–4 option secondary
control, per-integer forecast with two tension metrics + average, decision
bands low/balanced/high, outcome screens).

Target role: **Account Executive at a B2B fintech** (payments,
banking-infrastructure, spend-management SaaS). Deliverable: the ideal
simulation archetype.

---

## Stage 1 — Economics of the seat

- **Discounting is the margin lever:** ~80% of SaaS companies discount 25%+
  to acquire customers; customers acquired at 30%+ discount churn at
  **4.2× the rate** of full-price customers (Stripe, cited 2025–26).
  Standard annual discount ≈ 16.7% ("two months free"); enterprise deals
  10–20% negotiated; ~23% average off-list for 3-year commits
  (Monetizely/softwarepricing, 2025–26).
- **Win rates are brutal and falling:** 19% average in 2025, down from 29%
  in 2024 (Ebsta × Pavilion); enterprise deals >$100K sit at 15–18% median.
  "If your win-rate lift from discounting is under 5 points, you're giving
  away margin for nothing" (zenitdata, 2026).
- **Fintech-specific drag:** sales cycles 12–24 months by segment, with
  compliance review adding 2–4 months after the deal is "won" — compliance
  can kill a won deal (prospeo/vidpros, 2026). CAC payback averages
  **18–24 months** in B2B fintech vs 5–7 for elite SaaS (revnew/ltvcacbook,
  2026) — every extra discount point stretches an already-long payback.
- Funding recovering but selective: $11.1B across 466 US deals Q1 2026,
  +16% YoY; diligence deeper, economics scrutinized (banksandbankers, 2026).

**Simulation angle:** the AE's consequential numeric decision is **the
discount on a live quote**. The trade-off curve is canonical: too little →
lose a >$100K deal in a 19%-win-rate market; too much → 4.2× churn cohort,
CAC payback blows past 24 months, and deal desk bounces the quote anyway.

## Stages 2–3 — Org map & role workflow

| Title | Exists? | Notes |
|---|---|---|
| Account Executive | ✅ core | Quota-carrying; owns opportunities Discovery → Closed |
| Deal Desk analyst | ✅ at scale | "Owns pricing strategy and governance… discount guardrails and approval matrices" (Impact/Greenhouse JD, DealHub) |
| Sales Engineer | ✅ | Demo/security review support |
| SDR/BDR | ✅ | Pipeline supply upstream |
| Compliance/Legal | ✅ fintech-heavy | The post-"won" gauntlet (2–4 months) |

Workflow: pipeline reviews inspect specific deals, not roll-ups; every opp
needs close date, amount, stage; stages map to forecast categories
(Commit/Best Case/Open) (Salesforce docs/coefficient, 2025). Mid-deal, the
AE builds a quote; discount beyond threshold auto-routes for approval:
**">15% discount or >$100K → VP sign-off"** is the canonical matrix
(fastslowmotion/cflowapps/Salesforce CPQ guides, 2025). Deal desk reviews
exceptions and non-standard terms.

**Simulation angle:** the moment to simulate is the quote before the
forecast call: a competitor-pressured prospect, a quota clock, and a
discount slider whose upper range triggers an approval gate — the approval
threshold IS a decision band boundary.

## Stage 4 — Tool stack

| Role | Literally open | Gap |
|---|---|---|
| AE | Salesforce opportunity record + Pipeline Inspection (Commit/Best Case buckets, stage path); CPQ quote builder with line items, discount field, approval status | Give/get tradecraft lives in Slack + manager lore |
| Deal desk | CPQ approval queue; margin/guardrail dashboards | — |

The CPQ experience: rep enters discount → system validates against
thresholds → exceeding routes to manager/VP automatically (LST/DealHub,
2025).

**Simulation angle:** the fictional tool is an **opportunity + quote
console**: stage-path chevrons across the top (Discovery → Demo →
Negotiation → Contract), locked deal facts (prospect, seats, list price,
term), a quote panel with the discount slider, a live "approval status"
chip that flips to "requires VP sign-off" past the threshold, and a
forecast panel. Visual language: CRM record + stage path — nothing like
the ad-ops dashboard or the studio board.

## Stage 5 — Deliverables

Quote/order form (per deal, CPQ), mutual action plan, forecast call
prep (weekly), QBR deck (quarterly), handoff-to-implementation doc.

## Stage 6 — Pressures

- Quota with a 19% win rate and shrinking pipelines; discounting as the
  path of least resistance ("discount expectation cycle — customers learn
  to wait for deals," Monetizely 2025).
- Deal desk friction vs. quarter-end pressure; "compliance can kill a deal
  that was already won" (vidpros 2026).
- CAC payback = cash runway in a selective funding market: "marketing
  investment and cash runway decisions are the same decision" (revnew 2026).
- Throughline: **the discount you give today is the churn and payback
  problem your company inherits for two years.**

## Stage 7 — Synthesis: the archetype spec

**Archetype: `dealDesk` — pipeline opportunity & quote console**

| Simulation contract slot | Fintech-AE mapping |
|---|---|
| Fictional tool | "PipelineHQ"-style CRM/CPQ console (never Salesforce by name) |
| Locked contract fields | Opportunity: prospect, seats/volume, list price (ACV), term, stage, competitor note, quota gap |
| ONE numeric decision (slider) | **Discount %** on the quote (0–15, integer steps, default ~8) |
| Secondary 2–4 option control | The give/get: "Multi-year term in exchange" (good) / "Discount with no give" (warn) / "Throw in free implementation" (warn) |
| Forecast metrics | **Win probability %** (rises, then plateaus past ~12%) vs **first-year margin / NRR outlook %** (falls, cliff past the churn-risk threshold); avg stat = **CAC payback (months)** stretching toward 24 |
| Decision bands | 0–4% = "low" (deal lost to competitor); 5–11% = "balanced" (won, healthy cohort); 12%+ = "high" (won but 4.2× churn cohort + VP-approval bounce) |
| Approval-gate flourish | Past ~12%, an "exceeds guardrails — routes to VP" chip appears (thresholds from Stage 3) |
| Outcome vocabulary | win rate, guardrails, give/get, NRR, churn cohort, payback, clawback, sandbagging |
| Visual language (build target) | Stage-path chevrons, opportunity header card, quote line-item table, discount slider + approval chip, forecast panel, activity timeline |

**Copy ingredients bank:** 4.2× churn at 30%+ discounts (Stripe); 80%
discount ≥25% (2025); 19% avg win rate, down from 29% (Ebsta×Pavilion
2025); >15%/> $100K → VP approval (CPQ guides 2025); 16.7% = "two months
free"; fintech compliance adds 2–4 months post-win; CAC payback 18–24mo.
Jargon: opp, stage, commit, best case, give/get, guardrails, deal desk,
CPQ, clawback, NRR, ACV, payback.

**Sources:** Monetizely SaaS pricing benchmark 2025; softwarepricing.com
2026; zenitdata win-rate benchmarks 2026; Ebsta × Pavilion (via zenitdata)
2025; Stripe churn stat (via discount-strategy roundups, 2025–26);
DealHub deal-desk/approval glossaries; fastslowmotion/cflowapps/LST CPQ
approval guides 2025; Salesforce Pipeline Inspection docs; prospeo fintech
sales 2026; vidpros fintech compliance playbook 2026; revnew CAC guide
2026; ltvcacbook CAC benchmarks 2026; banksandbankers funding 2026;
Impact deal-desk-analyst job posting (Greenhouse).
