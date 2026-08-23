import HeaderBox from '@/components/HeaderBox'
import { getAccount, getAccounts, getAllTransactions } from '@/lib/actions/bank.actions'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import TransactionHistoryClient from './TransactionHistoryClient'

const TransactionHistory = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const currentPage = Number(page as string) || 1
  const loggedIn = await getLoggedInUser()
  const accounts = await getAccounts({ userId: loggedIn.$id })

  // Accounts will now always return mock data if Firestore is empty
  const accountsData = accounts?.data || []
  const bankDocumentId = (id as string) || accountsData[0]?.bankDocumentId

  // Only fetch account if we have a valid bankDocumentId
  let account = null
  if (bankDocumentId) {
    account = await getAccount({ bankDocumentId })
  }

  const allTransactions = await getAllTransactions({ userId: loggedIn.$id })

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