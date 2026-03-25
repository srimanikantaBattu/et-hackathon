"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCompanies, fetchConsolidation, fetchAgentStatus, triggerWorkflow } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentActivityFeed } from "@/components/agent-activity-feed";
import { DollarSign, BarChart3, Wallet, Users, Play, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function Dashboard() {
  const { data: companies, isLoading: loadingComps } = useQuery<any>({ queryKey: ["companies"], queryFn: fetchCompanies });
  const { data: consolidation, isLoading: loadingConsol } = useQuery<any>({ queryKey: ["consolidation"], queryFn: () => fetchConsolidation() });
  const { data: agentStatus } = useQuery<any>({ queryKey: ["agentStatus"], queryFn: fetchAgentStatus, refetchInterval: 3000 });
  const [triggering, setTriggering] = useState(false);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await triggerWorkflow();
    } finally {
      setTimeout(() => setTriggering(false), 2000);
    }
  };

  const metrics = [
    { title: "Consolidated Revenue", value: `$${(consolidation?.total_revenue || 0).toLocaleString()}`, icon: DollarSign, trend: "+12%" },
    { title: "EBITDA Margin", value: `${consolidation?.ebitda_margin_pct?.toFixed(1) || 0}%`, icon: BarChart3, trend: "+2.1%" },
    { title: "Cash Position", value: `$${(consolidation?.total_cash || 0).toLocaleString()}`, icon: Wallet, trend: "-4%" },
    { title: "Active Agents", value: agentStatus?.running_agents?.length || 0, icon: Users, subtext: `${agentStatus?.total_tasks_completed || 0} tasks done` }
  ];

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Executive Dashboard</h2>
          <p className="text-muted-foreground mt-1">Month-End Close Platform &bull; Period: 2026-01</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleTrigger}
            disabled={triggering || (agentStatus?.is_running)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
          >
            {triggering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Trigger Workflow
          </button>
        </div>
      </div>

      {loadingConsol || loadingComps ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Top Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                  <metric.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center">
                    {metric.trend && (
                      <span className={metric.trend.startsWith('+') ? 'text-green-500 flex items-center' : 'text-red-500 flex items-center'}>
                        {metric.trend.startsWith('+') ? <ArrowUpRight className="h-3 w-3 mr-1"/> : <ArrowDownRight className="h-3 w-3 mr-1"/>}
                        {metric.trend}
                      </span>
                    )}
                    {metric.subtext && <span>{metric.subtext}</span>}
                    {!metric.subtext && <span className="ml-2">vs prior period</span>}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-7">
            {/* Portfolio Grid */}
            <Card className="md:col-span-4 lg:col-span-5 h-[500px] flex flex-col">
              <CardHeader>
                <CardTitle>Portfolio Status</CardTitle>
                <CardDescription>Real-time month-end close progress by subsidiary.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pr-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  {companies?.map((company: any) => (
                    <Link href={`/companies/${company.id}`} key={company.id}>
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                        <CardHeader className="pb-2 flex flex-row items-start justify-between">
                          <div>
                            <CardTitle className="text-base group-hover:text-primary transition-colors">{company.name}</CardTitle>
                            <CardDescription className="text-xs mt-1 mr-2 line-clamp-1">{company.industry}</CardDescription>
                          </div>
                          <Badge 
                            variant={company.status === 'completed' ? 'success' : company.status === 'error' ? 'destructive' : company.status === 'in_progress' ? 'warning' : 'secondary'}
                          >
                            {(company.status || '').replace('_', ' ')}
                          </Badge>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <div className="flex justify-between items-end text-sm">
                            <span className="text-muted-foreground">{company.country}</span>
                            <span className="font-medium">{company.reporting_currency}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Agent Feed */}
            <div className="md:col-span-3 lg:col-span-2">
              <AgentActivityFeed />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
