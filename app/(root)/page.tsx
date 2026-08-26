import { Suspense } from 'react';
import HeaderBox from '@/components/HeaderBox';
import RecentTransactions from '@/components/RecentTransactions';
import RightSidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox';
import { getAccounts, getAllTransactions } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const Home = async ({ searchParams }: PageProps) => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) redirect('/sign-in');

  const resolvedParams = await searchParams;
  const idParam = Array.isArray(resolvedParams.id) ? resolvedParams.id[0] : resolvedParams.id;
  const pageParam = Array.isArray(resolvedParams.page) ? resolvedParams.page[0] : resolvedParams.page;

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          {/* Renders immediately for LCP score */}
          <HeaderBox 
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || 'Guest'}
            subtext="Access and manage your account and transactions efficiently."
          />
        </header>

        {/* Main Dashboard Content */}
        <Suspense fallback={<DashboardSkeleton />}>
          <AsyncDashboardContent 
            userId={loggedIn.$id} 
            id={idParam} 
            page={pageParam} 
          />
        </Suspense>
      </div>

      {/* Right Sidebar placed at main section level */}
      <Suspense fallback={<SidebarSkeleton />}>
        <AsyncRightSidebar 
          userId={loggedIn.$id} 
          user={loggedIn} 
        />
      </Suspense>
    </section>
  );
};

// 1. Main Dashboard Data Streaming
async function AsyncDashboardContent({ 
  userId, 
  id, 
  page 
}: { 
  userId: string; 
  id?: string; 
  page?: string; 
}) {
  const currentPage = Number(page) || 1;

  const [accounts, allTransactions] = await Promise.all([
    getAccounts({ userId }),
    getAllTransactions({ userId }),
  ]);

  const accountsData = accounts?.data || [];
  const bankDocumentId = id || accountsData[0]?.bankDocumentId;

  return (
    <>
      <TotalBalanceBox 
        accounts={accountsData}
        totalBanks={accounts?.totalBanks || accountsData.length}
        totalCurrentBalance={
          accounts?.totalCurrentBalance || 
          accountsData.reduce((sum: number, acc: any) => sum + (acc.currentBalance || 0), 0)
        }
      />

      <RecentTransactions 
        accounts={accountsData}
        transactions={allTransactions}
        bankDocumentId={bankDocumentId}
        page={currentPage}
      />
    </>
  );
}

// 2. Right Sidebar Data Streaming
async function AsyncRightSidebar({ userId, user }: { userId: string; user: any }) {
  const [accounts, allTransactions] = await Promise.all([
    getAccounts({ userId }),
    getAllTransactions({ userId }),
  ]);

  const accountsData = accounts?.data || [];

  return (
    <RightSidebar 
      user={user}
      transactions={allTransactions}
      banks={accountsData}
    />
  );
}

// Skeletons to prevent layout shifts
function DashboardSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse mt-4">
      <div className="h-32 w-full bg-gray-200 rounded-xl" />
      <div className="h-64 w-full bg-gray-200 rounded-xl" />
    </div>
  );
}

function SidebarSkeleton() {
  return <div className="hidden xl:flex w-[350px] min-h-screen animate-pulse bg-gray-50" />;
}

export default Home;