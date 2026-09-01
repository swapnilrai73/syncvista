'use client';

import CountUp from 'react-countup';
import { formatAmount } from '@/lib/utils';

const AnimatedCounter = ({ amount }: { amount: number }) => {
  return (
    <div className="w-full">
      <CountUp 
        decimals={2}
        decimal="."
        separator=","
        prefix="₹"
        end={amount}
        formattingFn={(value) => formatAmount(value)}
      />
    </div>
  )
}

export default AnimatedCounter