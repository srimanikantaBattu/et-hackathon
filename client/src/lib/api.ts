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

export async function fetchAgentStatus() {
  const res = await fetch(`${API_BASE_URL}/agents/status`);
  if (!res.ok) throw new Error("Failed to fetch agent status");
  return res.json();
}

export async function fetchAgentLogs(companyId?: string, limit = 100) {
  const url = companyId 
    ? `${API_BASE_URL}/agents/logs?company_id=${companyId}&limit=${limit}`
    : `${API_BASE_URL}/agents/logs?limit=${limit}`;
  const res = await fetch(url);
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
