"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type AgentEvent = {
  id: number;
  agent_name: string;
  company_id: string | null;
  action: string;
  severity: "info" | "warning" | "error" | "success";
  created_at: string;
};

export function AgentActivityFeed() {
  const [events, setEvents] = useState<AgentEvent[]>([]);

  useEffect(() => {
    const socket = getSocket();

    socket.on("agent_update", (data: AgentEvent) => {
      setEvents((prev) => [data, ...prev].slice(0, 50)); // Keep last 50
    });

    return () => {
      socket.off("agent_update");
    };
  }, []);

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Live Agent Activity</CardTitle>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-muted-foreground mr-1">Listening</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6 text-sm text-muted-foreground">
            Awaiting agent actions...
          </div>
        ) : (
          <ul className="divide-y text-sm">
            {events.map((evt, i) => (
              <li key={i} className="p-3 hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-primary">{evt.agent_name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(evt.created_at), "HH:mm:ss")}</span>
                </div>
                <div className="text-muted-foreground break-words">{evt.action}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={evt.severity === "error" ? "destructive" : evt.severity === "warning" ? "warning" : evt.severity === "success" ? "success" : "secondary"}>
                    {evt.severity}
                  </Badge>
                  {evt.company_id && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded border">{evt.company_id}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
