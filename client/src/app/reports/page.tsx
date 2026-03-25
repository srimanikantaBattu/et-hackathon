"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchConsolidation } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Download, Mail, Loader2, Target } from "lucide-react";
import { format } from "date-fns";

export default function ReportsPage() {
  const { data: consolidation, isLoading } = useQuery({ 
    queryKey: ["consolidation"], 
    queryFn: () => fetchConsolidation("2026-01") 
  });

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financial Reports</h2>
          <p className="text-muted-foreground mt-1">Consolidated packages and auditor exports.</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-muted h-9 px-4 py-2">
            <Mail className="mr-2 h-4 w-4" /> Email Partners
          </button>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><FileText size={20} className="text-primary" /> Month-End Close Summary</CardTitle>
                  <CardDescription className="mt-1">Generated autonomously by Reporting Agent on {format(new Date(), "MMMM d, yyyy")}</CardDescription>
                </div>
                <div className="px-3 py-1 bg-primary/10 text-primary uppercase text-xs font-bold rounded">
                  Internal Draft
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 prose prose-slate dark:prose-invert max-w-none">
              {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b">
                    <div>
                      <div className="text-sm text-muted-foreground uppercase tracking-wider">Revenue</div>
                      <div className="text-2xl font-bold">${consolidation?.total_revenue?.toLocaleString() || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground uppercase tracking-wider">EBITDA</div>
                      <div className="text-2xl font-bold">${consolidation?.ebitda?.toLocaleString() || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground uppercase tracking-wider">Gross Profit</div>
                      <div className="text-2xl font-bold">${consolidation?.gross_profit?.toLocaleString() || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground uppercase tracking-wider">Net Income</div>
                      <div className="text-2xl font-bold">${consolidation?.net_income?.toLocaleString() || 0}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2"><Target size={18}/> Executive Commentary</h3>
                    <p className="mt-4 text-muted-foreground leading-relaxed">
                      The portfolio exhibited strong performance for the period 2026-01. Total consolidated gross margin stood at {consolidation?.gross_margin_pct?.toFixed(1) || 0}%, 
                      with EBITDA margins at {consolidation?.ebitda_margin_pct?.toFixed(1) || 0}%. Intercompany eliminations were fully reconciled by the autonomous agent with $0 in out-of-balance transactions.
                    </p>
                    <p className="mt-4 text-muted-foreground leading-relaxed">
                      All {consolidation?.portfolio_companies || 0} subsidiary entities successfully closed their books. The Variance Analysis agent flagged 14 accounts for manual review where deviations exceeded the 10% threshold, primarily driven by seasonal payroll accruals and SaaS software capitalization changes.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Downloads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <a href="#" className="flex items-center justify-between p-3 rounded-md border hover:bg-muted transition-colors group">
                <div className="flex items-center gap-3">
                  <FileText className="text-blue-500" size={20} />
                  <div>
                    <p className="text-sm font-medium leading-none">Complete Financials</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF &bull; 2.4 MB</p>
                  </div>
                </div>
                <Download size={16} className="text-muted-foreground group-hover:text-foreground" />
              </a>
              <a href="#" className="flex items-center justify-between p-3 rounded-md border hover:bg-muted transition-colors group">
                <div className="flex items-center gap-3">
                  <FileText className="text-green-500" size={20} />
                  <div>
                    <p className="text-sm font-medium leading-none">Intercompany Matrix</p>
                    <p className="text-xs text-muted-foreground mt-1">Excel &bull; 45 KB</p>
                  </div>
                </div>
                <Download size={16} className="text-muted-foreground group-hover:text-foreground" />
              </a>
              <a href="#" className="flex items-center justify-between p-3 rounded-md border hover:bg-muted transition-colors group">
                <div className="flex items-center gap-3">
                  <FileText className="text-orange-500" size={20} />
                  <div>
                    <p className="text-sm font-medium leading-none">Audit Trail Log</p>
                    <p className="text-xs text-muted-foreground mt-1">CSV &bull; 1.1 MB</p>
                  </div>
                </div>
                <Download size={16} className="text-muted-foreground group-hover:text-foreground" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
