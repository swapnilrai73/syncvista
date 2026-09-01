import { formatAmount } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import Copy from './Copy'

const getBankCardGradient = (bankName: string = '') => {
  const name = bankName.toLowerCase()

  if (name.includes('hdfc')) {
    // HDFC: Deep Royal Navy
    return 'linear-gradient(135deg, #012053 0%, #004B87 50%, #0A2540 100%)'
  } 
  if (name.includes('icici')) {
    // ICICI: Signature Orange & Deep Rust
    return 'linear-gradient(135deg, #F26522 0%, #E35205 50%, #B33000 100%)'
  } 
  if (name.includes('axis')) {
    // Axis: Burgundy & Deep Cherry Red
    return 'linear-gradient(135deg, #860532 0%, #A80B43 50%, #58001F 100%)'
  } 
  if (name.includes('sbi') || name.includes('state bank')) {
    // SBI: Ocean Blue & Deep Blue
    return 'linear-gradient(135deg, #00A3E0 0%, #0080C6 50%, #003366 100%)'
  }

  return 'linear-gradient(135deg, #012053 0%, #0A2540 100%)'
}

const BankCard = ({ account, userName, showBalance = true }: CreditCardProps) => {
  const cardBg = getBankCardGradient(account?.name || account?.officialName)

  return (
    <div className="flex flex-col">
      <Link 
        href={`/transaction-history/?id=${account.bankDocumentId}`} 
        className="bank-card"
        style={{ background: cardBg }}
      >
        <div className="bank-card_content">
          <div>
            <h1 className="text-16 font-semibold text-white">
              {account.name}
            </h1>
            <p className="font-ibm-plex-serif font-black text-white">
              {formatAmount(account.currentBalance)}
            </p>
          </div>

          <article className="flex flex-col gap-2">
            <div className="flex justify-between">
              <h1 className="text-12 font-semibold text-white">
                {userName}
              </h1>
              <h2 className="text-12 font-semibold text-white">
                ●● / ●●
              </h2>
            </div>
            <p className="text-14 font-semibold tracking-[1.1px] text-white">
              ●●●● ●●●● ●●●● <span className="text-16">{account?.mask}</span>
            </p>
          </article>
        </div>

        <div className="bank-card_icon">
          <Image 
            src="/icons/Paypass.svg"
            width={20}
            height={24}
            alt="pay"
          />
          <Image 
            src="/icons/mastercard.svg"
            width={45}
            height={32}
            alt="mastercard"
            className="ml-5"
          />
        </div>

        <Image 
          src="/icons/lines.png"
          width={316}
          height={190}
          alt="lines"
          className="absolute top-0 left-0 opacity-80 pointer-events-none z-0"
        />
      </Link>

      {showBalance && <Copy title={account?.shareableId} />}
    </div>
  )
}

export default BankCard