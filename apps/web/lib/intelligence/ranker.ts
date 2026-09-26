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
        actionType = "PREPAY_DEBT";
        effortLevel = "MEDIUM";
        // Assuming ~36% APR on credit cards -> impact is 36% of the debt over a year
        estimatedImpactValue = Math.round(opp.detectedValue * 0.36);
        title = `Pay off ${opp.metadata.accountName || "Credit Card"}`;
        description = `Clear this debt immediately to guarantee a ~36% annualized return.`;
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
        // Assuming idle cash earns 3% in savings, but could earn 10% in index -> 7% spread
        estimatedImpactValue = Math.round(opp.detectedValue * 0.07);
        title = `Invest Idle Cash`;
        description = `Deploy ₹${opp.detectedValue.toLocaleString()} to prevent inflation decay.`;
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

  // Score function for sorting
  const getRankScore = (rec: FinancialRecommendation, opp: FinancialOpportunity): number => {
    // Highest priority: Critical High Interest Debt
    if (rec.actionType === "PREPAY_DEBT" && opp.severity === "CRITICAL") return 10000 + rec.estimatedImpactValue;
    if (rec.actionType === "PREPAY_DEBT") return 9000 + rec.estimatedImpactValue;
    
    // Second priority: Emergency Fund
    if (rec.actionType === "LIQUIDATE_TO_EMERGENCY_FUND" && opp.severity === "CRITICAL") return 8000 + rec.estimatedImpactValue;
    if (rec.actionType === "LIQUIDATE_TO_EMERGENCY_FUND") return 7000 + rec.estimatedImpactValue;

    // Third priority: Idle Cash
    if (rec.actionType === "INVEST_SURPLUS") return 5000 + rec.estimatedImpactValue;

    return rec.estimatedImpactValue;
  };

  // Sort descending by rank score
  return clearedRecommendations.sort((a, b) => {
    const oppA = opportunities.find(o => o.id === a.opportunityId)!;
    const oppB = opportunities.find(o => o.id === b.opportunityId)!;
    return getRankScore(b, oppB) - getRankScore(a, oppA);
  });
}
