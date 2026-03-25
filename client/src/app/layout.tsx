import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Link from "next/link";
import { LayoutDashboard, Building2, Activity, FileText, Settings } from "lucide-react";

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
      <body className={`${inter.className} bg-background text-foreground flex h-screen overflow-hidden`}>
        <Providers>
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 border-r bg-card flex flex-col">
            <div className="h-16 flex items-center px-6 border-b">
              <div className="font-bold text-lg text-primary tracking-tight flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs">A</div>
                PE Firm
              </div>
            </div>
            <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
              <SidebarLink href="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
              <SidebarLink href="/companies" icon={<Building2 size={18} />} label="Portfolio Close" />
              <SidebarLink href="/agents" icon={<Activity size={18} />} label="Agent Activity" />
              <SidebarLink href="/reports" icon={<FileText size={18} />} label="Financial Reports" />
            </nav>
            <div className="mt-auto p-4 border-t">
              <SidebarLink href="/settings" icon={<Settings size={18} />} label="Settings" />
              <div className="mt-4 flex items-center gap-3 px-3 py-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">CFO</div>
                <div className="text-sm">
                  <p className="font-medium leading-none">Alex Mercer</p>
                  <p className="text-muted-foreground text-xs mt-1">Controller</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col h-full overflow-hidden bg-muted/30">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

function SidebarLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
