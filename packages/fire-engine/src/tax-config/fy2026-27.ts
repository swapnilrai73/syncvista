// ─────────────────────────────────────────────────────────────────────────
// Tax config for FY 2026-27.
//
// RULE: these constants are versioned in code, reviewed via a normal PR
// each Union Budget cycle. Never make this a live-editable database value —
// tax rule changes should go through review and tests before going live,
// not be mutable at runtime.
//
// Every number here is sourced from public tax law and is expected to
// change roughly annually. Verify against the current year's Finance Act
// before relying on this for a real tax year — do not assume these figures
// stay accurate without checking.
// ─────────────────────────────────────────────────────────────────────────

export interface TaxYearConfig {
  fiscalYear: string;
  ltcgEquityExemptionThreshold: number; // Section 112A annual exemption
  ltcgEquityRate: number;
  stcgEquityRate: number; // Section 111A
  section80CCD1BCap: number; // additional NPS deduction
  epfAssumedRate: number; // guaranteed-ish EPF rate, changes annually via EPFO notification
}

export const FY_2026_27: TaxYearConfig = {
  fiscalYear: "FY2026-27",
  ltcgEquityExemptionThreshold: 125_000,
  ltcgEquityRate: 0.125,
  stcgEquityRate: 0.2,
  section80CCD1BCap: 50_000,
  epfAssumedRate: 0.0815,
};

const TAX_CONFIG_REGISTRY: Record<string, TaxYearConfig> = {
  "FY2026-27": FY_2026_27,
};

export function getTaxConfig(fiscalYear: string): TaxYearConfig {
  const config = TAX_CONFIG_REGISTRY[fiscalYear];
  if (!config) {
    throw new Error(
      `No tax config registered for ${fiscalYear}. Add a new file in tax-config/ and register it here — do not fall back to a default silently.`
    );
  }
  return config;
}