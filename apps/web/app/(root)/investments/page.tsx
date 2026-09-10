"use client";

import { useState, useEffect } from "react";
import HeaderBox from '@/components/HeaderBox';
import CasUploadCard from '@/components/CasUploadCard';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getInvestmentSummary } from '@/lib/actions/investment.actions';
import { TrendingUp, PieChart, BarChart3, Wallet } from 'lucide-react';
import { MOCK_DATA } from '@/lib/mockData';

const Investments = () => {
  const [loggedIn, setLoggedIn] = useState<User | null>(null);
  const [investmentSummary, setInvestmentSummary] = useState<InvestmentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getLoggedInUser();
        setLoggedIn(user);
        
        if (user) {
          const summary = await getInvestmentSummary({ userId: user.$id });
          setInvestmentSummary(summary);
        }
      } catch (error) {
        console.error("Error loading investment data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <section className='flex w-full'>
      <div className="investments w-full max-w-7xl mx-auto space-y-8">
        <HeaderBox 
          title="Investments & Net Worth"
          subtext="Institutional portfolio ledger, verified equity folios, mutual funds, and depository holdings."
        />

        {/* Metric Cards Grid - Elevated Frosted Glass */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/85 border border-slate-200/90 shadow-xs backdrop-blur-md rounded-2xl p-6 min-h-[140px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Portfolio</span>
              <div className="size-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <TrendingUp className="size-4 text-[#002766]" />
              </div>
            </div>
            <p className="text-[24px] sm:text-[26px] font-extrabold text-[#002766] tabular-nums tracking-tight font-sans">
              {isLoading ? '₹0' : `₹${(investmentSummary?.totalPortfolioValue || 0).toLocaleString('en-IN')}`}
            </p>
            <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">Across verified CAS folios</p>
          </div>

          <div className="bg-white/85 border border-slate-200/90 shadow-xs backdrop-blur-md rounded-2xl p-6 min-h-[140px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Equity Assets</span>
              <div className="size-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <PieChart className="size-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-[24px] sm:text-[26px] font-extrabold text-slate-900 tabular-nums tracking-tight font-sans">
              {isLoading ? '₹0' : `₹${(investmentSummary?.equity || 0).toLocaleString('en-IN')}`}
            </p>
            <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">Direct stocks & depository shares</p>
          </div>

          <div className="bg-white/85 border border-slate-200/90 shadow-xs backdrop-blur-md rounded-2xl p-6 min-h-[140px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mutual Funds</span>
              <div className="size-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <BarChart3 className="size-4 text-indigo-600" />
              </div>
            </div>
            <p className="text-[24px] sm:text-[26px] font-extrabold text-slate-900 tabular-nums tracking-tight font-sans">
              {isLoading ? '₹0' : `₹${(investmentSummary?.mutualFunds || 0).toLocaleString('en-IN')}`}
            </p>
            <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">Active SIPs & folio NAV</p>
          </div>

          <div className="bg-white/85 border border-slate-200/90 shadow-xs backdrop-blur-md rounded-2xl p-6 min-h-[140px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Debt & Alternate</span>
              <div className="size-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Wallet className="size-4 text-amber-600" />
              </div>
            </div>
            <p className="text-[24px] sm:text-[26px] font-extrabold text-slate-900 tabular-nums tracking-tight font-sans">
              {isLoading ? '₹0' : `₹${(investmentSummary?.unparsedHoldings || 0).toLocaleString('en-IN')}`}
            </p>
            <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">Fixed income, gold & bonds</p>
          </div>
        </div>

        {/* CAS Upload Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">
            Consolidated Account Statement (CAS) Ingestion
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Modernized Upload Component */}
            <div className="lg:col-span-7">
              <CasUploadCard userId={loggedIn?.$id || ''} />
            </div>
            
            {/* Right Column: CAS Information & Guide */}
            <div className="lg:col-span-5">
              <div className="bg-white/85 border border-slate-200/90 shadow-xs backdrop-blur-md rounded-2xl p-6 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#002766]" />
                    How to get your CAS PDF?
                  </h3>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="size-6 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-xs font-bold text-[#002766] shrink-0 mt-0.5">
                        1
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Request CDSL or NSDL Consolidated Account Statement via email from your registered depository participant or CAMS/KFintech.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="size-6 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-xs font-bold text-[#002766] shrink-0 mt-0.5">
                        2
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Standard password format: Your PAN in <span className="font-semibold text-slate-800">CAPITAL letters</span> or Date of Birth (<span className="font-mono text-slate-800">DDMMYYYY</span>).
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="size-6 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-xs font-bold text-[#002766] shrink-0 mt-0.5">
                        3
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Syncs equity lots and mutual fund ISINs deterministically without storing passwords or plain-text statement copies.
                      </p>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Client Side Decryption</span>
                  <span className="text-emerald-700 font-semibold">Zero Credentials Stored</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Investments;
