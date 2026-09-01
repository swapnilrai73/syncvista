"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { parseStringify } from "../utils";

export const getInvestmentSummary = async ({ userId }: getInvestmentSummaryProps) => {
  try {
    const investmentRef = doc(db, "investments", userId);
    const investmentDoc = await getDoc(investmentRef);

    if (investmentDoc.exists()) {
      const data = investmentDoc.data();
      return parseStringify({
        totalPortfolioValue: data.totalPortfolioValue || 0,
        equity: data.equity || 0,
        mutualFunds: data.mutualFunds || 0,
        unparsedHoldings: data.unparsedHoldings || 0,
      });
    }

    // Return default values if no data exists
    return {
      totalPortfolioValue: 0,
      equity: 0,
      mutualFunds: 0,
      unparsedHoldings: 0,
    };
  } catch (error) {
    console.error("Error fetching investment summary:", error);
    return {
      totalPortfolioValue: 0,
      equity: 0,
      mutualFunds: 0,
      unparsedHoldings: 0,
    };
  }
};

export const saveInvestmentData = async ({
  userId,
  portfolioData,
}: {
  userId: string;
  portfolioData: any;
}) => {
  try {
    const investmentRef = doc(db, "investments", userId);
    
    // Calculate summary metrics from portfolio data
    let totalPortfolioValue = 0;
    let equity = 0;
    let mutualFunds = 0;
    let unparsedHoldings = 0;

    if (portfolioData && portfolioData.holdings) {
      portfolioData.holdings.forEach((holding: any) => {
        const value = holding.value || 0;
        totalPortfolioValue += value;

        if (holding.asset_type === "equity" || holding.asset_type === "stocks") {
          equity += value;
        } else if (holding.asset_type === "mutual_funds" || holding.asset_type === "mutual funds") {
          mutualFunds += value;
        } else {
          unparsedHoldings += value;
        }
      });
    }

    await setDoc(investmentRef, {
      userId,
      totalPortfolioValue,
      equity,
      mutualFunds,
      unparsedHoldings,
      portfolioData,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return parseStringify({
      totalPortfolioValue,
      equity,
      mutualFunds,
      unparsedHoldings,
    });
  } catch (error) {
    console.error("Error saving investment data:", error);
    throw error;
  }
};
