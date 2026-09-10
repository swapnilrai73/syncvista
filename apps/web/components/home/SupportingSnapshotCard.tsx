"use client"

import { formatAmount } from '@/lib/utils'
import { Landmark, ArrowUpRight, Plus, PieChart, ReceiptText } from 'lucide-react'
import Link from 'next/link'
import SetuConnect from '@/components/SetuConnect'

interface SupportingSnapshotCardProps {
  accounts: any[]
  user: any
  topCategories: { category: string; amount: number; percentage: number }[]
  recentTransactions: any[]
}

export default function SupportingSnapshotCard({
  accounts = [],
  user,
  topCategories = [],
  recentTransactions = [],
}: SupportingSnapshotCardProps) {
  // Take top 3 transactions for contextual evidence
  const previewTransactions = recentTransactions.slice(0, 3)

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/85 p-6 shadow-xs backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-[#002766] text-white">
              <Landmark className="size-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Supporting Financial Snapshot
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Connected institutional accounts, expense allocations, and recent ledger activity
          </p>
        </div>

        <Link
          href="/financial-intelligence?view=transactions"
          className="text-xs font-semibold text-[#002766] hover:text-blue-700 transition-colors flex items-center gap-1"
        >
          <span>Ledger</span>
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {/* 3-Column Snapshot Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Connected Accounts */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Connected Institutions
              </span>
              <SetuConnect
                user={user}
                variant="custom"
                className="flex"
                buttonClassName="inline-flex items-center gap-1 text-xs font-semibold text-[#002766] hover:text-blue-700 bg-transparent p-0 shadow-none border-none cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Add Bank</span>
              </SetuConnect>
            </div>

            <div className="space-y-2.5">
              {accounts.slice(0, 3).map((acc) => {
                const bal = acc.currentBalance ?? acc.balance ?? acc.availableBalance ?? 0
                return (
                  <div
                    key={acc.id || acc.bankDocumentId}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200/70"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-md bg-[#002766]/5 flex items-center justify-center text-[#002766] font-bold text-xs">
                        {(acc.name || 'B')[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 max-w-[120px] truncate">
                          {acc.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          ●●●● {acc.mask || '****'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-800 tabular-nums">
                      {formatAmount(bal)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-200/50 text-right">
            <Link
              href="/my-banks"
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Manage all accounts →
            </Link>
          </div>
        </div>

        {/* Column 2: Expense Commitments */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Top Spending Allocations
              </span>
              <PieChart className="size-3.5 text-slate-400" />
            </div>

            <div className="space-y-3">
              {topCategories.slice(0, 3).map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{cat.category}</span>
                    <span className="text-slate-500 tabular-nums font-medium">{formatAmount(cat.amount)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#002766] rounded-full"
                      style={{ width: `${Math.min(100, Math.max(10, cat.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-200/50 text-right">
            <Link
              href="/financial-intelligence"
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Analyze categories →
            </Link>
          </div>
        </div>

        {/* Column 3: Recent Activity Snapshot */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recent Ledger Activity
              </span>
              <ReceiptText className="size-3.5 text-slate-400" />
            </div>

            <div className="space-y-2">
              {previewTransactions.map((t, idx) => {
                const isDebit = t.type === 'debit' || t.amount < 0
                return (
                  <div
                    key={t.id || t.$id || idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70 text-xs"
                  >
                    <div className="max-w-[130px] truncate">
                      <p className="font-semibold text-slate-800 truncate">{t.name}</p>
                      <p className="text-[10px] text-slate-400">{t.category}</p>
                    </div>
                    <span className={`font-bold tabular-nums ${isDebit ? 'text-slate-800' : 'text-emerald-700'}`}>
                      {isDebit ? `-${formatAmount(Math.abs(t.amount))}` : formatAmount(Math.abs(t.amount))}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-200/50 text-right">
            <Link
              href="/financial-intelligence?view=transactions"
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              View full ledger →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
