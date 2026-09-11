import { getAccounts, getAllTransactions } from '@/lib/actions/bank.actions'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import { getInvestmentSummary } from '@/lib/actions/investment.actions'
import TransactionHistoryClient from '../transaction-history/TransactionHistoryClient'

const FinancialIntelligence = async ({ searchParams: { id, page, view } }: SearchParamProps) => {
  const currentPage = Number(page as string) || 1
  const loggedIn = await getLoggedInUser()

  // Execute all independent server requests in parallel
  const [accounts, allTransactions, investmentSummary] = await Promise.all([
    loggedIn?.$id ? getAccounts({ userId: loggedIn.$id }) : null,
    loggedIn?.$id ? getAllTransactions({ userId: loggedIn.$id }) : null,
    loggedIn?.$id ? getInvestmentSummary({ userId: loggedIn.$id }) : null,
  ])

  const accountsData = accounts?.data || []
  const bankDocumentId = (id as string) || accountsData[0]?.bankDocumentId || ""

  return (
    <TransactionHistoryClient
      accounts={accountsData}
      initialAccount={null}
      initialAccountId={bankDocumentId}
      currentPage={currentPage}
      initialAllTransactions={allTransactions}
      investmentSummary={investmentSummary}
    />
  )
}

export default FinancialIntelligence
