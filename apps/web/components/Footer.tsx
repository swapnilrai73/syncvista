"use client"

import { useState, useRef, useEffect } from 'react'
import { logoutAccount } from '@/lib/actions/user.actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LogOut, 
  Wallet, 
  TrendingUp, 
  PieChart, 
  ShieldCheck, 
  ChevronsUpDown, 
  X, 
  ChevronRight,
  Lock
} from 'lucide-react'

export default function Footer({ user, type = 'desktop' }: FooterProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showSecurityDetails, setShowSecurityDetails] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const handleLogOut = async () => {
    setIsLoggingOut(true)
    try {
      const loggedOut = await logoutAccount()
      if (loggedOut) router.push('/sign-in')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Handle escape key and click-outside dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setShowSecurityDetails(false)
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setShowSecurityDetails(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const initial = user?.firstName?.[0] || 'U'
  const fullName = `${user?.firstName || 'User'} ${user?.lastName || ''}`.trim()
  const email = user?.email || 'user@syncvista.com'

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* Liquid-Glass Profile Popover */}
      {isOpen && (
        <div className="absolute bottom-full mb-3 left-0 w-full sm:w-80 rounded-2xl border border-white/20 bg-[#0A1832]/95 backdrop-blur-xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] text-white z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Popover Header */}
          <div className="flex items-start justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-xs shrink-0">
                {initial}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold text-white truncate">{fullName}</h4>
                <p className="text-xs text-slate-400 truncate">{email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false)
                setShowSecurityDetails(false)
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close profile menu"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Engine Status Banner */}
          <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Deterministic Ledger Active
            </span>
            <span className="text-[10px] text-slate-400 font-mono">SEBI Compliant</span>
          </div>

          {/* Security Subview Toggle / Content */}
          {showSecurityDetails ? (
            <div className="mt-3 space-y-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock className="size-3.5 text-blue-400" />
                  Stored Identity & Security
                </span>
                <button
                  onClick={() => setShowSecurityDetails(false)}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  Back to menu
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">PAN Number</span>
                  <span className="font-mono text-white">
                    {user?.panNumber ? `●●●●●●${user.panNumber.slice(-4)}` : '●●●●●●1234'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Location</span>
                  <span className="text-white">
                    {user?.city ? `${user.city}, ${user.state || ''}` : 'Verified Domestic'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Postal Code</span>
                  <span className="font-mono text-white">{user?.postalCode || '700001'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Session Mode</span>
                  <span className="text-emerald-400 font-medium">Encrypted Firestore</span>
                </div>
              </div>
            </div>
          ) : (
            /* Navigation Links Supported By Architecture */
            <div className="mt-3 space-y-1">
              <Link
                href="/my-banks"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="size-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span>My Banks & Accounts</span>
                </div>
                <ChevronRight className="size-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                href="/financial-intelligence"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="size-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Financial Intelligence</span>
                </div>
                <ChevronRight className="size-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                href="/investments"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <PieChart className="size-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>Investments & CAS Holdings</span>
                </div>
                <ChevronRight className="size-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

              <button
                type="button"
                onClick={() => setShowSecurityDetails(true)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="size-4 text-violet-400 group-hover:scale-110 transition-transform" />
                  <span>Security & Identity</span>
                </div>
                <ChevronRight className="size-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </button>
            </div>
          )}

          {/* Destructive Logout Action */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <button
              onClick={handleLogOut}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-200 hover:bg-rose-500/15 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <LogOut className="size-4 text-rose-400" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out of SyncVista'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Trigger Surface */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="User account menu"
        className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all cursor-pointer text-left border ${
          isOpen 
            ? 'bg-white/[0.12] border-blue-400/40 shadow-xs' 
            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="size-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-xs shrink-0">
            {initial}
          </div>
          <div className="flex flex-col justify-center overflow-hidden">
            <h4 className="text-xs font-bold text-white truncate max-xl:hidden">{fullName}</h4>
            <p className="text-[11px] text-slate-400 truncate max-xl:hidden">{email}</p>
          </div>
        </div>

        <ChevronsUpDown className="size-4 text-slate-400 max-xl:hidden shrink-0" />
      </button>
    </div>
  )
}