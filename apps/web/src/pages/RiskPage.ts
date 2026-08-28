import { apiClient } from "../services/apiClient";
import { RiskAssessmentRecord } from "../types";

export async function renderRiskPage(solverAddrParam?: string): Promise<string> {
  const solverAddr = solverAddrParam || "0xsolver_a_reliable";
  let assessment: RiskAssessmentRecord["assessment"] | null = null;
  let errorMsg = "";

  try {
    const res = await apiClient.getRisk(solverAddr);
    assessment = res.assessment;
  } catch (err: any) {
    errorMsg = err.message || "Failed to fetch risk assessment.";
  }

  if (errorMsg || !assessment) {
    return `<div class="page-container"><div class="card-section" style="border-color: var(--status-danger);">Error evaluating risk for solver ${solverAddr}: ${errorMsg}</div></div>`;
  }

  const isLow = assessment.riskLevel === "LOW";
  const isMed = assessment.riskLevel === "MEDIUM";
  const isHigh = assessment.riskLevel === "HIGH";

  return `
    <div class="page-container">
      <div class="page-title-group">
        <h1 class="page-title">Deterministic Solver Risk Engine</h1>
        <p class="page-subtitle">Inspect quantitative risk scoring, hard safety rule passes, and primary 14-day ➔ fallback 90-day evidence lookback.</p>
      </div>

      <!-- Risk Score Card -->
      <div class="card-section" style="border-color: ${isLow ? "var(--status-success)" : isMed ? "var(--status-warning)" : "var(--status-danger)"};">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 14px; color: var(--text-muted);">Evaluated Solver Address</div>
            <div style="font-size: 20px; font-weight: 700; color: var(--accent-cyan); margin-top: 4px;">${assessment.solverAddress}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px; color: var(--text-muted);">Composite Risk Level</div>
            <div style="font-size: 24px; font-weight: 800; color: ${isLow ? "var(--status-success)" : isMed ? "var(--status-warning)" : "var(--status-danger)"}; margin-top: 4px;">
              ${assessment.riskLevel} (${assessment.riskScore}/100)
            </div>
          </div>
        </div>
      </div>

      <!-- 14-Day vs 90-Day Lookback Visualizer -->
      <div class="card-section">
        <div class="section-header">Historical Sample Lookback Window</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
          <div style="background: #0d1322; border: 1px solid ${assessment.lookbackDays === 14 ? "var(--accent-primary)" : "var(--border-color)"}; border-radius: 8px; padding: 16px;">
            <div style="font-weight: 700; color: white;">Primary Window: 14 Days</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Inspected first for minimum sample threshold (≥ 5 fills).</div>
            <div style="margin-top: 8px; font-size: 13px;">Status: ${assessment.lookbackDays === 14 ? '<span class="badge badge-success">ACTIVE & SUFFICIENT</span>' : '<span class="badge badge-warning">INSUFFICIENT SAMPLES</span>'}</div>
          </div>
          <div style="background: #0d1322; border: 1px solid ${assessment.lookbackDays === 90 ? "var(--accent-purple)" : "var(--border-color)"}; border-radius: 8px; padding: 16px;">
            <div style="font-weight: 700; color: white;">Fallback Window: 90 Days</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Expanded automatically only when 14-day sample count is insufficient.</div>
            <div style="margin-top: 8px; font-size: 13px;">Status: ${assessment.lookbackDays === 90 ? '<span class="badge badge-info">EXPANDED FOR DATA</span>' : '<span class="badge badge-info">NOT NEEDED</span>'}</div>
          </div>
        </div>
      </div>

      <!-- 5-Factor Score Breakdown -->
      <div class="card-section">
        <div class="section-header">Five Quantitative Risk Factors (0 - 100)</div>
        <div class="metrics-grid" style="margin-bottom: 0;">
          <div class="metric-card">
            <div class="metric-label">Reliability Score (30%)</div>
            <div class="metric-value" style="color: var(--accent-cyan);">${assessment.factors.reliabilityScore}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Success Rate Score (25%)</div>
            <div class="metric-value" style="color: var(--status-success);">${assessment.factors.successRateScore}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Timeout Rate Score (20%)</div>
            <div class="metric-value" style="color: var(--accent-purple);">${assessment.factors.timeoutRateScore}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Latency Score (15%)</div>
            <div class="metric-value" style="color: var(--status-warning);">${assessment.factors.latencyScore}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Coverage Score (10%)</div>
            <div class="metric-value" style="color: white;">${assessment.factors.coverageScore}</div>
          </div>
        </div>
      </div>

      <!-- AI Non-Authoritative Advisory Badge -->
      <div class="card-section" style="border-color: var(--accent-purple);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 14px; font-weight: 700; color: var(--accent-purple); margin-bottom: 4px;">🤖 AI Non-Authoritative Advisory Engine</div>
            <div style="font-size: 13px; color: var(--text-muted);">${assessment.advisoryNote}</div>
          </div>
          <span class="badge badge-info" style="font-size: 11px;">ADVISORY ONLY</span>
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 8px;">
          In accordance with Protocol Invariant-010, AI model recommendations carry <strong>ZERO authorization authority</strong> over token settlements, winner selection, or refund authorization.
        </div>
      </div>
    </div>
  `;
}
