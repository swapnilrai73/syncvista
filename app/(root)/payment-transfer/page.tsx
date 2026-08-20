import HeaderBox from '@/components/HeaderBox'
import React from 'react'

const Transfer = async () => {
  return (
    <section className="payment-transfer">
      <HeaderBox 
        title="Payment Transfer"
        subtext="Payment transfers are currently unavailable"
      />

      <section className="size-full pt-5">
        <p className="text-16 text-gray-600">
          Connect and manage bank accounts through Setu AA. External payment transfers are not enabled.
        </p>
      </section>
    </section>
  )
}

export default Transfer