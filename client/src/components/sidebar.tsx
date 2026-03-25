"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Activity, FileText, Settings, Paperclip } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { href: "/companies", icon: <Users size={20} />, label: "Portfolio" },
    { href: "/agents", icon: <Activity size={20} />, label: "Orchestration" },
    { href: "/reports", icon: <FileText size={20} />, label: "Reports" },
    { href: "#", icon: <Paperclip size={20} />, label: "Documents" },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-[#1A1A1C] flex flex-col py-6 border-r border-white/5 shadow-2xl z-50">
      {/* Brand Logo */}
      <div className="px-8 flex items-center gap-4 mb-10">
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#2A2B2D] text-[#D4FF3A] border border-white/5 shadow-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 22l10-4 10 4L12 2z"/></svg>
        </div>
        <div>
          <h1 className="text-white font-bold tracking-tight leading-none">Apex Capital</h1>
          <p className="text-[10px] uppercase font-mono tracking-widest text-[#D4FF3A] mt-1">Agentic AI</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        <div className="px-4 text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4 mt-2">Main Menu</div>
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm group ${
                isActive
                  ? "bg-[#242529] text-white border border-white/5 shadow-lg"
                  : "text-white/50 hover:bg-[#242529]/50 hover:text-white"
              }`}
            >
              <div className={`${isActive ? "text-[#D4FF3A]" : "text-white/40 group-hover:text-white/80"}`}>
                {link.icon}
              </div>
              {link.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D4FF3A] shadow-[0_0_8px_rgba(212,255,58,0.8)]"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-4 mt-auto space-y-2">
        <div className="px-4 text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4 mt-8">System</div>
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm group ${
            pathname === "/settings"
              ? "bg-[#242529] text-white border border-white/5 shadow-lg"
              : "text-white/50 hover:bg-[#242529]/50 hover:text-white"
          }`}
        >
          <div className={`${pathname === "/settings" ? "text-[#D4FF3A]" : "text-white/40 group-hover:text-white/80"}`}>
            <Settings size={20} />
          </div>
          Settings
          {pathname === "/settings" && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D4FF3A] shadow-[0_0_8px_rgba(212,255,58,0.8)]"></div>
          )}
        </Link>
        <div className="pt-4 mt-6 mx-4 border-t border-white/5 flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#D4FF3A] to-[#3ABFF0] p-[2px]">
            <div className="h-full w-full rounded-full bg-black flex items-center justify-center overflow-hidden">
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Alex&backgroundColor=transparent" alt="Avatar" className="w-full h-full object-cover bg-[#D4FF3A]/20" />
            </div>
          </div>
          <div>
            <div className="text-white text-xs font-semibold">User Terminal</div>
            <div className="text-[10px] text-white/40">CFO Access</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
