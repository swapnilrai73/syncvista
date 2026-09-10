import { Suspense } from 'react';
import { getAccounts, getAllTransactions } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getInvestmentSummary } from '@/lib/actions/investment.actions';
import { redirect } from 'next/navigation';
import HomeDashboardClient from '@/components/home/HomeDashboardClient';

export const dynamic = 'force-dynamic';

const Home = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) redirect('/sign-in');

  return (
    <div className="flex-1 w-full bg-[#F8F9FA] overflow-y-auto no-scrollbar min-h-screen">
      <Suspense fallback={<DashboardSkeleton />}>
        <AsyncDashboardContent user={loggedIn} />
      </Suspense>
    </div>
  );
};

async function AsyncDashboardContent({ user }: { user: any }) {
  const [accounts, allTransactions, investmentSummary] = await Promise.all([
    getAccounts({ userId: user.$id }),
    getAllTransactions({ userId: user.$id }),
    getInvestmentSummary({ userId: user.$id }),
  ]);

  return (
    <HomeDashboardClient
      user={user}
      accounts={accounts?.data || []}
      allTransactions={allTransactions || []}
      investmentSummary={investmentSummary}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-pulse p-6">
      <div className="h-28 w-full bg-slate-200/70 rounded-2xl" />
      <div className="h-44 w-full bg-slate-200/70 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 h-72 bg-slate-200/70 rounded-2xl" />
        <div className="lg:col-span-5 h-72 bg-slate-200/70 rounded-2xl" />
      </div>
      <div className="h-48 w-full bg-slate-200/70 rounded-2xl" />
    </div>
  );
}

export default Home;
