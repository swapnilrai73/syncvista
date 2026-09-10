import Link from "next/link";
import BankCard from '@/components/BankCard';
import HeaderBox from '@/components/HeaderBox';
import { Plus, Copy, ArrowRight, Activity } from "lucide-react";
import { getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { formatAmount } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MOCK_DATA } from '@/lib/mockData';
import SetuConnect from '@/components/SetuConnect';

const MyBanks = async () => {
  const loggedIn = await getLoggedInUser();
  const accountsData = loggedIn ? await getAccounts({ userId: loggedIn.$id }) : null;

  const accounts = accountsData?.data?.length ? accountsData.data : MOCK_DATA.bankAccounts;
  const totalBalance = accountsData?.totalCurrentBalance ?? MOCK_DATA.summary.totalBalance;
  const selectedAccount = accounts[0] || null;

  return (
    <section className='flex w-full'>
      <div className="my-banks w-full max-w-7xl mx-auto space-y-8">
        <HeaderBox 
          title="My Bank Accounts"
          subtext="Institutional financial account containers & verified depository balances."
        />

        {/* Top Summary Bar - Elevated Frosted Glass */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/85 border border-slate-200/90 shadow-xs backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Bank Balance</h3>
              <div className="size-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#002766]" />
              </div>
            </div>
            <p className="text-[26px] sm:text-[28px] font-extrabold text-[#002766] tabular-nums tracking-tight font-sans">
              {formatAmount(totalBalance)}
            </p>
            <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              Across all verified accounts
            </p>
          </div>

          <div className="bg-white/85 border border-slate-200/90 shadow-xs backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Connected Institutions</h3>
              <div className="size-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Plus className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-[26px] sm:text-[28px] font-extrabold text-slate-900 tabular-nums tracking-tight font-sans">
              {accounts.length} Active {accounts.length !== 1 ? 'Accounts' : 'Account'}
            </p>
            <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              Linked via verified financial data feed
            </p>
          </div>

          <div className="bg-white/85 border border-slate-200/90 shadow-xs backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">AA Sync Status</h3>
              <div className="relative flex items-center justify-center size-9 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="size-2.5 bg-emerald-500 rounded-full animate-pulse" />
              </div>
            </div>
            <p className="text-lg font-bold text-emerald-700 font-sans">
              Connected via Setu AA
            </p>
            <p className="text-xs text-emerald-600/90 mt-2 pt-2 border-t border-slate-100 font-medium">
              Deterministic data sync active
            </p>
          </div>
        </div>

        {/* Card Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              Connected Financial Accounts
            </h2>
            <span className="text-xs font-semibold text-slate-500 bg-white/70 px-2.5 py-1 rounded-md border border-slate-200/70">
              {accounts.length} Total
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((a: Account) => (
              <div 
                key={a.bankDocumentId || a.id} 
                className="transition-transform duration-200 hover:-translate-y-0.5"
              >
                <BankCard 
                  account={a}
                  userName={loggedIn?.firstName || ''}
                />
              </div>
            ))}
            
            {loggedIn && (
              <SetuConnect
                user={loggedIn}
                variant="custom"
                buttonClassName="relative flex min-h-[190px] w-full max-w-[340px] justify-center items-center rounded-2xl border-2 border-dashed border-slate-300/80 bg-white/50 hover:bg-white/85 hover:border-[#002766]/50 shadow-xs backdrop-blur-sm transition-all cursor-pointer p-5 text-left group"
              >
                <div className="flex flex-col items-center gap-2.5 text-center">
                  <div className="size-11 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="size-5 text-[#002766]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-blue-900 transition-colors">
                      Connect Another Bank
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Setu Account Aggregator
                    </p>
                  </div>
                </div>
              </SetuConnect>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MyBanks;