'use client'

import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Footer from './Footer'
import SetuConnect from './SetuConnect'

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname();

  return (
    <section className="sidebar">
      <nav className="flex flex-col gap-4">
      <Link href="/" className="mb-12 cursor-pointer flex items-center gap-3">
  <Image 
    src="/icons/logo.svg"
    width={48}
    height={48}
    alt="SyncVista logo"
    className="size-12 object-contain max-xl:size-10"
  />
  <h1 className="text-[28px] leading-none font-bold tracking-tight text-[#012053] max-xl:hidden font-sans">
    <span className="font-extrabold">Sync</span>
    <span className="font-normal">Vista</span>
  </h1>
</Link>

        {sidebarLinks.map((item) => {
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`)

          return (
            <Link href={item.route} key={item.label}
            className={cn('sidebar-link', { 'bg-[#002766]': isActive })}
            >
              <div className="relative size-6">
                <Image 
                  src={item.imgURL}
                  alt={item.label}
                  fill
                  className={cn({
                    'brightness-[3] invert-0': isActive
                  })}
                />
              </div>
              <p className={cn("sidebar-label", { "!text-white": isActive })}>
                {item.label}
              </p>
            </Link>
          )
        })}
        
          <SetuConnect user={user} />
      </nav>

      <Footer user={user} />
    </section>
  )
}

export default Sidebar