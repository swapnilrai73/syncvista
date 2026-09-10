'use client'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { sidebarLinks } from "@/constants"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Footer from "./Footer"

const MobileNav = ({ user }: MobileNavProps) => {
  const pathname = usePathname();

  return (
    <section className="w-full max-w-[264px]">
      <Sheet>
        <SheetTrigger className="p-1 rounded-lg hover:bg-white/10 transition-colors">
          <Image
            src="/icons/hamburger.svg"
            width={28}
            height={28}
            alt="menu"
            className="cursor-pointer brightness-0 invert"
          />
        </SheetTrigger>
        <SheetContent side="left" className="border-r border-slate-800/80 bg-[#03132B] text-white p-6">
          <Link href="/" className="cursor-pointer flex items-center gap-3 px-1 mb-8">
            <div className="size-10 rounded-xl bg-white/[0.08] border border-white/15 backdrop-blur-xs flex items-center justify-center shadow-xs shrink-0">
              <Image 
                src="/icons/logo.webp"
                width={28}
                height={28}
                alt="SyncVista logo"
                className="size-6 object-contain"
              />
            </div>
            <h1 className="text-[22px] leading-none font-bold tracking-tight text-white font-sans">
              <span className="font-extrabold">Sync</span>
              <span className="font-normal text-slate-300">Vista</span>
            </h1>
          </Link>
          <div className="mobilenav-sheet">
            <SheetClose asChild>
              <nav className="flex h-full flex-col gap-2 pt-2 text-white">
                {sidebarLinks.map((item) => {
                  const isActive = pathname === item.route || (item.route !== '/' && pathname.startsWith(`${item.route}/`))

                  return (
                    <SheetClose asChild key={item.route}>
                      <Link 
                        href={item.route} 
                        key={item.label}
                        className={cn(
                          'relative flex gap-3.5 items-center py-2.5 px-3.5 rounded-xl w-full transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-r from-white/[0.16] to-white/[0.08] backdrop-blur-md border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_12px_rgba(0,0,0,0.3)] text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] border border-transparent font-medium'
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                        )}
                        <div className="relative size-5 shrink-0">
                          <Image 
                            src={item.imgURL}
                            alt={item.label}
                            width={20}
                            height={20}
                            className={cn({
                              'brightness-0 invert': true,
                              'opacity-70': !isActive,
                              'opacity-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]': isActive
                            })}
                          />
                        </div>
                        <p className={cn("text-sm tracking-wide", { "text-white font-semibold": isActive, "text-slate-300": !isActive })}>
                          {item.label}
                        </p>
                      </Link>
                    </SheetClose>
                  )
                })}
              </nav>
            </SheetClose>

            <Footer user={user} type="mobile" />
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}

export default MobileNav