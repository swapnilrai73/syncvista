"use client"

import { useState, useMemo } from 'react'
import { Metric, Text, AreaChart, BarChart, DonutChart } from '@tremor/react'
import { 
  Wallet, Zap, Target, CreditCard, X, AlertTriangle, ShieldCheck, 
  TrendingUp, ArrowUpRight, Scale, Flame, Compass, Layers, Shield,
  Percent, Coins, ArrowRightLeft, Activity, Sparkles, CheckCircle2
} from 'lucide-react'
import {
  calculateFinancialHealth,
  detectSubscriptions,
  detectAnomalies,
  calculateNetWorth,
  calculateMonthlyCashFlow,
  type AnomalyDetection,
} from '@/lib/analytics/engine'
import { formatAmount } from '@/lib/utils'
import { analyzeTaxHarvestOpportunities, compareDebtStrategies, getTaxConfig } from '@syncvista/fire-engine'

const ESSENTIAL_CATEGORIES = ['Rent', 'Mortgage', 'Utilities', 'Groceries', 'Insurance', 'Loan', 'Healthcare', 'Transport', 'Fuel/Transport', 'Fuel']
const DISCRETIONARY_CATEGORIES = ['Entertainment', 'Dining', 'Shopping', 'Travel', 'Subscription', 'Hobbies', 'Food and Drink']

interface FinancialAnalysisProps {
  transactions: any[]
  bankBalances: any[]
  casData?: any
  investmentSummary?: any
}

const FinancialAnalysis = ({ 
  transactions = [], 
  bankBalances = [], 
  investmentSummary 
}: FinancialAnalysisProps) => {
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filterTransactionsByTimeframe = (txns: any[]) => {
    if (timeframe === 'ALL') return txns
    
    const now = new Date()
    const cutoffDate = new Date()
    
    switch (timeframe) {
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case '3M':
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case '6M':
        cutoffDate.setMonth(now.getMonth() - 6)
        break
      case '1Y':
        cutoffDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        return txns
    }
    
    return txns.filter((t: any) => {
      const rawDate = t.date || t.$createdAt || t.createdAt
      if (!rawDate) return false
      const tDate = new Date(rawDate)
      return !isNaN(tDate.getTime()) && tDate >= cutoffDate
    })
  }

  const filteredTransactions = filterTransactionsByTimeframe(transactions)

  const expenseOnlyTransactions = filteredTransactions.filter((t: any) => {
    const isDebitType = t.type ? t.type.toLowerCase() === 'debit' : true
    const isNotSalaryCategory = (t.category || '').toLowerCase() !== 'salary' && (t.name || '').toLowerCase() !== 'monthly salary credit'
    return isDebitType && isNotSalaryCategory
  })

  const categoryFilteredTransactions = selectedCategory 
    ? expenseOnlyTransactions.filter((t: any) => (t.category || '').toLowerCase() === selectedCategory.toLowerCase())
    : expenseOnlyTransactions

  const financialHealth = calculateFinancialHealth(filteredTransactions)
  const rawSubscriptions = detectSubscriptions(categoryFilteredTransactions)

  const subscriptions = rawSubscriptions.filter((sub: any) => {
    const name = (sub.merchant || sub.name || '').toLowerCase()
    const cat = (sub.category || '').toLowerCase()
    return !name.includes('salary') && !name.includes('credit') && cat !== 'salary'
  })

  const anomalies = detectAnomalies(filteredTransactions)
  const netWorth = calculateNetWorth(bankBalances, investmentSummary)
  const monthlyCashFlow = calculateMonthlyCashFlow(filteredTransactions)

  const subscriptionLeakage = subscriptions.reduce((sum: number, sub: any) => {
    const amount = sub.averageAmount || sub.amount || 0
    const monthlyAmount = sub.frequency === 'Weekly' ? amount * 4.33
        : sub.frequency === 'Bi-weekly' ? amount * 2.17
            : sub.frequency === 'Yearly' ? amount / 12
                : amount
    return sum + monthlyAmount
  }, 0)

  const runwayMonths = financialHealth.burnRate > 0 ? Math.floor(netWorth / financialHealth.burnRate) : 0
  const targetRunway = 6

  const expenseCategoriesData = financialHealth.topExpenseCategories.map((cat: any) => ({
    name: cat.category,
    value: cat.amount,
  }))

  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  }

  const chronologicallySortedCashFlow = [...monthlyCashFlow].sort((a, b) => {
    const [aMonth, aYear] = a.month.split(' ')
    const [bMonth, bYear] = b.month.split(' ')
    const dateA = new Date(parseInt(aYear || '2026'), monthMap[aMonth] || 0, 1).getTime()
    const dateB = new Date(parseInt(bYear || '2026'), monthMap[bMonth] || 0, 1).getTime()
    return dateA - dateB
  })

  const groupedCashFlowData = chronologicallySortedCashFlow.map((cf: any) => {
    const parts = (cf.month || '').trim().split(' ')
    const mName = parts[0]
    const yr = parseInt(parts[1] || '2026', 10)
    const mIdx = monthMap[mName] ?? -1

    const monthTxns = filteredTransactions.filter((t: any) => {
      const rawDate = t.date || t.$createdAt || t.createdAt
      if (!rawDate) return false
      const d = new Date(rawDate)
      if (isNaN(d.getTime())) return false
      return d.getMonth() === mIdx && d.getFullYear() === yr
    })

    const computedInflow = monthTxns.reduce((sum: number, t: any) => {
      const isCredit = t.type?.toLowerCase() === 'credit'
      const isSalary = (t.category || '').toLowerCase() === 'salary'
      const isPositive = (t.amount || 0) > 0
      return (isCredit || isSalary || isPositive) ? sum + Math.abs(t.amount || 0) : sum
    }, 0)

    const fallbackInflow = cf.inflow ?? cf.income ?? cf.credits ?? cf.totalInflow ?? 0
    const finalInflow = computedInflow > 0 ? computedInflow : Math.abs(Number(fallbackInflow) || 0)

    const computedOutflow = monthTxns.reduce((sum: number, t: any) => {
      const isDebit = t.type?.toLowerCase() === 'debit'
      const isNegative = (t.amount || 0) < 0
      return (isDebit || isNegative) ? sum + Math.abs(t.amount || 0) : sum
    }, 0)

    const fallbackOutflow = cf.outflow ?? cf.expenses ?? cf.debits ?? cf.totalOutflow ?? 0
    const finalOutflow = computedOutflow > 0 ? computedOutflow : Math.abs(Number(fallbackOutflow) || 0)

    return {
      date: cf.month,
      'Inflow': Math.round(finalInflow),
      'Outflow': Math.round(finalOutflow),
    }
  })

  const cashFlowChartData = chronologicallySortedCashFlow.map((cf: any) => ({
    date: cf.month,
    'Net Cash Flow': cf.net,
  }))

  const currentMonthNet = monthlyCashFlow.length > 0 ? monthlyCashFlow[monthlyCashFlow.length - 1].net : 0
  const previousMonthNet = monthlyCashFlow.length > 1 ? monthlyCashFlow[monthlyCashFlow.length - 2].net : 0
  const cashFlowDelta = previousMonthNet !== 0 ? ((currentMonthNet - previousMonthNet) / Math.abs(previousMonthNet)) * 100 : 0

  const burnRatePercent = financialHealth.burnRate > 0 ? Math.min((financialHealth.burnRate / (netWorth * 0.1)) * 100, 100) : 0
  const runwayPercent = Math.min((runwayMonths / targetRunway) * 100, 100)

  const discretionaryEssentialData = chronologicallySortedCashFlow.map((cf: any) => {
    const cfDate = new Date(`1 ${cf.month}`)
    const targetMonth = cfDate.getMonth()
    const targetYear = cfDate.getFullYear()

    const monthTransactions = filteredTransactions.filter((t: any) => {
      const rawDate = t.date || t.$createdAt
      if (!rawDate) return false
      const tDate = new Date(rawDate)
      return (
          !isNaN(tDate.getTime()) &&
          tDate.getMonth() === targetMonth &&
          tDate.getFullYear() === targetYear
      )
    })

    const isExpense = (t: any) => {
      if (t.type) return t.type.toLowerCase() === 'debit'
      if (t.category) return t.category.toLowerCase() !== 'income' && t.category.toLowerCase() !== 'salary'
      return true
    }

    const essentialSpend = monthTransactions
        .filter(isExpense)
        .filter((t: any) => ESSENTIAL_CATEGORIES.some((cat: string) => (t.category || '').toLowerCase().includes(cat.toLowerCase())))
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0)

    const discretionarySpend = monthTransactions
        .filter(isExpense)
        .filter((t: any) => DISCRETIONARY_CATEGORIES.some((cat: string) => (t.category || '').toLowerCase().includes(cat.toLowerCase())))
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0)

    return {
      date: cf.month,
      'Discretionary Spend': discretionarySpend,
      'Essential Fixed Costs': essentialSpend,
    }
  })

  const subscriptionChartData = subscriptions
      .map((sub: any) => {
        const amount = sub.averageAmount || sub.amount || 0
        const monthlyAmount =
            sub.frequency === 'Weekly' ? amount * 4.33
                : sub.frequency === 'Bi-weekly' ? amount * 2.17
                    : sub.frequency === 'Yearly' ? amount / 12
                        : amount

        return {
          name: sub.merchant || sub.name || 'Service',
          'Monthly Spend': Math.round(monthlyAmount),
        }
      })
      .sort((a: any, b: any) => b['Monthly Spend'] - a['Monthly Spend'])
      .slice(0, 10)

  const chartStyles = "h-56 mt-4 [&_.recharts-cartesian-axis-tick-text]:!text-xs [&_.recharts-cartesian-axis-tick-text]:!fill-slate-500 [&_.recharts-cartesian-grid-line]:!stroke-slate-200"

  const latestGroupedCf = groupedCashFlowData.length > 0
      ? groupedCashFlowData[groupedCashFlowData.length - 1]
      : { date: '', 'Inflow': 0, 'Outflow': 0 }

  const grossInflow = latestGroupedCf['Inflow'] || 0
  const grossOutflow = latestGroupedCf['Outflow'] || 0
  const retainedAmount = Math.max(0, grossInflow - grossOutflow)

  const expenseRatio = grossInflow > 0 ? Math.min(100, (grossOutflow / grossInflow) * 100) : 0
  const retainedRatio = Math.max(0, 100 - expenseRatio)

  // ─────────────────────────────────────────────────────────────────────────
  // Pillar 4: Opportunities Calculations (Powered by @syncvista/fire-engine)
  // ─────────────────────────────────────────────────────────────────────────
  const taxConfig = useMemo(() => {
    try {
      return getTaxConfig('FY2026-27')
    } catch {
      return {
        fiscalYear: 'FY2026-27',
        ltcgEquityExemptionThreshold: 125000,
        ltcgEquityRate: 0.125,
        stcgEquityRate: 0.2,
        section80CCD1BCap: 50000,
        epfAssumedRate: 0.0815,
      }
    }
  }, [])

  const taxHarvestOutput = useMemo(() => {
    const equityVal = investmentSummary?.equity || 0
    const lots = equityVal > 0 ? [
      {
        id: 'lot_equity_broad',
        assetLabel: 'Diversified Equity Holdings',
        isEquityOriented: true,
        purchaseDate: '2024-04-01',
        costBasis: Math.round(equityVal * 0.75),
        currentValue: equityVal,
      }
    ] : []

    return analyzeTaxHarvestOpportunities({
      taxYear: 'FY2026-27',
      lots,
      realizedGainsThisYear: { stcg: 0, ltcg: 0 }
    }, taxConfig)
  }, [investmentSummary, taxConfig])

  const debtOpportunity = useMemo(() => {
    return compareDebtStrategies({
      loans: [
        {
          id: 'loan_revolving',
          label: 'Credit / Short-Term Facility',
          type: 'personal',
          outstandingBalance: 85000,
          annualInterestRate: 0.165,
          monthlyEMI: 4500,
        },
        {
          id: 'loan_auto',
          label: 'Vehicle / Fixed Term Facility',
          type: 'car',
          outstandingBalance: 320000,
          annualInterestRate: 0.092,
          monthlyEMI: 7600,
        }
      ],
      extraMonthlyPayment: Math.min(10000, Math.max(2500, Math.round(retainedAmount * 0.25))),
      strategy: 'avalanche',
      userMarginalTaxRate: 0.30,
      expectedPostTaxPortfolioReturn: 0.11,
    })
  }, [retainedAmount])

  // Emergency buffer target (6 months burn rate)
  const emergencyBufferTarget = Math.max(100000, Math.round(financialHealth.burnRate * 6))
  const totalLiquidCash = bankBalances.reduce((sum: number, b: any) => {
    const bal = b.currentBalance ?? b.balance ?? b.availableBalance ?? 0
    return sum + Number(bal)
  }, 0)
  const excessLiquidity = totalLiquidCash - emergencyBufferTarget

  if (transactions.length === 0) {
    if (bankBalances.length > 0) {
      const singleAccount = bankBalances[0]
      const accBalance = singleAccount?.currentBalance ?? singleAccount?.balance ?? singleAccount?.availableBalance ?? 0
      const accName = singleAccount?.name || 'Selected Account'
      const isCredit = singleAccount?.type === 'credit' || singleAccount?.subtype === 'credit_card'

      return (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xs mt-4 text-slate-800">
          <div className="max-w-xl mx-auto text-center py-8">
            <div className="inline-flex items-center justify-center p-3.5 bg-blue-50 text-[#002766] rounded-2xl mb-4">
              <ShieldCheck className="h-7 w-7 text-[#002766]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">{accName} Active</h3>
            <p className="text-sm text-slate-500 mt-1">
              Current Ledger Balance: <span className="font-semibold text-slate-800">{formatAmount(accBalance)}</span>
            </p>
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-left">
              <p className="text-xs font-semibold text-[#002766] uppercase tracking-wider mb-1">
                Zero Settle Activity Recorded
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isCredit
                  ? 'No card debits or payments have been recorded for this credit account during the selected timeframe. As transactions settle, credit utilization telemetry and velocity will populate here.'
                  : 'No debit or credit transactions have been recorded for this depository account during the selected timeframe. As transactions settle, cash flow velocity and spending telemetry will populate automatically.'}
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 shadow-sm mt-4 text-slate-800">
        <div className="text-center py-12">
          <Text className="text-slate-500 text-lg">No transaction data available</Text>
          <Text className="text-slate-400 mt-2">Connect your bank accounts to see financial intelligence</Text>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Dashboard Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Activity className="h-5 w-5 text-[#002766]" />
            <h2 className="text-lg font-bold text-slate-800">Intelligence Horizon</h2>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  timeframe === tf
                    ? 'bg-white text-[#002766] shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedCategory && (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-medium hover:bg-rose-100 transition-colors"
            >
              <span>Filtered: {selectedCategory}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
            <Wallet className="h-4 w-4 text-slate-400" />
            <span>{filteredTransactions.length} transactions analyzed</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. CAPITAL HEALTH                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-lg bg-[#002766] text-white">
                <Shield className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">1. Capital Health</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 pl-0.5">
              Your overall financial strength and stability
            </p>
          </div>
          <div>
            {runwayMonths >= targetRunway && financialHealth.savingsRate >= 20 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Resilient Capital Health
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                Attention Recommended
              </span>
            )}
          </div>
        </div>

        {/* 4 Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Net Worth */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Net Worth</Text>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  cashFlowDelta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {cashFlowDelta >= 0 ? '+' : ''}{cashFlowDelta.toFixed(1)}%
                </span>
              </div>
              <Metric className="text-2xl lg:text-3xl font-bold text-slate-800 my-1">
                {formatAmount(netWorth)}
              </Metric>
              <Text className="text-slate-400 text-xs">
                Prev: {formatAmount(netWorth * (1 - cashFlowDelta / 100))}
              </Text>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="h-14 [&_.recharts-area-area]:!fill-[#002766]/15 [&_.recharts-area-curve]:!stroke-[#002766]">
                <AreaChart
                  className="h-14"
                  data={cashFlowChartData}
                  index="date"
                  categories={['Net Cash Flow']}
                  colors={['blue-900']}
                  showLegend={false}
                  showYAxis={false}
                  showXAxis={false}
                  showGridLines={false}
                  showTooltip={false}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Liquid accounts & CAS assets</p>
            </div>
          </div>

          {/* Card 2: Liquidity Runway */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Liquidity Runway</Text>
                <Target className="h-4 w-4 text-emerald-600" />
              </div>
              <Metric className="text-2xl lg:text-3xl font-bold text-slate-800 my-1">
                {runwayMonths} <span className="text-base font-normal text-slate-500">Months</span>
              </Metric>
              <Text className="text-slate-400 text-xs">Target: {targetRunway} months of coverage</Text>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    runwayMonths >= targetRunway ? 'bg-emerald-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${runwayPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{runwayPercent.toFixed(0)}% Funded</span>
                {runwayMonths >= targetRunway ? (
                  <span className="text-emerald-700 font-medium">Safe buffer</span>
                ) : (
                  <span className="text-amber-700 font-medium">Under target</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Burn Rate */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Burn Rate</Text>
                <Zap className="h-4 w-4 text-[#002766]" />
              </div>
              <Metric className="text-2xl lg:text-3xl font-bold text-slate-800 my-1">
                {formatAmount(financialHealth.burnRate)}
              </Metric>
              <Text className="text-slate-400 text-xs">Average monthly operational outflow</Text>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Safe Threshold (10%)</span>
                <span className="font-semibold text-slate-700">{formatAmount(netWorth * 0.1)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#002766] rounded-full transition-all duration-500"
                  style={{ width: `${burnRatePercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">{burnRatePercent.toFixed(0)}% of safety threshold capacity</p>
            </div>
          </div>

          {/* Card 4: Savings Rate */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Savings Rate</Text>
                <Percent className="h-4 w-4 text-indigo-600" />
              </div>
              <Metric className="text-2xl lg:text-3xl font-bold text-slate-800 my-1">
                {financialHealth.savingsRate.toFixed(1)}%
              </Metric>
              <Text className="text-slate-400 text-xs">Retained from monthly inflow</Text>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#002766]" />
                  <span className="text-slate-600 font-medium">Saved ({financialHealth.savingsRate.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-slate-200" />
                  <span className="text-slate-500">Spent ({(100 - financialHealth.savingsRate).toFixed(0)}%)</span>
                </div>
              </div>

              <div className="size-16 relative flex items-center justify-center [&_p]:!hidden [&_text]:!hidden [&_tspan]:!hidden [&_.recharts-pie-sector:first-child]:!fill-[#002766]">
                <DonutChart
                  className="size-16"
                  data={[
                    { name: 'Saved', value: financialHealth.savingsRate },
                    { name: 'Spent', value: Math.max(0, 100 - financialHealth.savingsRate) },
                  ]}
                  category="value"
                  index="name"
                  colors={['blue-900', 'slate-200']}
                  showTooltip={false}
                  valueFormatter={() => ''}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. CASH FLOW & VELOCITY                                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-lg bg-[#002766] text-white">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">2. Cash Flow & Velocity</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 pl-0.5">
              How money moves through your system
            </p>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              grossInflow >= grossOutflow 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {grossInflow >= grossOutflow ? <TrendingUp className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {grossInflow >= grossOutflow ? 'Positive Cash Flow Velocity' : 'Deficit Cash Flow Velocity'}
            </span>
          </div>
        </div>

        {/* Velocity & Momentum Summary Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Inflow</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{formatAmount(grossInflow)}</p>
              <p className="text-[11px] text-slate-400">Total monthly credits</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Outflow</p>
              <p className="text-xl font-bold text-rose-600 mt-1">{formatAmount(grossOutflow)}</p>
              <p className="text-[11px] text-slate-400">Essential + Discretionary</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Retained</p>
              <p className="text-xl font-bold text-[#002766] mt-1">{formatAmount(retainedAmount)}</p>
              <p className="text-[11px] text-emerald-600 font-medium">{retainedRatio.toFixed(1)}% retained</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Velocity Momentum</p>
              <p className="text-xl font-bold text-slate-800 mt-1">
                {cashFlowDelta >= 0 ? `+${cashFlowDelta.toFixed(1)}%` : `${cashFlowDelta.toFixed(1)}%`}
              </p>
              <p className="text-[11px] text-slate-400">vs prior period net velocity</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-600 font-medium">Inflow Retention Split</span>
              <span className="text-slate-500">{retainedRatio.toFixed(0)}% Saved / {expenseRatio.toFixed(0)}% Spent</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-[#002766] transition-all duration-500"
                style={{ width: `${retainedRatio}%` }}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${expenseRatio}%` }}
              />
            </div>
          </div>
        </div>

        {/* Analytical Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Cash Flow Trajectory */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs [&_.recharts-bar-rectangle:first-child_path]:!fill-[#002766] [&_.recharts-legend-item:first-child_.recharts-legend-item-text]:!text-[#002766]">
            <div className="mb-2">
              <h4 className="text-base font-semibold text-slate-800 tracking-tight">Cash Flow Trajectory</h4>
              <p className="text-xs text-slate-500 mt-0.5">Inflow vs outflow comparisons across active periods</p>
            </div>
            <BarChart
              className={chartStyles}
              data={groupedCashFlowData}
              index="date"
              categories={['Inflow', 'Outflow']}
              colors={['blue-900', 'rose-500']}
              valueFormatter={(val: number) => formatAmount(val)}
              showLegend={true}
              showYAxis={true}
              yAxisWidth={110}
              minValue={0}
              showGridLines={true}
            />
          </div>

          {/* Card 2: Stacked Discretionary vs Essential */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="mb-2">
              <h4 className="text-base font-semibold text-slate-800 tracking-tight">Essential vs Discretionary Velocity</h4>
              <p className="text-xs text-slate-500 mt-0.5">Stacked proportions of fixed commitments vs variable spending</p>
            </div>
            <BarChart
              className={chartStyles}
              data={discretionaryEssentialData}
              index="date"
              categories={['Essential Fixed Costs', 'Discretionary Spend']}
              colors={['emerald-600', 'indigo-900']}
              stack={true}
              valueFormatter={(val: number) => formatAmount(val)}
              showLegend={true}
              showYAxis={true}
              yAxisWidth={110}
              minValue={0}
              showGridLines={true}
            />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. LEAKAGE & RISK                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-lg bg-[#002766] text-white">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">3. Leakage & Risk</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 pl-0.5">
              What's leaking, what's risky, what needs attention
            </p>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              anomalies.length > 0 
                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {anomalies.length > 0 ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {anomalies.length} Risk Items Detected
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Risk Guard Active
                </>
              )}
            </span>
          </div>
        </div>

        {/* Subscriptions & Category Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Card 1: Subscription Leakage */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-violet-600" />
                  <h4 className="text-base font-semibold text-slate-800">Subscription Leakage</h4>
                </div>
                <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-100">
                  {formatAmount(subscriptionLeakage)}/mo
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Annualized recurring drag: <span className="font-semibold text-slate-700">{formatAmount(subscriptionLeakage * 12)}/yr</span> across {subscriptions.length} active services
              </p>
            </div>

            <div className="mt-4">
              <BarChart
                className={chartStyles}
                data={subscriptionChartData}
                index="name"
                categories={['Monthly Spend']}
                colors={['violet-600']}
                valueFormatter={(val: number) => formatAmount(val)}
                showLegend={false}
                showYAxis={true}
                yAxisWidth={110}
                minValue={0}
                showGridLines={true}
              />
            </div>
          </div>

          {/* Card 2: Category Risk Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between [&_.recharts-bar-rectangle_path]:!fill-[#002766]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#002766]" />
                  <h4 className="text-base font-semibold text-slate-800">Category Risk Breakdown</h4>
                </div>
                <span className="text-xs text-slate-500">Click bar to filter</span>
              </div>
              <p className="text-xs text-slate-500">
                Spending distribution across primary operational categories
              </p>
            </div>

            <div className="mt-4">
              <BarChart
                className={chartStyles}
                data={expenseCategoriesData}
                index="name"
                categories={['value']}
                colors={['blue-900']}
                valueFormatter={(val: number) => formatAmount(val)}
                showLegend={false}
                showYAxis={true}
                yAxisWidth={110}
                minValue={0}
                showGridLines={true}
                onValueChange={(v) => {
                  if (v && typeof v === 'object' && 'name' in v) {
                    setSelectedCategory(v.name as string)
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Anomaly Detection & Unusual Transactions */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h4 className="text-base font-semibold text-slate-800 tracking-tight">
                  Anomaly Detection & Unusual Transactions
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  anomalies.length > 0 
                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {anomalies.length} {anomalies.length === 1 ? 'outlier' : 'outliers'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Transactions deviating beyond +2.5 standard deviations from category baseline
              </p>
            </div>
            {anomalies.length > 0 && (
              <span className="text-xs text-slate-400 font-medium">Sorted by statistical deviation</span>
            )}
          </div>

          {anomalies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="pb-2 pl-1">Transaction</th>
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-right pr-1">Deviation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {anomalies.map((a: AnomalyDetection, idx: number) => {
                    const formattedDate = a.date ? new Date(a.date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'N/A';

                    return (
                      <tr key={a.transactionId || `anomaly-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 pl-1 font-medium text-slate-800 max-w-[200px] truncate">
                          {a.name}
                        </td>
                        <td className="py-2.5 text-slate-600">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {a.category}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-500">
                          {formattedDate}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-rose-600">
                          {formatAmount(Math.abs(a.amount))}
                        </td>
                        <td className="py-2.5 text-right pr-1 font-mono text-[11px] text-amber-700 font-medium">
                          +{a.zScore.toFixed(1)}σ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <ShieldCheck className="h-8 w-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium text-slate-700">No spending anomalies detected</p>
              <p className="text-xs text-slate-400 mt-0.5">
                All transactions in this timeframe fall within expected standard deviations for their categories.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. OPPORTUNITIES                                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-lg bg-[#002766] text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">4. Opportunities</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 pl-0.5">
              Where you can improve and grow
            </p>
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Coins className="h-3.5 w-3.5" />
              3 Strategic Opportunities
            </span>
          </div>
        </div>

        {/* 3 Strategic Opportunities Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Tax Opportunity */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 font-semibold text-[11px] border border-blue-100">
                  Tax Opportunity
                </span>
                <Scale className="h-4 w-4 text-[#002766]" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Section 112A LTCG Harvesting
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                FY 2026-27 annual long-term capital gains exemption headroom.
              </p>

              <div className="my-4 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Exemption Cap:</span>
                  <span className="font-bold text-slate-800">{formatAmount(taxConfig.ltcgEquityExemptionThreshold)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Tax Savings at 12.5%:</span>
                  <span className="font-bold text-emerald-700">{formatAmount(taxConfig.ltcgEquityExemptionThreshold * taxConfig.ltcgEquityRate)}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Realizing eligible unrealized equity gains up to ₹1.25L before March 31 resets acquisition cost basis higher at zero tax cost under Section 112A.
              </p>
            </div>
          </div>

          {/* Card 2: Debt Opportunity */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/50 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[11px] border border-amber-100">
                  Debt Opportunity
                </span>
                <Flame className="h-4 w-4 text-amber-600" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Accelerated Avalanche Payoff
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Debt clearance strategy comparison powered by fire-engine.
              </p>

              <div className="my-4 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Engine Strategy:</span>
                  <span className="font-bold text-slate-800 capitalize">{debtOpportunity.avalanche.strategy}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Payoff Recommendation:</span>
                  <span className="font-bold text-emerald-700">Prepay High Interest</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Prioritizing highest-rate liabilities with surplus monthly cash flow minimizes total interest drag and accelerates freed cash flow into compounding assets.
              </p>
            </div>
          </div>

          {/* Card 3: Allocation Opportunity */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-[11px] border border-emerald-100">
                  Allocation Opportunity
                </span>
                <Compass className="h-4 w-4 text-emerald-600" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Liquidity Buffer & Rebalancing
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Safety net coverage vs growth asset deployment.
              </p>

              <div className="my-4 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">6-Mo Buffer Target:</span>
                  <span className="font-bold text-slate-800">{formatAmount(emergencyBufferTarget)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Liquid Position:</span>
                  <span className={`font-bold ${excessLiquidity >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {excessLiquidity >= 0 ? `+${formatAmount(excessLiquidity)} surplus` : `${formatAmount(Math.abs(excessLiquidity))} gap`}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {excessLiquidity >= 0 
                  ? `You maintain ₹${Math.round(excessLiquidity).toLocaleString('en-IN')} beyond your 6-month safety buffer. Deploying this idle cash into equity index funds protects purchasing power against inflation.`
                  : `Your liquid accounts are ₹${Math.round(Math.abs(excessLiquidity)).toLocaleString('en-IN')} below the 6-month living cost safety buffer. Direct current monthly savings into high-yield liquid accounts until fully funded.`}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default FinancialAnalysis
