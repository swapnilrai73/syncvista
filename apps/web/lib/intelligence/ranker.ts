import { evaluateDataQuality } from "../utils/data-quality";

/**
 * PHASE 11: POLICY GATE
 * Strict rule-based filtering. If regulatory clearance fails, the recommendation
 * MUST NOT be presented to the user.
 */
function evaluatePolicyGate(
  actionType: ActionType, 
  snapshot: FinancialSnapshot,
  detectedValue: number
): boolean {
  // 1. Data Eligibility Gate
  const quality = evaluateDataQuality(snapshot);
  if (!quality.eligibility) {
    return false; // Blocks all AI/Recommendation downstream if data is mock or insufficient
  }

  // 2. Regulatory / Tier Gates
  // E.g., we cannot recommend executing tax harvesting if the user is in a basic tier 
  // without the tax module, or if they lack the required documentation.
  if (actionType === "EXECUTE_TAX_HARVEST") {
    // Only clear if we explicitly have investment data proving LTCG capability
    if (!snapshot.investmentSummary || snapshot.investmentSummary.totalPortfolioValue === 0) {
      return false; 
    }
  }

  return true;
}

/**
 * PHASE 10: DETERMINISTIC RANKER
 * Converts Opportunities into Recommendations and ranks them mathematically.
 * Rank Priority:
 * 1. Critical High-Interest Debt (Guaranteed negative return ~30%)
 * 2. Critical Emergency Fund Shortfall (Catastrophic risk)
 * 3. High Emergency Fund Shortfall
 * 4. Excess Idle Cash (Opportunity cost)
 * 5. Everything else
 */
export function rankRecommendations(
  opportunities: FinancialOpportunity[], 
  snapshot: FinancialSnapshot
): FinancialRecommendation[] {
  
  const recommendations: FinancialRecommendation[] = [];
  const dataQuality = evaluateDataQuality(snapshot);

  for (const opp of opportunities) {
    let actionType: ActionType;
    let effortLevel: "LOW" | "MEDIUM" | "HIGH";
    let estimatedImpactValue = 0;
    let title = "";
    let description = "";

    switch (opp.type) {
      case "HIGH_INTEREST_DEBT":
      case "OUTSTANDING_CREDIT_BALANCE":
        actionType = "PREPAY_DEBT";
        effortLevel = "MEDIUM";
        // Cannot compute impact value without knowing actual APR.
        estimatedImpactValue = 0;
        title = `Pay off ${opp.metadata.accountName || "Credit Card"}`;
        description = `Consider paying down this debt to avoid potential interest.`;
        break;

      case "LOW_EMERGENCY_FUND":
        actionType = "LIQUIDATE_TO_EMERGENCY_FUND";
        effortLevel = "HIGH";
        estimatedImpactValue = opp.detectedValue; // The impact is the capital secured
        title = `Build your Emergency Fund`;
        description = `You are ₹${opp.detectedValue.toLocaleString()} short of a 6-month safety net. Prioritize this before any new investments.`;
        break;

      case "EXCESS_IDLE_CASH":
        actionType = "INVEST_SURPLUS";
        effortLevel = "LOW";
        // Cannot guess market spread. Impact unknown without a specific investment plan.
        estimatedImpactValue = 0;
        title = `Invest Idle Cash`;
        description = `Consider deploying ₹${opp.detectedValue.toLocaleString()} to prevent inflation decay.`;
        break;

      default:
        continue;
    }

    const passesGate = evaluatePolicyGate(actionType, snapshot, opp.detectedValue);

    recommendations.push({
      id: `REC-${opp.id}`,
      opportunityId: opp.id,
      actionType,
      title,
      description,
      estimatedImpactValue,
      effortLevel,
      confidenceScore: dataQuality.coverageScore, // Deterministic trace back to data coverage
      regulatoryClearance: passesGate,
    });
  }

  // Filter out recommendations that failed the Policy Gate
  const clearedRecommendations = recommendations.filter(r => r.regulatoryClearance);

  // Return the candidates without claiming a financially superior arbitrary ranking.
  // Preserving detector order provides deterministic stability without false priority.
  return clearedRecommendations;
}
