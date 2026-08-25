"use client"

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Download } from 'lucide-react'
import HeaderBox from '@/components/HeaderBox'
import { Pagination } from '@/components/Pagination'
import TransactionsTable from '@/components/TransactionsTable'
import { formatAmount } from '@/lib/utils'
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
}

const TransactionHistoryClient = ({ 
  accounts = [], 
  initialAccount, 
  initialAccountId, 
  currentPage, 
  initialAllTransactions = [] 
}: TransactionHistoryClientProps) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [page, setPage] = useState(currentPage)
  
  const selectedAccountId = searchParams.get('id') || null
  const showAnalysis = searchParams.get('view') === 'analysis'
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

  // 2. Filter Transactions based on selected account ID
  const activeTransactions = useMemo(() => {
    if (!selectedAccountId || selectedAccountId === 'all') {
      return effectiveTransactions
    }

    return effectiveTransactions.filter((t: any) => {
      const accId = String(selectedAccountId)
      return (
        String(t.bankDocumentId) === accId ||
        String(t.accountId) === accId ||
        String(t.bankId) === accId ||
        String(t.senderBankId) === accId ||
        String(t.receiverBankId) === accId
      )
    })
  }, [effectiveTransactions, selectedAccountId])

  // 3. Filter Transactions for Table View (Search & Category)
  const filteredTableTransactions = useMemo(() => {
    return activeTransactions.filter((t: any) => {
      const matchesSearch = searchQuery === '' || 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.paymentChannel?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = selectedCategory === 'All Categories' || t.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [activeTransactions, searchQuery, selectedCategory])

  // 4. Current Selected Account Object
  const currentAccountObj = useMemo(() => {
    if (!selectedAccountId) return null
    return effectiveAccounts.find((a: any) => 
      String(a.bankDocumentId || a.id || a.$id) === String(selectedAccountId)
    ) || initialAccount
  }, [effectiveAccounts, selectedAccountId, initialAccount])

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
    const viewQuery = showAnalysis ? '&view=analysis' : ''
    router.push(`/transaction-history?id=${accountId}${viewQuery}`)
  }

  const handleAllAccounts = () => {
    setPage(1)
    const viewQuery = showAnalysis ? '?view=analysis' : ''
    router.push(`/transaction-history${viewQuery}`)
  }

  const totalPages = Math.ceil(filteredTableTransactions.length / rowsPerPage)
  const currentTransactions = filteredTableTransactions.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  )

  if (!mounted) return <div className="p-8">Loading...</div>

  return (
    <div className="transactions">
      <div className="transactions-header">
        <HeaderBox
          title="Transaction History"
          subtext="See your bank details and transactions."
        />
      </div>

      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="w-full overflow-x-auto pb-2">
          <Tabs value={selectedAccountId || 'all'} className="w-full">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 w-full overflow-x-auto">
              <TabsTrigger
                value="all"
                onClick={handleAllAccounts}
                className={!selectedAccountId ? 'bg-background text-foreground' : ''}
              >
                All Accounts
              </TabsTrigger>
              {effectiveAccounts.map((account: any) => {
                const accId = account.bankDocumentId || account.id || account.$id
                return (
                  <TabsTrigger
                    key={accId}
                    value={accId}
                    onClick={() => handleAccountChange(accId)}
                    className={selectedAccountId === accId ? 'bg-background text-foreground' : ''}
                  >
                    {account.name}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Big Blue Banner */}
        <div className="flex flex-col justify-between gap-4 rounded-xl bg-[#002766] p-6 text-white shadow-md md:flex-row md:items-center">
          <div className="flex flex-col gap-2">
            <h2 className="text-18 font-bold text-white">
              {selectedAccountId ? (currentAccountObj?.name || 'Account') : 'All Accounts'}
            </h2>
            <p className="text-14 text-blue-100/80">
              {selectedAccountId 
                ? (currentAccountObj?.officialName || 'Bank Account') 
                : `${effectiveAccounts.length} bank accounts`}
            </p>
            <p className="text-14 font-semibold tracking-[1.1px] text-white">
              {selectedAccountId && currentAccountObj?.mask ? `●●●● ●●●● ●●●● ${currentAccountObj.mask}` : ''}
            </p>
          </div>
          
          <div className="flex flex-col items-center justify-center gap-1 rounded-lg bg-white/10 px-5 py-3 backdrop-blur-sm border border-white/10 text-white">
            <p className="text-14 text-blue-100/90">Current balance</p>
            <p className="text-24 text-center font-bold text-white">
              {formatAmount(displayCurrentBalance)}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Button
            onClick={() => {
              const nextState = !showAnalysis
              const baseUrl = selectedAccountId 
                ? `/transaction-history?id=${selectedAccountId}` 
                : '/transaction-history'
              const queryDelimiter = selectedAccountId ? '&' : '?'
              router.push(nextState ? `${baseUrl}${queryDelimiter}view=analysis` : baseUrl)
            }}
            className="flex items-center gap-2 rounded-lg border-2 border-[#1570EF] bg-white px-4 py-2 font-semibold text-[#1570EF] hover:bg-blue-50 transition-all shadow-xs"
          >
            {showAnalysis ? 'Show Transactions' : 'Show Financial Analysis'}
          </Button>
        </div>

        {/* Dynamic Analysis Section */}
        <section className="flex w-full flex-col gap-6">
          {showAnalysis ? (
            <FinancialAnalysis
              transactions={activeTransactions}
              bankBalances={selectedAccountId && currentAccountObj ? [currentAccountObj] : effectiveAccounts}
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
            <div className="text-center py-12 text-gray-500">
              <p className="text-16 font-medium">No transactions found</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default TransactionHistoryClient