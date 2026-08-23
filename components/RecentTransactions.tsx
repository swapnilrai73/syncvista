"use client"

import Link from 'next/link'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BankTabItem } from './BankTabItem'
import BankInfo from './BankInfo'
import TransactionsTable from './TransactionsTable'
import { Pagination } from './Pagination'

const RecentTransactions = ({
  accounts,
  transactions = [],
  bankDocumentId,
  page = 1,
}: RecentTransactionsProps) => {
  const [selectedTab, setSelectedTab] = useState(bankDocumentId || (accounts[0]?.bankDocumentId))
  const rowsPerPage = 10;

  return (
    <section className="recent-transactions">
      <header className="flex items-center justify-between">
        <h2 className="recent-transactions-label">Recent transactions</h2>
        <Link
          href={`/transaction-history/?id=${selectedTab}`}
          className="view-all-btn"
        >
          View all
        </Link>
      </header>

      <Tabs defaultValue={selectedTab} className="w-full" onValueChange={setSelectedTab}>
      <TabsList className="recent-transactions-tablist">
          {accounts.map((account: Account) => (
            <TabsTrigger key={account.id} value={account.bankDocumentId}>
              <BankTabItem
                key={account.id}
                account={account}
                bankDocumentId={selectedTab}
              />
            </TabsTrigger>
          ))}
        </TabsList>

        {accounts.map((account: Account) => {
          // Filter transactions for this specific account
          const accountTransactions = transactions.filter(
            (t) => !account.bankDocumentId || t.bankDocumentId === account.bankDocumentId
          );
          
          const totalPages = Math.ceil(accountTransactions.length / rowsPerPage);
          const indexOfLastTransaction = page * rowsPerPage;
          const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;
          const currentTransactions = accountTransactions.slice(
            indexOfFirstTransaction, indexOfLastTransaction
          );

          return (
            <TabsContent
              value={account.bankDocumentId}
              key={account.id}
              className="space-y-4"
            >
              <BankInfo 
                account={account}
                bankDocumentId={selectedTab}
                type="full"
              />

              <TransactionsTable transactions={currentTransactions} />
              

              {totalPages > 1 && (
                <div className="my-4 w-full">
                  <Pagination totalPages={totalPages} page={page} />
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  )
}

export default RecentTransactions