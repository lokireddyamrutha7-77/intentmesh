import { Intent, SolverProfile } from "@intentmesh/protocol-types";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ExecutionRecord {
  intentHash: string;
  solver: string;
  timestamp: number;
  success: boolean;
  timeout: boolean;
  latencySeconds: number;
  sourceAmount: bigint;
  outputAmount: bigint;
  demoSimulated?: boolean;
}

export interface RiskAssessmentFactors {
  reliabilityScore: number;  // 0 - 100
  successRateScore: number;  // 0 - 100
  timeoutRateScore: number;  // 0 - 100
  latencyScore: number;      // 0 - 100
  coverageScore: number;     // 0 - 100
}

export interface RiskAssessmentResult {
  solverAddress: string;
  riskScore: number; // 0 - 100 (deterministic)
  riskLevel: RiskLevel;
  hardSafetyPass: boolean;
  disqualificationReasons: string[];
  factors: RiskAssessmentFactors;
  lookbackDays: number; // 14 or 90
  sampleCount: number;
  evidenceSufficient: boolean;
  advisoryNote: string;
}

export interface RiskEngineConfig {
  minSampleThreshold: number; // default: 5
  lookbackPrimaryDays: number; // default: 14
  lookbackFallbackDays: number; // default: 90
  weights: {
    reliability: number;   // 0.30
    successRate: number;   // 0.25
    timeoutRate: number;   // 0.20
    latency: number;       // 0.15
    coverage: number;      // 0.10
  };
}
