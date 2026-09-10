'use client'

import { useState, useTransition, useEffect } from 'react'
import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Footer from './Footer'
import SetuConnect from './SetuConnect'

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Optimistic path state updates instantly before server route completes
  const [optimisticPath, setOptimisticPath] = useState(pathname)

  // Sync optimistic path when real route completes
  useEffect(() => {
    setOptimisticPath(pathname)
  }, [pathname])

  const handleNavigation = (route: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setOptimisticPath(route) // Instant UI feedback
    
    startTransition(() => {
      router.push(route)
    })
  }

  return (
    <section className="sidebar">
      <nav className="flex flex-col gap-2">
        <Link 
          href="/" 
          prefetch={true}
          onClick={(e) => handleNavigation('/', e)}
          className="mb-10 cursor-pointer flex items-center gap-3"
        >
          <Image 
            src="/icons/logo.webp"
            width={48}
            height={48}
            alt="SyncVista logo"
            className="size-12 object-contain max-xl:size-10 shrink-0"
            priority
          />
          <h1 className="text-[28px] leading-none font-bold tracking-tight text-white max-xl:hidden font-sans">
            <span className="font-extrabold">Sync</span>
            <span className="font-normal text-slate-200">Vista</span>
          </h1>
        </Link>

        <div className="space-y-1.5">
          {sidebarLinks.map((item) => {
            const isActive = optimisticPath === item.route || (item.route !== '/' && optimisticPath.startsWith(`${item.route}/`))

            return (
              <Link 
                href={item.route} 
                key={item.label}
                prefetch={true}
                onClick={(e) => handleNavigation(item.route, e)}
                className={cn(
                  'group relative flex gap-3.5 items-center py-2.5 px-3.5 rounded-xl justify-center xl:justify-start transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50',
                  isActive
                    ? 'bg-gradient-to-r from-white/[0.16] to-white/[0.08] backdrop-blur-md border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_12px_rgba(0,0,0,0.3)] text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] border border-transparent font-medium',
                  isPending && !isActive && 'opacity-60'
                )}
              >
                {/* Subtle active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] max-xl:hidden" />
                )}

                <div className="relative size-5 shrink-0">
                  <Image 
                    src={item.imgURL}
                    alt={item.label}
                    fill
                    className={cn(
                      'transition-all duration-200 object-contain',
                      isActive
                        ? 'brightness-0 invert drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]'
                        : 'opacity-70 group-hover:opacity-100 brightness-0 invert'
                    )}
                  />
                </div>
                <p className={cn(
                  "text-sm tracking-wide max-xl:hidden transition-colors duration-150",
                  isActive ? "text-white font-semibold" : "text-slate-300 group-hover:text-white"
                )}>
                  {item.label}
                </p>
              </Link>
            )
          })}
        </div>
        
        <div className="pt-2">
          <SetuConnect
            user={user}
            variant="custom"
            buttonClassName="w-full flex items-center gap-3.5 py-2.5 px-3.5 rounded-xl justify-center xl:justify-start text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all border border-dashed border-white/15 cursor-pointer bg-white/[0.02]"
          >
            <div className="relative size-5 shrink-0 flex items-center justify-center">
              <Image src="/icons/connect-bank.svg" alt="connect bank" width={20} height={20} className="brightness-0 invert opacity-70 group-hover:opacity-100" />
            </div>
            <p className="text-sm font-medium tracking-wide max-xl:hidden text-slate-300">
              Connect Bank
            </p>
          </SetuConnect>
        </div>
      </nav>

      <Footer user={user} />
    </section>
  )
}

export default Sidebar