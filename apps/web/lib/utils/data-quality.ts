export interface DataQualityReport {
  coverageScore: number;       // 0-100: Are enough months of data present?
  freshnessScore: number;      // 0-100: How recently was the data synced?
  sourceQuality: number;       // 0-100: Setu AA vs Manual CAS vs Mock
  calculationValidity: number; // 0-100: Are the calculations mathematically sound with this data?
  eligibility: boolean;        // Boolean: Is this data good enough to feed to the AI?
}

export function evaluateDataQuality(snapshot: any): DataQualityReport {
  // If ANY mock data is detected, strictly drop source quality and eligibility.
  const hasMockData = Boolean(snapshot.containsMockData);
  
  // Baseline heuristic metrics
  let coverageScore = hasMockData ? 20 : 80;
  let freshnessScore = hasMockData ? 0 : 100;
  let sourceQuality = hasMockData ? 0 : 100;
  let calculationValidity = hasMockData ? 50 : 100;
  
  // Strict AI eligibility gate
  const eligibility = !hasMockData && coverageScore >= 50 && freshnessScore >= 50;

  return {
    coverageScore,
    freshnessScore,
    sourceQuality,
    calculationValidity,
    eligibility
  };
}
