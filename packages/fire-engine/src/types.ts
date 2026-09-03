// ─────────────────────────────────────────────────────────────────────────
// FIRE Engine — Core Type Contract
//
// This is the single source of truth for what goes IN and what comes OUT
// of the deterministic engine. Base tier, Pro tier, and Supreme tier all
// consume the SAME output shape — they differ only in which fields their
// respective presenter/formatter layer chooses to surface and how it words
// them. Never let a presenter layer reach back into raw calculation logic;
// it only ever transforms this output.
// ─────────────────────────────────────────────────────────────────────────

export type InflationBucket =
  | "general"
  | "healthcare"
  | "education"
  | "techDurables"
  | "housing";

export type CityTier = "metro" | "tier2" | "tier3";

export interface UserProfile {
  currentAge: number;
  targetRetirementAge: number;
  cityTier: CityTier;
  /** Optional specific city name (e.g. "Mumbai", "Bhopal") for a more precise cost multiplier than the tier average. */
  city?: string;
}

/** Monthly expense amounts, in today's rupees, per inflation bucket. */
export type ExpenseBuckets = Record<InflationBucket, number>;

export interface GoalMilestone {
  label: string;
  /** Years from now this expense hits — e.g. 8 for "child's college in 8 years" */
  yearFromNow: number;
  /** Cost in today's rupees; the engine inflates it to the target year */
  amountToday: number;
  inflationBucket: InflationBucket;
}

export interface AssetAllocation {
  equityDomestic: number;
  equityInternational: number;
  debt: number;
  gold: number;
  realEstate: number;
  cash: number;
}

export interface PortfolioSnapshot {
  currentCorpus: number;
  allocation: AssetAllocation;
  monthlyInvestment: number;
}

export interface EngineAssumptions {
  generalInflation: number; // e.g. 0.06
  withdrawalRate: number; // e.g. 0.038
  monteCarloRuns: number; // e.g. 1000
  postRetirementHorizonYears: number; // e.g. 30
}

export interface FireEngineInput {
  profile: UserProfile;
  expenses: ExpenseBuckets;
  goals: GoalMilestone[];
  portfolio: PortfolioSnapshot;
  assumptions: EngineAssumptions;
  /** Looks up the versioned tax config — e.g. "FY2026-27" */
  taxYear: string;
}

export interface MonteCarloResult {
  survivalProbability: number; // 0–1
  runsCompleted: number;
  percentileOutcomes: {
    p10: number;
    p50: number;
    p90: number;
  };
}

export interface FireEngineOutput {
  targetCorpus: number;
  yearsToRetirement: number;
  requiredMonthlySavings: number;
  /** Nonzero only when current corpus growth alone already exceeds the target — distinguishes "just covered" from "already ahead." */
  surplusAtRetirement: number;
  projectedCorpusAtRetirement: number;
  monteCarlo: MonteCarloResult;
  /** Inflated present-value contribution of each expense bucket, for transparency */
  bucketedContribution: Record<InflationBucket, number>;
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// Tax-lot / harvesting module — TYPE CONTRACT ONLY for this pass.
// Implementation lands next session; defining the shape now so nothing
// downstream has to guess at it.
// ─────────────────────────────────────────────────────────────────────────

export interface TaxLot {
  assetLabel: string; // Supreme tier: real fund/stock name. Base/Pro tier presenters strip this.
  purchaseDate: string; // ISO date
  costBasis: number;
  currentValue: number;
  isEquityOriented: boolean;
}

export interface TaxHarvestOpportunity {
  lot: TaxLot;
  unrealizedGainOrLoss: number;
  gainType: "STCG" | "LTCG";
  /** e.g. "harvestable against STCG under Section 70 before March 31" */
  applicableRule: string;
}

export interface TaxHarvestAnalysisInput {
  lots: TaxLot[];
  taxYear: string;
  realizedGainsThisYear: { stcg: number; ltcg: number };
}

export interface TaxHarvestAnalysisOutput {
  opportunities: TaxHarvestOpportunity[];
  totalHarvestableLoss: number;
  ltcgExemptionRemaining: number; // vs the versioned Section 112A threshold
}