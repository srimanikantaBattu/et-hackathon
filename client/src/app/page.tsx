"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCompanies, fetchConsolidation, fetchAgentStatus, fetchWorkflowRuns, fetchWorkflowStatus, triggerWorkflow } from "@/lib/api";
import { Play, Loader2, ChevronDown, Bell, MoreVertical, Plus, Hand, Users, Target, PieChart, Flame, Flag, Activity, RefreshCw } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { AgentActivityFeed } from "@/components/agent-activity-feed";

// Custom Stacked Card Component matching the HTML/CSS spec perfectly
function GradientCard({ title, value, icon, trend, bgStyle }: { title: string, value: string | number, icon: React.ReactNode, trend?: string, bgStyle: string }) {
  const splitTitle = title.split(' ');
  return (
    <div className="relative pb-[44px] w-full group animate-fade-up">

      {/* Lowest shadow layer (3rd) */}
      <div 
        className="absolute top-[34px] left-[22px] right-[22px] bottom-[0px] rounded-[18px] opacity-30 -z-10"
        style={{ background: bgStyle }}
      ></div>
      
      {/* Middle shadow layer (2nd) */}
      <div 
        className="absolute top-[24px] left-[15px] right-[15px] bottom-[14px] rounded-[18px] opacity-45 z-0"
        style={{ background: bgStyle }}
      ></div>
      
      {/* Top shadow layer (1st) */}
      <div 
        className="absolute top-[14px] left-[8px] right-[8px] bottom-[28px] rounded-[18px] opacity-65 z-10"
        style={{ background: bgStyle }}
      ></div>
      
      {/* Main Top Card */}
      <div 
        className="relative flex flex-col justify-between p-[22px] pb-[28px] min-h-[200px] rounded-[20px] overflow-hidden z-20 shadow-lg transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
        style={{ background: bgStyle }}
      >
         {/* Custom inner glow/reflection */}
         <div className="absolute inset-0 rounded-[20px] pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)' }}></div>

         <div className="relative z-10 flex flex-col h-full">
           {/* Icon Container */}
           <div className="w-10 h-10 rounded-full flex items-center justify-center mb-6 border border-white/10" style={{ background: 'rgba(0,0,0,0.35)' }}>
              {icon}
           </div>
           
           {/* Text Content */}
           <div className="mt-auto">
              <h4 className="text-[10px] font-semibold tracking-[0.12em] text-white/50 uppercase leading-[1.5] mb-4">
                 {splitTitle.map((word, i) => <span key={i} className="block">{word}</span>)}
              </h4>
              
              <div className="flex items-end gap-2">
                <span className="text-[52px] font-extrabold tracking-[-2px] leading-none text-white">{value}</span>
                {trend && (
                  <span className={`text-[11px] font-semibold mb-2 font-mono tracking-tight shrink-0 ${trend.startsWith('-') ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                    {trend}
                  </span>
                )}
              </div>
           </div>
         </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: companies, isLoading: loadingComps } = useQuery<any>({ queryKey: ["companies"], queryFn: fetchCompanies, refetchOnMount: true, staleTime: 0 });
  const { data: consolidation, isLoading: loadingConsol } = useQuery<any>({ queryKey: ["consolidation"], queryFn: () => fetchConsolidation(), refetchOnMount: true, staleTime: 0 });
  const { data: agentStatus } = useQuery<any>({ queryKey: ["agentStatus"], queryFn: fetchAgentStatus, refetchInterval: 2000 });
  const { data: workflowStatus } = useQuery<any>({ queryKey: ["workflowStatus"], queryFn: fetchWorkflowStatus, refetchInterval: 2000 });
  const { data: workflowRuns } = useQuery<any>({ queryKey: ["workflowRuns"], queryFn: () => fetchWorkflowRuns(5), refetchInterval: 5000 });
  const [triggering, setTriggering] = useState(false);

  const latestRun = workflowStatus?.latest_run;
  const workflowStateLabel = latestRun?.status ? String(latestRun.status).toUpperCase() : "IDLE";
  const workflowGroupLabel = latestRun?.current_group ? String(latestRun.current_group).replace(/_/g, " ") : "standby";
  const workflowProgress = Math.round(Number(latestRun?.progress_pct || 0));

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await triggerWorkflow("2026-01");
    } finally {
      setTimeout(() => setTriggering(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#18181A] text-white">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto pr-4 pl-10 py-10 pb-4 custom-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[2.5rem] font-semibold tracking-tight text-white leading-none">Statistics</h1>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-3">Monthly Updates</p>
          </div>
          <div className="flex items-center">
            <button className="flex items-center gap-3 bg-[#1C1D1F] px-5 py-2.5 rounded-full text-xs font-bold border border-white/5 hover:bg-[#2A2B2D] transition-all text-white/80">
              PE Platform Project <ChevronDown size={14} className="text-white/50" />
            </button>
          </div>
        </div>

        {loadingConsol || loadingComps ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#D4FF3A]" /></div>
        ) : (
          <div className="space-y-6 flex-1">
            
            {/* Top Chart Area (Portfolio Activity) */}
            <div className="bg-[#0C0C0E] rounded-[32px] p-8 border border-white/[0.03] shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-10 relative z-10">
                <div>
                  <h2 className="text-xl font-medium">Portfolio Close Activity</h2>
                  <p className="text-[11px] text-white/40 mt-1">Real-time status by subsidiary</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex bg-[#1E1F21] rounded-2xl p-1 border border-white/5">
                    <button
                      onClick={handleTrigger}
                      disabled={triggering}
                      className="bg-[#2A2B2D] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#333436] transition-colors text-white"
                    >
                      {triggering ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Play className="w-3.5 h-3.5 text-[#D4FF3A]"/>}
                      {triggering ? "Running..." : `Trigger AI Workflow • ${workflowStateLabel}`}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stylized Bubble-like Grid for companies */}
              <div className="grid grid-cols-4 gap-4 relative z-10 mb-2">
                {companies?.map((company: any, idx: number) => {
                  const colors = ['bg-[#A070F0]', 'bg-[#FF5577]', 'bg-[#FFB03A]', 'bg-[#D4FF3A]', 'bg-[#3ABFF0]', 'bg-[#FF8A3A]', 'bg-[#8AF03A]', 'bg-[#F03AD4]'];
                  const color = colors[idx % colors.length];
                  return (
                    <Link href={`/companies/${company.id}`} key={company.id} className="relative bg-[#1A1A1C] p-5 rounded-[24px] border border-white/[0.04] hover:border-white/10 hover:bg-[#202022] transition-all flex flex-col justify-between group h-[130px] shadow-lg">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-white/90">{company.name}</h3>
                        <div className={`w-3.5 h-3.5 rounded-full ${color} shadow-[0_0_15px_${color}] opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">{company.reporting_currency} • {company.industry}</span>
                        <div className="mt-1.5 text-xs font-bold font-mono text-white/80">{(company.status || 'pending').replace('_', ' ').toUpperCase()}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* 4 Stacked Gradient Cards Matching HTML Specs */}
            <div className="grid grid-cols-4 gap-4 pt-2 pb-4">
              <GradientCard 
                title="CONSOL REVENUE" 
                value={`$${((consolidation?.total_revenue || 0) / 1000000).toFixed(1)}M`} 
                icon={<PieChart size={18} color="rgba(255,255,255,0.7)" strokeWidth={2}/>}
                trend="+12%" 
                bgStyle="linear-gradient(145deg, #2a3a6e 0%, #1a2550 40%, #0f1635 100%)" 
              />
              <GradientCard 
                title="EBITDA MARGIN" 
                value={`${consolidation?.ebitda_margin_pct?.toFixed(0) || 0}%`} 
                icon={<Flame size={18} color="rgba(255,255,255,0.7)" strokeWidth={2}/>}
                trend="+8%" 
                bgStyle="linear-gradient(145deg, #2a4a2a 0%, #1e3d2a 40%, #0f2218 100%)" 
              />
              <GradientCard 
                title="OPEN ISSUES" 
                value={consolidation?.total_issues_found || 0} 
                icon={<Flag size={18} color="rgba(255,255,255,0.7)" strokeWidth={2}/>}
                trend="-4%" 
                bgStyle="linear-gradient(145deg, #1a4a4a 0%, #143d42 40%, #0a2530 100%)" 
              />
              <GradientCard 
                title="ORCHESTRATION AGENTS" 
                value={`${agentStatus?.running_agents?.length > 0 ? agentStatus.running_agents.length : 10}`} 
                icon={<Activity size={18} color="rgba(255,255,255,0.7)" strokeWidth={2}/>}
                trend={latestRun?.status === "running" ? `LIVE • ${workflowGroupLabel.toUpperCase()}` : "STANDBY"}
                bgStyle="linear-gradient(145deg, #2a3a20 0%, #1f3420 40%, #0e1f10 100%)" 
              />
            </div>

            {/* Bottom Small Widgets */}
            <div className="grid grid-cols-3 gap-5 pb-8">
              <div className="bg-[#242529] rounded-[24px] p-5 flex justify-between items-center border border-white/[0.03] shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="text-white/40"><Hand size={20}/></div>
                  <span className="text-[13px] font-medium text-white/70">Review Items</span>
                </div>
                <span className="font-bold text-lg">{consolidation?.total_issues_found || 0}</span>
              </div>
              <div className="bg-[#242529] rounded-[24px] p-5 flex justify-between items-center border border-white/[0.03] shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="text-white/40"><Users size={20}/></div>
                  <span className="text-[13px] font-medium text-white/70">Team Members</span>
                </div>
                <span className="font-bold text-lg">24</span>
              </div>
              <div className="bg-[#242529] rounded-[24px] p-5 flex justify-between items-center border border-white/[0.03] shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="text-white/40"><Target size={20}/></div>
                  <span className="text-[13px] font-medium text-white/70">Project Progress</span>
                </div>
                <span className="text-[10px] font-bold text-black bg-[#D4FF3A] px-2.5 py-1 rounded shadow-sm">{workflowProgress}%</span>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Right Sidebar Timeline Panel */}
      <div className="w-[400px] bg-[#1C1C1E] m-4 mr-6 rounded-[40px] p-8 flex flex-col border border-white/[0.03] shadow-2xl shrink-0">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-1 bg-[#2A2B2D] p-1.5 rounded-2xl">
            <div className="w-8 h-8 rounded-xl bg-[#D4FF3A] flex items-center justify-center text-black shadow-sm"><span className="text-[10px] font-black">||</span></div>
            <div className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center cursor-pointer text-white/50"><Play size={10} fill="currentColor"/></div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/40 font-mono tracking-widest text-[10px]">&lt; &gt;</span>
            <span className="font-medium mr-2 text-white/90 text-sm">Today, {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
            <div className="relative">
              <Bell size={18} className="text-white/50"/>
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#FF5577] border-2 border-[#1C1C1E]"></div>
            </div>
            <MoreVertical size={18} className="text-white/30 ml-1"/>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {/* Agent Activity wrapper to mimic dark timeline look */}
          <div className="agent-timeline-wrapper relative">
            <AgentActivityFeed />
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">Recent Workflow Runs</h4>
            </div>
            <div className="space-y-2">
              {workflowRuns?.length ? workflowRuns.map((run: any) => (
                <div key={run.id} className="flex items-center justify-between rounded-xl bg-[#242529] border border-white/5 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-white/80 font-mono">RUN #{run.id} • {run.period}</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-wider">{String(run.current_group || "queued").replace(/_/g, " ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-white/70 uppercase font-bold">{String(run.status || "pending")}</p>
                    <p className="text-[9px] text-[#D4FF3A] font-mono">{Math.round(Number(run.progress_pct || 0))}%</p>
                  </div>
                </div>
              )) : (
                <p className="text-[10px] text-white/30 uppercase tracking-wider">No workflow runs yet.</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-white/5 flex justify-end">
          <button className="w-14 h-14 rounded-full bg-[#D4FF3A] text-black flex items-center justify-center hover:bg-white transition-all shadow-[0_0_30px_rgba(212,255,58,0.2)] ml-auto hover:scale-105 active:scale-95">
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
