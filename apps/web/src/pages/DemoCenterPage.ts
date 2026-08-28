import { apiClient } from "../services/apiClient";

export async function renderDemoCenterPage(): Promise<string> {
  return `
    <div class="page-container">
      <div class="page-title-group">
        <h1 class="page-title">Master Scenario Demo Control Center</h1>
        <p class="page-subtitle">Trigger live backend orchestration scenarios against local Anvil EVM nodes and observe real-time state transitions.</p>
      </div>

      <!-- Scenarios Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 32px;">
        
        <!-- Scenario 1: Golden Path -->
        <div class="card-section" style="border-color: var(--accent-primary);">
          <div style="font-size: 16px; font-weight: 700; color: var(--accent-primary); margin-bottom: 8px;">1. Golden Path End-to-End</div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
            Full end-to-end execution: Intent creation ➔ InputEscrow locking ➔ Batch auction ➔ Risk scoring ➔ Winner selection ➔ Destination execution ➔ 7-point verification ➔ Settlement release.
          </p>
          <button id="btn-demo-golden" class="btn btn-primary" style="width: 100%;">🚀 RUN GOLDEN PATH DEMO</button>
        </div>

        <!-- Scenario 2: Failure Recovery -->
        <div class="card-section" style="border-color: var(--status-warning);">
          <div style="font-size: 16px; font-weight: 700; color: var(--status-warning); margin-bottom: 8px;">2. Failure Recovery & Fallback</div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
            Primary solver execution timeout/failure detected ➔ FailureManager invokes deterministic fallback ➔ Fallback solver executes ➔ Verification passes ➔ Settlement completes.
          </p>
          <button id="btn-demo-failure" class="btn btn-secondary" style="width: 100%; border-color: var(--status-warning); color: var(--status-warning);">⚠️ RUN FAILURE RECOVERY DEMO</button>
        </div>

        <!-- Scenario 3: Contract Refund -->
        <div class="card-section" style="border-color: var(--status-danger);">
          <div style="font-size: 16px; font-weight: 700; color: var(--status-danger); margin-bottom: 8px;">3. Contract-Authorized Refund</div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
            Solver execution failure ➔ No safe fallback solver available ➔ Verification blocks settlement ➔ SettlementManager authorizes user contract refund.
          </p>
          <button id="btn-demo-refund" class="btn btn-secondary" style="width: 100%; border-color: var(--status-danger); color: var(--status-danger);">💸 RUN CONTRACT REFUND DEMO</button>
        </div>

      </div>

      <!-- Execution Log Output Container -->
      <div class="card-section">
        <div class="section-header">Live Scenario Execution Output</div>
        <div id="demo-log-output" style="min-height: 200px;">
          <div style="color: var(--text-muted); padding: 40px; text-align: center;">Select a scenario above to run the live backend orchestration pipeline.</div>
        </div>
      </div>
    </div>
  `;
}

export function setupDemoCenterHandlers() {
  const btnGolden = document.getElementById("btn-demo-golden");
  const btnFailure = document.getElementById("btn-demo-failure");
  const btnRefund = document.getElementById("btn-demo-refund");
  const logDiv = document.getElementById("demo-log-output");

  if (!logDiv) return;

  btnGolden?.addEventListener("click", async () => {
    logDiv.innerHTML = `<div style="color: var(--accent-cyan); font-weight: 600;">Executing Golden Path Scenario on Backend API...</div>`;
    try {
      const res = await apiClient.runGoldenPathDemo();
      logDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="color: var(--status-success); font-weight: 700; font-size: 16px;">✓ Golden Path Scenario Completed Successfully!</div>
          <div><strong>Intent Hash:</strong> <code style="color: var(--accent-cyan);">${res.intentHash}</code></div>
          <div><strong>Winning Solver:</strong> <code>${res.winner}</code></div>
          <div><strong>Verification Result:</strong> <span class="badge badge-success">VALIDATED (7/7 Checks Passed)</span></div>
          <pre class="code-block">${JSON.stringify(res, null, 2)}</pre>
        </div>
      `;
    } catch (err: any) {
      logDiv.innerHTML = `<div style="color: var(--status-danger);">Execution Error: ${err.message}</div>`;
    }
  });

  btnFailure?.addEventListener("click", async () => {
    logDiv.innerHTML = `<div style="color: var(--status-warning); font-weight: 600;">Executing Failure Recovery Scenario on Backend API...</div>`;
    try {
      const res = await apiClient.runFailureRecoveryDemo();
      logDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="color: var(--status-warning); font-weight: 700; font-size: 16px;">⚠️ Failure Recovery & Fallback Completed Successfully!</div>
          <div><strong>Failed Primary Solver:</strong> <code style="color: var(--status-danger);">${res.failedSolver}</code></div>
          <div><strong>Fallback Solver Selected:</strong> <code style="color: var(--status-success);">${res.fallbackSolver}</code></div>
          <div><strong>Resolution:</strong> ${res.resolution?.reason}</div>
          <pre class="code-block">${JSON.stringify(res, null, 2)}</pre>
        </div>
      `;
    } catch (err: any) {
      logDiv.innerHTML = `<div style="color: var(--status-danger);">Execution Error: ${err.message}</div>`;
    }
  });

  btnRefund?.addEventListener("click", async () => {
    logDiv.innerHTML = `<div style="color: var(--status-danger); font-weight: 600;">Executing Contract Refund Scenario on Backend API...</div>`;
    try {
      const res = await apiClient.runRefundDemo();
      logDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="color: var(--status-danger); font-weight: 700; font-size: 16px;">💸 Contract Refund Authorized!</div>
          <div><strong>Intent Hash:</strong> <code style="color: var(--accent-cyan);">${res.intentHash}</code></div>
          <div><strong>Refund Authorized:</strong> <span class="badge badge-danger">TRUE (SettlementManager Contract Refund)</span></div>
          <div><strong>Reason:</strong> ${res.resolution?.reason}</div>
          <pre class="code-block">${JSON.stringify(res, null, 2)}</pre>
        </div>
      `;
    } catch (err: any) {
      logDiv.innerHTML = `<div style="color: var(--status-danger);">Execution Error: ${err.message}</div>`;
    }
  });
}
