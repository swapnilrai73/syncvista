"use client"

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Download, TrendingUp, ReceiptText } from 'lucide-react'
import HeaderBox from '@/components/HeaderBox'
import { Pagination } from '@/components/Pagination'
import TransactionsTable from '@/components/TransactionsTable'
import { formatAmount, cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FinancialAnalysis from '@/components/FinancialAnalysis'
import { MOCK_DATA } from '@/lib/mockData'

const CATEGORIES = [
  'All Categories',
  'Income',
  'Food and Drink',
  'Transfer',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Groceries',
  'Fuel/Transport'
]

interface TransactionHistoryClientProps {
  accounts: Account[]
  initialAccount: any
  initialAccountId: string
  currentPage: number
  initialAllTransactions?: Transaction[]
  investmentSummary?: any
}

const TransactionHistoryClient = ({ 
  accounts = [], 
  initialAccount, 
  initialAccountId, 
  currentPage, 
  initialAllTransactions = [],
  investmentSummary
}: TransactionHistoryClientProps) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [page, setPage] = useState(currentPage)
  
  const selectedAccountId = searchParams.get('id') || null
  const currentView = searchParams.get('view')
  const isTransactionsView = currentView === 'transactions'
  const rowsPerPage = 10

  useEffect(() => {
    setMounted(true)
  }, [])

  // 1. Resolve Accounts and Transactions source (Fallback to MOCK_DATA cleanly)
  const effectiveAccounts = useMemo(() => {
    if (accounts && accounts.length > 0) return accounts
    return MOCK_DATA.bankAccounts || []
  }, [accounts])

  const effectiveTransactions = useMemo(() => {
    if (initialAllTransactions && initialAllTransactions.length > 0) return initialAllTransactions
    if (initialAccount?.transactions && initialAccount.transactions.length > 0) return initialAccount.transactions
    return MOCK_DATA.transactions || []
  }, [initialAllTransactions, initialAccount])

  // 2. Current Selected Account Object
  const currentAccountObj = useMemo(() => {
    if (!selectedAccountId || selectedAccountId === 'all') return null
    const target = String(selectedAccountId).toLowerCase()
    return (
      effectiveAccounts.find((a: any) => {
        const bDocId = String(a.bankDocumentId || '').toLowerCase()
        const id = String(a.id || '').toLowerCase()
        const docId = String(a.$id || '').toLowerCase()
        const accId = String(a.accountId || '').toLowerCase()
        const shareId = String(a.shareableId || '').toLowerCase()
        return (
          bDocId === target ||
          id === target ||
          docId === target ||
          accId === target ||
          shareId === target
        )
      }) || initialAccount
    )
  }, [effectiveAccounts, selectedAccountId, initialAccount])

  // 3. Resolve Account Identifiers & Known Seed Aliases
  const accountIdentifiers = useMemo(() => {
    if (!selectedAccountId || selectedAccountId === 'all') return null

    const ids = new Set<string>()
    const addId = (val: any) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        ids.add(String(val).toLowerCase().trim())
      }
    }

    addId(selectedAccountId)

    if (currentAccountObj) {
      addId(currentAccountObj.bankDocumentId)
      addId(currentAccountObj.id)
      addId(currentAccountObj.$id)
      addId(currentAccountObj.accountId)
      addId(currentAccountObj.shareableId)
      addId(currentAccountObj.mask)
      addId(currentAccountObj.consentId)
      addId(currentAccountObj.institutionId)

      const name = String(currentAccountObj.name || '').toLowerCase()
      const offName = String(currentAccountObj.officialName || '').toLowerCase()
      const bankName = String(currentAccountObj.bankName || '').toLowerCase()
      const instId = String(currentAccountObj.institutionId || '').toLowerCase()
      const accType = String(currentAccountObj.type || '').toLowerCase()
      const subtype = String(currentAccountObj.subtype || '').toLowerCase()

      // HDFC aliases
      if (name.includes('hdfc') || offName.includes('hdfc') || bankName.includes('hdfc') || instId.includes('hdfc')) {
        ids.add('bank_hdfc_savings')
        ids.add('hdfc123456789')
        ids.add('hdfc-savings-123')
        ids.add('hdfc')
      }

      // ICICI aliases
      if (name.includes('icici') || offName.includes('icici') || bankName.includes('icici') || instId.includes('icici')) {
        ids.add('bank_icici_salary')
        ids.add('icici987654321')
        ids.add('icici-salary-456')
        ids.add('icici')
      }

      // Axis Neo / Credit Card aliases
      if (
        name.includes('neo') ||
        offName.includes('neo') ||
        ((name.includes('axis') || bankName.includes('axis')) && (accType === 'credit' || subtype === 'credit_card' || name.includes('credit')))
      ) {
        ids.add('cc_axis_neo')
        ids.add('axiscc99887766')
        ids.add('axis-cc-321')
      }

      // Axis Liberty / Savings aliases
      if (
        name.includes('liberty') ||
        offName.includes('liberty') ||
        name.includes('prime') ||
        offName.includes('prime') ||
        ((name.includes('axis') || bankName.includes('axis')) && accType !== 'credit' && subtype !== 'credit_card' && !name.includes('credit') && !name.includes('neo'))
      ) {
        ids.add('bank_axis_savings')
        ids.add('axis556677889')
        ids.add('axis-prime-789')
      }
    }

    return ids
  }, [selectedAccountId, currentAccountObj])

  // 4. Filter Transactions based on selected account ID & Identifiers
  const activeTransactions = useMemo(() => {
    if (!selectedAccountId || selectedAccountId === 'all' || !accountIdentifiers) {
      return effectiveTransactions
    }

    return effectiveTransactions.filter((t: any) => {
      const candidates = [
        t.bankDocumentId,
        t.accountId,
        t.bankId,
        t.senderBankId,
        t.receiverBankId,
        t.bank,
        t.institutionId,
      ]

      return candidates.some((cand) => {
        if (!cand) return false
        const candStr = String(cand).toLowerCase().trim()
        return accountIdentifiers.has(candStr)
      })
    })
  }, [effectiveTransactions, selectedAccountId, accountIdentifiers])

  // 5. Filter Transactions for Table View (Search & Category)
  const filteredTableTransactions = useMemo(() => {
    return activeTransactions.filter((t: any) => {
      const matchesSearch = searchQuery === '' || 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.paymentChannel?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = selectedCategory === 'All Categories' || t.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [activeTransactions, searchQuery, selectedCategory])

  // 5. Current Balance Calculation
  const displayCurrentBalance = useMemo(() => {
    if (currentAccountObj) {
      return Number(
        currentAccountObj.currentBalance ?? 
        currentAccountObj.balance ?? 
        currentAccountObj.availableBalance ?? 
        0
      )
    }
    return effectiveAccounts.reduce((sum: number, acc: any) => {
      const bal = acc.currentBalance ?? acc.balance ?? acc.availableBalance ?? 0
      return sum + Number(bal)
    }, 0)
  }, [currentAccountObj, effectiveAccounts])

  const handleAccountChange = (accountId: string) => {
    setPage(1)
    const viewParam = isTransactionsView ? '&view=transactions' : '&view=intelligence'
    router.push(`/financial-intelligence?id=${accountId}${viewParam}`)
  }

  const handleAllAccounts = () => {
    setPage(1)
    const viewParam = isTransactionsView ? '?view=transactions' : '?view=intelligence'
    router.push(`/financial-intelligence${viewParam}`)
  }

  const handleViewChange = (newView: 'intelligence' | 'transactions') => {
    setPage(1)
    const baseUrl = selectedAccountId 
      ? `/financial-intelligence?id=${selectedAccountId}&` 
      : '/financial-intelligence?'
    router.push(`${baseUrl}view=${newView}`)
  }

  const totalPages = Math.ceil(filteredTableTransactions.length / rowsPerPage)
  const currentTransactions = filteredTableTransactions.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  )


  return (
    <div className="transactions">
      <div className="transactions-header">
        <HeaderBox
          title="Financial Intelligence"
          subtext="Holistic capital health, cash flow velocity, risk intelligence, and growth opportunities."
        />
      </div>

      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="w-full overflow-x-auto pb-2">
          <Tabs value={selectedAccountId || 'all'} className="w-full">
            <TabsList className="inline-flex h-11 items-center justify-start rounded-xl bg-white/80 border border-slate-200/90 p-1 backdrop-blur-xs shadow-2xs w-auto min-w-full sm:min-w-0">
              <TabsTrigger
                value="all"
                onClick={handleAllAccounts}
                className={!selectedAccountId ? 'bg-[#002766] text-white shadow-xs font-bold rounded-lg' : 'text-slate-600 font-medium hover:text-slate-900 rounded-lg'}
              >
                All Accounts
              </TabsTrigger>
              {effectiveAccounts.map((account: any) => {
                const accId = account.bankDocumentId || account.id || account.$id
                const isSelected = selectedAccountId === accId || 
                  (currentAccountObj && (
                    currentAccountObj.bankDocumentId === accId ||
                    currentAccountObj.id === accId ||
                    currentAccountObj.$id === accId ||
                    currentAccountObj.accountId === accId
                  ))
                return (
                  <TabsTrigger
                    key={accId}
                    value={accId}
                    onClick={() => handleAccountChange(accId)}
                    className={isSelected ? 'bg-[#002766] text-white shadow-xs font-bold rounded-lg' : 'text-slate-600 font-medium hover:text-slate-900 rounded-lg'}
                  >
                    {account.name}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Elevated Institutional Midnight Glass Banner */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-[#03132B] p-6 text-white shadow-xs border border-slate-800/80 md:flex-row md:items-center">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider">
              {selectedAccountId ? (currentAccountObj?.subtype || 'Depository Account') : 'Consolidated System of Record'}
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {selectedAccountId ? (currentAccountObj?.name || 'Account') : 'All Accounts'}
            </h2>
            <p className="text-xs text-slate-400">
              {selectedAccountId 
                ? (currentAccountObj?.officialName || 'Bank Account') 
                : `${effectiveAccounts.length} connected banking institutions`}
            </p>
            {selectedAccountId && currentAccountObj?.mask && (
              <p className="text-xs font-mono font-semibold tracking-wider text-slate-300 mt-1">
                ●●●● ●●●● ●●●● <span className="text-white font-bold">{currentAccountObj.mask}</span>
              </p>
            )}
          </div>
          
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/[0.08] px-6 py-4 backdrop-blur-md border border-white/15 text-white">
            <p className="text-xs text-blue-200/90 font-medium">Available Ledger Balance</p>
            <p className="text-[26px] text-center font-extrabold text-white tabular-nums tracking-tight font-sans">
              {formatAmount(displayCurrentBalance)}
            </p>
          </div>
        </div>

        {/* View Switcher & Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-white/80 border border-slate-200/90 p-1.5 backdrop-blur-xs shadow-2xs self-start">
            <button
              type="button"
              onClick={() => handleViewChange('intelligence')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
                !isTransactionsView
                  ? "bg-[#002766] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Intelligence Overview</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('transactions')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all",
                isTransactionsView
                  ? "bg-[#002766] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ReceiptText className="h-4 w-4" />
              <span>Ledger & Transactions</span>
            </button>
          </div>

          {isTransactionsView && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search by name or channel..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9 h-10 bg-white border-gray-200 text-sm"
                />
              </div>

              <Select
                value={selectedCategory}
                onValueChange={(val) => {
                  setSelectedCategory(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-48 h-10 bg-white border-gray-200 text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchQuery || selectedCategory !== 'All Categories') && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('All Categories')
                    setPage(1)
                  }}
                  className="h-10 text-sm text-gray-500 hover:text-gray-900"
                >
                  Reset
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Section */}
        <section className="flex w-full flex-col gap-6">
          {!isTransactionsView ? (
            <FinancialAnalysis
              transactions={activeTransactions}
              bankBalances={selectedAccountId && currentAccountObj ? [currentAccountObj] : effectiveAccounts}
              investmentSummary={investmentSummary}
            />
          ) : currentTransactions.length > 0 ? (
            <>
              <TransactionsTable transactions={currentTransactions} />
              {totalPages > 1 && (
                <div className="my-4 w-full">
                  <Pagination totalPages={totalPages} page={page} onPageChange={setPage} />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
              <p className="text-16 font-medium text-gray-700">No transactions found</p>
              {(searchQuery || selectedCategory !== 'All Categories') ? (
                <div className="mt-2">
                  <p className="text-sm text-gray-400">Try adjusting your search query or category filter.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('All Categories')
                      setPage(1)
                    }}
                    className="mt-3"
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-1">There are no transactions recorded for this account.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default TransactionHistoryClient