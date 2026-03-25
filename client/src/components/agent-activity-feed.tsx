"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/api";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

type AgentEvent = {
  id: number;
  agent_name: string;
  company_id: string | null;
  action: string;
  details?: string;
  severity: "info" | "warning" | "error" | "success";
  created_at: string;
};

export function AgentActivityFeed() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial historical logs so it's not empty on refresh
    fetch("http://127.0.0.1:8000/api/agents/logs?limit=50")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch logs:", err);
        setLoading(false);
      });

    // 2. Listen for real-time updates
    const socket = getSocket();
    socket.on("agent_update", (data: AgentEvent) => {
      setEvents((prev) => [data, ...prev].slice(0, 50));
    });

    return () => {
      socket.off("agent_update");
    };
  }, []);

  if (loading) {
    return <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#D4FF3A]" /></div>;
  }

  return (
    <div className="w-full flex-1 flex flex-col pt-2">
      {/* Sleek Live Indicator */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
        <h3 className="text-sm font-semibold tracking-wider text-white/50 uppercase">Live Output</h3>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4FF3A] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4FF3A]"></span>
          </span>
          <span className="text-[10px] uppercase font-bold text-[#D4FF3A] tracking-wider">Listening</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6 text-xs font-mono text-white/30 uppercase tracking-widest">
            Awaiting Output...
          </div>
        ) : (
          <ul className="space-y-4">
            {events.map((evt, i) => (
              <li key={i} className="relative pl-6 pb-2 group">
                {/* Timeline vertical line & dot */}
                <div className="absolute left-0 top-1.5 bottom-[-16px] w-[1px] bg-white/10 group-last:bg-transparent"></div>
                <div className={`absolute left-[-3.5px] top-1.5 w-2 h-2 rounded-full border border-[#1C1C1E] shadow-sm ${evt.severity === 'warning' ? 'bg-[#FFB03A]' : evt.severity === 'error' ? 'bg-[#FF5577]' : 'bg-[#3ABFF0]'}`}></div>

                {/* Content */}
                <div className="bg-[#242529] rounded-[16px] p-4 border border-white/[0.04] transition-colors hover:border-white/10 shadow-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-white/80">
                      {evt.agent_name.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] font-mono text-white/30">{format(new Date(evt.created_at), "HH:mm:ss")}</span>
                  </div>
                  
                  
                  <div className="text-sm text-white/70 leading-relaxed mb-3">{evt.action}</div>
                  
                  {evt.details && (
                    <div className="text-[11px] text-white/50 leading-relaxed mb-4 whitespace-pre-wrap font-mono p-3 bg-black/40 rounded-lg border border-white/5 max-h-[300px] overflow-y-auto custom-scrollbar shadow-inner">
                      {evt.details}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-auto">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${evt.severity === 'warning' ? 'bg-[#FFB03A]/10 text-[#FFB03A]' : evt.severity === 'error' ? 'bg-[#FF5577]/10 text-[#FF5577]' : 'bg-[#3ABFF0]/10 text-[#3ABFF0]'}`}>
                      {evt.severity}
                    </span>
                    {evt.company_id && (
                      <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-white/5 text-white/50 border border-white/10">
                        {evt.company_id}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
