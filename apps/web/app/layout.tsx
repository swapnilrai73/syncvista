

import type { Metadata } from "next";
import { Inter, IBM_Plex_Serif } from "next/font/google";
import "@/app/globals.css";
import { Toaster } from "sonner";
import nextDynamic from "next/dynamic";
import { getLoggedInUser } from "@/lib/actions/user.actions";


// Lazy load client widget so it doesn't block critical main-thread LCP
const AIChatWidget = nextDynamic(() => import("@/components/AIChatWidget"), {
  ssr: false,
});

const inter = Inter({ subsets: ["latin"], variable: '--font-inter', display: 'optional', preload: true });
const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ibm-plex-serif',
  display: 'optional',
  preload: true,
})

export const metadata: Metadata = {
  title: "SyncVista",
  description: "SyncVista is a modern banking platform for everyone.",
  icons: {
    icon: '/icons/logo.webp'
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedInUser = await getLoggedInUser();

  return (
    <html lang="en">
      <body className={`${inter.variable} ${ibmPlexSerif.variable}`}>
        {children}
        <Toaster />
        <AIChatWidget userId={loggedInUser?.$id} />
      </body>
    </html>
  );
}