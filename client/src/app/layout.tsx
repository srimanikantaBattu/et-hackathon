import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Link from "next/link";
import { LayoutDashboard, Users, Activity, FileText, Settings, Key, Paperclip } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PE Firm | Month-End Close",
  description: "Autonomous Agentic AI Month-End Close Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#18181A] text-foreground flex h-screen overflow-hidden antialiased`}>
        <Providers>
          {/* Narrow Icon-only Sidebar */}
          <aside className="w-20 flex-shrink-0 bg-[#1E1F21] flex flex-col items-center py-6 border-r border-[#353538]">
            {/* Logo */}
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#2A2B2D] text-primary mb-8 shadow-sm">
               <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 22l10-4 10 4L12 2z"/></svg>
            </div>

            {/* Nav Icons */}
            <nav className="flex-1 flex flex-col gap-6 w-full items-center">
              <SidebarLink href="/" icon={<LayoutDashboard size={22} />} active />
              <SidebarLink href="/companies" icon={<Users size={22} />} />
              <SidebarLink href="/agents" icon={<Activity size={22} />} />
              <SidebarLink href="/reports" icon={<FileText size={22} />} />
              <SidebarLink href="#" icon={<Paperclip size={22} />} />
            </nav>

            {/* Bottom Actions */}
            <div className="mt-auto flex flex-col items-center gap-6 w-full">
              <SidebarLink href="/settings" icon={<Settings size={22} />} />
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-[2px]">
                <div className="h-full w-full rounded-full bg-black flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Alex&backgroundColor=transparent" alt="Avatar" className="w-full h-full object-cover bg-[#D4FF3A]"/>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#18181A]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

function SidebarLink({ href, icon, active = false }: { href: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${
        active 
          ? "bg-[#2C2D32] text-white shadow-sm" 
          : "text-[#808080] hover:text-white hover:bg-[#2A2B2D]"
      }`}
    >
      {active && (
        <div className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-md"></div>
      )}
      {icon}
    </Link>
  );
}

