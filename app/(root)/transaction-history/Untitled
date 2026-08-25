import HeaderBox from '@/components/HeaderBox'
import { getAccount, getAccounts, getAllTransactions } from '@/lib/actions/bank.actions'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import TransactionHistoryClient from './TransactionHistoryClient'

const TransactionHistory = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const currentPage = Number(page as string) || 1
  const loggedIn = await getLoggedInUser()

  // Execute all independent server requests in parallel
  const [accounts, allTransactions] = await Promise.all([
    getAccounts({ userId: loggedIn.$id }),
    getAllTransactions({ userId: loggedIn.$id }),
  ])

  const accountsData = accounts?.data || []
  const bankDocumentId = (id as string) || accountsData[0]?.bankDocumentId

  // Fetch specific account data if needed
  const account = bankDocumentId 
    ? await getAccount({ bankDocumentId }) 
    : null

  return (
    <TransactionHistoryClient
      accounts={accountsData}
      initialAccount={account}
      initialAccountId={bankDocumentId}
      currentPage={currentPage}
      initialAllTransactions={allTransactions}
    />
  )
}

export default TransactionHistory