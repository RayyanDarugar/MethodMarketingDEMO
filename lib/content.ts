/**
 * All lesson content, terms, simulation configuration, decision logic, and
 * outcome copy for every vertical. Components are presentation-only and read
 * from this file, so a later version can swap this static data for an API
 * response without touching the component layer.
 */

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export type SceneId =
  | "intro"
  | "lesson"
  | "briefing"
  | "simulation"
  | "outcome"
  | "payoff";

export type PhaseId = "learn" | "simulate" | "produce";

export interface Phase {
  id: PhaseId;
  label: string;
  scenes: SceneId[];
}

/** Ordered scene sequence the store walks through. */
export const SCENE_ORDER: SceneId[] = [
  "intro",
  "lesson",
  "briefing",
  "simulation",
  "outcome",
  "payoff",
];

/** The persistent Learn → Simulate → Produce arc shown in the stepper. */
export const PHASES: Phase[] = [
  { id: "learn", label: "Learn", scenes: ["intro", "lesson"] },
  { id: "simulate", label: "Simulate", scenes: ["briefing", "simulation", "outcome"] },
  { id: "produce", label: "Produce", scenes: ["payoff"] },
];

export function phaseForScene(scene: SceneId): PhaseId {
  return PHASES.find((p) => p.scenes.includes(scene))?.id ?? "learn";
}

// ---------------------------------------------------------------------------
// Lesson
// ---------------------------------------------------------------------------

/** A scripted question-and-answer pair attached to a lesson card. */
export interface FollowUp {
  question: string;
  answer: string;
}

export interface Term {
  term: string;
  definition: string;
  whyItMatters: string;
  /** How the word actually sounds in the wild — quoted, verbatim. */
  heardAs: string;
}

export interface FlowStage {
  id: string;
  name: string;
  tagline: string;
  detail: string;
  /** What this player loses sleep over. */
  worry: string;
}

export interface Pressure {
  title: string;
  body: string;
  /** What it costs when this goes wrong — short, concrete. */
  consequence: string;
}

export interface TimelineEntry {
  time: string;
  label: string;
  detail: string;
}

interface LessonCardBase {
  id: string;
  eyebrow: string;
  title: string;
  /** One-line orientation shown at the top of the expanded card. */
  lede: string;
  /** Suggested questions the learner can tap; also the scripted answers. */
  followUps: FollowUp[];
  /** Reply for free-text questions the script can't match. */
  fallbackAnswer: string;
}

export type LessonCard =
  | (LessonCardBase & { kind: "flow"; stages: FlowStage[] })
  | (LessonCardBase & { kind: "terms"; terms: Term[] })
  | (LessonCardBase & { kind: "pressures"; pressures: Pressure[] })
  | (LessonCardBase & { kind: "timeline"; entries: TimelineEntry[] });

export interface LessonContent {
  title: string;
  subhead: string;
  cards: LessonCard[];
  cta: string;
}

// ---------------------------------------------------------------------------
// Briefing — the primer between lesson and simulation
// ---------------------------------------------------------------------------

export interface QuizOption {
  label: string;
  correct: boolean;
  feedback: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

export interface BriefingContent {
  eyebrow: string;
  title: string;
  mission: string[];
  decisions: { label: string; summary: string }[];
  objectives: { label: string; detail: string }[];
  quizTitle: string;
  quiz: QuizQuestion[];
  cta: string;
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export interface SimNavItem {
  label: string;
  active?: boolean;
  badge?: string;
}

export interface SimNavSection {
  section: string;
  items: SimNavItem[];
}

export interface PriorityOption {
  value: string;
  label: string;
  description: string;
}

/** Forecast the ad server shows for a given frequency cap. */
export interface Projection {
  reachPct: number;
  deliveryPct: number;
  avgFrequency: number;
}

export interface SimulationConfig {
  /** Name of the fictional ad server the learner is dropped into. */
  productName: string;
  environmentLabel: string;
  nav: SimNavSection[];
  breadcrumb: string[];
  taskTitle: string;
  taskBrief: string;
  campaign: {
    lineItemName: string;
    advertiser: string;
    budget: number;
    currency: string;
    impressionsGoal: number;
    cpm: number;
    flight: string;
  };
  frequencyCap: {
    label: string;
    unit: string;
    helper: string;
    min: number;
    max: number;
    default: number;
  };
  priority: {
    label: string;
    helper: string;
    options: PriorityOption[];
    default: string;
  };
  /** Live forecast readout, keyed by frequency cap. Drives outcome metrics too. */
  forecast: {
    label: string;
    disclaimer: string;
    byCap: Record<number, Projection>;
  };
  launchLabel: string;
}

// ---------------------------------------------------------------------------
// Decision logic + outcomes
// ---------------------------------------------------------------------------

export type OutcomeKey = "low" | "balanced" | "high";

/**
 * Frequency-cap bands, evaluated in order; the first band whose max is >= the
 * chosen cap wins. Adding or tuning bands is a data change only.
 */
export interface DecisionBand {
  max: number;
  outcome: OutcomeKey;
}

export interface DecisionLogic {
  input: "frequencyCap";
  bands: DecisionBand[];
  /** Fallback when the value exceeds every band's max. */
  fallback: OutcomeKey;
  /** Metric tones are derived from these thresholds. */
  thresholds: {
    reachGoodAt: number;
    frequencyWasteAt: number;
  };
  /** Secondary flavor line keyed to the chosen priority option. */
  priorityNotes: Record<string, { tone: "good" | "warn"; text: string }>;
}

export interface OutcomeMetric {
  label: string;
  value: string;
  tone: "good" | "warn" | "neutral";
}

export interface OutcomeResult {
  key: OutcomeKey;
  status: "win" | "risk";
  verdict: string;
  summary: string;
  /** Amber callout; omitted on the win state. */
  risk?: { title: string; body: string };
  coaching: string;
}

/** An OutcomeResult joined with the numbers for the cap actually chosen. */
export interface EvaluatedOutcome extends OutcomeResult {
  reachPct: number;
  deliveryPct: number;
  metrics: OutcomeMetric[];
}

// ---------------------------------------------------------------------------
// Assistant + payoff
// ---------------------------------------------------------------------------

export interface AssistantScript {
  buttonLabel: string;
  /** Scripted nudges, revealed one at a time. */
  lines: string[];
}

export interface EmailCard {
  label: string;
  sublabel: string;
  subject: string;
  /**
   * Paragraphs. Substrings wrapped in [[double brackets]] are domain terms
   * and render highlighted.
   */
  body: string[];
}

export interface PayoffContent {
  headline: string;
  subhead: string;
  before: EmailCard;
  after: EmailCard;
  completion: { title: string; body: string };
  restartLabel: string;
}

// ---------------------------------------------------------------------------
// Vertical
// ---------------------------------------------------------------------------

export interface Vertical {
  id: string;
  industry: string;
  role: string;
  intro: {
    eyebrow: string;
    headline: string;
    subhead: string;
    cta: string;
  };
  lesson: LessonContent;
  briefing: BriefingContent;
  simulation: SimulationConfig;
  decision: DecisionLogic;
  outcomes: Record<OutcomeKey, OutcomeResult>;
  assistant: AssistantScript;
  payoff: PayoffContent;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export interface SimulationChoices {
  frequencyCap: number;
  priority: string;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function projectionForCap(
  vertical: Vertical,
  cap: number
): Projection {
  const { byCap } = vertical.simulation.forecast;
  return byCap[cap] ?? byCap[vertical.simulation.frequencyCap.default];
}

export function evaluateSimulation(
  vertical: Vertical,
  choices: SimulationChoices
): EvaluatedOutcome {
  const { bands, fallback, thresholds } = vertical.decision;
  const band = bands.find((b) => choices.frequencyCap <= b.max);
  const result = vertical.outcomes[band ? band.outcome : fallback];
  const projection = projectionForCap(vertical, choices.frequencyCap);
  const budget = vertical.simulation.campaign.budget;
  const delivered = Math.round((budget * projection.deliveryPct) / 100);

  const metrics: OutcomeMetric[] = [
    {
      label: "Unique reach",
      value: `${projection.reachPct}% of target`,
      tone: projection.reachPct >= thresholds.reachGoodAt ? "good" : "warn",
    },
    {
      label: "Budget delivered",
      value: `${money.format(delivered)} of ${money.format(budget)}`,
      tone: projection.deliveryPct >= 100 ? "good" : "warn",
    },
    {
      label: "Avg. frequency",
      value: `${projection.avgFrequency.toFixed(1)} per user`,
      tone:
        projection.avgFrequency >= thresholds.frequencyWasteAt
          ? "warn"
          : projection.deliveryPct < 100
            ? "neutral"
            : "good",
    },
  ];

  return {
    ...result,
    reachPct: projection.reachPct,
    deliveryPct: projection.deliveryPct,
    metrics,
  };
}

export function priorityNote(vertical: Vertical, priority: string) {
  return vertical.decision.priorityNotes[priority];
}

// ---------------------------------------------------------------------------
// Vertical: ad-tech / media — campaign manager
// ---------------------------------------------------------------------------

const adTechMedia: Vertical = {
  id: "adtech-media-campaign-manager",
  industry: "Ad-tech / Media",
  role: "Campaign Manager",

  intro: {
    eyebrow: "Vertical 01 — Ad-tech / Media",
    headline:
      "You've been asked to market to media campaign managers. You don't know the role. Let's fix that.",
    subhead:
      "In the next few minutes you'll learn how the industry works, run the job yourself in a simulated ad server, and see what that understanding does to your own output.",
    cta: "Start learning the role",
  },

  lesson: {
    title: "The world a campaign manager lives in",
    subhead:
      "Four cards, each interactive. Open them all, poke at everything, and ask the coach when something doesn't click — the simulation ahead assumes you did.",
    cards: [
      {
        kind: "flow",
        id: "industry",
        eyebrow: "The industry",
        title: "How money becomes ads",
        lede: "Four players stand between a marketing budget and an ad on a page. Click each one to see what they do — and what they worry about.",
        stages: [
          {
            id: "advertiser",
            name: "Advertiser",
            tagline: "Has money and a goal",
            detail:
              "A brand — say, Atlas Cloud Software — commits a budget to reach a specific audience. They don't buy ads directly; they buy outcomes: awareness, pipeline, sales. The budget comes with a contract that says exactly what it must achieve.",
            worry:
              "Am I paying to reach new customers, or paying to show the same ad to the same people?",
          },
          {
            id: "agency",
            name: "Agency",
            tagline: "Turns money into a plan",
            detail:
              "The agency translates the budget into a media plan: which audiences, which sites, which formats, which dates, at what price. The output is an insertion order — the signed contract that locks in budget, impression goals, and flight dates.",
            worry:
              "If the plan under-performs, the client asks why we recommended it.",
          },
          {
            id: "adserver",
            name: "Ad server",
            tagline: "Decides who sees what",
            detail:
              "The decision engine. Billions of times a day, a page loads, several ads are eligible, and the ad server picks one in milliseconds based on targeting, priority, pacing, and frequency rules. This is the machine the campaign manager operates — the settings you give it are the campaign.",
            worry:
              "It doesn't worry. It does exactly what it's told — which is why the person telling it matters.",
          },
          {
            id: "publisher",
            name: "Publisher",
            tagline: "Owns the audience",
            detail:
              "The site or app people actually visit. Publishers sell their ad space two ways: direct contracts (guaranteed, premium) and programmatic auctions (automated, fills whatever is left). Campaign managers usually work here, in ad operations, making sure direct contracts deliver.",
            worry:
              "Every impression given away free as a makegood is revenue we already spent.",
          },
        ],
        followUps: [
          {
            question: "What's an insertion order?",
            answer:
              "The signed contract behind a campaign: this budget, this many impressions, these dates, this price. When sales closes one, a campaign manager turns it into line items in the ad server. That handoff — contract in, delivery settings out — is exactly what you'll do in the simulation.",
          },
          {
            question: "Which side does the campaign manager work on?",
            answer:
              "Usually the publisher side, in a team called ad operations (ad ops). Buy-side equivalents exist at agencies, but the classic campaign manager is the person who makes a publisher's signed deals actually deliver. In the simulation, that's your seat.",
          },
          {
            question: "How does anyone make money here?",
            answer:
              "Ads are priced per thousand impressions — a CPM. At a $12.50 CPM, a $45,000 budget buys 3.6 million impressions. The publisher earns it by serving them; the campaign manager's job is making sure all 3.6 million actually serve, to the right people.",
          },
        ],
        fallbackAnswer:
          "Good question — the honest answer is that it varies by company, and this lesson covers the version you need for the simulation: advertiser money flows through an agency's plan into an ad server, and the campaign manager operates that ad server on the publisher's behalf.",
      },
      {
        kind: "terms",
        id: "language",
        eyebrow: "The language",
        title: "Six words that run the job",
        lede: "You'll hear all six inside the simulation. Click each to see what it means, why it matters, and how it sounds in a real standup.",
        terms: [
          {
            term: "Line item",
            definition:
              "A single deliverable inside a campaign: this budget, these ad sizes, this audience, these dates. The unit of work a campaign manager actually configures and launches.",
            whyItMatters:
              "Everything a campaign manager sweats — pacing, priority, delivery — happens at the line-item level, not the campaign level.",
            heardAs:
              "\"The Atlas order has three line items and the display one is the problem child.\"",
          },
          {
            term: "Frequency cap",
            definition:
              "The maximum number of times one person is shown the same ad in a period — '3 per user per day'.",
            whyItMatters:
              "The core trade-off of the job. Too low and the budget can't spend; too high and it spends on the same eyeballs over and over.",
            heardAs: "\"Loosen the cap to 4 or we're not going to deliver.\"",
          },
          {
            term: "CPM",
            definition:
              "Cost per mille — the price of one thousand impressions. The unit ads are bought and sold in.",
            whyItMatters:
              "It's how budget converts to impressions: $45,000 at a $12.50 CPM is 3.6M impressions. Every delivery conversation is really a CPM conversation.",
            heardAs: "\"They signed at a twelve-fifty CPM, so don't discount the remnant.\"",
          },
          {
            term: "Pacing",
            definition:
              "Whether a line item is delivering on schedule — 50% of impressions served at 50% of the flight is 100% pacing.",
            whyItMatters:
              "Pacing is the early-warning system. A line item pacing at 60% halfway through a flight is a makegood forming in slow motion.",
            heardAs: "\"Everything's pacing green except the video line, which is at 82%.\"",
          },
          {
            term: "Makegood",
            definition:
              "Free ad inventory a publisher owes an advertiser when a campaign under-delivers on what was contracted.",
            whyItMatters:
              "The word that makes a campaign manager's stomach drop. Makegoods are refunds — lost revenue and an awkward client call.",
            heardAs: "\"If this doesn't recover by Friday we're talking makegood.\"",
          },
          {
            term: "Programmatic",
            definition:
              "Ad inventory sold automatically in real-time auctions rather than through a direct contract.",
            whyItMatters:
              "The opportunity cost. Every impression a direct line item takes is one that can't be auctioned — so over-serving a contract leaves programmatic revenue on the table.",
            heardAs:
              "\"Sponsorship priority on that line is crushing our programmatic yield.\"",
          },
        ],
        followUps: [
          {
            question: "Campaign vs. line item — what's the difference?",
            answer:
              "A campaign (or order) is the whole signed deal; line items are the deliverables inside it. One Atlas Cloud campaign might contain a display line item, a video line item, and a mobile line item — each with its own budget, targeting, and frequency cap. You manage line items; the client sees the campaign.",
          },
          {
            question: "Who actually pays for a makegood?",
            answer:
              "The publisher — in inventory rather than cash. Free impressions to compensate for the shortfall are impressions that could have been sold to someone else, so a makegood is real lost revenue. That's why under-delivery gets escalated fast.",
          },
          {
            question: "So what's a good frequency cap?",
            answer:
              "For awareness campaigns, most practitioners land between 2 and 4 impressions per user per day — enough repetition for the message to stick, enough headroom for the budget to spend. You're about to test that number yourself.",
          },
        ],
        fallbackAnswer:
          "That one's outside the six terms this card covers — but the six here (line item, frequency cap, CPM, pacing, makegood, programmatic) are the vocabulary the simulation uses, and honestly, the vocabulary that makes you sound credible in a first meeting.",
      },
      {
        kind: "pressures",
        id: "pressures",
        eyebrow: "The pressures",
        title: "What actually keeps them up",
        lede: "The job is a standing four-way tension. Expand each pressure — the consequences are what make the decisions in the simulation feel the way they do.",
        pressures: [
          {
            title: "Deliver the contract in full",
            body: "A signed insertion order is a promise: 3.6 million impressions by September 30. The ad server only delivers what its settings allow — set a frequency cap too tight or a priority too low, and the promise quietly breaks a few thousand impressions at a time.",
            consequence: "Under-delivery → makegood → refunded inventory and an awkward call",
          },
          {
            title: "Reach unique people",
            body: "Advertisers pay for new eyeballs, not the same person twelve times. Delivery alone isn't success — a line item can spend every dollar while reaching a third of the audience it should. The frequency report tells this story, and the client reads it.",
            consequence: "Wasted frequency → the first chart the client points at in the review",
          },
          {
            title: "Don't starve the auction",
            body: "Direct-sold line items outrank programmatic demand. Every impression a contract takes is one the open auction can't sell — so an over-prioritized line item doesn't just deliver, it quietly eats the revenue that fills the gaps between contracts.",
            consequence: "Over-prioritizing → programmatic yield drops → the revenue team notices",
          },
          {
            title: "Prove it with numbers",
            body: "Every buy-side meeting starts with the delivery report. The campaign manager who walks in with the pacing story already written — what dipped, why, what's being done — owns the room. The one who gets surprised by their own dashboard doesn't.",
            consequence: "No narrative → the client writes their own, and it's worse",
          },
        ],
        followUps: [
          {
            question: "Which pressure wins when they conflict?",
            answer:
              "Delivery, almost always — a makegood is a contractual, dollar-denominated failure, while wasted frequency is 'only' a quality problem. But the best campaign managers refuse the trade: they tune caps and priorities so the contract delivers AND the reach report looks good. That's the balance the simulation asks you to find.",
          },
          {
            question: "What happens after a makegood?",
            answer:
              "The publisher schedules free impressions to cover the shortfall, sales renegotiates the relationship, and the campaign manager writes the post-mortem. One makegood is a bad quarter; a pattern of them is how a publisher loses an advertiser.",
          },
        ],
        fallbackAnswer:
          "The four pressures on this card are the load-bearing ones — nearly everything else a campaign manager worries about (broken creatives, discrepancies, targeting gaps) matters because it eventually threatens delivery, reach, yield, or the reporting story.",
      },
      {
        kind: "timeline",
        id: "day",
        eyebrow: "A day in the seat",
        title: "Tuesday, mid-flight",
        lede: "Click through the day. Notice how much of it is watching numbers move — and how 10:00 is the hour you're about to live.",
        entries: [
          {
            time: "8:30",
            label: "Pacing check",
            detail:
              "Coffee, then the delivery dashboard. Every live line item has a pacing number, and anything under 95% or over 105% gets flagged before anyone asks. Today: the Atlas video line dipped to 88% overnight — worth watching, not yet worth escalating.",
          },
          {
            time: "10:00",
            label: "New line items",
            detail:
              "A signed insertion order landed yesterday. Turning it into configured line items — budgets, targeting, frequency caps, priorities — is the most consequential hour of the day, because every number set here plays out over the whole flight. This is the hour the simulation drops you into.",
          },
          {
            time: "12:30",
            label: "Broken creative",
            detail:
              "A rich-media unit started throwing errors at 11:40 and delivery on that line item has flatlined. Pull it, notify the agency, chase a replacement tag. Every hour it's down widens a pacing gap that someone will eventually call a makegood.",
          },
          {
            time: "15:00",
            label: "Client reporting call",
            detail:
              "Walk the buyer through delivery, reach, and frequency. The Thursday dip gets explained before they ask — creative swap, recovered in 36 hours, flight still on pace. Surprises are for people who didn't read their own dashboard.",
          },
          {
            time: "16:30",
            label: "Priority triage",
            detail:
              "A house promo is beating a paid campaign to impressions on the homepage. Re-rank line-item priorities so signed contracts win, house fills the gaps, and the open auction keeps monetizing everything else.",
          },
        ],
        followUps: [
          {
            question: "What's a pacing dashboard actually showing?",
            answer:
              "One row per live line item: impressions served vs. impressions expected by today, as a percentage. 100% means on schedule. The skill isn't reading it — it's knowing which deviations self-correct (weekend dips) and which ones compound (a too-tight frequency cap).",
          },
          {
            question: "How much of this job is meetings vs. tools?",
            answer:
              "Most of the day lives in the ad server and reporting tools; the client-facing hour is the visible tip. But the meeting is where the job is judged — which is why campaign managers care so much about walking in with the numbers already narrated.",
          },
        ],
        fallbackAnswer:
          "Days vary — launch weeks are heavier on configuration, quarter-ends on reporting — but the spine is constant: check pacing, launch clean, fix what breaks, explain the numbers before someone asks.",
      },
    ],
    cta: "Got it — brief me on the job",
  },

  briefing: {
    eyebrow: "Simulate · your assignment",
    title: "An insertion order just closed. Delivery is now your problem.",
    mission: [
      "Sales signed Atlas Cloud Software this morning: $45,000 to reach cloud-ops decision makers this quarter — 3.6 million impressions at a $12.50 CPM, flight July 1 through September 30.",
      "You're the campaign manager. The contract terms are locked; how it delivers is entirely up to the settings you choose. You'll open the ad server, configure the one line item on this order, and launch it.",
    ],
    decisions: [
      {
        label: "Frequency cap",
        summary:
          "How many times one person can see the ad per day. The whole trade-off lives here: too tight and the budget can't spend, too loose and it spends on repeats.",
      },
      {
        label: "Line item priority",
        summary:
          "Where this line item ranks when it competes for an impression — against other contracts, house promos, and the programmatic auction.",
      },
    ],
    objectives: [
      {
        label: "Deliver the full $45,000",
        detail: "Anything short becomes a makegood conversation.",
      },
      {
        label: "Maximize unique reach",
        detail: "Atlas Cloud is buying awareness — new people, not repeats.",
      },
      {
        label: "Leave the auction breathing",
        detail: "Don't take more priority than the contract needs.",
      },
    ],
    quizTitle: "Thirty-second check before you're on the clock",
    quiz: [
      {
        id: "pacing",
        question:
          "Halfway through the flight, your line item has served 60% of the impressions it should have by now. What's forming?",
        options: [
          {
            label: "A makegood",
            correct: true,
            feedback:
              "Right — under-delivery on a signed order means the publisher owes free inventory. Pacing gaps are makegoods in slow motion.",
          },
          {
            label: "Wasted frequency",
            correct: false,
            feedback:
              "Other way around — wasted frequency comes from over-serving the same people. Under-delivery like this is makegood territory.",
          },
          {
            label: "A programmatic windfall",
            correct: false,
            feedback:
              "The auction does get the spare impressions, but that's cold comfort — the publisher still owes Atlas Cloud what was contracted. This is makegood territory.",
          },
        ],
      },
      {
        id: "waste",
        question:
          "Atlas Cloud is paying for awareness. What does 'wasted' spend look like on this campaign?",
        options: [
          {
            label: "The same person seeing the ad 9 times a day",
            correct: true,
            feedback:
              "Exactly — past a few exposures, repeat impressions buy fatigue, not awareness. That's what a frequency cap exists to prevent.",
          },
          {
            label: "Reaching too many unique people",
            correct: false,
            feedback:
              "There's no such thing on an awareness buy — unique reach is precisely what Atlas Cloud is paying for. Waste is the opposite: the same person, over and over.",
          },
          {
            label: "Spending the budget too quickly",
            correct: false,
            feedback:
              "Fast delivery is a pacing issue, not waste per se. Waste on an awareness buy is repeat impressions — one person seeing the ad 9 times while others never see it.",
          },
        ],
      },
    ],
    cta: "Open the ad server",
  },

  simulation: {
    productName: "AdServe Pro",
    environmentLabel: "Simulation · Atlas Cloud media plan",
    nav: [
      {
        section: "Delivery",
        items: [
          { label: "Orders" },
          { label: "Line items", active: true },
          { label: "Creatives" },
        ],
      },
      {
        section: "Inventory",
        items: [{ label: "Ad units" }, { label: "Placements" }],
      },
      {
        section: "Reporting",
        items: [{ label: "Queries" }, { label: "Alerts", badge: "3" }],
      },
    ],
    breadcrumb: ["Orders", "Atlas Cloud — Q3 Brand Awareness", "New line item"],
    taskTitle: "New line item",
    taskBrief:
      "Configure delivery for the Atlas Cloud order and launch. Contract fields are locked; the forecast updates as you work.",
    campaign: {
      lineItemName: "AtlasCloud_Q3_Display_CloudOps_Prospecting",
      advertiser: "Atlas Cloud Software",
      budget: 45000,
      currency: "USD",
      impressionsGoal: 3600000,
      cpm: 12.5,
      flight: "Jul 1 – Sep 30, 2026",
    },
    frequencyCap: {
      label: "Frequency cap",
      unit: "impressions / user / day",
      helper:
        "How many times one person can see this ad per day. This is the decision that determines whether the budget reaches new people or burns on repeats.",
      min: 1,
      max: 10,
      default: 1,
    },
    priority: {
      label: "Line item priority",
      helper: "Where this line item ranks when it competes for an impression.",
      options: [
        {
          value: "sponsorship",
          label: "Sponsorship",
          description: "Wins every eligible impression first",
        },
        {
          value: "standard",
          label: "Standard",
          description: "Paces evenly against the goal",
        },
        {
          value: "house",
          label: "House",
          description: "Fills only leftover inventory",
        },
      ],
      default: "standard",
    },
    forecast: {
      label: "Delivery forecast",
      disclaimer:
        "Modeled from audience size and historical serving data (simulated).",
      byCap: {
        1: { reachPct: 92, deliveryPct: 61, avgFrequency: 1.0 },
        2: { reachPct: 88, deliveryPct: 94, avgFrequency: 1.9 },
        3: { reachPct: 84, deliveryPct: 100, avgFrequency: 2.8 },
        4: { reachPct: 77, deliveryPct: 100, avgFrequency: 3.6 },
        5: { reachPct: 65, deliveryPct: 100, avgFrequency: 4.7 },
        6: { reachPct: 56, deliveryPct: 100, avgFrequency: 5.6 },
        7: { reachPct: 49, deliveryPct: 100, avgFrequency: 6.5 },
        8: { reachPct: 44, deliveryPct: 100, avgFrequency: 7.2 },
        9: { reachPct: 40, deliveryPct: 100, avgFrequency: 7.6 },
        10: { reachPct: 38, deliveryPct: 100, avgFrequency: 7.9 },
      },
    },
    launchLabel: "Launch line item",
  },

  decision: {
    input: "frequencyCap",
    bands: [
      { max: 1, outcome: "low" },
      { max: 4, outcome: "balanced" },
    ],
    fallback: "high",
    thresholds: {
      reachGoodAt: 70,
      frequencyWasteAt: 4.5,
    },
    priorityNotes: {
      sponsorship: {
        tone: "warn",
        text: "Sponsorship priority is winning every eligible impression — fine for this contract, but it's starving the open auction. Programmatic revenue on these placements dropped 18%.",
      },
      standard: {
        tone: "good",
        text: "Standard priority is pacing the line item evenly against its goal, and leftover impressions are still flowing to the open auction.",
      },
      house: {
        tone: "warn",
        text: "House priority only fills leftovers — every paid campaign is beating this contracted line item to impressions. On a signed $45,000 order, this setting alone risks under-delivery.",
      },
    },
  },

  outcomes: {
    low: {
      key: "low",
      status: "risk",
      verdict: "Everyone saw it once. The budget didn't spend.",
      summary:
        "A cap of 1 per day reaches the widest possible audience — and runs out of people. The ad server can't legally serve a second impression to anyone, so delivery stalls well short of goal.",
      risk: {
        title: "Makegood risk",
        body: "Projected under-delivery of 1.4M impressions on a signed order. If this holds through the flight, Atlas Cloud is owed free inventory — and someone has to make that call.",
      },
      coaching:
        "Reach was never the problem — one exposure rarely moves anyone. Ads work through repetition. Give the server room for a few impressions per person, and the budget can actually deliver.",
    },
    balanced: {
      key: "balanced",
      status: "win",
      verdict: "Full delivery, fresh eyeballs. This is the job done well.",
      summary:
        "A cap in the 2–4 range gives the ad server room to deliver the full budget while still spreading it across new people. Delivery hits goal, and the frequency report is one a client is happy to read.",
      coaching:
        "This is the balance the role exists to find: enough repetition for the message to land, enough restraint that the budget keeps finding new people. No makegood, no waste, a clean reporting call.",
    },
    high: {
      key: "high",
      status: "risk",
      verdict: "The budget spent. On the same people, over and over.",
      summary:
        "With a loose cap the server takes the easy impressions — the same heavy visitors again and again. The budget delivers in full, but most of the target audience never saw the ad at all.",
      risk: {
        title: "Wasted frequency",
        body: "The average person who saw this ad saw it many times a day. That's fatigue, not persuasion — and it's the first chart the client will point at in the quarterly review.",
      },
      coaching:
        "Delivery alone isn't success — the contract delivered, but to a fraction of the audience. Tighten the cap and the same dollars start buying new people instead of repeat impressions.",
    },
  },

  assistant: {
    buttonLabel: "I'm stuck",
    lines: [
      "Watch the forecast panel as you move the cap — the briefing said it: deliver the full budget AND keep unique reach high. There's a range where both bars stay healthy.",
      "Most awareness campaigns cap at 2–4 impressions per user per day. Enough repetition to land, enough headroom to spend the budget. Priority-wise, Standard paces a contract like this evenly.",
    ],
  },

  payoff: {
    headline: "Same product. Same prospect. Different marketer.",
    subhead:
      "This is the cold email you'd have written this morning — and the one you can write now that you've sat in the seat.",
    before: {
      label: "Before",
      sublabel: "Domain-blind",
      subject: "Quick question",
      body: [
        "Hi Dana — I'll keep this short. Atlas Cloud helps media teams do more with less. Our AI-powered platform streamlines your workflows, boosts ROI, and saves your team hours every week.",
        "Would love to grab 15 minutes to show you how we can help your team hit its goals. Open to a quick call this week?",
      ],
    },
    after: {
      label: "After",
      sublabel: "Domain-native",
      subject: "Pacing at 61% two weeks into flight",
      body: [
        "Hi Dana — when a [[line item]] is pacing at 61% mid-flight, every option is bad: loosen the [[frequency cap]] and burn budget on repeat impressions, or hold it and start drafting the [[makegood]] email.",
        "Atlas Cloud flags pacing drift per line item early enough that you're adjusting caps in week one — not negotiating makegoods in week five. And it models the [[programmatic]] revenue you're leaving on the table when a sponsorship line item over-serves.",
        "Worth 15 minutes against one of your live flights?",
      ],
    },
    completion: {
      title: "Vertical complete",
      body: "Ad-tech / Media — Campaign Manager. You've learned the role, run the job, and seen what it does to your output.",
    },
    restartLabel: "Run it again",
  },
};

// ---------------------------------------------------------------------------
// Registry — adding a vertical is a data change, not a rebuild.
// ---------------------------------------------------------------------------

export const VERTICALS: Vertical[] = [adTechMedia];

export const activeVertical: Vertical = VERTICALS[0];
