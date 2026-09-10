import AnimatedCounter from './AnimatedCounter';
import DoughnutChart from './DoughnutChart';
import { Wallet } from 'lucide-react';

const TotalBalanceBox = ({
  accounts = [], totalBanks = 0, totalCurrentBalance = 0
}: TotalBalanceBoxProps) => {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/85 p-6 shadow-xs backdrop-blur-md flex flex-col sm:flex-row items-center gap-6 justify-between w-full">
      <div className="flex items-center gap-5 w-full sm:w-auto">
        <div className="flex size-[100px] sm:size-[110px] shrink-0 items-center justify-center">
          <DoughnutChart accounts={accounts} />
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Current Balance
            </span>
          </div>

          <div className="text-[26px] sm:text-[30px] font-extrabold text-[#002766] tabular-nums tracking-tight font-sans">
            <AnimatedCounter amount={totalCurrentBalance || 0} />
          </div>

          <p className="text-xs text-slate-500">
            Across {totalBanks} verified deposit {totalBanks === 1 ? 'account' : 'accounts'}
          </p>
        </div>
      </div>

      <div className="self-start sm:self-center">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200/70 shadow-2xs">
          <Wallet className="size-3.5 text-[#002766]" />
          <span>{totalBanks} Active {totalBanks === 1 ? 'Institution' : 'Institutions'}</span>
        </span>
      </div>
    </section>
  )
}

export default TotalBalanceBox