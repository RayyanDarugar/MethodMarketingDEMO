/**
 * All lesson content, terms, simulation configuration, decision logic, and
 * outcome copy for every vertical. Components are presentation-only and read
 * from this file, so a later version can swap this static data for an API
 * response without touching the component layer.
 */

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

export type SceneId = "intro" | "lesson" | "simulation" | "outcome" | "payoff";

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
  "simulation",
  "outcome",
  "payoff",
];

/** The persistent Learn → Simulate → Produce arc shown in the stepper. */
export const PHASES: Phase[] = [
  { id: "learn", label: "Learn", scenes: ["intro", "lesson"] },
  { id: "simulate", label: "Simulate", scenes: ["simulation", "outcome"] },
  { id: "produce", label: "Produce", scenes: ["payoff"] },
];

export function phaseForScene(scene: SceneId): PhaseId {
  return PHASES.find((p) => p.scenes.includes(scene))?.id ?? "learn";
}

// ---------------------------------------------------------------------------
// Lesson
// ---------------------------------------------------------------------------

export interface Term {
  term: string;
  definition: string;
  whyItMatters: string;
}

export interface TimelineEntry {
  time: string;
  label: string;
  detail: string;
}

export type LessonCard =
  | {
      kind: "overview";
      id: string;
      eyebrow: string;
      title: string;
      body: string[];
    }
  | {
      kind: "terms";
      id: string;
      eyebrow: string;
      title: string;
      terms: Term[];
    }
  | {
      kind: "timeline";
      id: string;
      eyebrow: string;
      title: string;
      entries: TimelineEntry[];
    };

export interface LessonContent {
  title: string;
  subhead: string;
  cards: LessonCard[];
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
  /** Drives the green unique-reach bar (0–100). */
  reachPct: number;
  /** Drives the budget-delivered bar (0–100). */
  deliveryPct: number;
  metrics: OutcomeMetric[];
  /** Amber callout; omitted on the win state. */
  risk?: { title: string; body: string };
  coaching: string;
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

export function evaluateSimulation(
  vertical: Vertical,
  choices: SimulationChoices
): OutcomeResult {
  const { bands, fallback } = vertical.decision;
  const band = bands.find((b) => choices.frequencyCap <= b.max);
  return vertical.outcomes[band ? band.outcome : fallback];
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
      "Four cards. Open each one — the simulation ahead assumes you have.",
    cards: [
      {
        kind: "overview",
        id: "industry",
        eyebrow: "The industry",
        title: "How money becomes ads",
        body: [
          "An advertiser commits a budget. An agency turns it into a media plan. That plan lands in an ad server — the system that decides, billions of times a day, which ad shows to which person on which page.",
          "The campaign manager sits at the controls of that system. They translate a signed contract into line items, launch them, and then spend the flight making sure every dollar delivers to the right people — because if it doesn't, the publisher gives the money back.",
          "Success in this seat is unglamorous and absolute: deliver the full budget, on target, without waste, with proof.",
        ],
      },
      {
        kind: "terms",
        id: "language",
        eyebrow: "The language",
        title: "Four words that run the job",
        terms: [
          {
            term: "Line item",
            definition:
              "A single deliverable inside a campaign: this budget, these ad sizes, this audience, these dates. The unit of work a campaign manager actually configures and launches.",
            whyItMatters:
              "Everything a campaign manager sweats — pacing, priority, delivery — happens at the line-item level, not the campaign level.",
          },
          {
            term: "Frequency cap",
            definition:
              "The maximum number of times one person is shown the same ad in a period — '3 per user per day'.",
            whyItMatters:
              "The core trade-off of the job. Too low and the budget can't spend; too high and it spends on the same eyeballs over and over.",
          },
          {
            term: "Makegood",
            definition:
              "Free ad inventory a publisher owes an advertiser when a campaign under-delivers on what was contracted.",
            whyItMatters:
              "The word that makes a campaign manager's stomach drop. Makegoods are refunds — lost revenue and an awkward client call.",
          },
          {
            term: "Programmatic",
            definition:
              "Ad inventory sold automatically in real-time auctions rather than through a direct contract.",
            whyItMatters:
              "The opportunity cost. Every impression a direct line item takes is one that can't be auctioned — so over-serving a contract leaves programmatic revenue on the table.",
          },
        ],
      },
      {
        kind: "overview",
        id: "pressures",
        eyebrow: "The pressures",
        title: "What actually keeps them up",
        body: [
          "Deliver in full. An under-delivered contract becomes a makegood — the publisher hands back inventory for free and the campaign manager explains why.",
          "Reach unique people. Advertisers pay for new eyeballs, not the same person twelve times. Wasted frequency shows up in the campaign report, and the client reads the campaign report.",
          "Don't crowd the auction. Direct-sold line items outrank programmatic demand. Set priorities carelessly and you starve the open auction that pays the bills between contracts.",
          "Be ready to show your work. Every buy-side meeting starts with the numbers. The campaign manager who walks in with the pacing story already written owns the room.",
        ],
      },
      {
        kind: "timeline",
        id: "day",
        eyebrow: "A day in the seat",
        title: "Tuesday, mid-flight",
        entries: [
          {
            time: "8:30",
            label: "Pacing check",
            detail:
              "Coffee, then the delivery dashboard. Anything pacing under 95% or over 105% gets flagged before anyone asks.",
          },
          {
            time: "10:00",
            label: "New line items",
            detail:
              "A signed insertion order becomes configured line items: budgets, targeting, frequency caps, priorities. Today's simulation is this hour of the day.",
          },
          {
            time: "12:30",
            label: "Broken creative",
            detail:
              "A rich-media unit is throwing errors and delivery on that line item has stalled. Chase the agency for a new tag before the pacing gap becomes a makegood.",
          },
          {
            time: "15:00",
            label: "Client reporting call",
            detail:
              "Walk the buyer through delivery, reach, and frequency. Explain the dip on Thursday before they ask about it.",
          },
          {
            time: "16:30",
            label: "Priority triage",
            detail:
              "A house campaign is beating a paid one to impressions. Re-rank line-item priorities so contracts win and leftover inventory still flows to programmatic.",
          },
        ],
      },
    ],
    cta: "I know enough — put me in the seat",
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
      "The insertion order is signed: $45,000 to reach cloud-ops decision makers this quarter. Configure the delivery settings and launch. The contract fields are locked — the delivery decisions are yours.",
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
      helper:
        "Where this line item ranks when it competes for an impression.",
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
    launchLabel: "Launch line item",
  },

  decision: {
    input: "frequencyCap",
    bands: [
      { max: 1, outcome: "low" },
      { max: 4, outcome: "balanced" },
    ],
    fallback: "high",
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
        "A cap of 1 per day reaches the widest possible audience — and runs out of people. The ad server can't legally serve a second impression to anyone, so delivery stalls at 61% of goal.",
      reachPct: 92,
      deliveryPct: 61,
      metrics: [
        { label: "Unique reach", value: "92% of target", tone: "good" },
        { label: "Budget delivered", value: "$27,450 of $45,000", tone: "warn" },
        { label: "Avg. frequency", value: "1.0 per user", tone: "neutral" },
      ],
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
      reachPct: 84,
      deliveryPct: 100,
      metrics: [
        { label: "Unique reach", value: "84% of target", tone: "good" },
        { label: "Budget delivered", value: "$45,000 of $45,000", tone: "good" },
        { label: "Avg. frequency", value: "2.8 per user", tone: "good" },
      ],
      coaching:
        "This is the balance the role exists to find: enough repetition for the message to land, enough restraint that the budget keeps finding new people. No makegood, no waste, a clean reporting call.",
    },
    high: {
      key: "high",
      status: "risk",
      verdict: "The budget spent. On the same people, over and over.",
      summary:
        "With a loose cap the server takes the easy impressions — the same heavy visitors again and again. The budget delivers in full, but 38% unique reach means most of the target audience never saw the ad at all.",
      reachPct: 38,
      deliveryPct: 100,
      metrics: [
        { label: "Unique reach", value: "38% of target", tone: "warn" },
        { label: "Budget delivered", value: "$45,000 of $45,000", tone: "good" },
        { label: "Avg. frequency", value: "7.9 per user", tone: "warn" },
      ],
      risk: {
        title: "Wasted frequency",
        body: "The average person who saw this ad saw it nearly 8 times in a day. That's fatigue, not persuasion — and it's the first chart the client will point at in the quarterly review.",
      },
      coaching:
        "Delivery alone isn't success — the contract delivered, but to a fraction of the audience. Tighten the cap and the same dollars start buying new people instead of repeat impressions.",
    },
  },

  assistant: {
    buttonLabel: "I'm stuck",
    lines: [
      "Think about what the advertiser is paying for: new people seeing the ad enough times to remember it — not once, and not a dozen times.",
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
