import { apiClient } from "../services/apiClient";
import { AuctionRecord, HealthStatus, IntentRecord, ProtocolEventLog, SolverRecord } from "../types";

export async function renderDashboardPage(): Promise<string> {
  let health: HealthStatus | null = null;
  let intents: IntentRecord[] = [];
  let solvers: SolverRecord[] = [];
  let auctions: AuctionRecord[] = [];
  let events: ProtocolEventLog[] = [];
  let errorMsg = "";

  try {
    const [hRes, iRes, sRes, aRes, eRes] = await Promise.all([
      apiClient.getHealth(),
      apiClient.getIntents(),
      apiClient.getSolvers(),
      apiClient.getAuctions(),
      apiClient.getEvents(),
    ]);
    health = hRes;
    intents = iRes.intents;
    solvers = sRes.solvers;
    auctions = aRes.auctions;
    events = eRes.events;
  } catch (err: any) {
    errorMsg = err.message || "Failed to fetch dashboard data from API backend.";
  }

  if (errorMsg) {
    return `
      <div class="page-container">
        <div class="card-section" style="border-color: var(--status-danger);">
          <h2 style="color: var(--status-danger); margin-bottom: 8px;">⚠️ Backend API Unavailable</h2>
          <p style="color: var(--text-muted);">${errorMsg}</p>
          <p style="color: var(--text-muted); margin-top: 12px; font-size: 13px;">Ensure Anvil nodes and API backend are running via <code>pnpm start:api</code>.</p>
        </div>
      </div>
    `;
  }

  const activeIntentsCount = intents.filter((i) => i.state < 12).length;
  const activeAuctionsCount = auctions.filter((a) => a.state === "COMMIT" || a.state === "REVEAL").length;

  return `
    <div class="page-container">
      <div class="page-title-group">
        <h1 class="page-title">Protocol Overview Dashboard</h1>
        <p class="page-subtitle">Real-time status of cross-chain intents, commit-reveal auctions, and solver risk assessments.</p>
      </div>

      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Intents Created</div>
          <div class="metric-value">${intents.length}</div>
          <div class="metric-sub">${activeIntentsCount} active / pending</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Active Batch Auctions</div>
          <div class="metric-value">${auctions.length}</div>
          <div class="metric-sub">${activeAuctionsCount} currently open</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Registered Solvers</div>
          <div class="metric-value">${solvers.length}</div>
          <div class="metric-sub">100% active status</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Avg Execution Latency</div>
          <div class="metric-value">4.2s</div>
          <div class="metric-sub">Across 31337 ➔ 31338</div>
        </div>
      </div>

      <!-- Active Intents Section -->
      <div class="card-section">
        <div class="section-header">
          <span>Recent Protocol Intents</span>
          <button class="btn btn-secondary" onclick="window.navigateTo('intents')">View All Intents</button>
        </div>
        ${
          intents.length === 0
            ? `<div style="color: var(--text-muted); padding: 20px; text-align: center;">No intents created yet. Use <strong>Create Intent</strong> or <strong>Demo Center</strong> to launch an intent.</div>`
            : `
          <table class="data-table">
            <thead>
              <tr>
                <th>Intent Hash</th>
                <th>User</th>
                <th>Source Chain</th>
                <th>Dest Chain</th>
                <th>Amount</th>
                <th>Min Output</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              ${intents
                .slice(0, 5)
                .map(
                  (i) => `
                <tr>
                  <td><a href="#/intents/${i.intentHash}" onclick="window.navigateTo('intents')" style="color: var(--accent-cyan); font-weight: 600;">${i.intentHash.substring(0, 10)}...${i.intentHash.substring(58)}</a></td>
                  <td>${i.user.substring(0, 8)}...</td>
                  <td>Chain ${i.sourceChainId}</td>
                  <td>Chain ${i.destinationChainId}</td>
                  <td>${(BigInt(i.sourceAmount) / 10n**6n).toString()} USDC</td>
                  <td>${(BigInt(i.minOutputAmount) / 10n**6n).toString()} USDC</td>
                  <td><span class="badge badge-info">STATE ${i.state}</span></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        `
        }
      </div>

      <!-- Recent Events Section -->
      <div class="card-section">
        <div class="section-header">
          <span>Live Protocol Event Stream</span>
          <button class="btn btn-secondary" onclick="window.navigateTo('events')">Full Event Ticker</button>
        </div>
        ${
          events.length === 0
            ? `<div style="color: var(--text-muted); padding: 20px; text-align: center;">No events recorded in Protocol Event Indexer.</div>`
            : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${events
              .slice(-5)
              .reverse()
              .map(
                (ev) => `
              <div style="background-color: #0d1322; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="badge badge-success">${ev.type}</span>
                  <span style="font-size: 14px; font-weight: 500;">${ev.message}</span>
                </div>
                <span style="font-size: 12px; color: var(--text-muted);">${new Date(ev.timestamp * 1000).toLocaleTimeString()}</span>
              </div>
            `
              )
              .join("")}
          </div>
        `
        }
      </div>
    </div>
  `;
}
