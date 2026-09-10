"use client"

import { useMemo } from 'react'
import {
  calculateFinancialHealth,
  detectSubscriptions,
  detectAnomalies,
  calculateNetWorth,
  calculateMonthlyCashFlow,
} from '@/lib/analytics/engine'
import { MOCK_DATA } from '@/lib/mockData'
import FinancialPosition from './FinancialPosition'
import FinancialHealthCard from './FinancialHealthCard'
import FinancialTrajectoryCard from './FinancialTrajectoryCard'
import AttentionNeededCard from './AttentionNeededCard'
import SyncVistaIntelligenceCard from './SyncVistaIntelligenceCard'
import SupportingSnapshotCard from './SupportingSnapshotCard'

interface HomeDashboardClientProps {
  user: any
  accounts?: any[]
  allTransactions?: any[]
  investmentSummary?: any
}

export default function HomeDashboardClient({
  user,
  accounts = [],
  allTransactions = [],
  investmentSummary,
}: HomeDashboardClientProps) {
  // 1. Resolve Accounts and Transactions source (Graceful fallback to MOCK_DATA)
  const effectiveAccounts = useMemo(() => {
    if (accounts && accounts.length > 0) return accounts
    return MOCK_DATA.bankAccounts || []
  }, [accounts])

  const effectiveTransactions = useMemo(() => {
    if (allTransactions && allTransactions.length > 0) return allTransactions
    return MOCK_DATA.transactions || []
  }, [allTransactions])

  // 2. Deterministic Core Calculations
  const financialHealth = useMemo(() => {
    return calculateFinancialHealth(effectiveTransactions)
  }, [effectiveTransactions])

  const subscriptions = useMemo(() => {
    const raw = detectSubscriptions(effectiveTransactions)
    return raw.filter((sub: any) => {
      const name = (sub.merchant || sub.name || '').toLowerCase()
      const cat = (sub.category || '').toLowerCase()
      return !name.includes('salary') && !name.includes('credit') && cat !== 'salary'
    })
  }, [effectiveTransactions])

  const subscriptionLeakage = useMemo(() => {
    return subscriptions.reduce((sum: number, sub: any) => {
      const amount = sub.averageAmount || sub.amount || 0
      const monthlyAmount = sub.frequency === 'Weekly' ? amount * 4.33
        : sub.frequency === 'Bi-weekly' ? amount * 2.17
        : sub.frequency === 'Yearly' ? amount / 12
        : amount
      return sum + monthlyAmount
    }, 0)
  }, [subscriptions])

  const anomalies = useMemo(() => {
    return detectAnomalies(effectiveTransactions)
  }, [effectiveTransactions])

  const netWorth = useMemo(() => {
    return calculateNetWorth(effectiveAccounts, investmentSummary)
  }, [effectiveAccounts, investmentSummary])

  const totalLiquid = useMemo(() => {
    return effectiveAccounts.reduce((sum, acc) => {
      const bal = acc.currentBalance ?? acc.balance ?? acc.availableBalance ?? 0
      return sum + Number(bal)
    }, 0)
  }, [effectiveAccounts])

  const runwayMonths = useMemo(() => {
    if (financialHealth.burnRate <= 0) return 0
    return Math.floor(totalLiquid / financialHealth.burnRate)
  }, [totalLiquid, financialHealth.burnRate])

  const monthlyCashFlow = useMemo(() => {
    return calculateMonthlyCashFlow(effectiveTransactions)
  }, [effectiveTransactions])

  // 3. Cash Flow Trajectory & Velocity Metrics
  const { grossInflow, grossOutflow, retainedAmount, cashFlowDelta } = useMemo(() => {
    if (monthlyCashFlow.length === 0) {
      return { grossInflow: 0, grossOutflow: 0, retainedAmount: 0, cashFlowDelta: 0 }
    }

    const latest = monthlyCashFlow[monthlyCashFlow.length - 1]
    const previous = monthlyCashFlow.length > 1 ? monthlyCashFlow[monthlyCashFlow.length - 2] : null

    const inflow = latest.inflow || 0
    const outflow = latest.outflow || 0
    const retained = Math.max(0, inflow - outflow)

    let delta = 0
    if (previous && previous.net !== 0) {
      delta = ((latest.net - previous.net) / Math.abs(previous.net)) * 100
    }

    return {
      grossInflow: inflow,
      grossOutflow: outflow,
      retainedAmount: retained,
      cashFlowDelta: delta,
    }
  }, [monthlyCashFlow])

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-16 pt-8 lg:pt-12 px-5 sm:px-8 lg:px-10 font-sans">
      {/* SECTION 1 — FINANCIAL POSITION */}
      <FinancialPosition
        userFirstName={user?.firstName || 'User'}
        netWorth={netWorth}
        totalLiquid={totalLiquid}
        savingsRate={financialHealth.savingsRate}
        runwayMonths={runwayMonths}
        cashFlowDelta={cashFlowDelta}
        bankCount={effectiveAccounts.length}
      />

      {/* SECTION 2 — FINANCIAL HEALTH */}
      <FinancialHealthCard
        netWorth={netWorth}
        burnRate={financialHealth.burnRate}
        savingsRate={financialHealth.savingsRate}
        runwayMonths={runwayMonths}
        anomaliesCount={anomalies.length}
      />

      {/* 2-COLUMN EQUAL-WIDTH SPLIT: SECTION 3 (TRAJECTORY) & SECTION 4 (ATTENTION NEEDED) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="h-full flex flex-col">
          <FinancialTrajectoryCard
            monthlyCashFlow={monthlyCashFlow}
            grossInflow={grossInflow}
            grossOutflow={grossOutflow}
            retainedAmount={retainedAmount}
            cashFlowDelta={cashFlowDelta}
          />
        </div>

        <div className="h-full flex flex-col">
          <AttentionNeededCard
            anomalies={anomalies}
            subscriptionsCount={subscriptions.length}
            subscriptionLeakage={subscriptionLeakage}
            runwayMonths={runwayMonths}
            topExpenseCategory={financialHealth.topExpenseCategories[0]}
          />
        </div>
      </div>

      {/* SECTION 5 — SYNCVISTA INTELLIGENCE */}
      <SyncVistaIntelligenceCard
        retainedAmount={retainedAmount}
        totalLiquid={totalLiquid}
        burnRate={financialHealth.burnRate}
        runwayMonths={runwayMonths}
        netWorth={netWorth}
      />

      {/* SECTION 6 — SUPPORTING FINANCIAL SNAPSHOT */}
      <SupportingSnapshotCard
        accounts={effectiveAccounts}
        user={user}
        topCategories={financialHealth.topExpenseCategories}
        recentTransactions={effectiveTransactions}
      />
    </div>
  )
}
