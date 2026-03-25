"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Activity, FileText, Settings, Paperclip, ChevronLeft, ChevronRight } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);

  // Clear optimistic path once Next.js router completes the navigation
  useEffect(() => {
    setOptimisticPath(null);
  }, [pathname]);

  const navLinks = [
    { href: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { href: "/companies", icon: <Users size={20} />, label: "Portfolio" },
    { href: "/agents", icon: <Activity size={20} />, label: "Orchestration" },
    { href: "/reports", icon: <FileText size={20} />, label: "Reports" },
    { href: "#", icon: <Paperclip size={20} />, label: "Documents" },
  ];

  return (
    <aside 
      className={`relative flex-shrink-0 bg-[#1A1A1C] flex flex-col py-6 border-r border-white/5 shadow-2xl z-50 transition-all duration-500 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 w-6 h-6 bg-[#2A2B2D] border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-[#353538] transition-all z-50 shadow-md flex-shrink-0"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Brand Logo */}
      <div className={`px-4 flex items-center mb-10 overflow-hidden ${isCollapsed ? 'justify-center' : 'gap-4 px-8'}`}>
        <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#2A2B2D] text-[#D4FF3A] border border-white/5 shadow-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 22l10-4 10 4L12 2z"/></svg>
        </div>
        <div className={`transition-all duration-300 flex-shrink-0 ${isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100"}`}>
          <h1 className="text-white font-bold tracking-tight leading-none whitespace-nowrap">Apex Capital</h1>
          <p className="text-[10px] uppercase font-mono tracking-widest text-[#D4FF3A] mt-1 whitespace-nowrap">Agentic AI</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className={`flex-1 space-y-2 overflow-hidden px-4 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {!isCollapsed && <div className="px-4 text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4 mt-2">Main Menu</div>}
        {navLinks.map((link) => {
          const activePathToUse = optimisticPath !== null ? optimisticPath : pathname;
          const isActive = activePathToUse === link.href || (activePathToUse.startsWith(link.href) && link.href !== "/");
          
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOptimisticPath(link.href)}
              prefetch={true}
              className={`flex items-center gap-3 py-3 rounded-xl transition-all duration-300 ease-out font-medium text-sm group overflow-hidden ${
                isCollapsed ? "justify-center w-12 h-12 px-0" : "px-4 w-full"
              } ${
                isActive
                  ? "bg-[#242529] text-white border border-white/5 shadow-lg shadow-black/20"
                  : "text-white/50 hover:bg-[#242529]/50 hover:text-white"
              }`}
              title={isCollapsed ? link.label : undefined}
            >
              <div className={`flex-shrink-0 transition-colors duration-300 ${isActive ? "text-[#D4FF3A]" : "text-white/40 group-hover:text-white/80"}`}>
                {link.icon}
              </div>
              
              <div className={`flex items-center justify-between transition-all duration-300 whitespace-nowrap overflow-hidden ${
                isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-full"
              }`}>
                <span>{link.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4FF3A] shadow-[0_0_8px_rgba(212,255,58,0.8)] flex-shrink-0 ml-2"></div>
                )}
              </div>

              {/* Collapsed dot logic */}
              {isCollapsed && isActive && (
                <div className="absolute right-[-2px] w-1 h-4 bg-[#D4FF3A] rounded-l-md shadow-[0_0_8px_rgba(212,255,58,0.8)] hidden lg:block"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className={`mt-auto space-y-2 overflow-hidden px-4 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {!isCollapsed && <div className="px-4 text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4 mt-8">System</div>}
        <Link
          href="/settings"
          className={`flex items-center gap-3 py-3 rounded-xl transition-all duration-300 font-medium text-sm group overflow-hidden ${
            isCollapsed ? "justify-center w-12 h-12 px-0" : "px-4 w-full"
          } ${
            pathname === "/settings"
              ? "bg-[#242529] text-white border border-white/5 shadow-lg"
              : "text-white/50 hover:bg-[#242529]/50 hover:text-white"
          }`}
          title={isCollapsed ? "Settings" : undefined}
        >
          <div className={`flex-shrink-0 transition-colors duration-300 ${pathname === "/settings" ? "text-[#D4FF3A]" : "text-white/40 group-hover:text-white/80"}`}>
            <Settings size={20} />
          </div>
          <div className={`flex items-center justify-between transition-all duration-300 whitespace-nowrap overflow-hidden ${
            isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-full"
          }`}>
            <span>Settings</span>
            {pathname === "/settings" && (
              <div className="w-1.5 h-1.5 rounded-full bg-[#D4FF3A] shadow-[0_0_8px_rgba(212,255,58,0.8)] flex-shrink-0 ml-2"></div>
            )}
          </div>
        </Link>
        <div className={`pt-4 mt-6 border-t border-white/5 flex items-center ${isCollapsed ? 'justify-center mx-0' : 'gap-3 px-2 mx-4'}`}>
          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-tr from-[#D4FF3A] to-[#3ABFF0] p-[2px]">
            <div className="h-full w-full rounded-full bg-black flex items-center justify-center overflow-hidden">
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Alex&backgroundColor=transparent" alt="Avatar" className="w-full h-full object-cover bg-[#D4FF3A]/20" />
            </div>
          </div>
          <div className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100"}`}>
            <div className="text-white text-xs font-semibold">User Terminal</div>
            <div className="text-[10px] text-white/40">CFO Access</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
