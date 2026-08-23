import HeaderBox from '@/components/HeaderBox'
import RecentTransactions from '@/components/RecentTransactions';
import RightSidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox';
import { getAccount, getAccounts, getAllTransactions } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

const Home = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) redirect('/sign-in');

  const accounts = await getAccounts({ 
    userId: loggedIn.$id 
  })

  // Accounts will now always return mock data if Firestore is empty
  const accountsData = accounts?.data || [];
  const bankDocumentId = (id as string) || accountsData[0]?.bankDocumentId;

  const allTransactions = await getAllTransactions({ userId: loggedIn.$id });

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox 
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || 'Guest'}
            subtext="Access and manage your account and transactions efficiently."
          />

          <TotalBalanceBox 
            accounts={accountsData}
            totalBanks={accounts?.totalBanks || accountsData.length}
            totalCurrentBalance={accounts?.totalCurrentBalance || accountsData.reduce((sum: number, acc: any) => sum + (acc.currentBalance || 0), 0)}
          />
        </header>

        <RecentTransactions 
          accounts={accountsData}
          transactions={allTransactions}
          bankDocumentId={bankDocumentId}
          page={currentPage}
        />
      </div>

      <RightSidebar 
        user={loggedIn}
        transactions={allTransactions}
        banks={accountsData}
      />
    </section>
  )
}

export default Home