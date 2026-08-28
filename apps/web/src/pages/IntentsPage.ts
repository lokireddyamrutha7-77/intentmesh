import { renderIntentTimeline } from "../components/Timeline";
import { apiClient } from "../services/apiClient";
import { IntentRecord } from "../types";

export async function renderIntentsPage(intentHashParam?: string): Promise<string> {
  try {
    const res = await apiClient.getIntents();
    const intents = res.intents;

    if (intentHashParam) {
      const selectedIntent = intents.find((i) => i.intentHash.toLowerCase() === intentHashParam.toLowerCase()) || intents[0];
      if (selectedIntent) {
        return renderIntentDetail(selectedIntent);
      }
    }

    return `
      <div class="page-container">
        <div class="page-title-group">
          <h1 class="page-title">Canonical Intents Directory</h1>
          <p class="page-subtitle">Inspect registered cross-chain intents and their current protocol verification state.</p>
        </div>

        <div class="card-section">
          ${
            intents.length === 0
              ? `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No registered intents found in protocol state.</div>`
              : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Canonical Intent Hash</th>
                  <th>User</th>
                  <th>Source Chain</th>
                  <th>Dest Chain</th>
                  <th>Amount</th>
                  <th>Min Output</th>
                  <th>Lifecycle State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${intents
                  .map(
                    (i) => `
                  <tr>
                    <td><code style="color: var(--accent-cyan);">${i.intentHash.substring(0, 12)}...${i.intentHash.substring(58)}</code></td>
                    <td>${i.user.substring(0, 10)}...</td>
                    <td>${i.sourceChainId}</td>
                    <td>${i.destinationChainId}</td>
                    <td>${(BigInt(i.sourceAmount) / 10n**6n).toString()} USDC</td>
                    <td>${(BigInt(i.minOutputAmount) / 10n**6n).toString()} USDC</td>
                    <td><span class="badge badge-info">STATE ${i.state}</span></td>
                    <td>
                      <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="window.navigateTo('intents', '${i.intentHash}')">Inspect Timeline</button>
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          `
          }
        </div>
      </div>
    `;
  } catch (err: any) {
    return `<div class="page-container"><div class="card-section" style="border-color: var(--status-danger);">Error loading intents: ${err.message}</div></div>`;
  }
}

function renderIntentDetail(intent: IntentRecord): string {
  return `
    <div class="page-container">
      <div class="page-title-group">
        <button class="btn btn-secondary" style="margin-bottom: 12px;" onclick="window.navigateTo('intents')">← Back To Intents Directory</button>
        <h1 class="page-title">Intent Lifecycle Inspection</h1>
        <p class="page-subtitle">Canonical Hash: <code style="color: var(--accent-cyan);">${intent.intentHash}</code></p>
      </div>

      <!-- 9-step timeline visualizer -->
      <div class="card-section">
        <div class="section-header">Protocol Lifecycle Timeline</div>
        ${renderIntentTimeline(intent.state)}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div class="card-section">
          <div class="section-header">Canonical Intent Specification</div>
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
            <div><strong>User:</strong> <code>${intent.user}</code></div>
            <div><strong>Recipient:</strong> <code>${intent.recipient}</code></div>
            <div><strong>Source Chain ID:</strong> ${intent.sourceChainId}</div>
            <div><strong>Destination Chain ID:</strong> ${intent.destinationChainId}</div>
            <div><strong>Source Amount:</strong> ${(BigInt(intent.sourceAmount) / 10n**6n).toString()} USDC</div>
            <div><strong>Minimum Output:</strong> ${(BigInt(intent.minOutputAmount) / 10n**6n).toString()} USDC</div>
            <div><strong>Nonce:</strong> ${intent.nonce}</div>
            <div><strong>Verification Policy:</strong> <code>${intent.verificationPolicy}</code></div>
          </div>
        </div>

        <div class="card-section">
          <div class="section-header">Escrow & Custody State</div>
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
            <div><strong>Custody Vault:</strong> InputEscrow Module</div>
            <div><strong>Escrow Status:</strong> <span class="badge badge-success">FUNDS LOCKED</span></div>
            <div><strong>Authorized Release:</strong> SettlementManager Only</div>
            <div><strong>Authorized Refund:</strong> SettlementManager Only</div>
            <div style="margin-top: 12px; padding: 12px; background: #0d1322; border-radius: 8px; border: 1px solid var(--border-color); color: var(--text-muted); font-size: 12px;">
              In accordance with Protocol Invariant-003, input escrow funds can only be released upon valid cryptographic proof verification by SettlementManager.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
