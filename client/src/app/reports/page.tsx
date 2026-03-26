"use client";

import { useQuery } from "@tanstack/react-query";
import { buildReportDownloadUrl, fetchReportsSummary, fetchWorkflowRuns, triggerReportsEmail } from "@/lib/api";
import { FileText, Download, Mail, Loader2, Target, TrendingUp, BarChart3, Presentation, Server } from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

export default function ReportsPage() {
  const [selectedRunId, setSelectedRunId] = useState<number | undefined>(undefined);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const { data: runs } = useQuery({
    queryKey: ["workflowRuns", "reports"],
    queryFn: () => fetchWorkflowRuns(25),
    refetchInterval: 6000,
  });

  const selectedRun = useMemo(
    () => runs?.find((run: any) => run.id === selectedRunId),
    [runs, selectedRunId]
  );

  const effectivePeriod = selectedRun?.period || "2026-01";

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ["reportsSummary", effectivePeriod, selectedRunId],
    queryFn: () => fetchReportsSummary(effectivePeriod, selectedRunId),
    refetchInterval: 6000,
  });

  const consolidation = reportsData?.summary;
  const aiSummary = reportsData?.ai_summary;

  const handleEmailPartners = async () => {
    try {
      setIsSendingEmail(true);
      await triggerReportsEmail(effectivePeriod, selectedRunId);
      window.alert("Partner email request completed. Check logs for delivery status.");
    } catch (error) {
      window.alert("Failed to send partner email. Please retry.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const completeFinancialsUrl = buildReportDownloadUrl("complete-financials.pdf", {
    period: effectivePeriod,
    run_id: selectedRunId,
  });
  const intercompanyMatrixUrl = buildReportDownloadUrl("intercompany-matrix.csv", {
    period: effectivePeriod,
  });
  const agentAuditUrl = buildReportDownloadUrl("agent-audit.csv", {
    run_id: selectedRunId,
    limit: 2000,
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="flex-1 space-y-8 p-10 overflow-y-auto custom-scrollbar bg-[#18181A] text-white">
      <div className="flex items-end justify-between mb-8 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-[2.5rem] font-semibold tracking-tight leading-none">Financial Reports</h2>
          <p className="text-[12px] font-bold text-white/40 uppercase tracking-[0.2em] mt-4">Consolidated packages and auditor exports.</p>
        </div>
        <div className="flex gap-3 items-center">
          <select
            value={selectedRunId ?? "latest"}
            onChange={(e) => setSelectedRunId(e.target.value === "latest" ? undefined : Number(e.target.value))}
            className="rounded-xl border border-white/10 bg-[#242529] text-white/80 px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#3ABFF0]/40"
          >
            <option value="latest">Latest run</option>
            {runs?.map((run: any) => (
              <option key={run.id} value={run.id}>{`Run #${run.id} • ${run.period} • ${run.status}`}</option>
            ))}
          </select>
          <button
            onClick={handleEmailPartners}
            disabled={isSendingEmail}
            className="inline-flex items-center justify-center rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border border-white/10 bg-[#242529] text-white/70 hover:bg-[#2A2B2D] hover:text-white px-5 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} {isSendingEmail ? "Sending..." : "Email Partners"}
          </button>
          <a
            href={completeFinancialsUrl}
            className="inline-flex items-center justify-center rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-[#D4FF3A] text-black hover:bg-[#bceb2b] shadow-[0_0_20px_rgba(212,255,58,0.3)] px-5 py-2.5"
          >
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-[#1C1C1E] rounded-[24px] border border-white/[0.04] overflow-hidden shadow-2xl relative">
            {/* Top Glow */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4FF3A]/50 to-transparent"></div>
            
            <div className="bg-black/20 border-b border-white/5 p-8 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-medium text-white/90 flex items-center gap-3">
                  <Presentation size={20} className="text-[#D4FF3A]" /> 
                  Month-End Close Summary
                </h3>
                <p className="text-[11px] text-white/40 mt-2 uppercase tracking-widest font-mono">Generated autonomously by Reporting Agent on {format(new Date(reportsData?.generated_at || Date.now()), "MMM dd, yyyy")}</p>
              </div>
              <div className="px-3 py-1 bg-[#D4FF3A]/10 text-[#D4FF3A] uppercase text-[10px] tracking-widest font-bold rounded-sm border border-[#D4FF3A]/20">
                Run {reportsData?.run_id ? `#${reportsData.run_id}` : "Latest"}
              </div>
            </div>

            <div className="p-8">
              {isLoading ? (
                <div className="flex justify-center p-16 bg-black/10 rounded-xl"><Loader2 className="h-8 w-8 animate-spin text-[#D4FF3A]" /></div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4 gap-4 lg:gap-6 pb-8 border-b border-white/5">
                    <div className="bg-[#242529] p-5 rounded-2xl border border-white/[0.03] overflow-hidden">
                      <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><TrendingUp size={12} className="text-[#3ABFF0]"/> Revenue</div>
                      <div className="text-xl lg:text-2xl font-semibold tracking-tight text-white/90 truncate" title={formatCurrency(consolidation?.total_revenue || 0)}>
                        {formatCurrency(consolidation?.total_revenue || 0)}
                      </div>
                    </div>
                    <div className="bg-[#242529] p-5 rounded-2xl border border-white/[0.03] overflow-hidden">
                      <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><BarChart3 size={12} className="text-[#D4FF3A]"/> EBITDA</div>
                      <div className="text-xl lg:text-2xl font-semibold tracking-tight text-white/90 truncate" title={formatCurrency(consolidation?.ebitda || 0)}>
                        {formatCurrency(consolidation?.ebitda || 0)}
                      </div>
                    </div>
                    <div className="bg-[#242529] p-5 rounded-2xl border border-white/[0.03] overflow-hidden">
                      <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Gross Profit</div>
                      <div className="text-xl lg:text-2xl font-semibold tracking-tight text-white/90 truncate" title={formatCurrency(consolidation?.gross_profit || 0)}>
                        {formatCurrency(consolidation?.gross_profit || 0)}
                      </div>
                    </div>
                    <div className="bg-[#242529] p-5 rounded-2xl border border-white/[0.03] overflow-hidden">
                      <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Net Income</div>
                      <div className="text-xl lg:text-2xl font-semibold tracking-tight text-white/90 truncate" title={formatCurrency(consolidation?.net_income || 0)}>
                        {formatCurrency(consolidation?.net_income || 0)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[13px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-white/70">
                      <Target size={16} className="text-[#FFB03A]"/> Executive Commentary
                    </h4>
                    <div className="bg-black/30 p-6 rounded-2xl border border-white/[0.02] text-[13px] text-white/60 leading-loose">
                      {aiSummary ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({node, ...props}) => <p className="mb-4 text-[13px] text-white/65 leading-loose" {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-base font-semibold text-white mb-3" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-sm font-semibold text-white/90 mb-2" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-sm font-semibold text-white/85 mb-2" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 text-white/65" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 text-white/65" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            strong: ({node, ...props}) => <strong className="text-white/90" {...props} />,
                          }}
                        >
                          {aiSummary}
                        </ReactMarkdown>
                      ) : (
                        <>
                          <p>
                            Dynamic reporting output is not available for this selected run. Consolidated gross margin is currently <span className="text-white/90 font-mono font-medium">{consolidation?.gross_margin_pct?.toFixed(1) || 0}%</span> and EBITDA margin is <span className="text-white/90 font-mono font-medium">{consolidation?.ebitda_margin_pct?.toFixed(1) || 0}%</span>.
                          </p>
                          <p className="mt-4">
                            Open issues requiring review: <span className="text-white/90 font-mono font-medium">{reportsData?.open_alerts || 0}</span>. Run ID: <span className="text-white/90 font-mono font-medium">{reportsData?.run_id || "N/A"}</span>.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 space-y-6">
          <div className="bg-[#1C1C1E] rounded-[24px] border border-white/[0.04] p-6 shadow-2xl">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2">
              <Download size={14} /> Available Downloads
            </h3>
            
            <div className="space-y-4">
              <a href={completeFinancialsUrl} className="flex items-center justify-between p-4 bg-[#242529] rounded-xl border border-white/[0.03] hover:border-white/10 hover:bg-[#2A2B2D] transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#FF5577]/10 flex items-center justify-center text-[#FF5577]">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white/90">Complete Financials</h4>
                    <p className="text-[10px] uppercase font-mono tracking-widest text-white/40 mt-1">PDF &bull; Generated on click</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:bg-[#FF5577]/20 group-hover:text-[#FF5577] transition-all">
                  <Download size={14} />
                </div>
              </a>
              
              <a href={intercompanyMatrixUrl} className="flex items-center justify-between p-4 bg-[#242529] rounded-xl border border-white/[0.03] hover:border-white/10 hover:bg-[#2A2B2D] transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#3ABFF0]/10 flex items-center justify-center text-[#3ABFF0]">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white/90">Intercompany Matrix</h4>
                    <p className="text-[10px] uppercase font-mono tracking-widest text-white/40 mt-1">CSV &bull; Generated on click</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:bg-[#3ABFF0]/20 group-hover:text-[#3ABFF0] transition-all">
                  <Download size={14} />
                </div>
              </a>
              
              <a href={agentAuditUrl} className="flex items-center justify-between p-4 bg-[#242529] rounded-xl border border-white/[0.03] hover:border-white/10 hover:bg-[#2A2B2D] transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#FFB03A]/10 flex items-center justify-center text-[#FFB03A]">
                    <Server size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white/90">Agent Audit Trail</h4>
                    <p className="text-[10px] uppercase font-mono tracking-widest text-white/40 mt-1">CSV &bull; Latest run window</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:bg-[#FFB03A]/20 group-hover:text-[#FFB03A] transition-all">
                  <Download size={14} />
                </div>
              </a>

              <Link href="/agents" className="flex items-center justify-between p-4 bg-[#242529] rounded-xl border border-white/[0.03] hover:border-white/10 hover:bg-[#2A2B2D] transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#D4FF3A]/10 flex items-center justify-center text-[#D4FF3A]">
                    <Server size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white/90">Open Live Audit Trail</h4>
                    <p className="text-[10px] uppercase font-mono tracking-widest text-white/40 mt-1">Interactive view</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:bg-[#D4FF3A]/20 group-hover:text-[#D4FF3A] transition-all">
                  <Download size={14} />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
