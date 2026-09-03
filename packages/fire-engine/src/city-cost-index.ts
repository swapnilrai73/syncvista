// ─────────────────────────────────────────────────────────────────────────
// City cost index — replaces the placeholder tier bands from blueprint v1.
//
// SOURCING NOTE: no single official Indian government cost-of-living index
// exists across cities. These multipliers are derived from convergence
// across several independent 2026 cost-of-living aggregators (Numbeo-derived
// comparisons, RentOk's cost index, sitnit.com and costoflivingindia.com's
// city comparisons) — real research, not invention, but still aggregator
// estimates rather than one authoritative source. Treat as a meaningfully
// better estimate than a flat tier average, not as official data.
//
// KEY FINDING FROM RESEARCH: "metro" is not homogeneous. Mumbai runs
// materially higher than Bangalore/Pune/Delhi NCR/Hyderabad, which cluster
// together below it (roughly 0.70-0.80x Mumbai for comparable lifestyle,
// per multiple independently-converging 2026 sources). Flattening all
// metros to one number would understate cost for Mumbai users and overstate
// it for the other metros — so this is split into two metro bands rather
// than one, plus tier-2 and an extrapolated tier-3.
// ─────────────────────────────────────────────────────────────────────────

import type { CityTier } from "./types";

/**
 * Specific-city multipliers, relative to Mumbai = 1.00.
 * Add more cities here as better data becomes available — this list is
 * deliberately not exhaustive.
 */
export const CITY_MULTIPLIERS: Record<string, number> = {
  // Metro — Tier A (highest cost)
  mumbai: 1.0,

  // Metro — Tier B (high cost, but converging ~0.70-0.80x Mumbai per research)
  bangalore: 0.78,
  bengaluru: 0.78,
  pune: 0.76,
  "delhi ncr": 0.74,
  delhi: 0.74,
  gurgaon: 0.76,
  gurugram: 0.76,
  hyderabad: 0.68,

  // Tier-2 hubs (0.40-0.45x Mumbai per research — Jaipur/Lucknow/Bhopal
  // explicitly named as the cheap-end comparison point in source data)
  jaipur: 0.42,
  lucknow: 0.4,
  bhopal: 0.4,
  indore: 0.42,
  kochi: 0.45,
  chandigarh: 0.46,
  coimbatore: 0.44,
  ahmedabad: 0.5,
  chennai: 0.55,
  kolkata: 0.48,
};

/** Tier-level fallback averages, used when a specific city isn't in the table above. */
export const CITY_TIER_FALLBACK: Record<CityTier, number> = {
  metro: 0.85, // blended fallback across Tier-A/Tier-B metros — prefer a specific city match when possible
  tier2: 0.42,
  // Tier-3 is extrapolated below the tier-2 band, not directly evidenced in
  // the sources checked — lower confidence than the metro/tier-2 figures.
  tier3: 0.28,
};

export function getCityMultiplier(cityTier: CityTier, cityName?: string): number {
  if (cityName) {
    const key = cityName.trim().toLowerCase();
    const specific = CITY_MULTIPLIERS[key];
    if (specific !== undefined) return specific;
  }
  return CITY_TIER_FALLBACK[cityTier];
}