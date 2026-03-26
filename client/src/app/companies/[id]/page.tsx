"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCompanyFinancials, fetchCompanyWorkflowHandoffs, fetchWorkflowStatus } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, AlertTriangle, Bot, Terminal, Activity, Table as TableIcon, X } from "lucide-react";
import Link from "next/link";
import { use, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const sharedMarkdownComponents: Components = {
  h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-6 mb-4 text-[#3ABFF0]" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-lg font-semibold mt-5 mb-3 text-white" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-base font-medium mt-4 mb-2 text-white/90" {...props} />,
  p: ({node, ...props}) => <p className="mb-4 text-white/70 text-[12px] leading-relaxed" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1 text-white/70 text-[12px]" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-white/70 text-[12px]" {...props} />,
  li: ({node, ...props}) => <li className="marker:text-white/40" {...props} />,
  table: ({node, ...props}) => <MarkdownTableDialog {...props} />,
  thead: ({node, ...props}) => <thead className="bg-[#1C1C1E] sticky top-0 z-10 shadow-sm border-b border-white/5 backdrop-blur-md" {...props} />,
  tbody: ({node, ...props}) => <tbody className="divide-y divide-white/[0.03]" {...props} />,
  tr: ({node, isHeader, ...props}: any) => <tr className="hover:bg-white/[0.02] transition-colors group" {...props} />,
  th: ({node, ...props}) => <th className="px-8 py-5 whitespace-nowrap text-[10px] text-left text-white/40 uppercase tracking-widest font-semibold" {...props} />,
  td: ({node, ...props}) => <td className="px-8 py-5 whitespace-nowrap text-xs text-white/80" {...props} />,
  strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
  pre: ({node, ...props}) => (
    <pre className="bg-[#18181A] border border-white/10 p-4 rounded-lg overflow-x-auto mb-4 font-mono text-[11px] text-white/70" {...props} />
  ),
  code: ({node, className, children, ...props}: any) => {
    const text = Array.isArray(children) ? children.join("") : String(children ?? "");
    const isLikelyInline = !className && !text.includes("\n");

    return (
      <code
        className={
          isLikelyInline
            ? "bg-white/10 text-[#3ABFF0] px-1.5 py-0.5 rounded text-[11px] font-mono"
            : "font-mono text-[11px] text-white/70"
        }
        {...props}
      >
        {children}
      </code>
    );
  },
};

const MarkdownTableDialog = (props: any) => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 my-4 px-4 py-2.5 bg-[#242529] border border-white/10 rounded-xl hover:bg-[#2A2B2D] hover:border-white/20 transition-all text-[11px] font-semibold uppercase tracking-wider text-white/80 shadow-md group">
           <TableIcon size={14} className="text-[#3ABFF0] group-hover:scale-110 transition-transform" /> View Data Grid
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in-overlay data-[state=closed]:animate-out-overlay" />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 z-[70] w-[90vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 bg-[#1C1C1E] border border-white/10 shadow-2xl flex flex-col rounded-[24px] outline-none max-h-[85vh] overflow-hidden data-[state=open]:animate-in-overlay data-[state=closed]:animate-out-overlay"
          aria-describedby={undefined}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4FF3A]/0 via-[#D4FF3A]/40 to-[#D4FF3A]/0"></div>
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
            <div>
              <Dialog.Title className="text-lg font-medium text-white/90 flex items-center gap-2">
                <TableIcon size={18} className="text-[#D4FF3A]" />
                Detailed Data Grid
              </Dialog.Title>
              <Dialog.Description className="text-[11px] text-white/40 mt-1">Expanded view of the agent's tabular output.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200">
                <X size={14} />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse" {...props} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const companyId = decodeURIComponent(unwrappedParams?.id || "");
  const [isHandoffDrawerOpen, setIsHandoffDrawerOpen] = useState(false);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["company", companyId, "financials"],
    queryFn: () => fetchCompanyFinancials(companyId, "2026-01"),
    enabled: Boolean(companyId),
    refetchInterval: (query) => {
      const payload: any = query.state.data;
      const variances: any[] = Array.isArray(payload?.variances) ? payload.variances : [];
      const hasPendingCommentary = variances.some(
        (v) => !v?.ai_commentary || String(v.ai_commentary).toLowerCase().includes("waiting for ai variance commentary")
      );
      return hasPendingCommentary ? 3000 : false;
    },
  });
  const { data: workflowStatus } = useQuery({
    queryKey: ["workflowStatus"],
    queryFn: fetchWorkflowStatus,
    refetchInterval: 2000,
  });
  const latestRun = workflowStatus?.latest_run;
  const { data: handoffs } = useQuery({
    queryKey: ["workflowHandoffs", companyId, latestRun?.id],
    queryFn: () => fetchCompanyWorkflowHandoffs(companyId, latestRun?.id),
    enabled: Boolean(companyId),
    refetchInterval: 4000,
  });

  const hasHandoffData = useMemo(() => {
    const g1 = handoffs?.handoffs?.group1?.length || 0;
    const g2 = handoffs?.handoffs?.group2?.length || 0;
    return g1 + g2 > 0;
  }, [handoffs]);

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error || !data || !data.company) return <div className="p-8 text-destructive">Failed to load company data.</div>;

  const { company, trial_balance, variances, alerts } = data;
  const plSummary = data?.pl_summary || {};
  const plPrior = data?.pl_prior_year || {};
  const plBudget = data?.pl_budget || {};
  const balanceSheet = data?.balance_sheet || {};
  const cashFlow = data?.cash_flow || {};

  const toNumber = (value: unknown) => Number(value ?? 0);
  const formatCurrency = (value: unknown) => `$${toNumber(value).toLocaleString()}`;
  const formatPct = (actual: unknown, baseline: unknown) => {
    const actualNum = toNumber(actual);
    const baselineNum = toNumber(baseline);
    if (baselineNum === 0) return "-";
    const pct = ((actualNum - baselineNum) / Math.abs(baselineNum)) * 100;
    return `${pct.toFixed(1)}%`;
  };

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
            {latestRun?.status && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md bg-[#3ABFF0]/10 text-[#3ABFF0]">
                Workflow {String(latestRun.status).replace(/_/g, ' ')}
              </span>
            )}
            {latestRun?.current_group && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md bg-white/5 text-white/50">
                {String(latestRun.current_group).replace(/_/g, ' ')} • {Math.round(Number(latestRun.progress_pct || 0))}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
          <Tabs defaultValue="variances" className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-[#1C1C1E] p-1 rounded-xl border border-white/5 mb-6">
              <TabsTrigger value="variances" className="data-[state=active]:bg-[#2A2B2D] data-[state=active]:text-white rounded-lg text-xs">Variance Analysis</TabsTrigger>
              <TabsTrigger value="tb" className="data-[state=active]:bg-[#2A2B2D] data-[state=active]:text-white rounded-lg text-xs">Trial Balance</TabsTrigger>
              <TabsTrigger value="statements" className="data-[state=active]:bg-[#2A2B2D] data-[state=active]:text-white rounded-lg text-xs">Statements</TabsTrigger>
            </TabsList>
            
            <TabsContent value="variances" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="bg-[#1C1C1E] rounded-[24px] border border-white/[0.03] overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/5">
                  <h3 className="text-lg font-medium text-white/90">AI Variance Analysis</h3>
                  <p className="text-[11px] text-white/40 mt-1">Accounts flagged by the Agentic variance engine.</p>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[980px] text-sm text-left border-collapse">
                    <thead className="bg-[#18181A] text-white/40 text-[10px] uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-white/5 backdrop-blur-md">
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

            <TabsContent value="statements" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="space-y-6">
                <Card className="bg-[#1C1C1E] border-white/[0.03] rounded-[24px] shadow-xl">
                  <CardHeader className="border-b border-white/5">
                    <CardTitle className="text-white/90">Profit &amp; Loss Summary</CardTitle>
                    <CardDescription className="text-white/40">Actual vs prior year vs budget (2026-01)</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full min-w-[760px] text-sm text-left border-collapse">
                        <thead className="bg-[#18181A] text-white/40 text-[10px] uppercase tracking-wider border-b border-white/5">
                          <tr>
                            <th className="px-6 py-4">Line Item</th>
                            <th className="px-6 py-4 text-right">Actual</th>
                            <th className="px-6 py-4 text-right">Prior Year</th>
                            <th className="px-6 py-4 text-right">Budget</th>
                            <th className="px-6 py-4 text-right">Vs PY %</th>
                            <th className="px-6 py-4 text-right">Vs Budget %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {[
                            { key: "revenue", label: "Revenue" },
                            { key: "cogs", label: "COGS" },
                            { key: "gross_profit", label: "Gross Profit" },
                            { key: "opex", label: "Operating Expense" },
                            { key: "ebitda", label: "EBITDA" },
                          ].map((item) => {
                            const actual = toNumber(plSummary?.[item.key]);
                            const prior = toNumber(plPrior?.[item.key]);
                            const budget = toNumber(plBudget?.[item.key]);
                            return (
                              <tr key={item.key} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 text-white/80 font-medium">{item.label}</td>
                                <td className="px-6 py-4 text-right text-white/80">{formatCurrency(actual)}</td>
                                <td className="px-6 py-4 text-right text-white/70">{formatCurrency(prior)}</td>
                                <td className="px-6 py-4 text-right text-white/70">{formatCurrency(budget)}</td>
                                <td className="px-6 py-4 text-right text-white/60">{formatPct(actual, prior)}</td>
                                <td className="px-6 py-4 text-right text-white/60">{formatPct(actual, budget)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-[#1C1C1E] border-white/[0.03] rounded-[24px] shadow-xl">
                    <CardHeader className="border-b border-white/5">
                      <CardTitle className="text-white/90">Balance Sheet Snapshot</CardTitle>
                      <CardDescription className="text-white/40">Period-end balance check</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-center justify-between text-sm"><span className="text-white/50">Assets</span><span className="text-white/90 font-medium">{formatCurrency(balanceSheet.assets)}</span></div>
                      <div className="flex items-center justify-between text-sm"><span className="text-white/50">Liabilities</span><span className="text-white/80">{formatCurrency(balanceSheet.liabilities)}</span></div>
                      <div className="flex items-center justify-between text-sm"><span className="text-white/50">Equity</span><span className="text-white/80">{formatCurrency(balanceSheet.equity)}</span></div>
                      <div className="flex items-center justify-between text-sm pt-3 border-t border-white/5"><span className="text-white/40 uppercase tracking-wider text-[10px]">Liabilities + Equity</span><span className="text-white/90 font-medium">{formatCurrency(balanceSheet.liabilities_plus_equity)}</span></div>
                      <div className="flex items-center justify-between text-sm"><span className="text-white/40 uppercase tracking-wider text-[10px]">Balance Gap</span><span className="text-[#FFB03A] font-medium">{formatCurrency(balanceSheet.balance_gap)}</span></div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#1C1C1E] border-white/[0.03] rounded-[24px] shadow-xl">
                    <CardHeader className="border-b border-white/5">
                      <CardTitle className="text-white/90">Cash Flow Snapshot</CardTitle>
                      <CardDescription className="text-white/40">Derived movement from prior period</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-center justify-between text-sm"><span className="text-white/50">Beginning Cash</span><span className="text-white/80">{formatCurrency(cashFlow.beginning_cash)}</span></div>
                      <div className="flex items-center justify-between text-sm"><span className="text-white/50">Operating Cash</span><span className="text-white/80">{formatCurrency(cashFlow.operating_cash)}</span></div>
                      <div className="flex items-center justify-between text-sm"><span className="text-white/50">Investing Cash</span><span className="text-white/80">{formatCurrency(cashFlow.investing_cash)}</span></div>
                      <div className="flex items-center justify-between text-sm"><span className="text-white/50">Financing Cash</span><span className="text-white/80">{formatCurrency(cashFlow.financing_cash)}</span></div>
                      <div className="flex items-center justify-between text-sm pt-3 border-t border-white/5"><span className="text-white/40 uppercase tracking-wider text-[10px]">Net Cash Change</span><span className="text-[#3ABFF0] font-medium">{formatCurrency(cashFlow.net_cash_change)}</span></div>
                      <div className="flex items-center justify-between text-sm"><span className="text-white/40 uppercase tracking-wider text-[10px]">Ending Cash</span><span className="text-white/90 font-medium">{formatCurrency(cashFlow.ending_cash)}</span></div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#1C1C1E] rounded-[24px] border border-[#3ABFF0]/20 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3ABFF0]/0 via-[#3ABFF0] to-[#3ABFF0]/0 opacity-50"></div>
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[#3ABFF0] text-sm font-semibold tracking-wider uppercase">
                    Agent Handoffs
                  </h3>
                  <p className="text-[10px] text-white/40 mt-1">Latest run output snippets for this company</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHandoffDrawerOpen(true)}
                  disabled={!hasHandoffData}
                  className="text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-md border border-[#3ABFF0]/30 bg-[#3ABFF0]/10 text-[#3ABFF0] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:bg-[#3ABFF0]/20 hover:border-[#3ABFF0]/50 active:scale-[0.98]"
                >
                  View Full
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[10px] uppercase text-white/40 tracking-wider mb-2">Group 1</p>
                {handoffs?.handoffs?.group1?.length ? (
                  <ul className="space-y-6">
                    {handoffs.handoffs.group1.slice(0, 2).map((item: any, index: number) => (
                      <li key={index} className="text-sm transition-all duration-200 hover:bg-white/[0.02] rounded-lg px-2 py-1 -mx-2 -my-1">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-[#3ABFF0]/10 text-[#3ABFF0]">
                            {String(item.agent_name || "agent").replace(/_/g, " ")}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-white/30 font-mono">handoff</span>
                        </div>
                        <p className="font-semibold text-white/90 text-[13px] leading-snug">Agent Output</p>
                        <p className="text-white/50 text-[11px] mt-2 leading-relaxed whitespace-pre-wrap">{item.snippet}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">No group 1 handoff yet.</p>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase text-white/40 tracking-wider mb-2">Group 2</p>
                {handoffs?.handoffs?.group2?.length ? (
                  <ul className="space-y-6">
                    {handoffs.handoffs.group2.slice(0, 2).map((item: any, index: number) => (
                      <li key={index} className="text-sm transition-all duration-200 hover:bg-white/[0.02] rounded-lg px-2 py-1 -mx-2 -my-1">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-[#3ABFF0]/10 text-[#3ABFF0]">
                            {String(item.agent_name || "agent").replace(/_/g, " ")}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-white/30 font-mono">handoff</span>
                        </div>
                        <p className="font-semibold text-white/90 text-[13px] leading-snug">Agent Output</p>
                        <p className="text-white/50 text-[11px] mt-2 leading-relaxed whitespace-pre-wrap">{item.snippet}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">No group 2 handoff yet.</p>
                )}
              </div>
            </div>
          </div>

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

      <Dialog.Root open={isHandoffDrawerOpen} onOpenChange={setIsHandoffDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in-overlay data-[state=closed]:animate-out-overlay" />
          <Dialog.Content 
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-2xl bg-[#141415] border-l border-white/10 shadow-2xl flex flex-col data-[state=open]:animate-in-drawer data-[state=closed]:animate-out-drawer outline-none"
            aria-describedby={undefined}
          >
            <div className="absolute top-0 left-0 bottom-0 w-[1px] bg-gradient-to-b from-[#3ABFF0]/0 via-[#3ABFF0]/50 to-[#3ABFF0]/0"></div>
            
            <div className="px-8 py-6 border-b border-white/5 flex items-start justify-between gap-4 bg-[#18181A]">
              <div>
                <Dialog.Title className="text-[#3ABFF0] text-base font-medium tracking-wide flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#3ABFF0] animate-pulse"></span>
                  Agent Handoffs Log
                </Dialog.Title>
                <Dialog.Description className="text-xs text-white/40 mt-1.5">
                  Detailed diagnostic outputs and execution summaries from the AI orchestrator.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#3ABFF0]/50"
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <Tabs defaultValue="group1" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-[#1C1C1E] p-1.5 rounded-xl border border-white/5 mb-8">
                  <TabsTrigger value="group1" className="data-[state=active]:bg-[#2A2B2D] data-[state=active]:shadow-sm data-[state=active]:text-white text-white/50 rounded-lg text-[13px] py-2 transition-all">Phase 1 Execution</TabsTrigger>
                  <TabsTrigger value="group2" className="data-[state=active]:bg-[#2A2B2D] data-[state=active]:shadow-sm data-[state=active]:text-white text-white/50 rounded-lg text-[13px] py-2 transition-all">Phase 2 Verification</TabsTrigger>
                </TabsList>

                <TabsContent value="group1" className="mt-0 space-y-6 transition-all duration-300 data-[state=active]:opacity-100 data-[state=active]:translate-y-0 data-[state=inactive]:opacity-0 data-[state=inactive]:translate-y-2 outline-none">
                  {handoffs?.handoffs?.group1?.length ? (
                    handoffs.handoffs.group1.map((item: any, index: number) => (
                      <div key={`drawer-g1-${index}`} className="border border-[#2A2B2D] rounded-xl bg-[#121214] shadow-lg overflow-hidden transition-all duration-300 hover:border-[#3ABFF0]/30 hover:shadow-[0_0_20px_rgba(58,191,240,0.08)]">
                        <div className="px-5 py-3 border-b border-[#2A2B2D] bg-[#18181B] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Bot size={15} className="text-[#3ABFF0]" />
                            <span className="text-[12px] font-medium tracking-wide text-white/90 capitalize">
                              {String(item.agent_name || "agent").replace(/_/g, " ")}
                            </span>
                            <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-[#3ABFF0]/10 text-[#3ABFF0]">
                              Executed
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Terminal size={13} className="text-white/30" />
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">System.out</span>
                          </div>
                        </div>
                        <div className="p-5 relative">
                          <div className="absolute top-0 left-0 bottom-0 w-8 bg-[#18181A] border-r border-[#2A2B2D] flex flex-col items-center py-5 pointer-events-none">
                            <Activity size={12} className="text-white/20 mb-auto" />
                          </div>
                          <div className="pl-6 text-white/80 text-[13px] leading-relaxed custom-scrollbar overflow-x-auto">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={sharedMarkdownComponents}
                            >
                              {item.full_response || item.snippet}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-16 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                      <Terminal size={24} className="text-white/20 mb-3" />
                      <p className="text-[12px] text-white/40 font-mono">Awaiting phase 1 execution logs...</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="group2" className="mt-0 space-y-6 transition-all duration-300 data-[state=active]:opacity-100 data-[state=active]:translate-y-0 data-[state=inactive]:opacity-0 data-[state=inactive]:translate-y-2 outline-none">
                  {handoffs?.handoffs?.group2?.length ? (
                    handoffs.handoffs.group2.map((item: any, index: number) => (
                      <div key={`drawer-g2-${index}`} className="border border-[#2A2B2D] rounded-xl bg-[#121214] shadow-lg overflow-hidden transition-all duration-300 hover:border-[#3ABFF0]/30 hover:shadow-[0_0_20px_rgba(58,191,240,0.08)]">
                        <div className="px-5 py-3 border-b border-[#2A2B2D] bg-[#18181B] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Bot size={15} className="text-[#3ABFF0]" />
                            <span className="text-[12px] font-medium tracking-wide text-white/90 capitalize">
                              {String(item.agent_name || "agent").replace(/_/g, " ")}
                            </span>
                            <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-[#3ABFF0]/10 text-[#3ABFF0]">
                              Verified
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Terminal size={13} className="text-white/30" />
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">System.out</span>
                          </div>
                        </div>
                        <div className="p-5 relative">
                          <div className="absolute top-0 left-0 bottom-0 w-8 bg-[#18181A] border-r border-[#2A2B2D] flex flex-col items-center py-5 pointer-events-none">
                            <Activity size={12} className="text-white/20 mb-auto" />
                          </div>
                          <div className="pl-6 text-white/80 text-[13px] leading-relaxed custom-scrollbar overflow-x-auto">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={sharedMarkdownComponents}
                            >
                              {item.full_response || item.snippet}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-16 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                      <Terminal size={24} className="text-white/20 mb-3" />
                      <p className="text-[12px] text-white/40 font-mono">Awaiting phase 2 verification logs...</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}


