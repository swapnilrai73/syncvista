import { useMemo } from 'react'
import { formatAmount } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import Copy from './Copy'

interface BankAccent {
  primary: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  radialTint: string
}

// Extract existing bank-specific brand colors as atmospheric glass tints
const getBankAccent = (bankName: string = ''): BankAccent => {
  const name = bankName.toLowerCase()

  if (name.includes('hdfc')) {
    // HDFC: Deep Royal Navy
    return {
      primary: '#004B87',
      badgeBg: 'bg-blue-50/80',
      badgeText: 'text-[#004B87]',
      badgeBorder: 'border-blue-200/70',
      radialTint: 'radial-gradient(circle at 95% 10%, rgba(0, 75, 135, 0.16) 0%, rgba(1, 32, 83, 0.05) 45%, transparent 70%)',
    }
  } 
  if (name.includes('icici')) {
    // ICICI: Signature Orange
    return {
      primary: '#F26522',
      badgeBg: 'bg-orange-50/80',
      badgeText: 'text-[#C8490E]',
      badgeBorder: 'border-orange-200/70',
      radialTint: 'radial-gradient(circle at 95% 10%, rgba(242, 101, 34, 0.16) 0%, rgba(227, 82, 5, 0.05) 45%, transparent 70%)',
    }
  } 
  if (name.includes('axis')) {
    // Axis: Burgundy & Deep Cherry
    return {
      primary: '#860532',
      badgeBg: 'bg-rose-50/80',
      badgeText: 'text-[#860532]',
      badgeBorder: 'border-rose-200/70',
      radialTint: 'radial-gradient(circle at 95% 10%, rgba(134, 5, 50, 0.16) 0%, rgba(88, 0, 31, 0.05) 45%, transparent 70%)',
    }
  } 
  if (name.includes('sbi') || name.includes('state bank')) {
    // SBI: Ocean Blue
    return {
      primary: '#0080C6',
      badgeBg: 'bg-sky-50/80',
      badgeText: 'text-[#006A9C]',
      badgeBorder: 'border-sky-200/70',
      radialTint: 'radial-gradient(circle at 95% 10%, rgba(0, 128, 198, 0.16) 0%, rgba(0, 51, 102, 0.05) 45%, transparent 70%)',
    }
  }

  return {
    primary: '#002766',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-[#002766]',
    badgeBorder: 'border-slate-200',
    radialTint: 'radial-gradient(circle at 95% 10%, rgba(0, 39, 102, 0.14) 0%, transparent 65%)',
  }
}

// Deterministically resolve card network from real account metadata & standard Indian banking BINs
const getCardNetwork = (account: Account): 'visa' | 'mastercard' => {
  // 1. Check explicit properties if present
  const explicit = (account as any)?.network || (account as any)?.cardNetwork || (account as any)?.cardScheme
  if (explicit) {
    const expLower = String(explicit).toLowerCase()
    if (expLower.includes('visa')) return 'visa'
    if (expLower.includes('master')) return 'mastercard'
  }

  // 2. Check name / officialName / subtype for explicit network keywords
  const textInfo = `${account?.name || ''} ${account?.officialName || ''} ${account?.subtype || ''}`.toLowerCase()
  if (textInfo.includes('visa')) return 'visa'
  if (textInfo.includes('mastercard') || textInfo.includes('master')) return 'mastercard'

  // 3. Standard banking BIN logic: 4xxx -> Visa, 5xxx or 2xxx -> Mastercard
  const mask = String(account?.mask || '').trim()
  if (mask.startsWith('4')) return 'visa'
  if (mask.startsWith('5') || mask.startsWith('2')) return 'mastercard'

  // 4. Stable deterministic fallback for other masks
  const idStr = String(account?.id || account?.bankDocumentId || mask || '0')
  const sum = idStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return sum % 2 === 0 ? 'visa' : 'mastercard'
}

const BankCard = ({ account, userName, showBalance = true }: CreditCardProps) => {
  const bankDisplayName = account?.name || account?.officialName || 'Bank Account'
  const accent = useMemo(() => getBankAccent(bankDisplayName), [bankDisplayName])
  const network = useMemo(() => getCardNetwork(account), [account])

  return (
    <div className="flex flex-col gap-2 w-full max-w-[340px]">
      <Link 
        href={`/financial-intelligence/?id=${account.bankDocumentId || account.id}`} 
        className="group relative overflow-hidden rounded-2xl border border-slate-200/90 p-5 shadow-xs backdrop-blur-md transition-all duration-200 hover:border-slate-300 hover:shadow-md flex flex-col justify-between min-h-[190px] w-full"
        style={{ 
          background: `linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.84) 100%), ${accent.radialTint}`,
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.9), 0 2px 10px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Subtle Bank Accent Line at Top */}
        <div 
          className="absolute top-0 left-0 right-0 h-[3px] opacity-85"
          style={{ backgroundColor: accent.primary }}
        />

        {/* Top Header Row: Bank Title & Payment Network */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="overflow-hidden">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider mb-1.5 ${accent.badgeBg} ${accent.badgeText} ${accent.badgeBorder}`}>
              {account.subtype || account.type || 'Depository'}
            </span>
            <h3 className="text-base font-bold text-slate-900 truncate leading-tight group-hover:text-blue-900 transition-colors">
              {bankDisplayName}
            </h3>
          </div>

          {/* Payment Network Badge (Crisp Contrast Plate) */}
          <div className="flex items-center justify-center px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700/60 shadow-xs shrink-0">
            <Image 
              src={network === 'visa' ? '/icons/visa.svg' : '/icons/mastercard.svg'}
              width={40}
              height={26}
              alt={network === 'visa' ? 'Visa' : 'Mastercard'}
              className="h-5 w-auto object-contain"
            />
          </div>
        </div>

        {/* Middle Row: Primary Account Balance */}
        <div className="my-3 relative z-10">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Current Balance
          </span>
          <p className="text-[22px] sm:text-[24px] font-extrabold text-[#002766] tabular-nums tracking-tight font-sans mt-0.5">
            {formatAmount(account.currentBalance)}
          </p>
        </div>

        {/* Bottom Row: Account Holder & Masked Identity */}
        <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600 relative z-10">
          <div className="overflow-hidden pr-2">
            <p className="font-semibold text-slate-700 truncate text-[11px]">
              {userName || 'Verified Account'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px] font-semibold text-slate-600">
            <span className="tracking-widest text-[10px] text-slate-400">••••</span>
            <span className="text-slate-900 font-bold bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-200/60">
              {account?.mask || '••••'}
            </span>
          </div>
        </div>
      </Link>

      {showBalance && account?.shareableId && (
        <div className="px-1">
          <Copy title={account.shareableId} />
        </div>
      )}
    </div>
  )
}

export default BankCard