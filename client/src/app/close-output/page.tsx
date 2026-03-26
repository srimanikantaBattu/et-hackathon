"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWorkflowGroupOutputs, fetchWorkflowRuns } from "@/lib/api";
import { Loader2, Layers, GitMerge, FileText, Activity } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-6 mb-4 text-[#3ABFF0]" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mt-5 mb-3 text-white" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-base font-medium mt-4 mb-2 text-white/90" {...props} />,
  p: ({ node, ...props }) => <p className="mb-4 text-white/70 text-[12px] leading-relaxed" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-white/70 text-[12px]" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-white/70 text-[12px]" {...props} />,
  li: ({ node, ...props }) => <li className="marker:text-white/40" {...props} />,
  table: ({ node, ...props }) => (
    <div className="mb-4 overflow-x-auto custom-scrollbar border border-white/10 rounded-xl bg-black/20">
      <table className="w-full min-w-[760px] text-sm text-left border-collapse" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => <thead className="bg-[#1C1C1E] sticky top-0 z-10 shadow-sm border-b border-white/5 backdrop-blur-md text-white/40 text-[10px] uppercase tracking-widest" {...props} />,
  th: ({ node, ...props }) => <th className="px-4 py-3 font-semibold whitespace-nowrap" {...props} />,
  td: ({ node, ...props }) => <td className="px-4 py-3 border-b border-white/5 text-white/70 align-top" {...props} />,
  pre: ({ node, ...props }) => <pre className="bg-[#141415] border border-white/10 p-4 rounded-lg overflow-x-auto mb-4 font-mono text-[11px] text-white/70" {...props} />,
  code: ({ node, className, children, ...props }: any) => {
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

export default function CloseOutputPage() {
  const [selectedRunId, setSelectedRunId] = useState<number | undefined>(undefined);

  const { data: runs } = useQuery({
    queryKey: ["workflowRuns", "close-output"],
    queryFn: () => fetchWorkflowRuns(25),
    refetchInterval: 5000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["workflowGroup34", selectedRunId],
    queryFn: () => fetchWorkflowGroupOutputs(selectedRunId),
    refetchInterval: 4000,
  });

  const effectiveRunLabel = useMemo(() => {
    if (!data?.run_id) return "No run selected";
    return `Run #${data.run_id} • ${data.period || "N/A"}`;
  }, [data?.period, data?.run_id]);

  const statusClass = (status?: string) => {
    if (status === "completed") return "bg-[#D4FF3A]/10 text-[#D4FF3A] border-[#D4FF3A]/20";
    if (status === "running") return "bg-[#3ABFF0]/10 text-[#3ABFF0] border-[#3ABFF0]/20";
    if (status === "failed") return "bg-[#FF5577]/10 text-[#FF5577] border-[#FF5577]/20";
    return "bg-white/5 text-white/50 border-white/10";
  };

  return (
    <div className="flex-1 space-y-8 p-10 overflow-y-auto custom-scrollbar bg-[#18181A] text-white">
      <div className="flex items-end justify-between mb-8 border-b border-white/5 pb-6 gap-4">
        <div>
          <h2 className="text-[2.5rem] font-semibold tracking-tight leading-none">Finalization Output</h2>
          <p className="text-[12px] font-bold text-white/40 uppercase tracking-[0.2em] mt-4">
            Group 3 and Group 4 orchestration outputs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-mono">Workflow Run</span>
          <select
            value={selectedRunId ?? "latest"}
            onChange={(e) => setSelectedRunId(e.target.value === "latest" ? undefined : Number(e.target.value))}
            className="rounded-xl border border-white/10 bg-[#242529] text-white/80 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#3ABFF0]/40"
          >
            <option value="latest">Latest</option>
            {runs?.map((run: any) => (
              <option key={run.id} value={run.id}>{`Run #${run.id} • ${run.period} • ${run.status}`}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-[#1C1C1E] rounded-[24px] border border-white/5">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4FF3A]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1C1C1E] rounded-2xl border border-white/5 p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Selected Run</p>
              <p className="text-sm text-white/90 font-medium">{effectiveRunLabel}</p>
            </div>
            <div className="bg-[#1C1C1E] rounded-2xl border border-white/5 p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Run Status</p>
              <div className={`inline-flex px-2 py-1 rounded-md border text-[10px] uppercase tracking-wider font-bold ${statusClass(data?.status)}`}>
                {data?.status || "unknown"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="bg-[#1C1C1E] rounded-[24px] border border-white/5 overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-white/90 flex items-center gap-2">
                  <GitMerge size={16} className="text-[#3ABFF0]" /> Group 3 · Intercompany Elimination
                </h3>
                <span className={`px-2 py-1 rounded-md border text-[10px] uppercase tracking-wider font-bold ${statusClass(data?.group3?.status)}`}>
                  {data?.group3?.status || "pending"}
                </span>
              </div>
              <div className="p-6 max-h-[65vh] overflow-auto custom-scrollbar">
                {data?.group3?.output ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {data.group3.output}
                  </ReactMarkdown>
                ) : (
                  <div className="py-10 text-center text-white/40 text-sm flex flex-col items-center gap-2">
                    <Activity size={18} className="text-white/30" />
                    Group 3 output not available yet for this run.
                  </div>
                )}
              </div>
            </section>

            <section className="bg-[#1C1C1E] rounded-[24px] border border-white/5 overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-white/90 flex items-center gap-2">
                  <Layers size={16} className="text-[#D4FF3A]" /> Group 4 · Consolidation & Reporting
                </h3>
                <span className={`px-2 py-1 rounded-md border text-[10px] uppercase tracking-wider font-bold ${statusClass(data?.group4?.status)}`}>
                  {data?.group4?.status || "pending"}
                </span>
              </div>

              <div className="p-6 space-y-6 max-h-[65vh] overflow-auto custom-scrollbar">
                <div>
                  <h4 className="text-[11px] uppercase tracking-widest font-bold text-white/50 mb-3 flex items-center gap-2">
                    <FileText size={13} className="text-[#3ABFF0]" /> Consolidation Output
                  </h4>
                  {data?.group4?.consolidation_output ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {data.group4.consolidation_output}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm text-white/40">Consolidation output not available yet for this run.</p>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5">
                  <h4 className="text-[11px] uppercase tracking-widest font-bold text-white/50 mb-3 flex items-center gap-2">
                    <FileText size={13} className="text-[#D4FF3A]" /> Reporting & Communication Output
                  </h4>
                  {data?.group4?.reporting_output ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {data.group4.reporting_output}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm text-white/40">Reporting output not available yet for this run.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
