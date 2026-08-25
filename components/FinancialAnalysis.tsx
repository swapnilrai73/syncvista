"use client"

import { Metric, Text, AreaChart, BarChart, DonutChart } from '@tremor/react'
import { Wallet, Zap, Target, CreditCard } from 'lucide-react'
import {
  calculateFinancialHealth,
  detectSubscriptions,
  detectAnomalies,
  calculateNetWorth,
  calculateMonthlyCashFlow,
} from '@/lib/analytics/engine'
import { formatAmount } from '@/lib/utils'

const ESSENTIAL_CATEGORIES = ['Rent', 'Mortgage', 'Utilities', 'Groceries', 'Insurance', 'Loan', 'Healthcare', 'Transport', 'Fuel/Transport', 'Fuel']
const DISCRETIONARY_CATEGORIES = ['Entertainment', 'Dining', 'Shopping', 'Travel', 'Subscription', 'Hobbies', 'Food and Drink']

interface FinancialAnalysisProps {
  transactions: any[]
  bankBalances: any[]
  casData?: any
  investmentSummary?: any
}

const FinancialAnalysis = ({ transactions = [], bankBalances = [], investmentSummary }: FinancialAnalysisProps) => {
  const expenseOnlyTransactions = transactions.filter((t: any) => {
    const isDebitType = t.type ? t.type.toLowerCase() === 'debit' : true
    const isNotSalaryCategory = (t.category || '').toLowerCase() !== 'salary' && (t.name || '').toLowerCase() !== 'monthly salary credit'
    return isDebitType && isNotSalaryCategory
  })

  const financialHealth = calculateFinancialHealth(transactions)
  const rawSubscriptions = detectSubscriptions(expenseOnlyTransactions)

  const subscriptions = rawSubscriptions.filter((sub: any) => {
    const name = (sub.merchant || sub.name || '').toLowerCase()
    const cat = (sub.category || '').toLowerCase()
    return !name.includes('salary') && !name.includes('credit') && cat !== 'salary'
  })

  const anomalies = detectAnomalies(transactions)
  const netWorth = calculateNetWorth(bankBalances, investmentSummary)
  const monthlyCashFlow = calculateMonthlyCashFlow(transactions)

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

    const monthTxns = transactions.filter((t: any) => {
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

    const monthTransactions = transactions.filter((t: any) => {
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

  if (transactions.length === 0) {
    return (
        <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 shadow-sm mt-4 text-slate-800">
          <div className="text-center py-12">
            <Text className="text-slate-500 text-lg">No transaction data available</Text>
            <Text className="text-slate-400 mt-2">Connect your bank accounts to see financial analysis</Text>
          </div>
        </div>
    )
  }

  const chartStyles = "h-56 mt-4 [&_.recharts-cartesian-axis-tick-text]:!text-xs [&_.recharts-cartesian-axis-tick-text]:!fill-slate-500 [&_.recharts-cartesian-grid-line]:!stroke-slate-200"

  const latestCf = monthlyCashFlow.length > 0
      ? monthlyCashFlow[monthlyCashFlow.length - 1]
      : { inflow: 0, outflow: 0, net: 0, month: '' }

  const grossInflow = latestCf.inflow ??
      (financialHealth.savingsRate < 100
          ? latestCf.outflow / (1 - financialHealth.savingsRate / 100)
          : latestCf.outflow)

  const grossOutflow = latestCf.outflow || 0
  const retainedAmount = Math.max(0, grossInflow - grossOutflow)

  const expenseRatio = grossInflow > 0 ? Math.min(100, (grossOutflow / grossInflow) * 100) : 0
  const retainedRatio = Math.max(0, 100 - expenseRatio)

  return (
      <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 shadow-sm mt-4 text-slate-800 font-sans">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Financial Analytics Dashboard</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Wallet className="h-4 w-4" />
            <span>{transactions.length} transactions analyzed</span>
          </div>
        </div>

        {/* Row 1: KPI Capacity & Metric Gauges */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Burn Rate */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#002766]" />
                <Text className="text-slate-800 font-semibold">Burn Rate</Text>
              </div>
              <Text className="text-slate-500 text-xs">vs threshold</Text>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Text className="text-slate-600">Current Spend</Text>
                  <Text className="text-slate-800 font-semibold">{formatAmount(financialHealth.burnRate)}</Text>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                      className="h-full bg-[#002766] rounded-full transition-all duration-500"
                      style={{ width: `${burnRatePercent}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Text className="text-slate-600">Avg Threshold</Text>
                  <Text className="text-slate-500">{formatAmount(netWorth * 0.1)}</Text>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-300 rounded-full w-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Liquidity Runway */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-600" />
                <Text className="text-slate-800 font-semibold">Liquidity Runway</Text>
              </div>
              <Text className="text-slate-500 text-xs">Months of coverage</Text>
            </div>
            <div className="flex items-center justify-center mb-4">
              <div className="text-center">
                <Metric className="text-4xl font-bold text-slate-800">{runwayMonths}</Metric>
                <Text className="text-slate-500 text-sm">/ {targetRunway} months target</Text>
              </div>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${runwayPercent}%` }}
              />
            </div>
            <Text className="text-slate-500 text-xs mt-2 text-center">
              {runwayMonths >= targetRunway ? '✓ Healthy runway' : '⚠ Low runway warning'}
            </Text>
          </div>

          {/* Subscription Leakage */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-violet-600" />
                <Text className="text-slate-800 font-semibold">Subscription Leakage</Text>
              </div>
              <Text className="text-violet-600 text-sm font-semibold">{formatAmount(subscriptionLeakage)}/mo</Text>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-slate-700 text-sm font-medium">Active Subscriptions</Text>
                  <Text className="text-slate-500 text-xs">Recurring charges detected</Text>
                </div>
                <div className="text-right">
                  <Text className="text-2xl font-bold text-violet-600">{subscriptions.length}</Text>
                  <Text className="text-slate-500 text-xs">services</Text>
                </div>
              </div>
            </div>
            {subscriptions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {subscriptions.slice(0, 2).map((sub: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-xs">
                        <Text className="text-slate-600 truncate w-24">{sub.merchant || sub.name}</Text>
                        <Text className="text-slate-800 font-medium">{formatAmount(sub.averageAmount || sub.amount)}</Text>
                      </div>
                  ))}
                </div>
            )}
          </div>
        </div>

        {/* Row 2: Fixed Overview Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Card 1: Monthly Cash Flow */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <Text className="text-slate-600 text-sm font-medium">Monthly Cash Flow</Text>
              <Metric className="text-3xl font-bold text-slate-800 my-1">
                {formatAmount(grossInflow)}
              </Metric>
              <Text className="text-slate-500 text-xs mb-4">Total gross monthly inflow</Text>
            </div>

            <div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex mb-3">
                <div
                    className="h-full bg-[#002766] transition-all duration-500"
                    style={{ width: `${retainedRatio}%` }}
                />
                <div
                    className="h-full bg-rose-500 transition-all duration-500"
                    style={{ width: `${expenseRatio}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <Text className="text-slate-600">Expenses: {formatAmount(grossOutflow)}</Text>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#002766] inline-block" />
                  <Text className="text-slate-600">Retained: {formatAmount(retainedAmount)}</Text>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Savings Rate */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div className="flex flex-col justify-between h-full">
              <div>
                <Text className="text-slate-600 text-sm font-medium">Savings Rate</Text>
                <Metric className="text-3xl font-bold text-slate-800 my-1">
                  {financialHealth.savingsRate.toFixed(1)}%
                </Metric>
              </div>

              <div className="space-y-1.5 mt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#002766] inline-block" />
                  <Text className="text-xs text-slate-600">Saved ({financialHealth.savingsRate.toFixed(0)}%)</Text>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" />
                  <Text className="text-xs text-slate-600">Spent ({(100 - financialHealth.savingsRate).toFixed(0)}%)</Text>
                </div>
              </div>
            </div>

            <div className="h-28 w-28 relative flex items-center justify-center [&_p]:!hidden [&_text]:!hidden [&_tspan]:!hidden [&_.recharts-pie-sector:first-child]:!fill-[#002766]">
              <DonutChart
                  className="h-28 w-28"
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

          {/* Card 3: Net Worth Trends */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-center">
            <div className="flex flex-col justify-between h-full pr-2">
              <div>
                <Text className="text-slate-600 text-sm font-medium">Net Worth Trends</Text>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#002766] inline-block" />
                    <Text className="text-xs text-slate-500">Current</Text>
                  </div>
                  <Metric className="text-xl font-bold text-slate-800">{formatAmount(netWorth)}</Metric>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                    <Text className="text-xs text-slate-500">Prev. Period</Text>
                  </div>
                  <Text className="text-base font-semibold text-slate-600">
                    {formatAmount(netWorth * (1 - cashFlowDelta / 100))}
                  </Text>
                </div>
              </div>
            </div>

            <div className="w-1/2 h-28 flex flex-col justify-end [&_.recharts-area-area]:!fill-[#002766]/20 [&_.recharts-area-curve]:!stroke-[#002766]">
              <AreaChart
                  className="h-20"
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
              <div className="flex justify-between text-[11px] text-slate-400 mt-2 px-1 font-medium">
                <span>{cashFlowChartData[0]?.date}</span>
                <span>{cashFlowChartData[cashFlowChartData.length - 1]?.date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Analytical Moat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Card 1: Side-by-Side Grouped Cash Flow */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs [&_.recharts-bar-rectangle:first-child_path]:!fill-[#002766] [&_.recharts-legend-item:first-child_.recharts-legend-item-text]:!text-[#002766]">
            <div className="mb-2">
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">Cash Flow Trajectory</h3>
              <p className="text-xs text-slate-500 mt-0.5">Inflow vs outflow comparisons per monthly period</p>
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

          {/* Card 2: Category Risk Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs [&_.recharts-bar-rectangle_path]:!fill-[#002766]">
            <div className="mb-2">
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">Category Risk Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">Spending distribution across primary risk categories</p>
            </div>
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
            />
          </div>

          {/* Card 3: Stacked Discretionary vs Essential */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="mb-2">
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">Discretionary vs Essential Velocity</h3>
              <p className="text-xs text-slate-500 mt-0.5">Stacked proportions of fixed vs variable spending</p>
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

          {/* Card 4: Subscription Leakage Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="mb-2">
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">Subscription Leakage</h3>
              <p className="text-xs text-slate-500 mt-0.5">Recurring cost impact across top active services ({subscriptions.length} total)</p>
            </div>
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
      </div>
  )
}

export default FinancialAnalysis