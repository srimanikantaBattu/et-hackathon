"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAgentLogs } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Server, Filter } from "lucide-react";

export default function AgentsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["agentLogs", "all"],
    queryFn: () => fetchAgentLogs(undefined, 200),
    refetchInterval: 5000, // Poll every 5s on this page as ultimate backup
  });

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Agent Activity Log</h2>
        <p className="text-muted-foreground mt-1">Comprehensive audit trail of all autonomous actions.</p>
      </div>

      <Card className="h-[calc(100vh-200px)] flex flex-col">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Server size={18} /> System Audit Trail</CardTitle>
              <CardDescription>Last 200 recorded events</CardDescription>
            </div>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
              <Filter className="mr-2 h-4 w-4" /> Filter Logs
            </button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 font-semibold">Timestamp</th>
                  <th className="px-6 py-3 font-semibold">Agent</th>
                  <th className="px-6 py-3 font-semibold">Severity</th>
                  <th className="px-6 py-3 font-semibold">Target Company</th>
                  <th className="px-6 py-3 font-semibold">Action / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y relative">
                {logs?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-primary">
                      {log.agent_name.replace(/_/g, " ").replace(/\b\w/g, (l:string) => l.toUpperCase())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={log.severity === "error" ? "destructive" : log.severity === "warning" ? "warning" : log.severity === "success" ? "success" : "secondary"}>
                        {log.severity}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {log.company_id || <span className="text-muted-foreground/50">System-wide</span>}
                    </td>
                    <td className="px-6 py-4 min-w-[400px]">
                      <div className="font-medium mb-1">{log.action}</div>
                      {log.details && <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded max-h-24 overflow-y-auto">{log.details}</div>}
                    </td>
                  </tr>
                ))}
                {(!logs || logs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No agent activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
