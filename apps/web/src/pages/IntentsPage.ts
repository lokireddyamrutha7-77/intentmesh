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
      <div class="page-wrapper">
        <div class="page-header">
          <h1 class="page-title">Activity & Intent History</h1>
          <p class="page-subtitle">Inspect submitted cross-chain intents, real-time protocol state transitions, and custody escrow statuses.</p>
        </div>

        <div class="glass-card">
          ${
            intents.length === 0
              ? `<div style="padding: 40px; text-align: center; color: var(--text-muted);">No intents found in protocol state. Submit an intent on the <strong>Execute Terminal</strong>.</div>`
              : `
            <div class="table-responsive">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Canonical Hash</th>
                    <th>User</th>
                    <th>Source ➔ Dest</th>
                    <th>Input Amount</th>
                    <th>Min Output</th>
                    <th>Protocol State</th>
                    <th>Escrow Payout</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${intents
                    .map(
                      (i) => `
                    <tr>
                      <td><code style="color: var(--accent-cyan); font-weight: 700;">${i.intentHash.substring(0, 10)}...${i.intentHash.substring(58)}</code></td>
                      <td>${i.user.substring(0, 8)}...</td>
                      <td>Chain ${i.sourceChainId} ➔ ${i.destinationChainId}</td>
                      <td>${(BigInt(i.sourceAmount) / 10n**6n).toString()} USDC</td>
                      <td>${(BigInt(i.minOutputAmount) / 10n**6n).toString()} USDC</td>
                      <td><span class="badge-pill badge-info">STATE ${i.state}</span></td>
                      <td><span class="badge-pill badge-low">LOCKED IN ESCROW</span></td>
                      <td>
                        <button class="nav-link" style="padding: 6px 12px; font-size: 12px;" onclick="window.navigateTo('activity', '${i.intentHash}')">Inspect Journey</button>
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;
  } catch (err: any) {
    return `
      <div class="page-wrapper">
        <div class="glass-card" style="border-color: var(--accent-rose);">
          Error loading intents: ${err.message}
        </div>
      </div>
    `;
  }
}

function renderIntentDetail(intent: IntentRecord): string {
  return `
    <div class="page-wrapper">
      <div class="page-header">
        <button class="nav-link" style="margin-bottom: 12px;" onclick="window.navigateTo('activity')">← Back to Activity Directory</button>
        <h1 class="page-title">Intent Journey: <code style="color: var(--accent-cyan); font-size: 22px;">${intent.intentHash.substring(0, 16)}...</code></h1>
        <p class="page-subtitle">Full 11-field canonical representation and real-time lifecycle tracking.</p>
      </div>

      <!-- 9-STEP TIMELINE -->
      <div class="glass-card" style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 700; color: white; margin-bottom: 16px;">Protocol Stage Progression</h3>
        ${renderIntentTimeline(intent.state)}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        
        <!-- CANONICAL SPECIFICATION CARD -->
        <div class="glass-card">
          <h3 style="font-size: 16px; font-weight: 700; color: white; margin-bottom: 16px;">11-Field Canonical Specification</h3>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: var(--text-secondary);">
            <div><strong>User:</strong> <code style="color: white;">${intent.user}</code></div>
            <div><strong>Recipient:</strong> <code style="color: white;">${intent.recipient}</code></div>
            <div><strong>Source Chain ID:</strong> <span style="color: white;">${intent.sourceChainId}</span></div>
            <div><strong>Destination Chain ID:</strong> <span style="color: white;">${intent.destinationChainId}</span></div>
            <div><strong>Source Amount:</strong> <span style="color: var(--accent-cyan); font-weight: 700;">${(BigInt(intent.sourceAmount) / 10n**6n).toString()} USDC</span></div>
            <div><strong>Min Output Amount:</strong> <span style="color: var(--accent-emerald); font-weight: 700;">${(BigInt(intent.minOutputAmount) / 10n**6n).toString()} USDC</span></div>
            <div><strong>Nonce:</strong> <span style="color: white;">${intent.nonce}</span></div>
            <div><strong>Verification Policy:</strong> <code style="color: white;">${intent.verificationPolicy}</code></div>
          </div>
        </div>

        <!-- ESCROW & CUSTODY STATE CARD -->
        <div class="glass-card">
          <h3 style="font-size: 16px; font-weight: 700; color: white; margin-bottom: 16px;">Escrow & Custody Architecture</h3>
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
            <div><strong>Custody Vault:</strong> <span style="color: white;">InputEscrow Module</span></div>
            <div><strong>Escrow Status:</strong> <span class="badge-pill badge-low">FUNDS SECURED</span></div>
            <div><strong>Release Authorization:</strong> <span style="color: var(--accent-violet);">SettlementManager Contract Only</span></div>
            <div><strong>Refund Path:</strong> <span style="color: var(--accent-rose);">SettlementManager Authorized Refund</span></div>
            
            <div style="margin-top: 12px; padding: 14px; background: rgba(0,0,0,0.3); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 12px;">
              🔒 <strong>Protocol Invariant-003:</strong> Input escrow funds are completely non-custodial and can only be unlocked upon valid 7-point cryptographic proof verification by SettlementManager.
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}
