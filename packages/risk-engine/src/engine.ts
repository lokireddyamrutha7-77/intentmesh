import {
  EligibilityResult,
  Intent,
  SolverCapabilities,
  SolverProfile,
} from "@intentmesh/protocol-types";
import { evaluateEligibility } from "@intentmesh/solver-sdk";
import {
  ExecutionRecord,
  RiskAssessmentFactors,
  RiskAssessmentResult,
  RiskEngineConfig,
  RiskLevel,
} from "./types";

export const DEFAULT_RISK_CONFIG: RiskEngineConfig = {
  minSampleThreshold: 5,
  lookbackPrimaryDays: 14,
  lookbackFallbackDays: 90,
  weights: {
    reliability: 0.3,
    successRate: 0.25,
    timeoutRate: 0.2,
    latency: 0.15,
    coverage: 0.1,
  },
};

export class DeterministicRiskEngine {
  private readonly config: RiskEngineConfig;

  constructor(config: Partial<RiskEngineConfig> = {}) {
    this.config = {
      ...DEFAULT_RISK_CONFIG,
      ...config,
      weights: {
        ...DEFAULT_RISK_CONFIG.weights,
        ...(config.weights || {}),
      },
    };
  }

  public evaluateRisk(
    solverAddress: string,
    intent: Intent,
    profile: SolverProfile,
    capabilities: SolverCapabilities,
    availableBond: bigint,
    availableCapacity: bigint,
    executionHistory: ExecutionRecord[],
    currentTimestampSeconds: number = Math.floor(Date.now() / 1000)
  ): RiskAssessmentResult {
    const disqualificationReasons: string[] = [];

    // 1. Evaluate Structural Eligibility & Hard Safety Rules
    const eligibility: EligibilityResult = evaluateEligibility(
      intent,
      profile,
      capabilities,
      BigInt(currentTimestampSeconds)
    );

    if (!eligibility.eligible) {
      disqualificationReasons.push(...eligibility.reasons);
    }

    if (availableCapacity < intent.sourceAmount) {
      disqualificationReasons.push("INSUFFICIENT_CAPACITY");
    }

    const minBondRequired = 1000n; // Standard minimum bond threshold
    if (availableBond < minBondRequired) {
      disqualificationReasons.push("INSUFFICIENT_BOND");
    }

    const hardSafetyPass = disqualificationReasons.length === 0;

    // 2. Deterministic Historical Data Selection (14-day primary -> 90-day fallback)
    const sec14Days = 14 * 86400;
    const sec90Days = 90 * 86400;

    const cutoff14Days = currentTimestampSeconds - sec14Days;
    const records14Days = executionHistory.filter((r) => r.timestamp >= cutoff14Days);

    let selectedRecords = records14Days;
    let lookbackDays = 14;

    if (records14Days.length < this.config.minSampleThreshold) {
      const cutoff90Days = currentTimestampSeconds - sec90Days;
      selectedRecords = executionHistory.filter((r) => r.timestamp >= cutoff90Days);
      lookbackDays = 90;
    }

    const sampleCount = selectedRecords.length;
    const evidenceSufficient = sampleCount >= this.config.minSampleThreshold;

    // 3. If Hard Safety Rules Fail -> Return CRITICAL risk level immediately
    if (!hardSafetyPass) {
      return {
        solverAddress,
        riskScore: 0,
        riskLevel: "CRITICAL",
        hardSafetyPass: false,
        disqualificationReasons,
        factors: {
          reliabilityScore: 0,
          successRateScore: 0,
          timeoutRateScore: 0,
          latencyScore: 0,
          coverageScore: 0,
        },
        lookbackDays,
        sampleCount,
        evidenceSufficient,
        advisoryNote: "Disqualified by Hard Safety Rules. AI non-authoritative advisory.",
      };
    }

    // 4. Calculate Factor Scores Deterministically
    let successfulFills = 0;
    let failedFills = 0;
    let timeouts = 0;
    let totalLatencySeconds = 0;

    for (const rec of selectedRecords) {
      if (rec.success) successfulFills++;
      if (rec.timeout) timeouts++;
      if (!rec.success && !rec.timeout) failedFills++;
      totalLatencySeconds += rec.latencySeconds;
    }

    const totalFills = sampleCount;

    // Reliability Score (0-100)
    const reliabilityScore = totalFills > 0 ? Math.round((successfulFills / totalFills) * 100) : 70; // Baseline 70 if cold start

    // Success Rate Score (0-100)
    const successRateScore = totalFills > 0 ? Math.round((successfulFills / totalFills) * 100) : 70;

    // Timeout Rate Score (0-100, 100 = 0 timeouts)
    const timeoutRateScore = totalFills > 0 ? Math.max(0, Math.round(100 - (timeouts / totalFills) * 100)) : 80;

    // Latency Score (0-100, < 30s = 100, > 180s = 0)
    const avgLatency = totalFills > 0 ? totalLatencySeconds / totalFills : 60;
    const latencyScore = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, avgLatency - 30) * 0.6)));

    // Coverage Score (0-100)
    const capacityRatio = Number(availableCapacity) / Number(intent.sourceAmount || 1n);
    const coverageScore = Math.min(100, Math.round(capacityRatio * 50 + 50));

    const factors: RiskAssessmentFactors = {
      reliabilityScore,
      successRateScore,
      timeoutRateScore,
      latencyScore,
      coverageScore,
    };

    // 5. Composite Weighted Numerical Risk Score
    const { weights } = this.config;
    const rawScore =
      factors.reliabilityScore * weights.reliability +
      factors.successRateScore * weights.successRate +
      factors.timeoutRateScore * weights.timeoutRate +
      factors.latencyScore * weights.latency +
      factors.coverageScore * weights.coverage;

    const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // 6. Map Risk Level
    let riskLevel: RiskLevel = "LOW";
    if (riskScore < 40) riskLevel = "CRITICAL";
    else if (riskScore < 60) riskLevel = "HIGH";
    else if (riskScore < 80) riskLevel = "MEDIUM";
    else riskLevel = "LOW";

    const hasDemoData = selectedRecords.some((r) => r.demoSimulated);
    const advisoryNote = hasDemoData
      ? `Deterministic evaluation based on ${lookbackDays}-day window. Includes DEMO / SIMULATED HISTORY. AI non-authoritative advisory.`
      : `Deterministic evaluation based on ${lookbackDays}-day window (${sampleCount} records). AI non-authoritative advisory.`;

    return {
      solverAddress,
      riskScore,
      riskLevel,
      hardSafetyPass: true,
      disqualificationReasons: [],
      factors,
      lookbackDays,
      sampleCount,
      evidenceSufficient,
      advisoryNote,
    };
  }
}
