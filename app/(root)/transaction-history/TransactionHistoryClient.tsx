"use client"

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Download } from 'lucide-react'
import HeaderBox from '@/components/HeaderBox'
import { Pagination } from '@/components/Pagination'
import TransactionsTable from '@/components/TransactionsTable'
import { getAccount } from '@/lib/actions/bank.actions'
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

const exportTransactionsToCSV = (transactions: Transaction[]) => {
  const headers = ['Date', 'Transaction Name', 'Amount (INR)', 'Status', 'Channel', 'Category']
  
  const rows = transactions.map((t) => {
    const status = new Date(t.date) > new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) ? 'Processing' : 'Success'
    const amount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(t.amount)
    
    return [
      new Date(t.date).toLocaleDateString('en-US'),
      t.name.replace(/[^\w\s]/gi, ''),
      amount,
      status,
      t.paymentChannel,
      t.category,
    ].join(',')
  })
  
  const csvContent = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `syncvista_transactions_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

interface TransactionHistoryClientProps {
  accounts: Account[]
  initialAccount: any
  initialAccountId: string
  currentPage: number
}

const TransactionHistoryClient = ({ accounts, initialAccount, initialAccountId, currentPage }: TransactionHistoryClientProps) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [currentAccount, setCurrentAccount] = useState<any>(initialAccount)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(initialAccount?.transactions || [])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>(initialAccount?.transactions || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [page, setPage] = useState(currentPage)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(initialAccountId)
  const [showAnalysis, setShowAnalysis] = useState(false)
  
  const rowsPerPage = 10
  
  // Use mock data as fallback when no real data available
  const useMockData = !accounts || accounts.length === 0 || !initialAccount?.transactions || initialAccount.transactions.length === 0
  const transactionsToUse = useMockData ? MOCK_DATA.transactions : allTransactions
  const bankBalancesToUse = useMockData ? MOCK_DATA.bankAccounts : accounts
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  useEffect(() => {
    const fetchAccountData = async () => {
      if (selectedAccountId && selectedAccountId !== initialAccountId) {
        try {
          const accountData = await getAccount({ bankDocumentId: selectedAccountId })
          setCurrentAccount(accountData)
          setAllTransactions(accountData?.transactions || [])
        } catch (error) {
          console.error('Error fetching account data:', error)
        }
      }
    }
    
    if (mounted) {
      fetchAccountData()
    }
  }, [selectedAccountId, mounted, initialAccountId])
  
  useEffect(() => {
    let filtered = transactionsToUse
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.paymentChannel.toLowerCase().includes(query)
      )
    }
    
    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter((t) => t.category === selectedCategory)
    }
    
    setFilteredTransactions(filtered)
    setPage(1)
  }, [searchQuery, selectedCategory, transactionsToUse])
  
  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId)
    setPage(1)
    router.push(`/transaction-history?id=${accountId}`)
  }
  
  const handleAllAccounts = () => {
    setSelectedAccountId(null)
    setPage(1)
    router.push('/transaction-history')
  }
  
  const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage)
  const indexOfLastTransaction = page * rowsPerPage
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage
  const currentTransactions = filteredTransactions.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction
  )
  
  if (!mounted) {
    return <div className="p-8">Loading...</div>
  }
  
  return (
    <div className="transactions">
      <div className="transactions-header">
        <HeaderBox
          title="Transaction History"
          subtext="See your bank details and transactions."
        />
      </div>

      <div className="space-y-6">
        {/* Account Navigation Tabs */}
        <div className="w-full overflow-x-auto pb-2">
          <Tabs defaultValue={selectedAccountId || 'all'} className="w-full">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 w-full overflow-x-auto">
              <TabsTrigger
                value="all"
                onClick={handleAllAccounts}
                className={!selectedAccountId ? 'bg-background text-foreground' : ''}
              >
                All Accounts
              </TabsTrigger>
              {accounts.map((account) => (
                <TabsTrigger
                  key={account.bankDocumentId}
                  value={account.bankDocumentId}
                  onClick={() => handleAccountChange(account.bankDocumentId)}
                  className={selectedAccountId === account.bankDocumentId ? 'bg-background text-foreground' : ''}
                >
                  {account.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="transactions-account">
          <div className="flex flex-col gap-2">
            <h2 className="text-18 font-bold text-white">{currentAccount?.data.name}</h2>
            <p className="text-14 text-blue-25">
              {currentAccount?.data.officialName}
            </p>
            <p className="text-14 font-semibold tracking-[1.1px] text-white">
              ●●●● ●●●● ●●●● {currentAccount?.data.mask}
            </p>
          </div>
          
          <div className='transactions-account-balance'>
            <p className="text-14">Current balance</p>
            <p className="text-24 text-center font-bold">{formatAmount(currentAccount?.data.currentBalance)}</p>
          </div>
        </div>

        {/* View Toggle & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {useMockData && (
              <div className="px-3 py-1 bg-amber-100 border border-amber-300 rounded-full text-amber-800 text-xs font-medium">
                Using Mock Data (Mar-Aug 2026)
              </div>
            )}
            <Button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="flex items-center gap-2 rounded-lg border-2 border-[#1570EF] bg-white px-4 py-2 font-semibold text-[#1570EF] hover:bg-blue-50 transition-all shadow-xs"
            >
              {showAnalysis ? 'Show Transactions' : 'Show Financial Analysis'}
            </Button>
            
            {!showAnalysis && (
              <>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
          
          {!showAnalysis && (
            <Button
              onClick={() => exportTransactionsToCSV(filteredTransactions)}
              variant="outline"
              className="flex items-center gap-2"
              disabled={filteredTransactions.length === 0}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>

        <section className="flex w-full flex-col gap-6">
          {showAnalysis ? (
              // Pass bankAccounts and transactions from MOCK_DATA
              <FinancialAnalysis
                  transactions={MOCK_DATA.transactions}
                  bankBalances={MOCK_DATA.bankAccounts}
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
              <p className="text-16 font-medium">No transactions found matching your filter</p>
              <p className="text-14 mt-2">Try adjusting your search or category filter</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default TransactionHistoryClient
