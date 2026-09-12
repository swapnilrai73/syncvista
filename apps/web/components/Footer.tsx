"use client"

import { useState, useRef, useEffect } from 'react'
import { logoutAccount } from '@/lib/actions/user.actions'
import { 
  LogOut, 
  ShieldCheck, 
  ChevronsUpDown, 
  X, 
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  IndianRupee,
  SlidersHorizontal,
  Check,
  Building2,
  FileCheck,
  ChevronLeft
} from 'lucide-react'

export default function Footer({ user, type = 'desktop' }: FooterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSecurityDetails, setShowSecurityDetails] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [privacyMode, setPrivacyMode] = useState(false)
  const [numerationStandard, setNumerationStandard] = useState<'indian' | 'western'>('indian')
  const [taxRegime, setTaxRegime] = useState<'new' | 'old'>('new')
  const popoverRef = useRef<HTMLDivElement>(null)

  // Initialize client settings from localStorage
  useEffect(() => {
    try {
      const storedPrivacy = localStorage.getItem('syncvista_privacy_mode') === 'true'
      const storedNumeration = localStorage.getItem('syncvista_numeration') as 'indian' | 'western'
      const storedTax = localStorage.getItem('syncvista_tax_regime') as 'new' | 'old'

      if (storedPrivacy) {
        setPrivacyMode(true)
        document.documentElement.setAttribute('data-privacy-mode', 'active')
      }
      if (storedNumeration === 'western') setNumerationStandard('western')
      if (storedTax === 'old') setTaxRegime('old')
    } catch {
      // localStorage may be restricted in private browsing
    }
  }, [])

  const togglePrivacyMode = () => {
    const nextVal = !privacyMode
    setPrivacyMode(nextVal)
    try {
      localStorage.setItem('syncvista_privacy_mode', String(nextVal))
      document.documentElement.setAttribute('data-privacy-mode', nextVal ? 'active' : 'inactive')
      window.dispatchEvent(new CustomEvent('syncvista:privacy-toggle', { detail: { enabled: nextVal } }))
    } catch {
      // Ignore storage errors
    }
  }

  const handleNumerationChange = (val: 'indian' | 'western') => {
    setNumerationStandard(val)
    try {
      localStorage.setItem('syncvista_numeration', val)
      window.dispatchEvent(new CustomEvent('syncvista:numeration-change', { detail: { standard: val } }))
    } catch {}
  }

  const handleTaxRegimeChange = (val: 'new' | 'old') => {
    setTaxRegime(val)
    try {
      localStorage.setItem('syncvista_tax_regime', val)
      window.dispatchEvent(new CustomEvent('syncvista:tax-regime-change', { detail: { regime: val } }))
    } catch {}
  }

  const handleLogOut = async () => {
    setIsLoggingOut(true)
    try {
      await logoutAccount()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Perform immediate full document navigation to reset client state and router cache
      window.location.href = '/sign-in'
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
      {/* Liquid-Glass Profile & Settings Popover */}
      {isOpen && (
        <div className="absolute bottom-full mb-3 left-0 w-full sm:w-[350px] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/20 bg-[#0A1832]/98 backdrop-blur-2xl p-4 shadow-[0_16px_50px_rgba(0,0,0,0.7)] text-white z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 custom-scrollbar">
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
            <span className="text-[10px] text-emerald-300 font-mono font-semibold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
              RBI • SEBI • DPDP
            </span>
          </div>

          {/* Subview: Multi-Regulatory Framework & KYC Telemetry */}
          {showSecurityDetails ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSecurityDetails(false)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Back to Settings</span>
                </button>
                <span className="text-[11px] text-slate-400 font-medium">Compliance & KYC</span>
              </div>

              {/* Multi-Regulatory Statutory Compliance Stack */}
              <div className="space-y-2 p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1.5 border-b border-white/5 flex items-center justify-between">
                  <span>Statutory Compliance Matrix</span>
                  <span className="text-emerald-400 font-semibold">Active & Enforced</span>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-white">RBI Account Aggregator (AA)</span>
                      <p className="text-[10px] text-slate-400">Consent-driven, encrypted data pipeline (Setu / Sahamati)</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                      Aligned
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-white">SEBI RIA Regulations, 2013</span>
                      <p className="text-[10px] text-slate-400">Deterministic diagnostic system of record; non-advisory</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                      Compliant
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-white">DPDP Act, 2023 (Data Protection)</span>
                      <p className="text-[10px] text-slate-400">Indian data localization, purpose limitation & consent</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                      Enforced
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-white">CERT-In Cyber Security Guidelines</span>
                      <p className="text-[10px] text-slate-400">256-bit AES encryption at rest & TLS 1.3 in transit</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                      Secured
                    </span>
                  </div>
                </div>
              </div>

              {/* User Identity & Jurisdiction */}
              <div className="space-y-2 p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <FileCheck className="size-3.5 text-blue-400" />
                    PAN Verification
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {user?.panNumber ? `●●●●●●${user.panNumber.slice(-4)}` : '●●●●●●1234'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-emerald-400" />
                    Domestic Jurisdiction
                  </span>
                  <span className="text-white">
                    {user?.city ? `${user.city}, ${user.state || ''}` : 'Bengaluru, Karnataka'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Session Mode</span>
                  <span className="text-blue-300 font-mono text-[11px]">HMAC / Signed JWT</span>
                </div>
              </div>
            </div>
          ) : (
            /* Primary Customer Preferences & Settings View */
            <div className="mt-3 space-y-3">
              <div className="px-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  User Preferences & Controls
                </span>
                {privacyMode && (
                  <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                    Shield Active
                  </span>
                )}
              </div>

              {/* Setting 1: Privacy Shield Mode */}
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    privacyMode ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-slate-300'
                  }`}>
                    {privacyMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">Privacy Shield</h5>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      Mask financial figures during presentations
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={togglePrivacyMode}
                  role="switch"
                  aria-checked={privacyMode}
                  aria-label="Toggle Privacy Shield Mode"
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    privacyMode ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      privacyMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Setting 2: Numeration Format */}
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="size-3.5 text-indigo-400" />
                    <span className="text-xs font-semibold text-white">Numeration System</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Currency display</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleNumerationChange('indian')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      numerationStandard === 'indian'
                        ? 'bg-blue-600/30 text-blue-200 border border-blue-400/40 font-semibold'
                        : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-white/5'
                    }`}
                  >
                    {numerationStandard === 'indian' && <Check className="size-3 text-blue-400" />}
                    <span>₹ Lakh & Cr</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNumerationChange('western')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      numerationStandard === 'western'
                        ? 'bg-blue-600/30 text-blue-200 border border-blue-400/40 font-semibold'
                        : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-white/5'
                    }`}
                  >
                    {numerationStandard === 'western' && <Check className="size-3 text-blue-400" />}
                    <span>₹ Million/Bn</span>
                  </button>
                </div>
              </div>

              {/* Setting 3: Statutory Tax Regime */}
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="size-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">Tax Planning Regime</span>
                  </div>
                  <span className="text-[10px] text-slate-400">FIRE deductions</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTaxRegimeChange('new')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      taxRegime === 'new'
                        ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-400/40 font-semibold'
                        : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-white/5'
                    }`}
                  >
                    {taxRegime === 'new' && <Check className="size-3 text-emerald-400" />}
                    <span>New (115BAC)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTaxRegimeChange('old')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      taxRegime === 'old'
                        ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-400/40 font-semibold'
                        : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-white/5'
                    }`}
                  >
                    {taxRegime === 'old' && <Check className="size-3 text-emerald-400" />}
                    <span>Old (80C / 80D)</span>
                  </button>
                </div>
              </div>

              {/* Setting 4: Security, Compliance & Identity Subview Trigger */}
              <button
                type="button"
                onClick={() => setShowSecurityDetails(true)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="size-4 text-violet-400 group-hover:scale-110 transition-transform shrink-0" />
                  <div className="text-left">
                    <span className="block text-xs font-medium text-slate-200">Compliance, KYC & Security</span>
                    <span className="block text-[10px] text-slate-400">RBI AA • SEBI RIA • DPDP • CERT-In</span>
                  </div>
                </div>
                <ChevronRight className="size-3.5 text-slate-400 group-hover:text-white transition-colors shrink-0" />
              </button>
            </div>
          )}

          {/* Destructive Logout Action */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <button
              onClick={handleLogOut}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-600/30 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
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

      <style dangerouslySetInnerHTML={{ __html: `
        html[data-privacy-mode="active"] .tabular-nums {
          filter: blur(5px);
          transition: filter 0.15s ease;
          user-select: none;
        }
        html[data-privacy-mode="active"] .tabular-nums:hover {
          filter: blur(0px);
        }
      `}} />
    </div>
  )
}