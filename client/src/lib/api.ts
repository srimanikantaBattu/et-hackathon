import { io, Socket } from "socket.io-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8000";

// --- REST API Client ---

export async function fetchCompanies() {
  const res = await fetch(`${API_BASE_URL}/companies`);
  if (!res.ok) throw new Error("Failed to fetch companies");
  return res.json();
}

export async function fetchCompanyFinancials(id: string, period = "2026-01") {
  const res = await fetch(`${API_BASE_URL}/companies/${id}/financials?period=${period}`);
  if (!res.ok) throw new Error("Failed to fetch financials");
  return res.json();
}

export async function fetchConsolidation(period = "2026-01") {
  const res = await fetch(`${API_BASE_URL}/consolidation?period=${period}`);
  if (!res.ok) throw new Error("Failed to fetch consolidation");
  return res.json();
}

export async function fetchReportsSummary(period = "2026-01", runId?: number) {
  const runQuery = runId ? `&run_id=${runId}` : "";
  const res = await fetch(`${API_BASE_URL}/reports/summary?period=${period}${runQuery}`);
  if (!res.ok) throw new Error("Failed to fetch reports summary");
  return res.json();
}

export async function triggerReportsEmail(period = "2026-01", runId?: number) {
  const runQuery = runId ? `&run_id=${runId}` : "";
  const res = await fetch(`${API_BASE_URL}/reports/email?period=${period}${runQuery}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to send reports email");
  return res.json();
}

export function buildReportDownloadUrl(path: string, params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).length > 0) {
        query.set(key, String(value));
      }
    });
  }
  const queryString = query.toString();
  return `${API_BASE_URL}/reports/download/${path}${queryString ? `?${queryString}` : ""}`;
}

export async function fetchAgentStatus() {
  const res = await fetch(`${API_BASE_URL}/agents/status`);
  if (!res.ok) throw new Error("Failed to fetch agent status");
  return res.json();
}

export async function fetchWorkflowStatus() {
  const res = await fetch(`${API_BASE_URL}/workflow/status`);
  if (!res.ok) throw new Error("Failed to fetch workflow status");
  return res.json();
}

export async function fetchWorkflowRuns(limit = 10) {
  const res = await fetch(`${API_BASE_URL}/workflow/runs?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch workflow runs");
  return res.json();
}

export async function fetchWorkflowGroupOutputs(runId?: number) {
  const runIdQuery = runId ? `?run_id=${runId}` : "";
  const res = await fetch(`${API_BASE_URL}/workflow/group34${runIdQuery}`);
  if (!res.ok) throw new Error("Failed to fetch Group 3/4 workflow outputs");
  return res.json();
}

export async function fetchCompanyWorkflowHandoffs(companyId: string, runId?: number) {
  const runIdQuery = runId ? `?run_id=${runId}` : "";
  const res = await fetch(`${API_BASE_URL}/workflow/handoffs/${companyId}${runIdQuery}`);
  if (!res.ok) throw new Error("Failed to fetch workflow handoffs");
  return res.json();
}

export async function fetchAgentLogs(
  companyId?: string,
  limit = 100,
  filters?: { agentName?: string; severity?: string }
) {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  if (companyId) query.set("company_id", companyId);
  if (filters?.agentName) query.set("agent_name", filters.agentName);
  if (filters?.severity) query.set("severity", filters.severity);

  const res = await fetch(`${API_BASE_URL}/agents/logs?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch agent logs");
  return res.json();
}

export async function triggerWorkflow(period = "2026-01") {
  const res = await fetch(`${API_BASE_URL}/workflow/trigger?period=${period}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to trigger workflow");
  return res.json();
}

// --- WebSocket Client ---

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    
    socket.on("connect", () => {
      console.log("WebSocket connected to AgentOS feed");
    });
    
    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });
  }
  return socket;
}
