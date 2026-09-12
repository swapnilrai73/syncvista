"use client"

import { useMemo } from 'react'
import { AreaChart } from '@tremor/react'
import { formatAmount } from '@/lib/utils'
import { TrendingUp, ArrowUpRight, Calendar, ArrowRightLeft } from 'lucide-react'
import Link from 'next/link'

interface FinancialTrajectoryCardProps {
  monthlyCashFlow: {
    month: string
    inflow: number
    outflow: number
    net: number
  }[]
  grossInflow: number
  grossOutflow: number
  retainedAmount: number
  cashFlowDelta: number
}

export default function FinancialTrajectoryCard({
  monthlyCashFlow = [],
  grossInflow,
  grossOutflow,
  retainedAmount,
  cashFlowDelta,
}: FinancialTrajectoryCardProps) {
  const chartData = useMemo(() => {
    return monthlyCashFlow.map((cf) => ({
      date: cf.month,
      'Net Capital Generation': cf.net,
      'Gross Inflow': cf.inflow,
    }))
  }, [monthlyCashFlow])

  const chartStyles = "h-64 sm:h-72 mt-3 [&_.recharts-cartesian-axis-tick-text]:!text-xs [&_.recharts-cartesian-axis-tick-text]:!fill-slate-500 [&_.recharts-cartesian-grid-line]:!stroke-slate-200/80"

  const retentionEfficiency = useMemo(() => {
    if (grossInflow <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((retainedAmount / grossInflow) * 100)))
  }, [grossInflow, retainedAmount])

  const outflowRatio = useMemo(() => {
    if (grossInflow <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((grossOutflow / grossInflow) * 100)))
  }, [grossInflow, grossOutflow])

  const projected6MonthAccumulation = retainedAmount * 6

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/85 p-6 shadow-xs backdrop-blur-md flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-[#002766] text-white">
                <TrendingUp className="size-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Capital Trajectory
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Where you are heading • Net capital generation trajectory across active monthly cycles
            </p>
          </div>

          <Link
            href="/financial-intelligence"
            className="text-xs font-semibold text-[#002766] hover:text-blue-700 transition-colors flex items-center gap-1"
          >
            <span>Details</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        {/* Real Quantitative Milestone Indicators */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gross Inflow</span>
            <p className="text-sm sm:text-base font-bold text-slate-800 tabular-nums mt-0.5">
              {formatAmount(grossInflow)}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gross Outflow</span>
            <p className="text-sm sm:text-base font-bold text-rose-700 tabular-nums mt-0.5">
              {formatAmount(grossOutflow)}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Net Retained</span>
            <p className="text-sm sm:text-base font-bold text-[#002766] tabular-nums mt-0.5">
              {formatAmount(retainedAmount)}
            </p>
          </div>
        </div>

        {/* Trajectory Trend Chart */}
        <div className="[&_.recharts-area-area]:!fill-[#002766]/15 [&_.recharts-area-curve]:!stroke-[#002766]">
          <AreaChart
            className={chartStyles}
            data={chartData}
            index="date"
            categories={['Net Capital Generation']}
            colors={['blue-900']}
            valueFormatter={(val: number) => formatAmount(val)}
            showLegend={false}
            showYAxis={true}
            yAxisWidth={100}
            showGridLines={true}
          />
        </div>

        {/* Capital Accumulation & Velocity Dynamics Panel */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Capital Retention & Velocity
            </span>
            <span className="text-xs font-bold text-[#002766] bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
              {retentionEfficiency}% Retained
            </span>
          </div>

          {/* Retention vs Outflow visual split progress bar */}
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden flex">
              <div
                className="bg-[#002766] h-full transition-all duration-500"
                style={{ width: `${retentionEfficiency}%` }}
                title={`Retained: ${retentionEfficiency}%`}
              />
              <div
                className="bg-rose-500/80 h-full transition-all duration-500"
                style={{ width: `${outflowRatio}%` }}
                title={`Outflow: ${outflowRatio}%`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-[#002766] inline-block" />
                Retained ({retentionEfficiency}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-rose-500 inline-block" />
                Expenditure ({outflowRatio}%)
              </span>
            </div>
          </div>

          {/* 6-Month Projected Run-Rate Metric */}
          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">
                6-Month Projected Run-Rate
              </span>
              <p className="text-xs text-slate-600">
                At current net capital generation velocity
              </p>
            </div>
            <p className="text-sm font-bold text-slate-800 tabular-nums">
              {formatAmount(projected6MonthAccumulation)}
            </p>
          </div>
        </div>
      </div>

      {/* Trajectory Insight Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-slate-400" />
          <span>Historical trend based on verified ledger transactions</span>
        </div>
        <span className={`font-semibold ${cashFlowDelta >= 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
          {cashFlowDelta >= 0 ? `+${cashFlowDelta.toFixed(1)}% expansion` : `${cashFlowDelta.toFixed(1)}% momentum`}
        </span>
      </div>
    </section>
  )
}
