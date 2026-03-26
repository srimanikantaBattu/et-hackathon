"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const [emailRecipients, setEmailRecipients] = useState("cfo@company.com, controller@company.com");
  const [variancePct, setVariancePct] = useState("10");
  const [varianceAmount, setVarianceAmount] = useState("5000");
  const [scheduleCron, setScheduleCron] = useState("0 8 1 * *");
  const [activeCompanies, setActiveCompanies] = useState("dataanalytics_corp, ecopackaging_ltd, logisticspro");

  return (
    <div className="flex-1 space-y-8 p-10 overflow-y-auto custom-scrollbar bg-[#18181A] text-white">
      <div className="border-b border-white/5 pb-6">
        <h2 className="text-[2.5rem] font-semibold tracking-tight leading-none text-white">Settings</h2>
        <p className="text-[12px] font-bold text-white/40 uppercase tracking-[0.2em] mt-4">
          Configuration controls for notifications, thresholds, scheduling, and company scope.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1C1C1E] border-white/[0.04] rounded-[24px] shadow-xl">
          <CardHeader>
            <CardTitle className="text-white/90">Email Preferences</CardTitle>
            <CardDescription className="text-white/40">Recipients for report and alert notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              value={emailRecipients}
              onChange={(e) => setEmailRecipients(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-[#242529] px-3 py-2.5 text-xs text-white/80 placeholder:text-white/35 outline-none focus:border-[#3ABFF0]/60"
            />
          </CardContent>
        </Card>

        <Card className="bg-[#1C1C1E] border-white/[0.04] rounded-[24px] shadow-xl">
          <CardHeader>
            <CardTitle className="text-white/90">Variance Thresholds</CardTitle>
            <CardDescription className="text-white/40">Materiality limits used for variance detection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-2">Percent Threshold (%)</label>
              <input
                value={variancePct}
                onChange={(e) => setVariancePct(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#242529] px-3 py-2.5 text-xs text-white/80 outline-none focus:border-[#3ABFF0]/60"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-2">Amount Threshold ($)</label>
              <input
                value={varianceAmount}
                onChange={(e) => setVarianceAmount(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#242529] px-3 py-2.5 text-xs text-white/80 outline-none focus:border-[#3ABFF0]/60"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1C1C1E] border-white/[0.04] rounded-[24px] shadow-xl">
          <CardHeader>
            <CardTitle className="text-white/90">Scheduling</CardTitle>
            <CardDescription className="text-white/40">Workflow run schedule (cron expression)</CardDescription>
          </CardHeader>
          <CardContent>
            <input
              value={scheduleCron}
              onChange={(e) => setScheduleCron(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#242529] px-3 py-2.5 text-xs text-white/80 outline-none focus:border-[#3ABFF0]/60"
            />
          </CardContent>
        </Card>

        <Card className="bg-[#1C1C1E] border-white/[0.04] rounded-[24px] shadow-xl">
          <CardHeader>
            <CardTitle className="text-white/90">Company Master Data</CardTitle>
            <CardDescription className="text-white/40">Companies included in active close cycles</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              value={activeCompanies}
              onChange={(e) => setActiveCompanies(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-[#242529] px-3 py-2.5 text-xs text-white/80 placeholder:text-white/35 outline-none focus:border-[#3ABFF0]/60"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
