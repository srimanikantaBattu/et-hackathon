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
  const companyId = unwrappedParams.id;
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["company", companyId, "financials"],
    queryFn: () => fetchCompanyFinancials(companyId, "2026-01")
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error || !data || !data.company) return <div className="p-8 text-destructive">Failed to load company data.</div>;

  const { company, trial_balance, variances, alerts } = data;

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto">
      <div className="flex items-center gap-4">
        <Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-muted text-muted-foreground"><ArrowLeft size={16} /></Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{company.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{company.industry}</Badge>
            <Badge variant="outline">{company.reporting_currency}</Badge>
            <Badge variant={company.status === 'completed' ? 'success' : company.status === 'in_progress' ? 'warning' : 'secondary'}>
              {company.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
          <Tabs defaultValue="variances" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="variances">Variance Analysis</TabsTrigger>
              <TabsTrigger value="tb">Trial Balance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="variances" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Variance Analysis</CardTitle>
                  <CardDescription>Accounts flagged by the Agentic variance engine.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground text-xs uppercase">
                        <tr>
                          <th className="px-4 py-3 rounded-tl-md">Account</th>
                          <th className="px-4 py-3 text-right">Actual</th>
                          <th className="px-4 py-3 text-right">Budget</th>
                          <th className="px-4 py-3 text-right">Variance $</th>
                          <th className="px-4 py-3 text-right">%</th>
                          <th className="px-4 py-3 rounded-tr-md">AI Insights</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!variances?.length && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No significant variances identified.</td></tr>
                        )}
                        {variances?.map((v: any, i: number) => (
                          <tr key={i} className="border-b last:border-b-0 hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium">{v.account_name} <span className="text-xs text-muted-foreground block">{v.account_code}</span></td>
                            <td className="px-4 py-3 text-right">${v.actual_amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">${v.budget_amount.toLocaleString()}</td>
                            <td className={`px-4 py-3 text-right font-medium ${v.variance_amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                              ${v.variance_amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">{v.variance_pct.toFixed(1)}%</td>
                            <td className="px-4 py-3 min-w-[300px] text-muted-foreground text-xs">{v.ai_commentary || "Pending AI review..."}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="tb" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trial Balance 2026-01</CardTitle>
                  <CardDescription>Raw ending balances</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-[600px] relative">
                    <table className="w-full text-sm text-left relative">
                      <thead className="bg-muted text-muted-foreground text-xs uppercase sticky top-0">
                        <tr>
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Account</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3 text-right">Debit</th>
                          <th className="px-4 py-3 text-right">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trial_balance?.map((tb: any, i: number) => (
                          <tr key={i} className="border-b last:border-b-0 hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium">{tb.account_code}</td>
                            <td className="px-4 py-3">{tb.account_name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{tb.account_type}</td>
                            <td className="px-4 py-3 text-right">{tb.debit > 0 ? `$${tb.debit.toLocaleString()}` : '-'}</td>
                            <td className="px-4 py-3 text-right">{tb.credit > 0 ? `$${tb.credit.toLocaleString()}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-destructive flex items-center gap-2 text-base">
                <AlertTriangle size={18} /> Open Issues ({alerts?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active alerts for this company.</p>
              ) : (
                <ul className="space-y-4">
                  {alerts?.map((alert: any) => (
                    <li key={alert.id} className="text-sm border-b border-destructive/10 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{alert.severity}</Badge>
                        <span className="text-[10px] text-muted-foreground">{alert.agent_source}</span>
                      </div>
                      <p className="font-medium text-destructive">{alert.alert_type.replace(/_/g, " ")}</p>
                      <p className="text-muted-foreground text-xs mt-1">{alert.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
