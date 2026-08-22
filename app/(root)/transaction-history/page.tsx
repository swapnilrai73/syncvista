import HeaderBox from '@/components/HeaderBox'
import { getAccount, getAccounts } from '@/lib/actions/bank.actions'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import TransactionHistoryClient from './TransactionHistoryClient'

const TransactionHistory = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const currentPage = Number(page as string) || 1
  const loggedIn = await getLoggedInUser()
  const accounts = await getAccounts({ userId: loggedIn.$id })

  if (!accounts) return

  const accountsData = accounts?.data
  const bankDocumentId = (id as string) || accountsData[0]?.bankDocumentId

  const account = await getAccount({ bankDocumentId })

  return (
    <TransactionHistoryClient
      accounts={accountsData}
      initialAccount={account}
      initialAccountId={bankDocumentId}
      currentPage={currentPage}
    />
  )
}

export default TransactionHistory