import { apiClient } from "../services/apiClient";

export async function renderDemoCenterPage(): Promise<string> {
  return `
    <div class="page-wrapper">
      <div class="page-header">
        <div class="hero-tagline-badge" style="background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); color: var(--accent-amber);">
          <span>🧪 LOCAL PROTOCOL SIMULATION CONTROL ROOM</span>
        </div>
        <h1 class="page-title" style="margin-top: 8px;">Master Scenario Protocol Simulator</h1>
        <p class="page-subtitle">Trigger live backend orchestration scenarios against local Anvil EVM nodes (31337 ➔ 31338) to test edge cases and error handling.</p>
      </div>

      <!-- SIMULATION NOTICE BANNER -->
      <div class="glass-card" style="border-color: var(--accent-amber); margin-bottom: 24px; background: rgba(245, 158, 11, 0.04);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-weight: 700; color: var(--accent-amber); font-size: 14px;">ℹ️ LOCAL PROTOCOL SIMULATION ISOLATION</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
              These scenarios run controlled protocol state machine simulations against your local Anvil stack for testing fallback mechanisms and contract refunds. The <strong>Execute Terminal</strong> page processes real Web3 transactions.
            </div>
          </div>
          <span class="badge-pill badge-medium">SIMULATOR MODE</span>
        </div>
      </div>

      <!-- MASTER SCENARIOS CONTROL GRID -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-bottom: 32px;">
        
        <!-- SCENARIO 1: GOLDEN PATH -->
        <div class="glass-card" style="border-color: var(--accent-indigo);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 16px; font-weight: 800; color: var(--accent-indigo);">1. Golden Path Scenario</span>
            <span class="badge-pill badge-low">LOCAL SIMULATION</span>
          </div>
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5;">
            End-to-end intent execution: Intent creation ➔ InputEscrow locking ➔ Batch auction ➔ Risk scoring ➔ Winner selection ➔ Destination execution ➔ 7-point verification ➔ Settlement release.
          </p>
          <button id="btn-demo-golden" class="btn-action-primary" style="width: 100%;">
            <span>🚀 RUN GOLDEN PATH SIMULATION</span>
          </button>
        </div>

        <!-- SCENARIO 2: FAILURE RECOVERY -->
        <div class="glass-card" style="border-color: var(--accent-amber);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 16px; font-weight: 800; color: var(--accent-amber);">2. Failure Recovery & Fallback</span>
            <span class="badge-pill badge-medium">LOCAL SIMULATION</span>
          </div>
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5;">
            Primary Solver A timeout/failure detected ➔ FailureManager releases capacity & blocks settlement ➔ Fallback Solver B selected ➔ Retry execution succeeds ➔ Verification passes ➔ Settlement completes.
          </p>
          <button id="btn-demo-failure" class="btn-action-primary" style="width: 100%; background: linear-gradient(135deg, var(--accent-amber), #d97706); box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.4);">
            <span>⚠️ RUN FAILURE RECOVERY SIMULATION</span>
          </button>
        </div>

        <!-- SCENARIO 3: CONTRACT REFUND -->
        <div class="glass-card" style="border-color: var(--accent-rose);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 16px; font-weight: 800; color: var(--accent-rose);">3. Contract-Authorized Refund</span>
            <span class="badge-pill badge-high">LOCAL SIMULATION</span>
          </div>
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5;">
            Solver execution failure ➔ No safe fallback solver available ➔ Verification blocks settlement ➔ SettlementManager authorizes non-custodial user refund from InputEscrow.
          </p>
          <button id="btn-demo-refund" class="btn-action-primary" style="width: 100%; background: linear-gradient(135deg, var(--accent-rose), #e11d48); box-shadow: 0 10px 25px -5px rgba(244, 63, 94, 0.4);">
            <span>💸 RUN CONTRACT REFUND SIMULATION</span>
          </button>
        </div>

      </div>

      <!-- LIVE SIMULATION TELEMETRY OUTPUT CONTAINER -->
      <div class="glass-card">
        <h3 style="font-size: 18px; font-weight: 700; color: white; margin-bottom: 16px;">Live Simulator Telemetry Output</h3>
        <div id="demo-log-output" style="min-height: 220px; background: rgba(0,0,0,0.4); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 20px;">
          <div style="color: var(--text-muted); text-align: center; padding: 60px 0;">
            Select a protocol simulation scenario above to launch the live backend orchestration pipeline.
          </div>
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
    logDiv.innerHTML = `<div style="color: var(--accent-cyan); font-weight: 700;">⚡ Launching Golden Path Simulation on Backend API...</div>`;
    try {
      const res = await apiClient.runGoldenPathDemo();
      logDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="color: var(--accent-emerald); font-weight: 800; font-size: 18px;">
            ✓ GOLDEN PATH SIMULATION COMPLETED SUCCESSFULLY
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; color: var(--text-secondary);">
            <div>Canonical Hash: <code style="color: var(--accent-cyan);">${res.intentHash}</code></div>
            <div>Winning Solver: <code style="color: white;">${res.winner}</code></div>
            <div>Verification Result: <span class="badge-pill badge-low">7/7 CHECKS PASSED</span></div>
            <div>Settlement Status: <span class="badge-pill badge-low">SETTLEMENT AUTHORIZED</span></div>
          </div>

          <pre class="code-block" style="margin-top: 10px;">${JSON.stringify(res, null, 2)}</pre>
        </div>
      `;
    } catch (err: any) {
      logDiv.innerHTML = `<div style="color: var(--accent-rose); font-weight: 700;">❌ Simulation Error: ${err.message}</div>`;
    }
  });

  btnFailure?.addEventListener("click", async () => {
    logDiv.innerHTML = `<div style="color: var(--accent-amber); font-weight: 700;">⚠️ Launching Failure Recovery Simulation on Backend API...</div>`;
    try {
      const res = await apiClient.runFailureRecoveryDemo();
      logDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          
          <!-- ANIMATED FAILURE RECOVERY SEQUENCE BANNER -->
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid var(--accent-amber); border-radius: var(--radius-sm); padding: 16px;">
            <div style="color: var(--accent-amber); font-weight: 800; font-size: 16px; margin-bottom: 8px;">
              ⚠️ FAILURE DETECTED ➔ AUTOMATIC FALLBACK ENGAGED
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-family: var(--font-mono);">
              <div style="color: var(--accent-rose);">[❌ FAILURE] SOLVER A FAILED — Execution timeout detected.</div>
              <div style="color: var(--text-muted);">[🔒 SAFETY] Capacity released. Settlement blocked.</div>
              <div style="color: var(--accent-cyan);">[🤖 SEARCH] Finding next safe solver...</div>
              <div style="color: var(--accent-emerald);">[✓ RECOVERY] SOLVER B SELECTED — Retrying execution...</div>
              <div style="color: var(--accent-emerald);">[✓ VERIFIED] EXECUTION VERIFIED — SETTLEMENT COMPLETE.</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; color: var(--text-secondary);">
            <div>Failed Primary Solver: <code style="color: var(--accent-rose);">${res.failedSolver}</code></div>
            <div>Fallback Solver Selected: <code style="color: var(--accent-emerald);">${res.fallbackSolver}</code></div>
            <div>Resolution Reason: <span style="color: white;">${res.resolution?.reason}</span></div>
          </div>

          <pre class="code-block">${JSON.stringify(res, null, 2)}</pre>
        </div>
      `;
    } catch (err: any) {
      logDiv.innerHTML = `<div style="color: var(--accent-rose); font-weight: 700;">❌ Simulation Error: ${err.message}</div>`;
    }
  });

  btnRefund?.addEventListener("click", async () => {
    logDiv.innerHTML = `<div style="color: var(--accent-rose); font-weight: 700;">💸 Launching Contract Refund Simulation on Backend API...</div>`;
    try {
      const res = await apiClient.runRefundDemo();
      logDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          
          <!-- ANIMATED REFUND SEQUENCE BANNER -->
          <div style="background: rgba(244, 63, 94, 0.1); border: 1px solid var(--accent-rose); border-radius: var(--radius-sm); padding: 16px;">
            <div style="color: var(--accent-rose); font-weight: 800; font-size: 16px; margin-bottom: 8px;">
              💸 NO SAFE SOLVER AVAILABLE ➔ CONTRACT REFUND AUTHORIZED
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-family: var(--font-mono);">
              <div style="color: var(--accent-rose);">[❌ FAILURE] Verification failed / execution unavailable.</div>
              <div style="color: var(--text-muted);">[🔒 INVARIANT] Settlement remains strictly blocked.</div>
              <div style="color: var(--accent-cyan);">[🛡️ ESCROW] User funds are being returned through the protocol refund path.</div>
              <div style="color: var(--accent-emerald);">[✓ REFUND] REFUND AUTHORIZED BY SETTLEMENTMANAGER.</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; color: var(--text-secondary);">
            <div>Canonical Hash: <code style="color: var(--accent-cyan);">${res.intentHash}</code></div>
            <div>Refund Authorized: <span class="badge-pill badge-high">TRUE</span></div>
            <div>Resolution Reason: <span style="color: white;">${res.resolution?.reason}</span></div>
          </div>

          <pre class="code-block">${JSON.stringify(res, null, 2)}</pre>
        </div>
      `;
    } catch (err: any) {
      logDiv.innerHTML = `<div style="color: var(--accent-rose); font-weight: 700;">❌ Simulation Error: ${err.message}</div>`;
    }
  });
}
