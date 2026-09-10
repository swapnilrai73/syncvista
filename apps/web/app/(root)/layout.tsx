import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedIn = await getLoggedInUser();

  if(!loggedIn) redirect('/sign-in')

  return (
    <main className="flex h-screen w-full font-inter bg-[#DDE7F1]">
      <Sidebar user={loggedIn} />

      <div className="flex size-full flex-col overflow-y-auto bg-[#DDE7F1]">
        <div className="root-layout bg-[#03132B] border-b border-slate-800/80 px-4 py-3 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2.5">
            <Image src="/icons/logo.webp" width={30} height={30} alt="SyncVista logo" className="size-7 object-contain" />
            <span className="font-sans font-extrabold text-white text-lg tracking-tight">Sync<span className="font-normal text-slate-300">Vista</span></span>
          </div>
          <div>
            <MobileNav user={loggedIn} />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
