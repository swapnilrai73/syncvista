// ─────────────────────────────────────────────────────────────────────────
// Module C — Multi-Instrument Indian Asset Hub.
//
// Per-instrument return/volatility assumptions, and the resolver functions
// corpus.ts/monte-carlo.ts call instead of going straight to the six-bucket
// model. See file header in types.ts for why this exists — the short
// version: "debt: 0.25" hides that EPF, PPF, and a corporate bond behave
// completely differently.
// ─────────────────────────────────────────────────────────────────────────

import type { AssetAllocation, InstrumentHolding, InstrumentPortfolio, InstrumentType, PortfolioSnapshot } from "./types";
import { estimatePortfolioReturn, estimatePortfolioVolatility } from "./market-assumptions";

export interface InstrumentAssumption {
  expectedNominalReturn: number;
  volatility: number;
}

/**
 * All entries here are VERIFY ANNUALLY facts, per the blueprint's
 * verification ledger — EPF/PPF/SSY rates are government-notified and
 * change yearly or quarterly; equity/gold/real-estate figures are judgment
 * calls, structurally stable but worth revisiting periodically.
 */
export const INSTRUMENT_ASSUMPTIONS_2026: Record<Exclude<InstrumentType, "npsTier1">, InstrumentAssumption> = {
  epf: { expectedNominalReturn: 0.0815, volatility: 0.005 }, // EPFO-notified, near risk-free
  ppf: { expectedNominalReturn: 0.071, volatility: 0.002 }, // RBI quarterly notification
  ssy: { expectedNominalReturn: 0.082, volatility: 0.002 }, // govt-notified, girl child only
  fixedDeposit: { expectedNominalReturn: 0.07, volatility: 0.01 }, // bank credit risk, still low
  physicalGold: { expectedNominalReturn: 0.08, volatility: 0.16 },
  // Existing SGB holdings only (no new issuance since Feb 2024) — coupon (2.5%)
  // plus gold price appreciation. Tax treatment changed under Budget 2026;
  // verify exact current rule before relying on this for tax planning.
  sgbLegacy: { expectedNominalReturn: 0.105, volatility: 0.16 },
  equityDomestic: { expectedNominalReturn: 0.12, volatility: 0.18 },
  // 10% USD-equivalent long-run assumption + ~2% historical INR depreciation drag.
  equityInternational: { expectedNominalReturn: 0.12, volatility: 0.17 },
  realEstate: { expectedNominalReturn: 0.09, volatility: 0.1 }, // illiquid; measured volatility likely understates true risk
  cash: { expectedNominalReturn: 0.06, volatility: 0.005 },
  otherDebtInstrument: { expectedNominalReturn: 0.08, volatility: 0.05 }, // corporate debentures, generic bonds
};

/** NPS Tier-1's three internal sub-asset classes, reusing the equivalent top-level assumptions where they overlap. */
const NPS_SUB_ASSET_ASSUMPTIONS = {
  equity: INSTRUMENT_ASSUMPTIONS_2026.equityDomestic,
  corporateDebt: INSTRUMENT_ASSUMPTIONS_2026.otherDebtInstrument,
  governmentSecurities: { expectedNominalReturn: 0.075, volatility: 0.04 },
};

const DEFAULT_NPS_ALLOCATION = { equity: 0.5, corporateDebt: 0.3, governmentSecurities: 0.2 };

function estimateInstrumentReturn(holding: InstrumentHolding): number {
  if (holding.type === "npsTier1") {
    const alloc = holding.npsInternalAllocation ?? DEFAULT_NPS_ALLOCATION;
    return (
      alloc.equity * NPS_SUB_ASSET_ASSUMPTIONS.equity.expectedNominalReturn +
      alloc.corporateDebt * NPS_SUB_ASSET_ASSUMPTIONS.corporateDebt.expectedNominalReturn +
      alloc.governmentSecurities * NPS_SUB_ASSET_ASSUMPTIONS.governmentSecurities.expectedNominalReturn
    );
  }
  return INSTRUMENT_ASSUMPTIONS_2026[holding.type].expectedNominalReturn;
}

function estimateInstrumentVolatility(holding: InstrumentHolding): number {
  if (holding.type === "npsTier1") {
    const alloc = holding.npsInternalAllocation ?? DEFAULT_NPS_ALLOCATION;
    return (
      alloc.equity * NPS_SUB_ASSET_ASSUMPTIONS.equity.volatility +
      alloc.corporateDebt * NPS_SUB_ASSET_ASSUMPTIONS.corporateDebt.volatility +
      alloc.governmentSecurities * NPS_SUB_ASSET_ASSUMPTIONS.governmentSecurities.volatility
    );
  }
  return INSTRUMENT_ASSUMPTIONS_2026[holding.type].volatility;
}

export function instrumentPortfolioTotal(portfolio: InstrumentPortfolio): number {
  return portfolio.reduce((sum, h) => sum + h.currentValue, 0);
}

/**
 * True single-point-of-failure concentration: the largest INSTRUMENT's
 * share of the portfolio, not the largest BUCKET's. This is the actual fix
 * for a real false positive in the six-bucket model — someone holding EPF,
 * PPF, and NPS (three genuinely distinct instruments with different
 * lock-ins and guarantee structures) previously got flagged as
 * "concentrated" purely because all three collapsed into one `debt: 0.6`
 * number. NPS's own internal equity/debt/govSec split doesn't matter here
 * — concentration is about the whole instrument, not what's inside it.
 */
export function computeMaxInstrumentWeight(portfolio: InstrumentPortfolio): number {
  const total = instrumentPortfolioTotal(portfolio);
  if (total === 0) return 0;
  return Math.max(...portfolio.map((h) => h.currentValue / total));
}

/** Growth/volatile instrument types — everything else counts as "safe" for the sequence-of-returns buffer check below. */
const GROWTH_INSTRUMENT_TYPES: ReadonlySet<InstrumentType> = new Set<InstrumentType>([
  "equityDomestic",
  "equityInternational",
  "realEstate",
  "physicalGold",
  "sgbLegacy",
]);

/**
 * Fraction of the portfolio in "safe" (low-volatility) instruments, for the
 * sequence-of-returns buffer warning — deliberately NOT the same question
 * as liquidity. EPF/PPF/SSY count as safe here despite real lock-ins,
 * because this check is about volatility protection near retirement, not
 * whether the money can be accessed tomorrow. NPS Tier-1 is split
 * proportionally by its own internal allocation — its equity portion counts
 * as growth, its debt/gov-sec portion counts as safe, same logic
 * instrument-hub already uses for return/volatility.
 */
export function computeSafeInstrumentFraction(portfolio: InstrumentPortfolio): number {
  const total = instrumentPortfolioTotal(portfolio);
  if (total === 0) return 0;

  let safeValue = 0;
  for (const holding of portfolio) {
    if (holding.type === "npsTier1") {
      const alloc = holding.npsInternalAllocation ?? DEFAULT_NPS_ALLOCATION;
      safeValue += holding.currentValue * (alloc.corporateDebt + alloc.governmentSecurities);
    } else if (!GROWTH_INSTRUMENT_TYPES.has(holding.type)) {
      safeValue += holding.currentValue;
    }
  }
  return safeValue / total;
}

export function estimatePortfolioReturnFromInstruments(portfolio: InstrumentPortfolio): number {
  const total = instrumentPortfolioTotal(portfolio);
  if (total === 0) return 0;
  return portfolio.reduce((sum, h) => sum + (h.currentValue / total) * estimateInstrumentReturn(h), 0);
}

/**
 * Simplified weighted-average volatility — same documented limitation as
 * the six-bucket model it replaces: ignores cross-asset correlation. A
 * covariance-matrix-based version is a real upgrade, flagged in the
 * blueprint's parking lot, not attempted here.
 */
export function estimatePortfolioVolatilityFromInstruments(portfolio: InstrumentPortfolio): number {
  const total = instrumentPortfolioTotal(portfolio);
  if (total === 0) return 0;
  return portfolio.reduce((sum, h) => sum + (h.currentValue / total) * estimateInstrumentVolatility(h), 0);
}

/**
 * The actual integration point: corpus.ts and monte-carlo.ts call these
 * instead of going straight to market-assumptions.ts. Prefers
 * instrument-level detail when provided; falls back to the six-bucket
 * model otherwise — additive precision, not a breaking change to any
 * scenario that doesn't provide `instruments`.
 */
export function resolvePortfolioReturn(portfolio: Pick<PortfolioSnapshot, "allocation" | "instruments">): number {
  if (portfolio.instruments && portfolio.instruments.length > 0) {
    return estimatePortfolioReturnFromInstruments(portfolio.instruments);
  }
  return estimatePortfolioReturn(portfolio.allocation);
}

export function resolvePortfolioVolatility(portfolio: Pick<PortfolioSnapshot, "allocation" | "instruments">): number {
  if (portfolio.instruments && portfolio.instruments.length > 0) {
    return estimatePortfolioVolatilityFromInstruments(portfolio.instruments);
  }
  return estimatePortfolioVolatility(portfolio.allocation);
}

/** Resolver for concentration risk — prefers real instrument-level weights, falls back to the six-bucket max exactly as before. */
export function resolveMaxSingleHoldingWeight(portfolio: Pick<PortfolioSnapshot, "allocation" | "instruments">): number {
  if (portfolio.instruments && portfolio.instruments.length > 0) {
    return computeMaxInstrumentWeight(portfolio.instruments);
  }
  return Math.max(...Object.values(portfolio.allocation));
}

/** Resolver for the sequence-of-returns safety check — six-bucket fallback matches the original `cash + debt` behavior exactly, no regression. */
export function resolveSafeAssetFraction(portfolio: Pick<PortfolioSnapshot, "allocation" | "instruments">): number {
  if (portfolio.instruments && portfolio.instruments.length > 0) {
    return computeSafeInstrumentFraction(portfolio.instruments);
  }
  return portfolio.allocation.cash + portfolio.allocation.debt;
}