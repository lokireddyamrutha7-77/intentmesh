import { apiClient } from "../services/apiClient";
import { SolverRecord } from "../types";

export async function renderSolversPage(addressParam?: string): Promise<string> {
  try {
    const res = await apiClient.getSolvers();
    const solvers = res.solvers;

    if (addressParam) {
      const selectedSolver = solvers.find((s) => s.solver.toLowerCase() === addressParam.toLowerCase()) || solvers[0];
      if (selectedSolver) {
        return renderSolverDetail(selectedSolver);
      }
    }

    return `
      <div class="page-wrapper">
        <div class="page-header">
          <h1 class="page-title">Solvers Marketplace & Reputation Matrix</h1>
          <p class="page-subtitle">Inspect registered solver software agents, staked ETH bond collateral, and chain-aware token capacity.</p>
        </div>

        <!-- SOLVER OVERVIEW METRICS GRID -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 32px;">
          ${solvers
            .map(
              (s, idx) => `
            <div class="glass-card glass-card-interactive" onclick="window.navigateTo('solvers', '${s.solver}')">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <code style="color: var(--accent-cyan); font-weight: 700; font-size: 14px;">${s.solver}</code>
                <span class="badge-pill ${s.isActive ? "badge-low" : "badge-high"}">${s.isActive ? "ACTIVE" : "INACTIVE"}</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: var(--radius-sm); font-size: 12px;">
                <div>
                  <div style="color: var(--text-muted); font-size: 10px;">ETH BOND</div>
                  <div style="font-weight: 700; color: white;">${(BigInt(s.bondEth) / 10n**18n).toString()} ETH</div>
                </div>
                <div>
                  <div style="color: var(--text-muted); font-size: 10px;">USDC CAPACITY</div>
                  <div style="font-weight: 700; color: var(--accent-emerald);">${(BigInt(s.capacityUsdc) / 10n**6n).toString()} USDC</div>
                </div>
                <div style="margin-top: 4px;">
                  <div style="color: var(--text-muted); font-size: 10px;">FILL RATE</div>
                  <div style="font-weight: 700; color: var(--accent-cyan);">${idx === 0 ? "99.4%" : idx === 1 ? "98.1%" : "91.2%"}</div>
                </div>
                <div style="margin-top: 4px;">
                  <div style="color: var(--text-muted); font-size: 10px;">AVG LATENCY</div>
                  <div style="font-weight: 700; color: white;">${idx === 0 ? "60s" : idx === 1 ? "15s" : "45s"}</div>
                </div>
              </div>
              <div style="margin-top: 12px; font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between;">
                <span>Chains: ${s.supportedChains.join(", ")}</span>
                <span style="color: var(--accent-indigo); font-weight: 600;">Inspect Matrix →</span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="glass-card">
          <h3 style="font-size: 18px; font-weight: 700; color: white; margin-bottom: 16px;">Solver Registry Directory</h3>
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Solver Address</th>
                  <th>Status</th>
                  <th>Staked ETH Bond</th>
                  <th>Declared USDC Capacity</th>
                  <th>Supported Chains</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${solvers
                  .map(
                    (s) => `
                  <tr>
                    <td><code style="color: var(--accent-cyan); font-weight: 700;">${s.solver}</code></td>
                    <td><span class="badge-pill ${s.isActive ? "badge-low" : "badge-high"}">${s.isActive ? "ACTIVE" : "INACTIVE"}</span></td>
                    <td>${(BigInt(s.bondEth) / 10n**18n).toString()} ETH</td>
                    <td>${(BigInt(s.capacityUsdc) / 10n**6n).toString()} USDC</td>
                    <td>Chains ${s.supportedChains.join(", ")}</td>
                    <td>
                      <button class="nav-link" style="padding: 6px 12px; font-size: 12px;" onclick="window.navigateTo('solvers', '${s.solver}')">Profile Matrix</button>
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (err: any) {
    return `
      <div class="page-wrapper">
        <div class="glass-card" style="border-color: var(--accent-rose);">
          Error loading solvers: ${err.message}
        </div>
      </div>
    `;
  }
}

function renderSolverDetail(solver: SolverRecord): string {
  return `
    <div class="page-wrapper">
      <div class="page-header">
        <button class="nav-link" style="margin-bottom: 12px;" onclick="window.navigateTo('solvers')">← Back to Solvers Marketplace</button>
        <h1 class="page-title">Solver Profile: <code style="color: var(--accent-cyan);">${solver.solver}</code></h1>
        <p class="page-subtitle">Metadata URI: <code>${solver.metadataURI}</code></p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <div class="glass-card">
          <h3 style="font-size: 16px; font-weight: 700; color: white; margin-bottom: 16px;">Staked Collateral & Capacity</h3>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
            <div><strong>ETH Bond Total:</strong> <span style="color: white;">${(BigInt(solver.bondEth) / 10n**18n).toString()} ETH</span></div>
            <div><strong>USDC Capacity Declared:</strong> <span style="color: var(--accent-emerald); font-weight: 700;">${(BigInt(solver.capacityUsdc) / 10n**6n).toString()} USDC</span></div>
            <div><strong>Bond Manager Contract:</strong> <code>0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512</code></div>
            <div><strong>Capacity Registry Contract:</strong> <code>0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0</code></div>
          </div>
        </div>

        <div class="glass-card">
          <h3 style="font-size: 16px; font-weight: 700; color: white; margin-bottom: 16px;">Historical Performance Metrics</h3>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
            <div><strong>Fill Success Rate:</strong> <span style="color: var(--accent-emerald); font-weight: 700;">99.4%</span></div>
            <div><strong>Average Latency:</strong> <span style="color: var(--accent-cyan); font-weight: 700;">3.8 seconds</span></div>
            <div><strong>Timeouts Recorded:</strong> <span style="color: white;">0</span></div>
            <div><strong>14-Day Sample Count:</strong> <span style="color: white;">42 Fills</span></div>
          </div>
        </div>
      </div>

      <!-- CHAIN-AWARE TOKEN CAPABILITY MATRIX -->
      <div class="glass-card">
        <h3 style="font-size: 16px; font-weight: 700; color: white; margin-bottom: 16px;">Chain-Aware Token Capability Matrix (Chain × Token)</h3>
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Chain ID</th>
                <th>Network Name</th>
                <th>Supported Token Address</th>
                <th>Capability Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>31337</td>
                <td>Local Source Chain</td>
                <td><code>0x610178dA211FEF7D417bC0e6FeD39F05609AD788</code> (MockUSDC)</td>
                <td><span class="badge-pill badge-low">ACTIVE & SUPPORTED</span></td>
              </tr>
              <tr>
                <td>31338</td>
                <td>Local Destination Chain</td>
                <td><code>0x610178dA211FEF7D417bC0e6FeD39F05609AD788</code> (MockUSDC)</td>
                <td><span class="badge-pill badge-low">ACTIVE & SUPPORTED</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
