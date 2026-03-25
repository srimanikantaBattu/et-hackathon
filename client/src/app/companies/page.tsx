"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCompanies } from "@/lib/api";
import { Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CompaniesPage() {
  const { data: companies, isLoading } = useQuery({ 
    queryKey: ["companies"], 
    queryFn: fetchCompanies 
  });

  return (
    <div className="flex-1 space-y-8 p-10 overflow-y-auto custom-scrollbar bg-[#18181A]">
      <div className="mb-8 border-b border-white/5 pb-6">
        <h2 className="text-[2.5rem] font-semibold tracking-tight text-white leading-none">Portfolio Close</h2>
        <p className="text-[12px] font-bold text-white/40 uppercase tracking-[0.2em] mt-4">Manage month-end close progress across all 8 subsidiary companies</p>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#D4FF3A]" /></div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {companies?.map((company: any, idx: number) => {
            const colors = ['bg-[#4a6bb4]', 'bg-[#82a44a]', 'bg-[#3f8087]', 'bg-[#589c3a]', 'bg-[#A070F0]', 'bg-[#FF5577]', 'bg-[#FFB03A]', 'bg-[#D4FF3A]'];
            const color = colors[idx % colors.length];
            // Encode the ID appropriately
            const safeId = encodeURIComponent(company.id);

            return (
              <Link href={`/companies/${safeId}`} key={company.id} className="relative bg-[#1A1A1C] p-6 rounded-[24px] border border-white/[0.04] hover:border-white/10 hover:bg-[#202022] transition-all flex flex-col justify-between group h-[180px] shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-white/90">{company.name}</h3>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider block mt-1">{company.industry}</span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${color} shadow-[0_0_15px_${color}] opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                </div>
                
                <div>
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-[10px] font-mono text-white/50 bg-[#242529] px-2 py-1 rounded-md border border-white/5">{company.country}</span>
                    <span className="text-[10px] uppercase tracking-widest text-[#D4FF3A]/80 font-bold">
                      {(company.status || 'pending').replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/60 font-medium group-hover:text-white transition-colors">
                    <span>{company.reporting_currency}</span>
                    <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity text-[#D4FF3A]">
                      View Financials <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  );
}
