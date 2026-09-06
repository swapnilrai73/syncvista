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
  /** Optional — when present, the engine runs Module D internally and feeds its output into the housing bucket and savings-capacity calculations. */
  debtClearance?: DebtClearanceInput;
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
  /** Populated only when FireEngineInput.debtClearance was provided — both strategies run for standalone comparison, independent of which one drove the corpus math above. */
  debtComparison?: {
    avalanche: DebtClearanceOutput;
    snowball: DebtClearanceOutput;
  };
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

// ─────────────────────────────────────────────────────────────────────────
// Debt-Clearance module — Module D from the blueprint.
//
// Loan[] is the normalized contract: manual entry produces this shape
// directly; a future adapter (living in apps/web, not this pure package)
// would map SyncVista's existing bank/transaction data into the same
// shape once loan-tracking exists in the schema. The engine itself never
// cares which path produced its input.
// ─────────────────────────────────────────────────────────────────────────

export type DebtType = "home" | "car" | "personal" | "education" | "other";

export interface Loan {
  id: string;
  label: string;
  type: DebtType;
  outstandingBalance: number;
  annualInterestRate: number;
  monthlyEMI: number;
  /** Whether Section 24b interest deduction currently applies — regime- and self-occupied-status-dependent. */
  section24bEligible?: boolean;
  /** Whether Section 80C principal deduction currently applies — old regime only. */
  section80CEligible?: boolean;
}

export interface DebtClearanceInput {
  loans: Loan[];
  /** Monthly surplus available to accelerate payoff, beyond minimum EMIs. */
  extraMonthlyPayment: number;
  strategy: "avalanche" | "snowball";
  userMarginalTaxRate: number;
  expectedPostTaxPortfolioReturn: number;
}

export interface LoanMonthSnapshot {
  loanId: string;
  monthIndex: number;
  remainingBalance: number;
  interestPortion: number;
  principalPortion: number;
}

export interface DebtClearanceOutput {
  strategy: "avalanche" | "snowball";
  payoffOrder: string[];
  loanClearedMonth: Record<string, number>;
  totalInterestPaid: number;
  monthsToDebtFree: number;
  recommendation: "prepay_aggressively" | "invest_surplus_instead" | "balanced";
  recommendationReasoning: string;
  /**
   * Year-indexed ABSOLUTE nominal home-loan EMI expense still active that
   * year (year 1 = first year from now, matching corpus.ts's loop). This is
   * a fixed nominal figure, NOT subject to inflation or city-cost
   * adjustment — feeding it into the corpus calculation's housing bucket
   * for the matching year replaces the default computed figure entirely
   * for that year. Home-loan (type: "home") EMI only — car/personal/other
   * loans don't belong in the housing bucket.
   */
  housingExpenseByYear: Record<number, number>;
  /**
   * Year-indexed freed monthly cash flow versus the original total EMI
   * ACROSS ALL LOAN TYPES (not just home) — this is what increases
   * investable savings capacity once any debt clears, regardless of
   * whether that debt was a home loan. Added to fulfil the "freed cash
   * flow increases investable capacity" half of the auto-feed design —
   * the original contract only covered the housing-bucket replacement.
   */
  totalFreedMonthlyCashFlowByYear: Record<number, number>;
}