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
    return `
      <div class="page-wrapper">
        <div class="glass-card" style="border-color: var(--accent-rose);">
          Error evaluating risk for solver ${solverAddr}: ${errorMsg}
        </div>
      </div>
    `;
  }

  const isLow = assessment.riskLevel === "LOW";
  const isMed = assessment.riskLevel === "MEDIUM";
  const isHigh = assessment.riskLevel === "HIGH";

  return `
    <div class="page-wrapper">
      <div class="page-header">
        <h1 class="page-title">Deterministic Risk Intelligence Engine</h1>
        <p class="page-subtitle">Quantitative 5-factor scoring, hard safety rule checks, and 14-day ➔ 90-day adaptive lookback windows.</p>
      </div>

      <!-- RISK COMPOSITE HEADER CARD -->
      <div class="glass-card" style="border-color: ${isLow ? "var(--accent-emerald)" : isMed ? "var(--accent-amber)" : "var(--accent-rose)"}; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="font-size: 12px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Evaluated Solver Address</div>
            <code style="font-size: 20px; font-weight: 700; color: var(--accent-cyan); margin-top: 4px; display: block;">${assessment.solverAddress}</code>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Composite Risk Level</div>
            <div style="font-size: 26px; font-weight: 800; color: ${isLow ? "var(--accent-emerald)" : isMed ? "var(--accent-amber)" : "var(--accent-rose)"}; margin-top: 4px;">
              ${assessment.riskLevel} (${assessment.riskScore}/100)
            </div>
          </div>
        </div>
      </div>

      <!-- 14-DAY VS 90-DAY ADAPTIVE LOOKBACK WINDOW -->
      <div class="glass-card" style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 700; color: white; margin-bottom: 16px;">Historical Sample Lookback Window</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="background: rgba(0,0,0,0.3); border: 1px solid ${assessment.lookbackDays === 14 ? "var(--accent-indigo)" : "var(--border-subtle)"}; border-radius: var(--radius-sm); padding: 16px;">
            <div style="font-weight: 700; color: white;">Primary Window: 14 Days</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Inspected first for minimum sample threshold (≥ 5 fills).</div>
            <div style="margin-top: 8px;">
              ${assessment.lookbackDays === 14 ? '<span class="badge-pill badge-low">ACTIVE & SUFFICIENT</span>' : '<span class="badge-pill badge-medium">INSUFFICIENT SAMPLES</span>'}
            </div>
          </div>
          <div style="background: rgba(0,0,0,0.3); border: 1px solid ${assessment.lookbackDays === 90 ? "var(--accent-violet)" : "var(--border-subtle)"}; border-radius: var(--radius-sm); padding: 16px;">
            <div style="font-weight: 700; color: white;">Fallback Window: 90 Days</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Expanded automatically only when 14-day sample count is insufficient.</div>
            <div style="margin-top: 8px;">
              ${assessment.lookbackDays === 90 ? '<span class="badge-pill badge-cyan">EXPANDED FOR DATA</span>' : '<span class="badge-pill badge-info">NOT NEEDED</span>'}
            </div>
          </div>
        </div>
      </div>

      <!-- 5-FACTOR RISK BREAKDOWN -->
      <div class="glass-card" style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 700; color: white; margin-bottom: 16px;">Five Deterministic Risk Factors (0 - 100)</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); padding: 14px; border-radius: var(--radius-sm);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">Reliability (30%)</div>
            <div style="font-size: 24px; font-weight: 800; color: var(--accent-cyan); margin-top: 4px;">${assessment.factors.reliabilityScore}</div>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); padding: 14px; border-radius: var(--radius-sm);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">Success Rate (25%)</div>
            <div style="font-size: 24px; font-weight: 800; color: var(--accent-emerald); margin-top: 4px;">${assessment.factors.successRateScore}</div>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); padding: 14px; border-radius: var(--radius-sm);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">Timeout Rate (20%)</div>
            <div style="font-size: 24px; font-weight: 800; color: var(--accent-violet); margin-top: 4px;">${assessment.factors.timeoutRateScore}</div>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); padding: 14px; border-radius: var(--radius-sm);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">Latency (15%)</div>
            <div style="font-size: 24px; font-weight: 800; color: var(--accent-amber); margin-top: 4px;">${assessment.factors.latencyScore}</div>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); padding: 14px; border-radius: var(--radius-sm);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">Coverage (10%)</div>
            <div style="font-size: 24px; font-weight: 800; color: white; margin-top: 4px;">${assessment.factors.coverageScore}</div>
          </div>
        </div>
      </div>

      <!-- AI NON-AUTHORITATIVE ADVISORY CALLOUT BANNER -->
      <div class="ai-advisory-banner">
        <div>
          <div class="ai-title">
            <span>🤖 AI ADVISORY — NON-AUTHORITATIVE</span>
          </div>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
            ${assessment.advisoryNote}
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">
            🔒 <strong>Protocol Invariant-010:</strong> AI models provide non-authoritative advisory insights only. AI carries ZERO execution authority over winner selection, escrow releases, settlement authorizations, capacity, or refund paths.
          </div>
        </div>
        <span class="badge-pill badge-info" style="white-space: nowrap;">ADVISORY ONLY</span>
      </div>

    </div>
  `;
}
