"use client"

import { useMemo } from 'react'
import { formatAmount } from '@/lib/utils'
import { Shield, ShieldCheck, AlertTriangle, ChevronRight, Activity, Zap, Target, Percent } from 'lucide-react'
import Link from 'next/link'

interface FinancialHealthCardProps {
  netWorth: number
  burnRate: number
  savingsRate: number
  runwayMonths: number
  anomaliesCount: number
}

export default function FinancialHealthCard({
  netWorth,
  burnRate,
  savingsRate,
  runwayMonths,
  anomaliesCount,
}: FinancialHealthCardProps) {
  // Deterministic 4-dimension scoring (100% mathematical, zero fabrication)
  const { overallScore, liquidityScore, savingsScore, burnStabilityScore, riskGuardScore, statusTitle, statusColor, burnBufferText } = useMemo(() => {
    // 1. Liquidity Score: 6 months target = 100
    const lScore = Math.min(100, Math.max(0, Math.round((runwayMonths / 6) * 100)))
    
    // 2. Savings Score: 30% savings rate = 100
    const sScore = Math.min(100, Math.max(0, Math.round((savingsRate / 30) * 100)))
    
    // 3. Burn Stability Score: burn rate buffered by capital reserves (runway cushion)
    const runwayFraction = burnRate > 0 ? (netWorth > 0 ? netWorth / burnRate : 0) : 12
    let bScore = 100
    if (burnRate <= 0) {
      bScore = 100
    } else if (netWorth <= 0) {
      bScore = 10
    } else if (runwayFraction >= 12) {
      bScore = 100
    } else if (runwayFraction >= 6) {
      bScore = Math.min(100, Math.round(80 + ((runwayFraction - 6) / 6) * 20))
    } else if (runwayFraction >= 3) {
      bScore = Math.round(50 + ((runwayFraction - 3) / 3) * 30)
    } else if (runwayFraction >= 1) {
      bScore = Math.round(20 + ((runwayFraction - 1) / 2) * 30)
    } else {
      bScore = Math.max(5, Math.round(runwayFraction * 20))
    }
    
    // 4. Risk Guard Score: 0 anomalies = 100, -15 per statistical outlier (>2.5σ)
    const rScore = Math.max(30, 100 - anomaliesCount * 15)

    // Weighted composite
    const composite = Math.round(lScore * 0.35 + sScore * 0.30 + bScore * 0.20 + rScore * 0.15)
    
    const isResilient = composite >= 75 && runwayMonths >= 6 && anomaliesCount === 0
    const status = isResilient 
      ? { title: 'Resilient Capital Structure', color: 'emerald' } 
      : composite >= 60 
      ? { title: 'Stable with Optimization Scope', color: 'blue' }
      : { title: 'Attention Recommended', color: 'amber' }

    const burnBufferText = burnRate <= 0
      ? `${formatAmount(burnRate)}/mo • Zero burn recorded`
      : netWorth <= 0
      ? `${formatAmount(burnRate)}/mo • Capital deficit`
      : runwayFraction >= 6
      ? `${formatAmount(burnRate)}/mo • Safely capitalized (≥6 mo buffer)`
      : `${formatAmount(burnRate)}/mo • ${runwayFraction.toFixed(1)} mo runway buffer`

    return {
      overallScore: composite,
      liquidityScore: lScore,
      savingsScore: sScore,
      burnStabilityScore: bScore,
      riskGuardScore: rScore,
      statusTitle: status.title,
      statusColor: status.color,
      burnBufferText,
    }
  }, [netWorth, burnRate, savingsRate, runwayMonths, anomaliesCount])

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/85 p-6 shadow-xs backdrop-blur-md">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-[#002766] text-white">
              <Shield className="size-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">
              Financial Health Diagnostic
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 pl-0.5">
            Executive solvency assessment synthesized from deterministic liquidity, operational burn, and risk engines
          </p>
        </div>

        <Link
          href="/financial-intelligence"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#002766] hover:text-blue-700 transition-colors self-start sm:self-auto group"
        >
          <span>View full diagnosis</span>
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Main Diagnostic Layout: Left Dominant Score + Right 4 Dimensions */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Dominant Health Gauge (5 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-center rounded-xl bg-slate-50/70 p-6 border border-slate-200/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall Diagnostic</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              statusColor === 'emerald' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : statusColor === 'blue'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {statusColor === 'emerald' ? <ShieldCheck className="size-3" /> : <AlertTriangle className="size-3" />}
              {overallScore >= 75 ? 'Optimal Stature' : 'Attention Point'}
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold tracking-tight text-[#002766] tabular-nums">
              {overallScore}
            </span>
            <span className="text-xl font-medium text-slate-400">/ 100</span>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-800">
            {statusTitle}
          </p>

          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Derived from your liquid buffer coverage, savings rate against benchmarks, and absence of expenditure deviations.
          </p>
        </div>

        {/* 4 Supporting Deterministic Dimensions (7 cols) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dimension 1: Liquidity Coverage */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">Liquidity Runway</span>
              </div>
              <span className="text-xs font-bold text-slate-800 tabular-nums">{liquidityScore}/100</span>
            </div>
            <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${liquidityScore}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {runwayMonths} months coverage (Target: 6 months)
            </p>
          </div>

          {/* Dimension 2: Savings Discipline */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="size-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-700">Savings Discipline</span>
              </div>
              <span className="text-xs font-bold text-slate-800 tabular-nums">{savingsScore}/100</span>
            </div>
            <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${savingsScore}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {savingsRate.toFixed(1)}% savings rate (Benchmark: 30%)
            </p>
          </div>

          {/* Dimension 3: Burn Stability */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-[#002766]" />
                <span className="text-xs font-semibold text-slate-700">Burn Stability</span>
              </div>
              <span className="text-xs font-bold text-slate-800 tabular-nums">{burnStabilityScore}/100</span>
            </div>
            <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#002766] rounded-full transition-all duration-500"
                style={{ width: `${burnStabilityScore}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {burnBufferText}
            </p>
          </div>

          {/* Dimension 4: Risk Guard */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-amber-600" />
                <span className="text-xs font-semibold text-slate-700">Risk Guard</span>
              </div>
              <span className="text-xs font-bold text-slate-800 tabular-nums">{riskGuardScore}/100</span>
            </div>
            <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  anomaliesCount === 0 ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
                style={{ width: `${riskGuardScore}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {anomaliesCount === 0 ? 'Zero spending outliers detected' : `${anomaliesCount} statistical outliers (>2.5σ)`}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
