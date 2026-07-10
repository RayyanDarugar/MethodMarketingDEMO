# Creative & design agencies — simulation design brief

Adapted from the industry-gtm-brief pipeline: the "product" is Method
Marketing's Simulate step, so each stage ends with a **Simulation angle**
instead of a Kana angle, and the synthesis produces a simulation-archetype
spec instead of a GTM map.

## Stage 0 — Ground truth: the simulation contract

Every Method Marketing simulation must support (from `lib/content` +
`Simulation.tsx`):

- A fictional category-archetype tool (never a real vendor) the learner works inside
- Locked "contract" fields the learner cannot change
- ONE consequential numeric decision (slider: label/unit/min/max/default)
- A secondary 2–4 option priority-style control, each option annotated good/warn
- A live forecast that reacts to the slider: per-integer-value rows with two
  tension metrics + an average, telling a low/balanced/high trade-off story
- Decision bands mapping slider values → outcomes (low / balanced / high),
  where "balanced" is the win
- Outcome screens with verdict, summary, risk callout, coaching

Target role for this brief: **creative director / account lead at a
creative or design agency**. Deliverable: the ideal simulation archetype
(what tool it looks like, what the decision is, what the forecast shows).

---

## Stage 1 — Industry economics

**Business models (2–4 dominant):**
- **Retainers** — recurring monthly fee; 60–70% contracted recurring revenue is
  the stability benchmark for planning headcount (Mueller Group, 2025).
  Margin improves months 4–5 as delivery gets efficient (Sidekick, 2025).
- **Project fees** — strong margins when scoped well, but "hidden costs
  accumulate: extra revision rounds, unclear briefs, client feedback delays,
  scope additions never priced" (Sidekick, 2025). Income spikes and dips.
- **Hybrid** (baseline retainer + scoped projects) — the 2025 small-agency
  norm (Taskip/Creativepool, 2025); value-based retainers emerging.

**Margin structure:**
- Average digital agency after-tax net margin: **13% (2025)**, down from 14%
  in 2024; long-run ~15% (Promethean Research, 2025).
- Specialist design agencies: 25–40% net; generalists 15–20%; design
  agencies posted the highest average net margin in 2025 (iota-finance, 2026).
- Healthy targets: 50%+ gross/delivery margin, 15–25% net. Labor = 50–70%
  of revenue — the dominant cost (Swydo, 2025/26).

**Utilization (the industry's core operating number):**
- Producers: 75–85% billable weekly; agency-wide ~50–60% annually
  (tmetric, 2025). Target band 65–80%; **above 85% = "one sick employee away
  from delivery failure"; 90%+ = burnout inevitable** (Swydo, 2025). Below
  65% = too much non-billable time.

**Scope creep / revisions (the profit leak):**
- 57% of agencies lose $1K–$5K/month to unbilled work; 30% lose >$5K; only
  **1% bill for all out-of-scope work**; 78% rarely/sometimes charge for it
  (Ignition survey of 273 agency managers, 2025).
- ~52% of projects experience scope creep; 85% of those exceed budget by an
  avg 27% (PMI, cited 2025) — enough to erase a 13%-margin engagement.
- 63% of US agencies report unpredictable cash flow; 82% delaying growth
  plans because of it (Ignition, 2025).

**Structurally different from ad-ops:** the unit of scarcity is *people-hours*
(utilization), not budget/impressions. The trade-off engine is
revisions/scope vs. margin vs. client satisfaction, not reach vs. frequency.

**Simulation angle:** The role's daily tension is a *numeric* one the
simulation contract fits perfectly: how many revision rounds / how much
scope to concede on a fixed-fee engagement. Too rigid → client satisfaction
and renewal risk; too generous → utilization burns, margin evaporates
(27%-overrun stat). The forecast's two tension metrics map naturally to
**projected margin** vs **client-satisfaction/renewal likelihood**, with
team utilization as the averaged third stat (analog of avgFrequency).

---

## Stage 2 — Org map (agency-side)

| Title | Tribe | Exists? | Notes |
|---|---|---|---|
| Creative Director | creative leadership | ✅ core | Reviews/approves all art & copy; senior client contact; "responsible for all creative operations for their group of accounts" (Celarity/AFTA JDs, 2026) |
| Account Director / Account Lead | client services | ✅ core | Owns scope: "prepare change orders, creative briefs… negotiate and represent agency in discussions of client change/addition orders of scope" (Velvet Jobs/PPK JDs) |
| Art Director / Designer | creative | ✅ | Submits work into review |
| Producer / Project Manager | ops | ✅ | Timelines, resourcing, traffic |
| Brand/Category Manager | — | ❌ client-side | False friend: lives at the brand, not the agency |
| Media buyer/trader | — | mostly ❌ | Only at full-service shops; design studios have none |

**Simulation angle:** the seat to simulate is the CD/account-lead hybrid at
review time — the person who both approves creative AND owns the scope
conversation. Both JDs converge on the same screen: the review/approval
queue plus the engagement's budget/scope state.

## Stage 3 — Role workflow (CD / account lead)

Planning → briefing → **creation → internal review → client review →
revisions → approval** → launch/wrap. The mid-flight loop is the job:

- Standard practice: **2–3 revision rounds** is the healthy norm; "beyond
  three rounds you're likely experiencing diminishing returns"; agencies
  "agree the number of creative rounds up front (e.g. two post-internal, two
  with client) and stick to it to avoid endless loops" (Ziflow/PageProof/
  Filestage guides, 2025–26).
- Review participants: designer submits → CD evaluates craft → brand manager
  checks guidelines → stakeholders/legal → client approval (SizeIM, 2025).
- The account lead coordinates client approval and decides, when the client
  asks for "one more pass," whether it's a change order, goodwill, or a
  scope swap (Stage 1: only 1% bill all out-of-scope work).

**Simulation angle:** the consequential decision is *the revision policy on
a fixed-fee engagement*, exercised mid-flight when the client pushes past
the agreed rounds. It's numeric (rounds), bounded (1–6 is the realistic
band), and has a canonical trade-off curve — exactly the frequencyCap shape.

## Stage 4 — Tool stack

| Role | Literally open on screen | Gap/opportunity |
|---|---|---|
| CD | Proofing/review board: Ziflow, Frame.io, PageProof, Filestage — proof cards, version stacks (v1/v2/v3), comment pins, approve/request-changes buttons | Cross-tool status lives in Slack + memory |
| Account lead | PM/agency mgmt: Workamajig, Scoro, Asana; budget-burn + margin views | Scope decisions tracked in email threads |
| Producer/ops | Resource planning: Float ("most widely used dedicated resource scheduler for creative agencies"), Scoro "utilization heatmap showing who's overbooked", capacity dashboards "warnings firing when someone is over their limit" (AgencyPro) | Utilization vs. promise mismatch |

**Simulation angle:** the fictional tool is a **proofing/review board fused
with an engagement-health sidebar** — Ziflow × Float. Kanban-ish review
columns (In design / Internal review / Client review / Approved), proof
cards with version chips and comment counts, plus a sidebar showing budget
burn, team utilization, and the revision-policy control. Completely
distinct visual language from the ad-ops dashboard: cards and thumbnails,
not tables and line items.

## Stage 5 — Deliverables inventory

| Deliverable | Owner | Cadence | Manual assembly? |
|---|---|---|---|
| Creative concepts / proofs (per round) | CD | per project round | The core artifact |
| Change orders | Account lead | per scope event | Yes — usually email + PDF |
| Client status/burn report | Account lead / producer | weekly | Yes — pulled from PM + finance tools |
| Wrap report | Account lead | per engagement | Yes |
| Utilization/capacity report | Ops | weekly | Semi (Float/Scoro dashboards) |

## Stage 6 — Pressures & politics (2025–26, sourced)

- **In-housing wave:** 32% of brands expect nearly all creative in-house
  within 12 months; another 23% at least half (eMarketer/Adweek, 2026).
  60% of US senior marketing leaders spent less on agencies in 2025 as a
  direct result of AI; brands cite paying ~60% more for the same team
  externally (eMarketer, 2025–26).
- **AI price pressure:** AI-enabled undercutting; 45% of creatives say
  clients "sometimes" request AI for speed/budget, 18% say it's now a
  frequent expectation (Creative Boom survey, 2026). Indies rethinking how
  they charge as AI alters the cost of creative (Digiday, 2026).
- **Burnout:** 69% experienced burnout in the past 12 months; 77% among
  mid-career creatives (Creative Boom, 2026). Ties directly to the >85%
  utilization red line (Stage 1).
- **Throughline pressure:** "every free revision is margin you'll never get
  back — and the client can now ask an AI for a cheaper pass." Scope
  discipline is existential, but so is the relationship: churn one retainer
  client and the in-housing wave means they may never come back.

**Simulation angle:** the outcome screens write themselves: too-rigid
revision policy → client feels nickel-and-dimed → renewal risk in an
in-housing market; too-loose → margin erased (27% overrun stat) + team
pushed past the 85% utilization red line (burnout). "Balanced" = the
2–3-round norm with a change-order path.

## Stage 7 — Synthesis: the archetype spec

**Archetype: `studioBoard` — creative review & scope console**

| Simulation contract slot | Creative-agency mapping |
|---|---|
| Fictional tool | "ProofDesk"-style review board (never Ziflow/Frame.io by name) |
| Locked contract fields | Engagement: client, fixed fee, deliverables count, deadline, rounds sold |
| ONE numeric decision (slider) | **Revision rounds allowed on this engagement** (min 1 – max ~6, default from bands) |
| Secondary 2–4 option control | Out-of-scope handling: "Change order" (good) / "Absorb as goodwill" (warn) / "Swap scope" (warn) |
| Forecast metrics (two tensions + avg) | **Projected margin %** ↓ as rounds ↑ vs **client renewal likelihood %** ↑ then plateau; avg stat = **team utilization %** climbing toward the 85% red line |
| Decision bands | 1 round = "low" (relationship risk); 2–3 = "balanced" (win); 4+ = "high" (margin/burnout risk) |
| Outcome vocabulary | margin erased, unbilled work, utilization red line, renewal at risk, change order |
| Visual language (build target) | Card board with columns (In design / Internal review / Client review / Approved), proof thumbnails, version chips (v1 v2 v3), comment-pin counts, engagement-health sidebar (budget burn bar + utilization bar), settings panel hosting slider + policy control |

**Copy ingredients bank (for module generation prompts):**
- Stats: 57% of agencies lose $1–5K/month to unbilled work (Ignition 2025);
  only 1% bill all out-of-scope work (Ignition 2025); 85% of scope-crept
  projects exceed budget by avg 27% (PMI); >85% utilization = delivery
  failure risk (Swydo 2025); 69% burnout (Creative Boom 2026); 32% of
  brands going nearly all in-house (eMarketer 2026).
- Named deliverables: change order, proof, wrap report, burn report.
- Jargon: rounds, proofs, versions (v1/v2/v3), markup/annotations, scope
  creep, change order, utilization, burn, retainer, goodwill work, WIP.
- Pressure hooks: "Every free round is margin you never get back." /
  "The client can ask an AI for a cheaper pass now — and they know it." /
  "One sick designer away from a missed deadline."

**Sources:** Ignition 2025 agency pricing/cashflow report; Promethean
Research 2025; Swydo agency profitability guide; tmetric benchmarks 2025;
iota-finance 2026; PMI (via Alto Accounting 2025); Ziflow/PageProof/
Filestage/SizeIM workflow guides 2025–26; Float/Scoro/AgencyPro product
docs; eMarketer ad-agency FAQ + trends 2026; Adweek in-housing 2026;
Creative Boom state of the creative industry 2026; Digiday 2026; Indeed/
Workable/Celarity/Velvet Jobs/PPK job descriptions 2025–26.
