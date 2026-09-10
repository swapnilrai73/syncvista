"use client"

import { useMemo } from 'react'
import { formatAmount } from '@/lib/utils'
import { AlertTriangle, ShieldCheck, CreditCard, Scale, ChevronRight, Target } from 'lucide-react'
import Link from 'next/link'
import type { AnomalyDetection } from '@/lib/analytics/engine'

interface AttentionNeededCardProps {
  anomalies: AnomalyDetection[]
  subscriptionsCount: number
  subscriptionLeakage: number
  runwayMonths: number
  topExpenseCategory?: { category: string; amount: number; percentage: number }
}

export default function AttentionNeededCard({
  anomalies = [],
  subscriptionsCount = 0,
  subscriptionLeakage = 0,
  runwayMonths = 0,
  topExpenseCategory,
}: AttentionNeededCardProps) {
  // Generate 3-4 selective, high-signal attention items grounded purely in deterministic facts
  const attentionItems = useMemo(() => {
    const items = []

    // 1. Spending Anomalies (High Priority)
    if (anomalies.length > 0) {
      const topAnomaly = anomalies[0]
      items.push({
        id: 'anomaly',
        title: `${anomalies.length} Unusual ${anomalies.length === 1 ? 'Transaction' : 'Transactions'} Flagged`,
        what: `${topAnomaly.name} (${formatAmount(topAnomaly.amount)}) deviated +${topAnomaly.zScore.toFixed(1)}σ from ${topAnomaly.category} baseline.`,
        why: 'Statistical outliers indicate potential unbudgeted spikes or recurring charge alterations.',
        severity: 'attention',
        severityLabel: 'Requires Review',
        ctaText: 'Inspect anomaly',
        href: '/financial-intelligence?view=intelligence',
        icon: AlertTriangle,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      })
    } else {
      items.push({
        id: 'anomaly_clear',
        title: 'Zero Spending Anomalies Detected',
        what: 'All recent debits fall strictly within expected category standard deviations.',
        why: 'Operational expenditure baseline is stable without unbudgeted transaction spikes.',
        severity: 'optimal',
        severityLabel: 'Normal Baseline',
        ctaText: 'View ledger',
        href: '/financial-intelligence?view=transactions',
        icon: ShieldCheck,
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      })
    }

    // 2. Subscription Leakage
    if (subscriptionsCount > 0) {
      items.push({
        id: 'subscriptions',
        title: `${subscriptionsCount} Active Subscriptions Detected`,
        what: `${formatAmount(subscriptionLeakage)}/month recurring automated charges identified.`,
        why: `Annualized drag of ${formatAmount(subscriptionLeakage * 12)}/year draining liquid savings.`,
        severity: 'optimization',
        severityLabel: 'Leakage Drag',
        ctaText: 'Review subscriptions',
        href: '/financial-intelligence?view=intelligence',
        icon: CreditCard,
        badgeClass: 'bg-violet-50 text-violet-800 border-violet-200',
      })
    }

    // 3. Liquidity Runway Buffer
    if (runwayMonths < 6) {
      items.push({
        id: 'liquidity_warning',
        title: 'Liquidity Buffer Below 6-Month Target',
        what: `Current liquid reserves provide ${runwayMonths} months of living cost coverage.`,
        why: 'Maintaining a 6-month safety net prevents forced liquidation of investments during downturns.',
        severity: 'attention',
        severityLabel: 'Buffer Gap',
        ctaText: 'Manage bank liquidity',
        href: '/my-banks',
        icon: Target,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      })
    } else {
      items.push({
        id: 'liquidity_safe',
        title: '6-Month Emergency Buffer Funded',
        what: `${runwayMonths} months of liquid coverage safely held in deposit accounts.`,
        why: 'Baseline safety cushion is secured, freeing surplus capital for growth allocation.',
        severity: 'optimal',
        severityLabel: 'Capitalized',
        ctaText: 'Inspect balances',
        href: '/my-banks',
        icon: ShieldCheck,
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      })
    }

    // 4. Section 112A Tax Harvesting Opportunity
    items.push({
      id: 'tax_112a',
      title: 'Section 112A LTCG Tax-Harvesting Window',
      what: '₹1,25,000 annual LTCG exemption headroom available under FY2026-27 rules.',
      why: 'Realizing long-term gains before March 31 steps up equity cost basis at 0% tax (saves up to ₹15,625).',
      severity: 'optimization',
      severityLabel: 'Tax Opportunity',
      ctaText: 'Explore tax lots',
      href: '/investments',
      icon: Scale,
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    })

    return items
  }, [anomalies, subscriptionsCount, subscriptionLeakage, runwayMonths])

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/85 p-6 shadow-xs backdrop-blur-md flex flex-col justify-between h-full">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-[#002766] text-white">
                <AlertTriangle className="size-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Attention Needed
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              What requires attention • Filtered high-signal diagnostic and optimization items
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {attentionItems.length} Signals
          </span>
        </div>

        {/* Attention Items Stack */}
        <div className="mt-4 space-y-3">
          {attentionItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.id}
                className="group relative rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-slate-700 shrink-0 mt-0.5" />
                    <h4 className="text-sm font-bold text-slate-800 leading-tight">
                      {item.title}
                    </h4>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${item.badgeClass}`}>
                    {item.severityLabel}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-600 font-medium leading-relaxed">
                  {item.what}
                </p>

                <p className="mt-1 text-[11px] text-slate-400 leading-normal">
                  {item.why}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end">
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#002766] hover:text-blue-700 transition-colors"
                  >
                    <span>{item.ctaText}</span>
                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
