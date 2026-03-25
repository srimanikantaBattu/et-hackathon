"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCompanyFinancials } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const companyId = decodeURIComponent(unwrappedParams?.id || "");
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["company", companyId, "financials"],
    queryFn: () => fetchCompanyFinancials(companyId, "2026-01")
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error || !data || !data.company) return <div className="p-8 text-destructive">Failed to load company data.</div>;

  const { company, trial_balance, variances, alerts } = data;

  return (
    <div className="flex-1 space-y-8 p-10 overflow-y-auto custom-scrollbar bg-[#18181A] text-white">
      <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
        <Link href="/companies" className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-[#1C1C1E] hover:bg-[#2A2B2D] transition-all text-white/50 hover:text-white"><ArrowLeft size={16} /></Link>
        <div>
          <h2 className="text-[2rem] font-semibold tracking-tight leading-none mb-3">{company.name}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] uppercase tracking-widest text-white/40">{company.industry}</span>
            <span className="text-[10px] font-mono bg-[#242529] px-2 py-1 rounded-md border border-white/5 text-white/60">{company.reporting_currency}</span>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${company.status === 'completed' ? 'bg-[#D4FF3A]/10 text-[#D4FF3A]' : company.status === 'in_progress' ? 'bg-[#FFB03A]/10 text-[#FFB03A]' : 'bg-white/5 text-white/50'}`}>
              {(company.status || 'pending').replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
          <Tabs defaultValue="variances" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-[#1C1C1E] p-1 rounded-xl border border-white/5 mb-6">
              <TabsTrigger value="variances" className="data-[state=active]:bg-[#2A2B2D] data-[state=active]:text-white rounded-lg text-xs">Variance Analysis</TabsTrigger>
              <TabsTrigger value="tb" className="data-[state=active]:bg-[#2A2B2D] data-[state=active]:text-white rounded-lg text-xs">Trial Balance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="variances" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="bg-[#1C1C1E] rounded-[24px] border border-white/[0.03] overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/5">
                  <h3 className="text-lg font-medium text-white/90">AI Variance Analysis</h3>
                  <p className="text-[11px] text-white/40 mt-1">Accounts flagged by the Agentic variance engine.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#18181A] text-white/40 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Account</th>
                        <th className="px-6 py-4 text-right">Actual</th>
                        <th className="px-6 py-4 text-right">Budget</th>
                        <th className="px-6 py-4 text-right">Variance $</th>
                        <th className="px-6 py-4 text-right">%</th>
                        <th className="px-6 py-4">AI Insights</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {!variances?.length && (
                        <tr><td colSpan={6} className="px-6 py-10 text-center text-[11px] text-white/30 uppercase tracking-widest font-mono">No significant variances identified.</td></tr>
                      )}
                      {variances?.map((v: any, i: number) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-medium text-white/80">{v.account_name} <span className="text-[10px] text-white/30 block mt-1 font-mono">{v.account_code}</span></td>
                          <td className="px-6 py-4 text-right text-white/70">${v.actual_amount.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-white/70">${v.budget_amount.toLocaleString()}</td>
                          <td className={`px-6 py-4 text-right font-medium ${v.variance_amount < 0 ? 'text-[#FF5577]' : 'text-[#3ABFF0]'}`}>
                            ${v.variance_amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right text-white/50">{v.variance_pct.toFixed(1)}%</td>
                          <td className="px-6 py-4 min-w-[300px] text-white/60 text-xs leading-relaxed">{v.ai_commentary || "Pending AI review..."}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="tb" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="bg-[#1C1C1E] rounded-[24px] border border-white/[0.03] overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/5">
                  <h3 className="text-lg font-medium text-white/90">Trial Balance 2026-01</h3>
                  <p className="text-[11px] text-white/40 mt-1">Raw ending balances</p>
                </div>
                <div className="overflow-x-auto max-h-[600px] relative custom-scrollbar">
                  <table className="w-full text-sm text-left relative">
                    <thead className="bg-[#18181A] text-white/40 text-[10px] uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-white/5">
                      <tr>
                        <th className="px-6 py-4">Code</th>
                        <th className="px-6 py-4">Account</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4 text-right">Debit</th>
                        <th className="px-6 py-4 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {trial_balance?.map((tb: any, i: number) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-3 font-mono text-white/60 text-[11px]">{tb.account_code}</td>
                          <td className="px-6 py-3 text-sm text-white/80">{tb.account_name}</td>
                          <td className="px-6 py-3 text-[10px] uppercase text-white/40">{tb.account_type}</td>
                          <td className="px-6 py-3 text-right text-white/70">{tb.debit > 0 ? `$${tb.debit.toLocaleString()}` : '-'}</td>
                          <td className="px-6 py-3 text-right text-white/70">{tb.credit > 0 ? `$${tb.credit.toLocaleString()}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#1C1C1E] rounded-[24px] border border-[#FF5577]/20 shadow-xl overflow-hidden relative">
            {/* Warning Top Glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF5577]/0 via-[#FF5577] to-[#FF5577]/0 opacity-50"></div>
            
            <div className="p-6 border-b border-white/5">
              <h3 className="text-[#FF5577] flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
                <AlertTriangle size={16} /> Open Issues ({alerts?.length || 0})
              </h3>
            </div>
            
            <div className="p-6">
              {alerts?.length === 0 ? (
                <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest">No active alerts securely identified.</p>
              ) : (
                <ul className="space-y-6">
                  {alerts?.map((alert: any) => (
                    <li key={alert.id} className="text-sm">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-[#FF5577]/10 text-[#FF5577]">{alert.severity}</span>
                        <span className="text-[9px] uppercase tracking-wider text-white/30 font-mono">{alert.agent_source.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="font-semibold text-white/90 text-[13px] leading-snug">{alert.alert_type.replace(/_/g, " ")}</p>
                      <p className="text-white/50 text-[11px] mt-2 leading-relaxed">{alert.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
