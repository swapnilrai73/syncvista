/**
 * data-quality.ts
 *
 * Composable data-quality model for the SyncVista Intelligence Layer.
 *
 * These types answer the question: "How much should I trust this number?"
 * They are attached to every calculated output so that the UI and the LLM
 * layer can communicate uncertainty honestly rather than silently degrading.
 *
 * Standalone — no imports from other intelligence files, Firebase, or AI packages.
 */

// ---------------------------------------------------------------------------
// Core quality enums / union literals
// ---------------------------------------------------------------------------

/**
 * Identifies the pipeline that produced a piece of data.
 *
 *   AA_VERIFIED   — Setu Account Aggregator; bank-verified, highest trust
 *   CAS_PARSED    — Consolidated Account Statement uploaded by user; high trust
 *   USER_ENTERED  — Manually entered by user; medium trust (self-reported)
 *   INFERRED      — Derived by the engine from observed patterns (e.g. salary)
 *   ESTIMATED     — Statistical estimate with acknowledged uncertainty
 *   MOCK          — Seeded from mockData.ts / seed-firestore.ts
 *   FALLBACK      — Produced when a required source was unavailable
 */
export type DataSourceType =
  | "AA_VERIFIED"
  | "CAS_PARSED"
  | "USER_ENTERED"
  | "INFERRED"
  | "ESTIMATED"
  | "MOCK"
  | "FALLBACK";

/**
 * How fresh is the underlying data?
 *
 *   FRESH   — fetched < 24 hours ago
 *   RECENT  — fetched < 7 days ago
 *   STALE   — fetched >= 7 days ago
 *   UNKNOWN — no fetch timestamp available
 */
export type Freshness = "FRESH" | "RECENT" | "STALE" | "UNKNOWN";

/**
 * How complete is the data needed for a calculation?
 *
 *   FULL    — all required inputs are present
 *   PARTIAL — key inputs present, some optional inputs missing
 *   MINIMAL — calculation can run but with low confidence
 *   MISSING — cannot run this calculation at all
 */
export type Completeness = "FULL" | "PARTIAL" | "MINIMAL" | "MISSING";

/**
 * Whether a specific calculation is valid to surface to the user.
 *
 *   VALID    — all required inputs present and fresh; output is reliable
 *   DEGRADED — ran but with reduced-quality inputs (e.g. inferred salary)
 *   BLOCKED  — missing a required input; calculation cannot produce a result
 */
export type CalculationValidity = "VALID" | "DEGRADED" | "BLOCKED";

// ---------------------------------------------------------------------------
// Provenance and field-level quality
// ---------------------------------------------------------------------------

/**
 * Describes where a piece of data came from and how fresh it is.
 * Attach one of these to every data source that feeds an Intelligence output.
 */
export interface DataProvenance {
  source: DataSourceType;
  /** ISO 8601 timestamp of when this data was fetched, or null if unknown. */
  fetchedAt: string | null;
  freshness: Freshness;
  /** Convenience flag — true for MOCK and FALLBACK sources. */
  isMockOrFallback: boolean;
}

/**
 * Quality metadata for a single derived field (e.g. `estimatedMonthlyIncome`).
 */
export interface FieldQuality {
  present: boolean;
  source: DataSourceType;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  /** Optional human-readable explanation of how this field was derived. */
  notes?: string;
}

// ---------------------------------------------------------------------------
// DataQualitySummary — top-level quality envelope
// ---------------------------------------------------------------------------

/**
 * Rolled-up quality picture attached to every `FinancialSnapshot`.
 * Intentionally kept honest and non-gamified — `coverageEstimate` is an
 * engineering coverage fraction, not a "score" shown to the user.
 */
export interface DataQualitySummary {
  /**
   * Fraction of the user's financial picture that is visible to the engine
   * (0.0 – 1.0). This is NOT a score — it is an estimate of how much of
   * the user's total financial life we have data for.
   * See `buildDataQualitySummary` for the exact calculation.
   */
  coverageEstimate: number;
  freshness: Freshness;
  completeness: Completeness;
  /** True if any data source is MOCK or FALLBACK. */
  isMockOrFallback: boolean;
  /** Human-readable list of what data is completely absent. */
  missingInputs: string[];
  /** Inputs that are present but low quality (INFERRED, ESTIMATED, FALLBACK). */
  degradedInputs: string[];
  /**
   * Per-capability validity. Keys are capability identifiers
   * (e.g. "emergency_fund_check", "net_worth", "tax_harvest_window").
   */
  calculationValidity: Record<string, CalculationValidity>;
}

// ---------------------------------------------------------------------------
// Helper: computeFreshness
// ---------------------------------------------------------------------------

/**
 * Derives a `Freshness` label from a `fetchedAt` ISO timestamp.
 *
 * Thresholds (wall-clock age from now):
 *   < 24 h   → FRESH
 *   < 7 d    → RECENT
 *   >= 7 d   → STALE
 *   null/invalid → UNKNOWN
 */
export function computeFreshness(fetchedAt: string | null | undefined): Freshness {
  if (!fetchedAt) return "UNKNOWN";

  const fetched = new Date(fetchedAt);
  if (isNaN(fetched.getTime())) return "UNKNOWN";

  const ageMs = Date.now() - fetched.getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

  if (ageMs < ONE_DAY_MS) return "FRESH";
  if (ageMs < SEVEN_DAYS_MS) return "RECENT";
  return "STALE";
}

// ---------------------------------------------------------------------------
// Helper: computeCalculationValidity
// ---------------------------------------------------------------------------

/**
 * Decides whether a capability can run given its required inputs.
 *
 * Logic:
 *   - If no required inputs are missing → VALID
 *   - If ALL required inputs are missing → BLOCKED
 *   - Otherwise (some missing, some present) → DEGRADED
 */
export function computeCalculationValidity(
  requiredInputs: string[],
  missingInputs: string[]
): CalculationValidity {
  if (requiredInputs.length === 0) return "VALID";
  if (missingInputs.length === 0) return "VALID";

  const missingSet = new Set(missingInputs);
  const allMissing = requiredInputs.every((input) => missingSet.has(input));
  if (allMissing) return "BLOCKED";

  return "DEGRADED";
}

// ---------------------------------------------------------------------------
// Helper: buildDataQualitySummary
// ---------------------------------------------------------------------------

/** Input bag for `buildDataQualitySummary`. */
export interface BuildDataQualityOpts {
  /** Number of bank accounts connected. */
  accountCount: number;
  /** Number of months of transaction history available. */
  transactionMonths: number;
  /** Whether CAS or investment data is available. */
  hasInvestmentData: boolean;
  /** Whether liability / loan data is available. */
  hasLiabilityData: boolean;
  /** Whether the Firestore user profile document is present. */
  hasUserProfile: boolean;
  /** Whether any data comes from MOCK or FALLBACK sources. */
  isMockOrFallback: boolean;
  /** ISO timestamp of the most recent data fetch, or null. */
  latestFetchedAt: string | null;
  /**
   * Optional list of missing input keys (human-readable).
   * When omitted, `buildDataQualitySummary` auto-derives the list.
   */
  missingInputs?: string[];
}

/**
 * Assembles a `DataQualitySummary` from high-level data availability flags.
 *
 * coverageEstimate computation:
 *   +0.30  first account connected
 *   +0.10  second account (cumulative up to +0.20 from extra accounts)
 *   +0.10  third account
 *   +0.20  transactionMonths >= 3
 *   +0.10  transactionMonths >= 6 (additional)
 *   +0.15  hasInvestmentData
 *   +0.10  hasLiabilityData
 *   +0.05  hasUserProfile
 *   capped at 1.0
 *
 * completeness logic:
 *   MISSING — accountCount === 0
 *   MINIMAL — accountCount >= 1, transactionMonths < 3, no investment data
 *   FULL    — accountCount >= 2 AND transactionMonths >= 6 AND hasInvestmentData AND hasUserProfile
 *   PARTIAL — all other states
 */
export function buildDataQualitySummary(opts: BuildDataQualityOpts): DataQualitySummary {
  const {
    accountCount,
    transactionMonths,
    hasInvestmentData,
    hasLiabilityData,
    hasUserProfile,
    isMockOrFallback,
    latestFetchedAt,
  } = opts;

  // ---- coverageEstimate ----
  let coverage = 0;

  if (accountCount >= 1) {
    coverage += 0.3;
    // +0.10 per additional account up to 2 more (max +0.20)
    const extraAccounts = Math.min(accountCount - 1, 2);
    coverage += extraAccounts * 0.1;
  }

  if (transactionMonths >= 3) coverage += 0.2;
  if (transactionMonths >= 6) coverage += 0.1;
  if (hasInvestmentData) coverage += 0.15;
  if (hasLiabilityData) coverage += 0.1;
  if (hasUserProfile) coverage += 0.05;

  const coverageEstimate = Math.min(1.0, coverage);

  // ---- completeness ----
  let completeness: Completeness;
  if (accountCount === 0) {
    completeness = "MISSING";
  } else if (transactionMonths < 3 && !hasInvestmentData) {
    completeness = "MINIMAL";
  } else if (
    accountCount >= 2 &&
    transactionMonths >= 6 &&
    hasInvestmentData &&
    hasUserProfile
  ) {
    completeness = "FULL";
  } else {
    completeness = "PARTIAL";
  }

  // ---- freshness ----
  const freshness = computeFreshness(latestFetchedAt);

  // ---- missingInputs (auto-derive if not provided) ----
  const missingInputs: string[] = opts.missingInputs
    ? [...opts.missingInputs]
    : [
        ...(accountCount === 0 ? ["bank_account"] : []),
        ...(transactionMonths < 1 ? ["transaction_history"] : []),
        ...(!hasInvestmentData ? ["investment_data"] : []),
        ...(!hasLiabilityData ? ["liability_data"] : []),
        ...(!hasUserProfile ? ["user_profile"] : []),
      ];

  // ---- degradedInputs ----
  const degradedInputs: string[] = [
    ...(isMockOrFallback ? ["mock_or_fallback_data"] : []),
    ...(transactionMonths >= 1 && transactionMonths < 3 ? ["insufficient_transaction_history"] : []),
  ];

  // ---- calculationValidity (baseline capabilities) ----
  const calculationValidity: Record<string, CalculationValidity> = {
    net_worth: computeCalculationValidity(
      ["bank_account"],
      missingInputs.filter((m) => m === "bank_account")
    ),
    emergency_fund_check: computeCalculationValidity(
      ["bank_account", "transaction_history"],
      missingInputs.filter((m) => ["bank_account", "transaction_history"].includes(m))
    ),
    tax_harvest_window: computeCalculationValidity(
      ["investment_data"],
      missingInputs.filter((m) => m === "investment_data")
    ),
    salary_inference: computeCalculationValidity(
      ["transaction_history"],
      missingInputs.filter((m) => m === "transaction_history")
    ),
  };

  return {
    coverageEstimate,
    freshness,
    completeness,
    isMockOrFallback,
    missingInputs,
    degradedInputs,
    calculationValidity,
  };
}
