"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAgentLogs } from "@/lib/api";
import { format } from "date-fns";
import { Loader2, Server, Filter } from "lucide-react";

export default function AgentsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["agentLogs", "all"],
    queryFn: () => fetchAgentLogs(undefined, 200),
    refetchInterval: 5000, // Poll every 5s on this page as ultimate backup
  });

  return (
    <div className="flex-1 space-y-8 p-10 overflow-y-auto custom-scrollbar bg-[#18181A] text-white">
      <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-[2.5rem] font-semibold tracking-tight leading-none text-white">Agent Audit Trail</h2>
          <p className="text-[12px] font-bold text-white/40 uppercase tracking-[0.2em] mt-4">Security, compliance, and reasoning trace for all autonomous actions.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#242529] hover:bg-[#2A2B2D] transition-all text-white/70 hover:text-white px-4 py-2.5 text-xs font-semibold tracking-wider uppercase">
          <Filter size={14} /> Filter Trace
        </button>
      </div>

      <div className="bg-[#1C1C1E] rounded-[24px] border border-white/[0.04] overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-220px)]">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div>
            <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">
              <Server size={18} className="text-[#D4FF3A]" /> 
              Master Trace File
            </h3>
            <p className="text-[11px] text-white/40 mt-1">Live streaming last 200 execution events</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4FF3A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4FF3A]"></span>
            </span>
            <span className="text-[10px] uppercase font-bold text-[#D4FF3A] tracking-wider">WebSocket Active</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex items-center justify-center bg-black/10"><Loader2 className="h-8 w-8 animate-spin text-[#D4FF3A]" /></div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-[#1C1C1E] sticky top-0 z-10 shadow-sm border-b border-white/5 backdrop-blur-md">
                <tr className="text-[10px] text-white/40 uppercase tracking-widest">
                  <th className="px-8 py-5">Timestamp</th>
                  <th className="px-6 py-5">AI Agent</th>
                  <th className="px-6 py-5">Severity</th>
                  <th className="px-6 py-5">Target Company</th>
                  <th className="px-6 py-5">Action & Reasoning Logic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {logs?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-5 whitespace-nowrap text-xs font-mono text-white/30">
                      {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap font-bold text-[11px] text-[#D4FF3A] uppercase tracking-wider">
                      {log.agent_name.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm 
                        ${log.severity === 'warning' ? 'bg-[#FFB03A]/10 text-[#FFB03A]' : 
                          log.severity === 'error' ? 'bg-[#FF5577]/10 text-[#FF5577]' : 
                          log.severity === 'success' ? 'bg-[#3ABFF0]/10 text-[#3ABFF0]' : 'bg-white/5 text-white/50'}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {log.company_id ? (
                        <span className="text-[10px] bg-black/40 px-2 py-1 rounded-md border border-white/5 text-white/60 font-mono">
                          {log.company_id}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#3ABFF0]/50 uppercase tracking-widest font-bold">System Wide</span>
                      )}
                    </td>
                    <td className="px-6 py-5 min-w-[500px]">
                      <div className="font-medium text-white/80 text-sm mb-2">{log.action}</div>
                      {log.details && (
                        <div className="text-[11px] text-white/50 leading-relaxed whitespace-pre-wrap font-mono p-4 bg-black/40 rounded-xl border border-white/[0.03] max-h-32 overflow-y-auto custom-scrollbar shadow-inner opacity-80 group-hover:opacity-100 transition-opacity">
                          {log.details}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {(!logs || logs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-[12px] font-mono uppercase tracking-widest text-white/30">
                      No agent activity recorded yet. Target the Orchestrator to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
