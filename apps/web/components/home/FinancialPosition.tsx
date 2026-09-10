"use client"

import { useMemo } from 'react'
import { formatAmount } from '@/lib/utils'
import { ShieldCheck, TrendingUp, Wallet, Target, Activity } from 'lucide-react'

interface FinancialPositionProps {
  userFirstName?: string
  netWorth: number
  totalLiquid: number
  savingsRate: number
  runwayMonths: number
  cashFlowDelta: number
  bankCount: number
}

export default function FinancialPosition({
  userFirstName = 'User',
  netWorth,
  totalLiquid,
  savingsRate,
  runwayMonths,
  cashFlowDelta,
  bankCount,
}: FinancialPositionProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  return (
    <div className="space-y-6 pb-2">
      {/* Greeting & Header Surface */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[#002766] leading-tight">
              {greeting}, {userFirstName}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-slate-500 mt-1.5">
            Financial Command Center • Holistic system of record and diagnostic intelligence
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Deterministic Engine Active
          </span>
        </div>
      </div>

      {/* 4 Primary Position Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Net Worth */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/85 p-6 shadow-xs backdrop-blur-md transition-all hover:border-slate-300 min-h-[168px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Net Worth</span>
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
              cashFlowDelta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {cashFlowDelta >= 0 ? '+' : ''}{cashFlowDelta.toFixed(1)}%
            </span>
          </div>
          <p className="mt-3 mb-1 text-[26px] sm:text-[30px] lg:text-[32px] font-extrabold tracking-tight text-[#002766] tabular-nums">
            {formatAmount(netWorth)}
          </p>
          <div className="mt-4 pt-3.5 flex items-center gap-1.5 text-xs text-slate-500 border-t border-slate-100">
            <Activity className="size-3.5 text-slate-400" />
            <span>Liquid deposits + verified assets</span>
          </div>
        </div>

        {/* Liquid Capital */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/85 p-6 shadow-xs backdrop-blur-md transition-all hover:border-slate-300 min-h-[168px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Liquid Capital</span>
            <Wallet className="size-4 text-[#002766]" />
          </div>
          <p className="mt-3 mb-1 text-[26px] sm:text-[30px] lg:text-[32px] font-extrabold tracking-tight text-slate-900 tabular-nums">
            {formatAmount(totalLiquid)}
          </p>
          <div className="mt-4 pt-3.5 flex items-center gap-1.5 text-xs text-slate-500 border-t border-slate-100">
            <span className="size-1.5 rounded-full bg-blue-500" />
            <span>Across {bankCount} connected {bankCount === 1 ? 'account' : 'accounts'}</span>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/85 p-6 shadow-xs backdrop-blur-md transition-all hover:border-slate-300 min-h-[168px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Savings Rate</span>
            <TrendingUp className="size-4 text-indigo-600" />
          </div>
          <p className="mt-3 mb-1 text-[26px] sm:text-[30px] lg:text-[32px] font-extrabold tracking-tight text-slate-900 tabular-nums">
            {savingsRate.toFixed(1)}%
          </p>
          <div className="mt-4 pt-3.5 flex items-center gap-1.5 text-xs text-slate-500 border-t border-slate-100">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>{savingsRate >= 30 ? 'Strong retention discipline' : 'Moderate capital retention'}</span>
          </div>
        </div>

        {/* Liquidity Runway */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/85 p-6 shadow-xs backdrop-blur-md transition-all hover:border-slate-300 min-h-[168px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Liquidity Runway</span>
            <Target className="size-4 text-emerald-600" />
          </div>
          <p className="mt-3 mb-1 text-[26px] sm:text-[30px] lg:text-[32px] font-extrabold tracking-tight text-slate-900 tabular-nums">
            {runwayMonths} <span className="text-base font-normal text-slate-500">Months</span>
          </p>
          <div className="mt-4 pt-3.5 flex items-center gap-1.5 text-xs text-slate-500 border-t border-slate-100">
            {runwayMonths >= 6 ? (
              <>
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Healthy buffer (≥6 mo target)</span>
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span className="text-amber-700 font-medium">Under 6 mo target buffer</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
