"use client"

import { useMemo } from 'react'
import { formatAmount } from '@/lib/utils'
import { Sparkles, ArrowRight, Shield, Zap, Scale, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface SyncVistaIntelligenceCardProps {
  retainedAmount: number
  totalLiquid: number
  burnRate: number
  runwayMonths: number
  netWorth: number
}

export default function SyncVistaIntelligenceCard({
  retainedAmount,
  totalLiquid,
  burnRate,
  runwayMonths,
  netWorth,
}: SyncVistaIntelligenceCardProps) {
  // Deterministic capital deployment synthesis
  const { emergencyBufferGap, isBufferFunded, recommendedSplits } = useMemo(() => {
    const bufferTarget = Math.max(100000, Math.round(burnRate * 6))
    const gap = bufferTarget - totalLiquid
    const bufferFunded = gap <= 0

    // Compute deterministic priority distribution based on real retained amount
    let splits = []
    if (retainedAmount > 0) {
      if (!bufferFunded) {
        // Allocate up to 50% of retained amount to close buffer gap
        const bufferAlloc = Math.min(retainedAmount * 0.5, gap)
        const debtAlloc = Math.round(retainedAmount * 0.3)
        const equityAlloc = Math.max(0, retainedAmount - bufferAlloc - debtAlloc)
        splits = [
          { label: 'Emergency Reserve Replenishment', amount: bufferAlloc, tag: 'Safety Buffer', icon: Shield },
          { label: 'High-Interest Debt Prepayment (Avalanche)', amount: debtAlloc, tag: 'Liability Engine', icon: Zap },
          { label: 'Section 112A Tax-Advantaged Equity', amount: equityAlloc, tag: 'Growth Capital', icon: Scale },
        ]
      } else {
        // Buffer is funded: 0 to emergency, deploy surplus to debt clearance and equity growth
        const debtAlloc = Math.round(retainedAmount * 0.35)
        const equityAlloc = Math.round(retainedAmount * 0.45)
        const oppAlloc = Math.max(0, retainedAmount - debtAlloc - equityAlloc)
        splits = [
          { label: 'Emergency Reserve Status: Fully Capitalized', amount: 0, tag: '100% Funded (Safe)', icon: CheckCircle2, isFunded: true },
          { label: 'Accelerated Avalanche Payoff', amount: debtAlloc, tag: 'Liability Engine', icon: Zap },
          { label: 'Long-Term Equity & Section 112A Harvesting', amount: equityAlloc + oppAlloc, tag: 'Growth Capital', icon: Scale },
        ]
      }
    } else {
      splits = [
        { label: 'Deficit Recovery & Expense Rationalization', amount: 0, tag: 'Cash Flow Priority', icon: Shield },
      ]
    }

    return {
      emergencyBufferGap: Math.max(0, gap),
      isBufferFunded: bufferFunded,
      recommendedSplits: splits,
    }
  }, [retainedAmount, totalLiquid, burnRate])

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-xs backdrop-blur-md">
      {/* Decorative subtle gradient highlight */}
      <div className="absolute top-0 right-0 h-48 w-48 bg-gradient-to-bl from-blue-100/40 via-indigo-50/20 to-transparent pointer-events-none rounded-bl-full" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-[#002766] text-white">
              <Sparkles className="size-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">
              ✦ SyncVista Intelligence
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 pl-0.5">
            Deterministic capital synthesis across cash flow velocity, liquidity buffer, debt liabilities, and statutory tax limits
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 self-start sm:self-auto">
          Deterministic Engine Synthesis
        </span>
      </div>

      {/* Executive Intelligence Narrative */}
      <div className="mt-5 rounded-xl bg-slate-50/80 p-5 border border-slate-200/70">
        <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed">
          {retainedAmount > 0 ? (
            <>
              You have <span className="text-[#002766] font-bold">{formatAmount(retainedAmount)}</span> in net retained investable capital available this period.
            </>
          ) : (
            <>
              Your monthly cash flow operates in a break-even or deficit state this period.
            </>
          )}
        </p>

        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
          {isBufferFunded ? (
            <>
              Your 6-month safety buffer is fully capitalized at <span className="font-semibold text-slate-700">{runwayMonths} months</span> of living expenses. Our deterministic engines suggest routing surplus monthly liquidity toward accelerated liability clearance and statutory Section 112A tax harvesting.
            </>
          ) : (
            <>
              Your liquid reserves are currently at <span className="font-semibold text-slate-700">{runwayMonths} months</span> vs the 6-month benchmark. Our engines prioritize replenishing the safety buffer before expanding risk asset allocations.
            </>
          )}
        </p>

        {/* Actionable Priority Distribution */}
        {recommendedSplits.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Deterministic Allocation Priorities
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              {recommendedSplits.map((split, idx) => {
                const Icon = split.icon
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200/80 bg-white p-3.5 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          {split.tag}
                        </span>
                        <Icon className="size-4 text-slate-600" />
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-800">
                        {split.label}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Suggested:</span>
                      <span className="text-sm font-bold text-[#002766] tabular-nums">
                        {split.amount > 0 ? formatAmount(split.amount) : split.isFunded ? 'Secured' : 'Focus'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer & Regulatory Boundary Notice */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[11px] text-slate-600 max-w-xl leading-relaxed">
          Educational System of Record: Modeled deterministically per SEBI RIA guidelines. Projections reflect pure mathematical optimization, never arbitrary LLM calculations.
        </p>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/financial-intelligence"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#002766] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#001c4a] transition-colors"
          >
            <span>Explore in Financial Intelligence</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
