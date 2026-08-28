import Link from "next/link";
import BankCard from '@/components/BankCard';
import HeaderBox from '@/components/HeaderBox';
import { Plus, Copy, ArrowRight, Activity } from "lucide-react";
import { getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { formatAmount } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MOCK_DATA } from '@/lib/mockData';

const MyBanks = async () => {
  const loggedIn = await getLoggedInUser();
  const accountsData = loggedIn ? await getAccounts({ userId: loggedIn.$id }) : null;

  const accounts = accountsData?.data?.length ? accountsData.data : MOCK_DATA.bankAccounts;
  const totalBalance = accountsData?.totalCurrentBalance ?? MOCK_DATA.summary.totalBalance;
  const selectedAccount = accounts[0] || null;

  
  return (
    <section className='flex'>
      <div className="my-banks w-full max-w-7xl mx-auto">
        <HeaderBox 
          title="My Bank Accounts"
          subtext="Effortlessly manage your banking activities."
        />

        {/* Top Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Total Bank Balance</h3>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatAmount(totalBalance)}</p>
            <p className="text-sm text-gray-500 mt-1">Across all accounts</p>
          </div>

          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Connected Banks</h3>
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <Plus className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{accounts.length} Active Account{accounts.length !== 1 ? 's' : ''}</p>
            <p className="text-sm text-gray-500 mt-1">Successfully linked</p>
          </div>

          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">AA Sync Status</h3>
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
              </div>
            </div>
            <p className="text-lg font-semibold text-green-600">Connected via Setu AA</p>
            <p className="text-sm text-gray-500 mt-1">Data sync active</p>
          </div>
        </div>

        {/* Card Grid */}
        <div className="space-y-4">
          <h2 className="header-2">Your cards</h2>
          <div className="flex flex-wrap gap-6">
            {accounts.map((a: Account) => (
              <div 
              key={a.bankDocumentId || a.id} 
              className="cursor-pointer transition-all hover:scale-[1.02]"
            >
              <BankCard 
                account={a}
                userName={loggedIn?.firstName || ''}
              />
            </div>
            ))}
            
            <Link
              href="/"
              className="relative flex h-[190px] w-full max-w-[320px] justify-center items-center rounded-[20px] border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="flex-center size-12 rounded-full bg-gray-200">
                  <Plus className="size-6 text-gray-500" />
                </div>
                <p className="text-16 font-semibold text-gray-600">Add Bank Account</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MyBanks;