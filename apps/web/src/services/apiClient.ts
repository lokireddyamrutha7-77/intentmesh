import {
  AuctionRecord,
  DemoResponse,
  ExecutionRecord,
  HealthStatus,
  IntentRecord,
  ProtocolEventLog,
  RiskAssessmentRecord,
  SolverRecord,
} from "../types";

const API_BASE_URL = typeof window !== "undefined" && (window as any).INTENTMESH_API_URL
  ? (window as any).INTENTMESH_API_URL
  : "http://localhost:3001";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.error?.message) {
        errorMsg = errJson.error.message;
      }
    } catch {
      // Fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const apiClient = {
  getHealth: () => request<HealthStatus>("/api/health"),
  getIntents: () => request<{ intents: IntentRecord[]; count: number }>("/api/intents"),
  getIntent: (intentHash: string) => request<{ intent: IntentRecord; state: number; escrowStatus: string }>(`/api/intents/${intentHash}`),
  createIntent: (payload: any) => request<{ intentHash: string; intent: IntentRecord; state: number; unsignedTx: any }>("/api/intents", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  getSolvers: () => request<{ solvers: SolverRecord[]; count: number }>("/api/solvers"),
  getSolver: (address: string) => request<{ solver: any; capabilities: any; bondEth: string; capacityUsdc: string }>(`/api/solvers/${address}`),
  getAuctions: () => request<{ auctions: AuctionRecord[]; count: number }>("/api/auctions"),
  getAuction: (auctionId: string) => request<{ auction: AuctionRecord }>(`/api/auctions/${auctionId}`),
  createAuction: (intentHash: string) => request<{ auction: AuctionRecord }>("/api/auctions", {
    method: "POST",
    body: JSON.stringify({ intentHash }),
  }),
  getRisk: (address: string) => request<RiskAssessmentRecord>(`/api/risk/${address}`),
  getExecution: (executionId: string) => request<{ execution: ExecutionRecord }>(`/api/executions/${executionId}`),
  getEvents: () => request<{ events: ProtocolEventLog[]; count: number }>("/api/events"),
  runGoldenPathDemo: () => request<DemoResponse>("/api/demo/golden-path", { method: "POST" }),
  runFailureRecoveryDemo: () => request<DemoResponse>("/api/demo/failure-recovery", { method: "POST" }),
  runRefundDemo: () => request<DemoResponse>("/api/demo/refund", { method: "POST" }),

  subscribeToEvents: (onEvent: (event: ProtocolEventLog) => void): (() => void) => {
    try {
      const eventSource = new EventSource(`${API_BASE_URL}/api/events`);
      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.type !== "CONNECTED") {
            onEvent(parsed);
          }
        } catch {
          // Fallback
        }
      };
      return () => eventSource.close();
    } catch {
      return () => {};
    }
  },
};
