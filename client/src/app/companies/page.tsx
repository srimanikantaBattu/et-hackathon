"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCompanies } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CompaniesPage() {
  const { data: companies, isLoading } = useQuery({ 
    queryKey: ["companies"], 
    queryFn: fetchCompanies 
  });

  return (
    <div className="flex-1 space-y-6 p-8 overflow-y-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Portfolio Close</h2>
        <p className="text-muted-foreground mt-1">Manage month-end close progress across all 8 subsidiary companies.</p>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {companies?.map((company: any) => (
            <Link href={`/companies/${company.id}`} key={company.id}>
              <Card className="hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group h-full flex flex-col">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="pb-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">{company.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">{company.industry}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  <div className="mb-4">
                    <Badge 
                      variant={company.status === 'completed' ? 'success' : company.status === 'error' ? 'destructive' : company.status === 'in_progress' ? 'warning' : 'secondary'}
                    >
                      {company.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-4 border-t">
                    <span className="text-muted-foreground">{company.country}</span>
                    <span className="font-medium text-xs bg-muted px-2 py-1 rounded">{company.reporting_currency}</span>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View Financials <ArrowRight size={14} className="ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
